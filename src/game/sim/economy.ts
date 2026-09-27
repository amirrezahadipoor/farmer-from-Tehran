/**
 * src/game/sim/economy.ts — شروع بازی، قیمت، سفارش، تجربه، فروش، قرارداد، دستاورد و تناسخ
 * (P5.11: logic.ts به چهار ماژول ≤ ۴۰۰ خط شکسته شد؛ همه از مسیر "./logic" صادر می‌شوند)
 */
import { CROPS, BUILDINGS, ITEMS, DAY_LEN, NPCS, xpFor, TECH_TREE, ACHIEVEMENTS, CONTRACTS, fmt, type Recipe } from "../data";
import {
  type State, type Order, type Events, newStoryState, generateMap, rnd, NCH, capacity, invCount,
  countB, hasTech, hasSkill, DROUGHT,
} from "./state";


/** کالاهایی که «محصول کشاورزی» حساب می‌شوند (برای قیمتِ خشکسالی) */
const CROP_ITEMS = new Set(CROPS.map((c) => c.out ?? c.id));

export function newState(): State {
  const tiles = generateMap();
  const chunks = Array(NCH * NCH).fill(false);
  const startCx = Math.floor(NCH / 2), startCy = Math.floor(NCH / 2);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const cx = startCx + dx, cy = startCy + dy;
    if (cx >= 0 && cy >= 0 && cx < NCH && cy < NCH) chunks[cy * NCH + cx] = true;
  }
  const market: State["market"] = {};
  Object.keys(ITEMS).forEach((k) => (market[k] = { sat: 0, hist: [], ph: Math.random() * 6.28 }));
  const contracts = CONTRACTS.map((c) => ({ id: c.id, progress: 0, claimed: false }));
  const s: State = {
    v: 5, coins: 400, xp: 0, level: 1, prestige: 0,
    inv: { wheat: 10, carrot: 5, corn: 3 },
    tiles, chunks, bought: 0,
    time: DAY_LEN * 0.28, day: 1, seasonIndex: 0,
    weather: "sun", weatherLeft: 0, currentEvent: null,
    market, orders: [], nextId: 1, workers: [],
    rep: 0, techs: [], skills: [],
    achievements: {}, contracts,
    stats: { earned: 0, harvested: 0, orders: 0, produced: 0, spent: 0, animals: 0, decorations: 0, skillPoints: 0 },
    story: newStoryState(),
    savedAt: Date.now(), wAcc: 0, histAcc: 0, eventAcc: 0,
  };
  for (let i = 0; i < 3; i++) s.orders.push(genOrder(s));
  // تاریخچه‌ی آغازین: قیمت در این لحظه برای هر کالا ثابت است؛ یک بار حساب و ۲۰ بار ثبت (P6.5، همان خروجی)
  Object.keys(ITEMS).forEach((k) => { const p = price(s, k); for (let i = 0; i < 20; i++) s.market[k].hist.push(p); });
  return s;
}

/** قیمت با درجه‌ی اشباعِ دلخواه (برای پیش‌نمایش فروشِ انبوه بدون تغییر وضعیت) */
export function priceAt(s: State, id: string, sat: number): number {
  const m = s.market[id];
  if (!m) return 10;
  const base = ITEMS[id]?.base || 10;
  const wave = 1 + 0.22 * Math.sin(s.time / 90 + m.ph) + 0.08 * Math.sin(s.time / 23 + m.ph * 2);
  let bonus = 1;
  if (s.workers.some((w) => w.kind === "trader")) bonus += 0.12 * s.workers.filter((w) => w.kind === "trader").length;
  if (hasTech(s, "market1")) bonus += 0.08;
  if (hasTech(s, "export_license")) bonus += 0.20;
  if (hasSkill(s, "price_mind")) bonus += 0.10;
  if (hasSkill(s, "economist")) bonus += 0.15;
  // V.5: فستیوال «سرمایه‌گذاری بازار» — قیمت فروشِ فصل جاری +۱۰٪ (چک این‌لاین برای پرهیز از ایمپورت حلقوی)
  if (s.fest?.choice === "invest" && s.fest.idx === s.seasonIndex) bonus += 0.10;
  if (s.currentEvent?.type === "market_boom") bonus *= 1.35;
  if (s.currentEvent?.type === "fair") bonus *= 1.25;
  if (s.currentEvent?.type === "livestock_show") {
    const dItems = ["egg","milk","wool","pork","honey","butter","cheese","sausage","sweater"];
    if (dItems.includes(id)) bonus *= 1.5;
  }
  // بسته‌بندی صادراتی: کالاهای کارگاهی (پله‌ی ۲ به بالا) +۱۰٪
  if (hasTech(s, "export_pack") && (ITEMS[id]?.tier ?? 1) >= 2) bonus += 0.10;
  // خشکسالی: محصولِ کشاورزی کمیاب می‌شود → قیمت محصول‌ها +۲۰٪
  if (s.currentEvent?.type === "drought" && CROP_ITEMS.has(id)) bonus *= 1 + DROUGHT.price;
  const pm = 1 + s.prestige * 0.15;
  return Math.max(1, Math.round(base * wave * Math.max(0.35, 1 - sat) * bonus * pm));
}

export function price(s: State, id: string): number {
  const m = s.market[id];
  if (!m) return 10;
  return priceAt(s, id, m.sat);
}

/** دستور باز است؟ (سطح و — از P6.3 — نسل) */
export const recipeOpen = (s: State, r: Recipe) => (r.lvl ?? 0) <= s.level && (r.gen ?? 0) <= s.prestige;
/** برچسبِ قفلِ دستور برای UI و پیام‌ها ("" = باز) */
export const recipeLock = (s: State, r: Recipe) =>
  (r.gen ?? 0) > s.prestige ? `از نسل ${fmt((r.gen ?? 0) + 1)}` : (r.lvl ?? 0) > s.level ? `سطح ${fmt(r.lvl ?? 0)}` : "";

export function unlockedItems(s: State): string[] {
  const out: string[] = CROPS.filter((c) => c.lvl <= s.level).map((c) => c.out ?? c.id);
  // ساختمان‌های موجود در یک گذر (P6.5): پیش‌تر برای هر نوعِ ساختمان کلِ ۱۲۹۶ کاشی فیلتر می‌شد — ۳ بار در newState
  // و در هر سفارشِ تازه؛ همان مجموعه و همان ترتیبِ خروجی
  const built = new Set<string>();
  for (const t of s.tiles) if (t.b) built.add(t.b);
  BUILDINGS.forEach((b) => { if (built.has(b.id)) b.recipes.forEach((r) => { if (recipeOpen(s, r)) out.push(r.out); }); });
  return Array.from(new Set(out));
}

/** «بازکردنی»ها در یک سطح: محصول، ساختمان/دکور، دستورِ تازه و تحقیق (P6.1) */
export interface Unlock { kind: "crop" | "building" | "decor" | "recipe" | "tech"; id: string; name: string; }
export function unlocksAt(level: number): Unlock[] {
  const out: Unlock[] = [];
  for (const c of CROPS) if (c.lvl === level) out.push({ kind: "crop", id: c.id, name: c.name });
  for (const b of BUILDINGS) {
    if (b.lvl === level) out.push({ kind: b.isDecor ? "decor" : "building", id: b.id, name: b.name });
    for (const r of b.recipes) if (r.lvl === level && r.lvl > b.lvl) out.push({ kind: "recipe", id: `${b.id}:${r.out}`, name: ITEMS[r.out]?.name ?? r.out });
  }
  for (const t of TECH_TREE) if (t.lvl === level) out.push({ kind: "tech", id: t.id, name: t.name });
  return out;
}

/** نزدیک‌ترین سطحِ بعدی که چیزی باز می‌کند (برای «بازکردنیِ بعدی» در UI) */
export function nextUnlock(level: number, max = 60): { level: number; items: Unlock[] } | null {
  for (let l = level + 1; l <= max; l++) {
    const items = unlocksAt(l);
    if (items.length) return { level: l, items };
  }
  return null;
}

export function genOrder(s: State): Order {
  const pool = unlockedItems(s);
  const nItems = Math.min(pool.length, 1 + Math.floor(Math.random() * Math.min(4, 1 + s.level / 2)));
  const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, nItems);
  const items = picked.map((id) => ({ id, n: Math.max(1, Math.round(rnd(1, (ITEMS[id]?.base || 10) < 30 ? 6 : 3) + s.level / 2)) }));
  const val = items.reduce((a, it) => a + (ITEMS[it.id]?.base || 10) * it.n, 0);
  let m = 1.3 + s.rep * 0.012 + Math.random() * 0.2;
  if (hasTech(s, "order_bonus")) m *= 1.25;
  if (hasTech(s, "global_market")) m *= 1.15;
  if (hasSkill(s, "zen_master")) m *= 1.05;
  return {
    id: s.nextId++, npc: Math.floor(Math.random() * NPCS.length), items,
    coins: Math.round(val * m * (1 + s.prestige * 0.1)),
    xp: Math.round(4 + val / 10), repReward: Math.round(2 + val / 60),
    exp: s.time + rnd(360, 720),
  };
}

export function addXp(s: State, n: number, ev: Events) {
  let m = 1;
  if (hasTech(s, "crop_xp")) m += 0.25;
  if (hasSkill(s, "zen_master")) m += 0.10;
  if (hasSkill(s, "crop_lord")) m += 0.10;
  m += s.prestige * 0.2;
  if (s.level >= 10 && s.level < 20) m += 0.15; // V.7: کاهش گرایند میانه‌ی بازی
  s.xp += Math.round(n * m);
  let lvlGained = 0;
  while (s.xp >= xpFor(s.level)) {
    s.xp -= xpFor(s.level);
    s.level++;
    lvlGained++;
    s.stats.skillPoints += 1;
    const unl = unlocksAt(s.level).map((u) => u.name);
    ev.toast(`سطح ${fmt(s.level)}! ${unl.length ? "باز شد: " + unl.join("، ") : ""}`, "lvl");
    ev.sound("lvl");
    const bonus = s.level * 45;
    s.coins += bonus;
    ev.toast(`پاداش پیشرفت: +${fmt(bonus)} سکه`, "ok");
  }
  if (lvlGained > 0) ev.celebrate?.("level"); // V.3: جشن سطح
  if (lvlGained > 0 && s.stats.skillPoints > 0) {
    ev.toast(`${fmt(s.stats.skillPoints)} امتیاز مهارت در انتظار توست — از منو ← «مهارت‌ها» خرجش کن`, "lvl");
  }
  checkAchievements(s, ev);
}

export function addInv(s: State, id: string, n: number): number {
  const room = capacity(s) - invCount(s);
  const a = Math.min(room, n);
  if (a > 0) s.inv[id] = (s.inv[id] || 0) + a;
  return a;
}


/** پیش‌نمایش دقیق درآمد و تجربه‌ی فروش — بدون دست‌زدن به وضعیت (P5.7) */
export function sellPreview(s: State, id: string, n: number) {
  const have = s.inv[id] || 0;
  const count = Math.max(0, Math.min(Math.floor(n), have));
  const m = s.market[id] || { sat: 0, hist: [], ph: 0 };
  let sat = m.sat;
  let coins = 0;
  for (let i = 0; i < count; i++) {
    coins += priceAt(s, id, sat);
    sat = Math.min(0.65, sat + 0.02);
  }
  const frac = (s.xpAcc || 0) + coins / 50; // تجربه فقط تابع ارزش است، نه تعداد کلیک
  return { n: count, coins, xp: Math.floor(frac), satAfter: sat, priceNow: price(s, id) };
}

/**
 * فروش ایمن: کل مبلغ یک‌جا حساب می‌شود (نه حلقه‌ی کلیک‌به‌کلیک) و تجربه فقط
 * از روی «ارزش» داده می‌شود؛ پس ۱۰۰ بار فروشِ تکی هیچ تجربه‌ی اضافه‌ای نمی‌دهد.
 */
export function sell(s: State, id: string, n: number, ev: Events) {
  const pv = sellPreview(s, id, n);
  if (pv.n <= 0) return;
  if (!s.market[id]) s.market[id] = { sat: 0, hist: [], ph: Math.random() * 6 };
  s.inv[id] -= pv.n;
  s.coins += pv.coins; s.stats.earned += pv.coins;
  s.market[id].sat = pv.satAfter;
  s.xpAcc = (s.xpAcc || 0) + pv.coins / 50;
  const whole = Math.floor(s.xpAcc);
  if (whole > 0) { s.xpAcc -= whole; addXp(s, whole, ev); }
  updateContract(s, "coins", pv.coins, ev);
  ev.toast(`فروش ${fmt(pv.n)} ${ITEMS[id]?.name || "کالا"}: +${fmt(pv.coins)} سکه`, "ok");
  ev.sound("sell");
  ev.coins?.(Math.min(6, pv.n)); // V.3: سکه‌های پرنده به قرص سکه
}

export function fulfill(s: State, oi: number, ev: Events) {
  const o = s.orders[oi]; if (!o) return;
  if (!o.items.every((it) => (s.inv[it.id] || 0) >= it.n)) { ev.toast("اقلام سفارش آماده تحویل نیست", "err"); return; }
  o.items.forEach((it) => (s.inv[it.id] -= it.n));
  s.coins += o.coins; s.stats.earned += o.coins; s.stats.orders++;
  s.rep = Math.min(100, s.rep + o.repReward);
  addXp(s, o.xp, ev);
  updateContract(s, "orders", 1, ev);
  ev.toast(`سفارش ${NPCS[o.npc] || "مشتری"} تحویل شد: +${fmt(o.coins)} سکه`, "ok");
  ev.sound("order");
  ev.guest?.(o.npc);
  ev.coins?.(3); // V.3
  s.orders[oi] = genOrder(s);
}

export function claimContract(s: State, id: string, ev: Events) {
  const c = CONTRACTS.find((x) => x.id === id);
  const cs = s.contracts.find((x) => x.id === id);
  if (!c || !cs || cs.claimed || cs.progress < c.target) return;
  cs.claimed = true;
  s.coins += c.rewardCoins; s.rep = Math.min(100, s.rep + c.rewardRep); addXp(s, c.rewardXp, ev);
  ev.toast(`پاداش قرارداد دولتی وصول شد: +${fmt(c.rewardCoins)} سکه`, "lvl"); ev.sound("contract"); ev.coins?.(5);
}

export function updateContract(s: State, type: string, amount: number, _ev: Events) {
  CONTRACTS.forEach((c) => {
    if (c.type === type) {
      const cs = s.contracts.find((x) => x.id === c.id);
      if (cs && !cs.claimed) cs.progress += amount;
    }
  });
}

function checkAchievements(s: State, ev: Events) {
  for (const ach of ACHIEVEMENTS) {
    if (s.achievements[ach.id]) continue;
    let ok = false;
    if (ach.id === "first_harvest" && s.stats.harvested >= 1) ok = true;
    if (ach.id === "rich1" && s.coins >= 1000) ok = true;
    if (ach.id === "rich2" && s.coins >= 10000) ok = true;
    if (ach.id === "rich3" && s.coins >= 100000) ok = true;
    if (ach.id === "level10" && s.level >= 10) ok = true;
    if (ach.id === "level20" && s.level >= 20) ok = true;
    if (ach.id === "level25" && s.level >= 25) ok = true;
    if (ach.id === "factory_master" && s.stats.produced >= 60) ok = true;
    if (ach.id === "land_baron" && s.bought >= 10) ok = true;
    if (ach.id === "automation_king" && countB(s, "harvester") + countB(s, "auto_planter") + countB(s, "auto_fertilizer") >= 5) ok = true;
    if (ach.id === "zoo" && countB(s, "coop")>0 && countB(s, "barn")>0 && countB(s, "sheep")>0 && countB(s, "pigpen")>0 && countB(s, "beehive")>0) ok = true;
    if (ach.id === "decorator" && s.stats.decorations >= 10) ok = true;
    if (ach.id === "skill_master" && s.skills.length >= 10) ok = true;
    if (ok) {
      s.achievements[ach.id] = s.day; // V.8: تاریخِ گرفتن = شماره‌ی روز
      s.coins += ach.reward; ev.toast(`دستاورد جدید: ${ach.title} (+${fmt(ach.reward)} سکه)`, "lvl"); ev.sound("achievement"); ev.celebrate?.("achievement");
    }
  }
}

// P6.3: canPrestige / doPrestige به sim/legacy.ts رفتند (میراثِ نسل‌ها)
