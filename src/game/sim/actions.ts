/**
 * src/game/sim/actions.ts — کنش‌های بازیکن: برداشت، کاشت، کارگاه، ابزارها، ساخت، استخدام، تحقیق و مهارت
 * (P5.11: logic.ts به چهار ماژول ≤ ۴۰۰ خط شکسته شد؛ همه از مسیر "./logic" صادر می‌شوند)
 */
import { BMAP, CMAP, ITEMS, WORKERS, WorkerKind, FERT_COST, HOE_COST, CLEAR_COST, TECH_TREE, SKILLS, fmt } from "../data";
import {
  type State, type Tile, type Events, idx, chunkOf, locked, has, countB, hasTech, hasSkill,
  WATER_SECONDS, CLEAR_YIELD, NCH,
} from "./state";
import { addInv, addXp, updateContract } from "./economy";

export function harvest(s: State, x: number, y: number, ev: Events, silent = false): boolean {
  const t = s.tiles[idx(x, y)];
  if (!t.crop || (t.g || 0) < 1) return false;
  const c = CMAP[t.crop]; if (!c) return false;
  let extra = (t.fert ? 2 : 0) + (s.currentEvent?.type === "bountiful_harvest" ? 1 : 0);
  if (hasTech(s, "greenhouse_tech")) extra += 1;
  if (hasSkill(s, "harvest_god")) extra += 1;
  if (Math.random() < 0.2) extra += 1;
  const n = c.yield + extra;
  const outId = c.out ?? c.id; // صنوبر ← الوار
  const got = addInv(s, outId, n);
  if (got === 0) { if (!silent) ev.toast("انبار پر است! محصولات را بفروشید یا سیلو بسازید", "err"); return false; }
  s.stats.harvested += got;
  ev.fx(x, y, `+${fmt(got)}`, "#fff", c.color, `item:${outId}`);
  addXp(s, c.xp, ev);
  updateContract(s, "harvest", got, ev);
  t.crop = undefined; t.g = 0; t.wet = false; t.fert = false;
  if (!silent) ev.sound("harvest");
  return true;
}

export function plant(s: State, x: number, y: number, crop: string, ev: Events, silent = false): boolean {
  const t = s.tiles[idx(x, y)];
  const c = CMAP[crop]; if (!c || t.k !== "soil" || t.crop) return false;
  let seedCost = c.seed;
  if (hasTech(s, "seeds1")) seedCost = Math.max(1, Math.floor(seedCost * 0.8));
  if (hasSkill(s, "master_planter")) seedCost = Math.max(1, Math.floor(seedCost * 0.9));
  if (s.coins < seedCost) { if (!silent) ev.toast("سکه کافی برای خرید بذر ندارید", "err"); return false; }
  s.coins -= seedCost; s.stats.spent += seedCost;
  t.crop = crop; t.g = 0;
  if (hasTech(s, "fertilizer_master") && Math.random() < 0.3) t.fert = true;
  if (hasSkill(s, "fert_soil") && Math.random() < 0.15) t.fert = true;
  if (!silent) { ev.fx(x, y, `-${fmt(seedCost)}`, "#ffd54f", c.leaf, "ui:coin"); ev.sound("plant"); }
  return true;
}

export function collect(s: State, t: Tile, x: number, y: number, ev: Events, silent = false): boolean {
  if (!t.out || !t.out.length) return false;
  let any = false;
  while (t.out.length) {
    const id = t.out[0];
    if (addInv(s, id, 1) === 0) { if (!silent) ev.toast("انبار پر است!", "err"); break; }
    t.out.shift(); any = true; s.stats.produced++;
    if (["egg","milk","wool","pork","honey","butter","cheese","sausage","sweater"].includes(id)) {
      s.stats.animals++; updateContract(s, "animals", 1, ev);
    }
    updateContract(s, "produce", 1, ev);
    ev.fx(x, y, "+1", "#fff", "#ffe082", ITEMS[id] ? `item:${id}` : "ui:box");
  }
  if (any && !silent) ev.sound("collect");
  return any;
}

/** ظرفیت صف تولید هر کارگاه (با سطح و تحقیق «خوراک‌دهی خودکار» بیشتر می‌شود). */
export const queueMax = (s: State) => 3 + Math.floor(s.level / 4) + (hasTech(s, "auto_feed") ? 2 : 0);

export function queueRecipe(s: State, t: Tile, ri: number, ev: Events, silent = false): boolean {
  const b = BMAP[t.b!]; if (!b) return false;
  const r = b.recipes[ri]; if (!r) return false;
  if ((r.lvl ?? 0) > s.level) { if (!silent) ev.toast(`این دستور از سطح ${fmt(r.lvl ?? 0)} باز می‌شود`, "err"); return false; }
  const maxQ = queueMax(s);
  if ((t.q?.length || 0) >= maxQ) { if (!silent) ev.toast("صف تولید این کارگاه پر است", "err"); return false; }
  if (!has(s, r.inp)) { if (!silent) ev.toast("مواد اولیه کافی در انبار نیست", "err"); return false; }
  Object.entries(r.inp).forEach(([k, n]) => (s.inv[k] -= n));
  t.q = [...(t.q || []), ri]; t.lr = ri;
  if (!silent) ev.sound("plant");
  return true;
}

/**
 * رشدِ قیمتِ هر قطعه زمین (P5.11): قبلاً ۱.۱۵ بود و آخرین قطعه‌ی نقشه ۱۰ میلیون سکه می‌شد
 * (خریدِ کل نقشه عملاً ناممکن). با ۱.۰۸۵ آخرین قطعه ≈ ۱۶۰ هزار سکه — هدفِ واقعیِ آخر بازی.
 */
export const EXPAND_GROWTH = 1.085;
export const expandCost = (s: State) => Math.round(500 * Math.pow(EXPAND_GROWTH, s.bought));

export function canExpand(s: State, c: number): boolean {
  if (s.chunks[c]) return false;
  const cx = c % NCH, cy = Math.floor(c / NCH);
  return [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => {
    const nx = cx+dx, ny = cy+dy;
    return nx>=0 && ny>=0 && nx<NCH && ny<NCH && s.chunks[ny*NCH+nx];
  });
}

/**
 * STRICT TOOL ACTION
 * Each tool does EXACTLY what it is named for.
 * Clicking with "hand" will NOT plant, will NOT hoe, will NOT clear trees.
 * Clicking with "seed" will NOT plow grass, will NOT harvest.
 */
export function toolAction(s: State, x: number, y: number, tool: string, arg: string, ev: Events): "open" | void {
  const t = s.tiles[idx(x, y)];

  // Buying locked chunks
  if (locked(s, x, y)) {
    const c = chunkOf(x, y);
    if (!canExpand(s, c)) { ev.toast("ابتدا زمین‌های مجاور را خریداری کنید", "err"); return; }
    const cost = expandCost(s);
    if (s.coins < cost) { ev.toast(`خرید این قطعه زمین ${cost.toLocaleString("fa-IR")} سکه نیاز دارد`, "err"); return; }
    s.coins -= cost; s.stats.spent += cost; s.chunks[c] = true; s.bought++;
    addXp(s, 25, ev);
    ev.toast("قطعه زمین جدید با موفقیت خریداری شد!", "lvl"); ev.sound("expand"); return;
  }

  // 1. HAND TOOL: Only for harvest ripe crops, collect outputs, or open buildings/view info
  if (tool === "hand") {
    if (t.k === "bld") {
      if (t.out?.length) collect(s, t, x, y, ev);
      return "open";
    }
    if (t.crop) {
      if ((t.g || 0) >= 1) {
        harvest(s, x, y, ev);
      } else {
        const pct = Math.floor((t.g || 0) * 100);
        ev.toast(`${CMAP[t.crop]?.name || "گیاه"}: ${fmt(pct)}٪ رشد کرده — ${t.wet ? "آبیاری شده" : "تشنه‌ی آب"}`);
      }
      return;
    }
    if (t.k === "soil") {
      ev.toast("خاک آماده‌ی کاشت است — ابزار «کاشت» را از نوار پایین انتخاب کن.");
      return;
    }
    if (t.k === "grass") {
      ev.toast("این زمین چمن است — با ابزار «شخم» به خاک کشاورزی تبدیلش کن.");
      return;
    }
    if (t.k === "tree" || t.k === "rock") {
      ev.toast("برای پاکسازی موانع، ابزار «پاکسازی» را انتخاب کن.");
      return;
    }
    return;
  }

  // 2. SEED TOOL: Only plants on tilled soil without a crop. Never clears grass, never harvests.
  if (tool === "seed") {
    if (t.k !== "soil") {
      ev.toast("بذر فقط روی خاک شخم‌خورده کاشته می‌شود! اول با ابزار «شخم» زمین را آماده کن.", "err");
      return;
    }
    if (t.crop) {
      ev.toast("این خانه از قبل زیر کشت است!", "err");
      return;
    }
    plant(s, x, y, arg || "wheat", ev);
    return;
  }

  // 3. HOE TOOL: Strictly for tilling grass into soil.
  if (tool === "hoe") {
    if (t.k === "soil") {
      ev.toast("این خانه از قبل شخم خورده است.");
      return;
    }
    if (t.k !== "grass") {
      ev.toast("شخم فقط روی چمن خالی امکان‌پذیر است.", "err");
      return;
    }
    if (s.coins < HOE_COST) { ev.toast("سکه کافی برای شخم زدن ندارید", "err"); return; }
    s.coins -= HOE_COST; s.stats.spent += HOE_COST;
    s.tiles[idx(x, y)] = { k: "soil", v: t.v };
    ev.fx(x, y, "", "#fff", "#8d6e63"); ev.sound("dig"); return;
  }

  // 4. WATER TOOL: Strictly for watering soil tiles.
  if (tool === "water") {
    if (t.k !== "soil") {
      ev.toast("فقط بستر خاک کشاورزی نیاز به آبیاری دارد.", "err");
      return;
    }
    if (t.wet) {
      ev.toast(`این خاک هنوز ${fmt(Math.ceil(t.dry ?? WATER_SECONDS))} ثانیه رطوبت دارد.`);
      return;
    }
    t.wet = true;
    t.dry = WATER_SECONDS;
    ev.fx(x, y, `${fmt(WATER_SECONDS)}ث`, "#b3e5fc", "#4fc3f7", "ui:water"); ev.sound("water");
    return;
  }

  // 5. FERTILIZER TOOL: Strictly for fertilizing soil tiles.
  if (tool === "fert") {
    if (t.k !== "soil") {
      ev.toast("کود فقط روی خاک کشاورزی اعمال می‌شود.", "err");
      return;
    }
    if (t.fert) {
      ev.toast("این خاک قبلاً کوددهی شده و حداکثر بهره‌وری را دارد.");
      return;
    }
    if (s.coins < FERT_COST) { ev.toast("سکه کافی برای خرید کود تقویتی ندارید", "err"); return; }
    s.coins -= FERT_COST; s.stats.spent += FERT_COST;
    t.fert = true;
    ev.fx(x, y, "+۲", "#fff59d", "#aed581", "ui:sparkle"); ev.sound("fert");
    return;
  }

  // 6. CLEAR TOOL: Strictly for cutting trees, mining rocks, or removing buildings/soil.
  if (tool === "clear") {
    if (t.k === "tree" || t.k === "rock") {
      const c = CLEAR_COST[t.k];
      if (s.coins < c) { ev.toast("سکه کافی برای دستمزد پاکسازی ندارید", "err"); return; }
      s.coins -= c; s.stats.spent += c;
      ev.fx(x, y, "", "#fff", t.k === "tree" ? "#66bb6a" : "#9e9e9e");
      s.tiles[idx(x, y)] = { k: "grass", v: t.v }; addXp(s, 3, ev); ev.sound(t.k === "tree" ? "chop" : "rock");
      // P5.8: درخت = ۲ الوار و سنگ = ۲ سنگ (+۱ با شانس ۳۰٪) — مواد اولیه‌ی نجاری/معدن/سنگ‌تراشی
      const mat = t.k === "tree" ? "wood" : "stone";
      const got = addInv(s, mat, CLEAR_YIELD + (Math.random() < 0.3 ? 1 : 0));
      if (got) ev.fx(x, y, `+${fmt(got)}`, "#fff", undefined, `item:${mat}`);
      return;
    }
    if (t.k === "soil") {
      if (t.crop) {
        ev.toast("محصول از بین رفت و زمین به چمن تبدیل شد.");
      }
      s.tiles[idx(x, y)] = { k: "grass", v: t.v };
      ev.sound("dig");
      return;
    }
    if (t.k === "bld") {
      const b = BMAP[t.b!];
      if (b && b.isDecor) {
        const ref = Math.round(decorCost(s, b.id) * 0.5);
        s.coins += ref;
        s.tiles[idx(x, y)] = { k: "grass", v: t.v };
        if (s.stats.decorations > 0) s.stats.decorations--;
        ev.toast(`دکور ${b.name} جمع‌آوری شد (+${ref.toLocaleString("fa-IR")})`);
      } else {
        const ref = Math.round((b?.cost || 100) * 0.5);
        s.coins += ref; ev.toast(`${b?.name || "ساختمان"} برچیده شد (+${fmt(ref)} سکه)`);
        s.tiles[idx(x, y)] = { k: "grass", v: t.v };
      }
      ev.sound("demolish");
      return;
    }
    ev.toast("روی چمن خالی چیزی برای پاکسازی وجود ندارد.");
    return;
  }

  // 7. BUILD TOOL: Construct buildings and decorations
  if (tool === "build") {
    const b = BMAP[arg]; if (!b) return;
    if (t.k !== "grass" && !(t.k === "soil" && !t.crop)) {
      ev.toast("ساخت‌وساز فقط روی زمین خالی صاف امکان‌پذیر است.", "err"); return;
    }
    if (b.isDecor && !canBuildDecor(s)) {
      ev.toast("برای احداث دکوراسیون، ابتدا فناوری «طراحی منظر» یا مهارت «طراح باغ» را بیاموزید.", "err");
      return;
    }
    const cost = b.isDecor ? decorCost(s, b.id) : buildCost(s, b.id);
    if (s.coins < cost) { ev.toast("سکه کافی برای هزینه ساخت ندارید", "err"); return; }
    s.coins -= cost; s.stats.spent += cost;
    s.tiles[idx(x, y)] = { k: "bld", v: t.v, b: b.id, q: [], p: 0, out: [], autoMode: !b.isDecor };
    if (b.isDecor) s.stats.decorations++;
    addXp(s, b.isDecor ? 8 : 12, ev);
    ev.fx(x, y, `${b.name} برپا شد`, "#fff", "#ffcc80", "ui:build"); ev.sound("build");
    return;
  }
}

export const canBuildDecor = (s: State) => hasTech(s, "landscape_design") || hasSkill(s, "landscape_art");

/** Decorations have a flat price (no escalation) with a skill discount. */
export function decorCost(s: State, id: string): number {
  const b = BMAP[id]; if (!b) return 9999;
  return Math.round(b.cost * (hasSkill(s, "landscape_art") ? 0.8 : 1));
}

export function buildCost(s: State, id: string): number {
  const b = BMAP[id]; if (!b) return 9999;
  let m = 1.35;
  if (hasTech(s, "auto_feed")) m = 1.25;
  if (hasSkill(s, "landscape_art") && b.isDecor) m = 1.0;
  return Math.round(b.cost * Math.pow(m, countB(s, id)));
}

export function hire(s: State, kind: WorkerKind, ev: Events) {
  const w = WORKERS[kind];
  if (s.coins < w.hire) { ev.toast("سکه کافی ندارید", "err"); return; }
  s.coins -= w.hire; s.stats.spent += w.hire;
  s.workers.push({ id: s.nextId++, kind });
  ev.toast(`${w.name} استخدام شد`, "ok"); ev.sound("hire");
}

/* ----------------- کنش‌های ساده‌ی UI (تغییر وضعیت فقط از مسیر منطق) ----------------- */

/** رد سفارش: همان لحظه منقضی می‌شود تا tick سفارش تازه جایش بگذارد. */
export function rejectOrder(s: State, oi: number) {
  const o = s.orders[oi];
  if (o) s.orders[oi] = { ...o, exp: 0 };
}

/** تعدیل یک کارگر از نوع داده‌شده؛ خروجی = آیا کسی تعدیل شد. */
export function fireWorker(s: State, kind: WorkerKind): boolean {
  const j = s.workers.findIndex((w) => w.kind === kind);
  if (j < 0) return false;
  s.workers.splice(j, 1);
  return true;
}

/** روشن/خاموش کردن «تولید خودکار پیوسته»ی یک کارگاه. */
export function toggleAutoMode(t: Tile): boolean {
  t.autoMode = !t.autoMode;
  return t.autoMode;
}

/** نمایش/پنهان کردن پرده‌ی داستان. */
export function setStoryShown(s: State, shown: boolean) {
  s.story.shown = shown;
}

/** ثبت نام بازیکن (برای داستان و سند دره). */
export function setPlayerName(s: State, name: string) {
  s.story.name = name.trim().slice(0, 24);
}

export function unlockTech(s: State, id: string, ev: Events) {
  const t = TECH_TREE.find((x) => x.id === id);
  if (!t || s.techs.includes(id)) return;
  if ((t.lvl ?? 0) > s.level) { ev.toast(`این تحقیق از سطح ${fmt(t.lvl ?? 0)} باز می‌شود`, "err"); return; }
  if (t.req && !s.techs.includes(t.req)) { ev.toast("ابتدا دانش پیش‌نیاز را بیاموزید", "err"); return; }
  if (s.coins < t.cost) { ev.toast("سکه کافی برای تحقیق ندارید", "err"); return; }
  s.coins -= t.cost; s.stats.spent += t.cost;
  s.techs.push(id);
  ev.toast(`تحقیق کامل شد: ${t.name}`, "lvl"); ev.sound("unlock");
}

export function learnSkill(s: State, id: string, ev: Events) {
  const sk = SKILLS.find((x) => x.id === id);
  if (!sk || s.skills.includes(id)) return;
  if (sk.req && !s.skills.includes(sk.req)) { ev.toast("ابتدا مهارت پیش‌نیاز را بیاموزید", "err"); return; }
  if (s.stats.skillPoints < sk.cost) { ev.toast(`امتیاز مهارت کافی نداری (نیاز: ${fmt(sk.cost)}، موجود: ${fmt(s.stats.skillPoints)})`, "err"); return; }
  s.stats.skillPoints -= sk.cost;
  s.skills.push(id);
  if (id === "storage_master") ev.toast("ظرفیت انبار +۱۵۰ واحد افزایش یافت", "ok");
  else if (id === "price_mind") ev.toast("قیمت فروش تمامی کالاها +۱۰٪ شد", "lvl");
  else if (id === "harvest_god") ev.toast("محصول برداشتی در تمام مزارع +۱ افزایش یافت", "lvl");
  else ev.toast(`مهارت «${sk.name}» با موفقیت فراگرفته شد!`, "lvl");
  ev.sound("skill");
}
