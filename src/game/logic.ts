import {
  BMAP, CMAP, CROPS, BUILDINGS, ITEMS, N, CH, DAY_LEN, NPCS, WORKERS, WorkerKind,
  xpFor, FERT_COST, HOE_COST, CLEAR_COST, TECH_TREE, ACHIEVEMENTS, CONTRACTS,
  SEASONS, WEATHER_TYPES, WeatherType, Season, EVENT_TYPES, EventType,
  SKILLS, SkillItem,
} from "./data";

export type TileKind = "grass"|"soil"|"tree"|"rock"|"water"|"bld";
export interface Tile {
  k: TileKind; v: number; crop?: string; g?: number; wet?: boolean; fert?: boolean;
  b?: string; q?: number[]; p?: number; out?: string[]; lr?: number; autoMode?: boolean;
}
export interface Order { id: number; npc: number; items: { id: string; n: number }[]; coins: number; xp: number; repReward: number; exp: number; }
export interface ContractState { id: string; progress: number; claimed: boolean; }
export interface Worker { id: number; kind: WorkerKind; }
export interface State {
  v: 5; coins: number; xp: number; level: number; prestige: number;
  inv: Record<string, number>;
  tiles: Tile[]; chunks: boolean[]; bought: number;
  time: number; day: number; seasonIndex: number;
  weather: WeatherType; weatherLeft: number;
  currentEvent: { type: EventType; endsAt: number; text: string } | null;
  market: Record<string, { sat: number; hist: number[]; ph: number }>;
  orders: Order[]; nextId: number; workers: Worker[];
  rep: number; techs: string[]; skills: string[];
  achievements: Record<string, boolean>; contracts: ContractState[];
  stats: { earned: number; harvested: number; orders: number; produced: number; spent: number; animals: number; decorations: number; skillPoints: number; };
  story: { name: string; chapter: number; phase: "scenes"|"goal"|"end"; sceneIdx: number; done: boolean; shown: boolean; completed: string[] };
  savedAt: number; wAcc: number; histAcc: number; eventAcc: number;
}

export function newStoryState() {
  return { name: "", chapter: 0, phase: "scenes" as const, sceneIdx: 0, done: false, shown: true, completed: [] as string[] };
}

/**
 * Generates a large natural island: one big contiguous lake, a river flowing to
 * the sea, beaches, forest clusters and rocky highlands. Land is plentiful.
 */
function generateMap(): Tile[] {
  const tiles: Tile[] = [];
  const cx = (N - 1) / 2, cy = (N - 1) / 2;
  const noise = (x: number, y: number, f: number, ph: number) =>
    Math.sin(x * f + ph) * Math.cos(y * f * 1.3 + ph * 0.7) * 0.5 +
    Math.sin((x + y) * f * 0.6 + ph * 1.9) * 0.5;

  // Inherited farm stays dry: everything inside this box is protected from water
  const sx0 = Math.floor(N / 2) - 3, sy0 = Math.floor(N / 2) - 3;
  const inStart = (x: number, y: number, pad: number) =>
    x >= sx0 - pad && x < sx0 + 7 + pad && y >= sy0 - pad && y < sy0 + 7 + pad;

  // --- One single inland lake (north-east), built as a union of overlapping blobs
  const lakeX = cx + N * 0.115, lakeY = cy - N * 0.135, lakeR = N * 0.062;
  const lakeBlobs = [
    { x: 0, y: 0, r: 1.0 }, { x: 0.85, y: 0.2, r: 0.8 }, { x: -0.7, y: 0.45, r: 0.72 },
    { x: 0.25, y: -0.8, r: 0.68 }, { x: -0.4, y: -0.55, r: 0.6 }, { x: 1.25, y: -0.25, r: 0.5 },
  ];
  const inLake = (x: number, y: number) =>
    lakeBlobs.some((b) => Math.hypot(x - (lakeX + b.x * lakeR), y - (lakeY + b.y * lakeR)) < b.r * lakeR);

  // --- A river that carries the lake eastwards to the sea (never through the farm)
  const riverPts: { x: number; y: number; r: number }[] = [];
  {
    let rx = lakeX + lakeR * 1.1, ry = lakeY + lakeR * 0.15;
    for (let i = 0; i < 200; i++) {
      riverPts.push({ x: rx, y: ry, r: i < 12 ? 2.1 : 1.45 });
      rx += 0.5;
      ry += 0.16 + Math.sin(i * 0.22) * 0.22;
      if (rx > N + 2 || ry > N + 2 || ry < -2) break;
    }
  }
  const inRiver = (x: number, y: number) => riverPts.some((p) => Math.hypot(x - p.x, y - p.y) < p.r);

  // --- Rocky highland in the south-west
  const hillX = cx - N * 0.24, hillY = cy + N * 0.24, hillR = N * 0.13;

  const coastR = N * 0.40;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const d = Math.hypot(x - cx, y - cy);
      const coast = coastR + noise(x, y, 0.42, 3.1) * 1.6 + noise(x, y, 1.05, 7.7) * 0.75;
      if (d > coast) { tiles.push({ k: "water", v: 0.1 + Math.random() * 0.3 }); continue; }
      if ((inLake(x, y) || inRiver(x, y)) && !inStart(x, y, 1)) {
        tiles.push({ k: "water", v: 0.6 + Math.random() * 0.35 });
        continue;
      }
      const beach = d > coast - 1.5;
      const n = noise(x, y, 0.9, 12.3);
      const hillD = Math.hypot(x - hillX, y - hillY);
      if (!beach && !inStart(x, y, 0) && hillD < hillR * (0.55 + 0.45 * Math.abs(n))) {
        tiles.push({ k: Math.random() < 0.55 ? "rock" : "grass", v: Math.random() });
        continue;
      }
      const forest = noise(x, y, 0.3, 5.5);
      if (!beach && !inStart(x, y, 0) && forest > 0.4 && Math.random() < 0.75) {
        tiles.push({ k: "tree", v: Math.random() });
        continue;
      }
      if (!beach && Math.random() < 0.03) { tiles.push({ k: "rock", v: Math.random() }); continue; }
      tiles.push({ k: "grass", v: beach ? 0.04 + Math.random() * 0.08 : Math.random() });
    }
  }

  // --- De-fragment inland water: fill puddles smaller than 24 tiles so lakes stay whole
  {
    const seen = new Array(N * N).fill(false);
    for (let i = 0; i < N * N; i++) {
      if (seen[i] || tiles[i].k !== "water" || tiles[i].v < 0.5) continue;
      const comp: number[] = [];
      const stack = [i];
      seen[i] = true;
      while (stack.length) {
        const cur = stack.pop()!;
        comp.push(cur);
        const x = cur % N, y = Math.floor(cur / N);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
          const j = ny * N + nx;
          if (!seen[j] && tiles[j].k === "water") { seen[j] = true; stack.push(j); }
        }
      }
      if (comp.length < 24) for (const j of comp) tiles[j] = { k: "grass", v: Math.random() };
    }
  }

  // --- Starter clearing: the inherited farm is always usable
  for (let y = sy0; y < sy0 + 7; y++) {
    for (let x = sx0; x < sx0 + 7; x++) {
      if (x < 0 || y < 0 || x >= N || y >= N) continue;
      const i = idx(x, y);
      if (tiles[i].k === "water") continue;
      tiles[i] = { k: "grass", v: Math.random() };
    }
  }
  for (let y = sy0 + 1; y <= sy0 + 3; y++) for (let x = sx0 + 1; x <= sx0 + 4; x++) tiles[idx(x, y)] = { k: "soil", v: Math.random() };
  tiles[idx(sx0 + 2, sy0 + 2)] = { k: "soil", v: 0.3, crop: "wheat", g: 0.95 };
  tiles[idx(sx0 + 3, sy0 + 2)] = { k: "soil", v: 0.3, crop: "wheat", g: 1 };
  tiles[idx(sx0 + 2, sy0 + 3)] = { k: "soil", v: 0.3, crop: "carrot", g: 0.7 };
  tiles[idx(sx0 + 3, sy0 + 3)] = { k: "soil", v: 0.3, crop: "carrot", g: 1 };
  if (tiles[idx(sx0 + 5, sy0 + 4)].k !== "water") tiles[idx(sx0 + 5, sy0 + 4)] = { k: "bld", v: 0.5, b: "coop", q: [], p: 0, out: [], autoMode: true };
  return tiles;
}
export interface Fx { kind: "text"|"leaf"|"spark"|"water"|"coin"; x: number; y: number; vx: number; vy: number; life: number; max: number; text?: string; icon?: string; color: string; }
export interface Events { toast: (m: string, t?: "ok"|"err"|"lvl"|"prestige") => void; fx: (gx: number, gy: number, text: string, color?: string, burst?: string) => void; sound: (k: string) => void; }

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const idx = (x: number, y: number) => y * N + x;
export const chunkOf = (x: number, y: number) => Math.floor(y / CH) * Math.ceil(N / CH) + Math.floor(x / CH);
export const locked = (s: State, x: number, y: number) => !s.chunks[chunkOf(x, y)];
const NCH = Math.ceil(N / CH);

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
  Object.keys(ITEMS).forEach((k) => { for (let i = 0; i < 20; i++) s.market[k].hist.push(price(s, k)); });
  return s;
}

export const capacity = (s: State): number => {
  let b = 120;
  b += s.tiles.filter((t) => t.b === "silo").length * 120;
  if (s.techs.includes("storage1")) b += 100;
  if (s.techs.includes("storage2")) b += 250;
  if (s.techs.includes("mega_silo")) b += 600;
  if (s.skills.includes("storage_master")) b += 150;
  b += s.prestige * 140;
  return b;
};
export const invCount = (s: State) => Object.values(s.inv).reduce((a, b) => a + b, 0);
export const has = (s: State, inp: Record<string, number>) => Object.entries(inp).every(([k, n]) => (s.inv[k] || 0) >= n);
export const countB = (s: State, id: string) => s.tiles.filter((t) => t.b === id).length;
export const hasTech = (s: State, id: string) => s.techs.includes(id);
export const hasSkill = (s: State, id: string) => s.skills.includes(id);

export function price(s: State, id: string): number {
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
  if (s.currentEvent?.type === "market_boom") bonus *= 1.35;
  if (s.currentEvent?.type === "fair") bonus *= 1.25;
  if (s.currentEvent?.type === "livestock_show") {
    const dItems = ["egg","milk","wool","pork","honey","butter","cheese","sausage","sweater"];
    if (dItems.includes(id)) bonus *= 1.5;
  }
  const pm = 1 + s.prestige * 0.15;
  return Math.max(1, Math.round(base * wave * Math.max(0.35, 1 - m.sat) * bonus * pm));
}

export function unlockedItems(s: State): string[] {
  const out: string[] = CROPS.filter((c) => c.lvl <= s.level).map((c) => c.id);
  BUILDINGS.forEach((b) => { if (countB(s, b.id) > 0) b.recipes.forEach((r) => out.push(r.out)); });
  return Array.from(new Set(out));
}

export function genOrder(s: State): Order {
  const pool = unlockedItems(s);
  const nItems = Math.min(pool.length, 1 + Math.floor(Math.random() * Math.min(4, 1 + s.level / 2)));
  const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, nItems);
  const items = picked.map((id) => ({ id, n: Math.max(1, Math.round(rnd(1, (ITEMS[id]?.base || 10) < 30 ? 6 : 3) + s.level / 2)) }));
  const val = items.reduce((a, it) => a + (ITEMS[it.id]?.base || 10) * it.n, 0);
  let m = 1.3 + s.rep * 0.012 + Math.random() * 0.2;
  if (hasTech(s, "order_bonus")) m += 0.25;
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
  s.xp += Math.round(n * m);
  let lvlGained = 0;
  while (s.xp >= xpFor(s.level)) {
    s.xp -= xpFor(s.level);
    s.level++;
    lvlGained++;
    s.stats.skillPoints += 1;
    const unl = [
      ...CROPS.filter((c) => c.lvl === s.level).map((c) => c.icon + " " + c.name),
      ...BUILDINGS.filter((b) => b.lvl === s.level).map((b) => b.icon + " " + b.name),
    ];
    ev.toast(`🎉 سطح ${s.level}! ${unl.length ? "باز شد: " + unl.join("، ") : ""}`, "lvl");
    ev.sound("lvl");
    const bonus = s.level * 45;
    s.coins += bonus;
    ev.toast(`🎁 پاداش پیشرفت: +${bonus.toLocaleString("fa-IR")} 🪙`, "ok");
  }
  if (lvlGained > 0 && s.stats.skillPoints > 0) {
    ev.toast(`🧠 امتیاز مهارت جدید: ${s.stats.skillPoints} امتیاز در دسترس است (کلید K)`, "lvl");
  }
  checkAchievements(s, ev);
}

export function addInv(s: State, id: string, n: number): number {
  const room = capacity(s) - invCount(s);
  const a = Math.min(room, n);
  if (a > 0) s.inv[id] = (s.inv[id] || 0) + a;
  return a;
}

export function harvest(s: State, x: number, y: number, ev: Events, silent = false): boolean {
  const t = s.tiles[idx(x, y)];
  if (!t.crop || (t.g || 0) < 1) return false;
  const c = CMAP[t.crop]; if (!c) return false;
  let extra = (t.fert ? 2 : 0) + (s.currentEvent?.type === "bountiful_harvest" ? 1 : 0);
  if (hasTech(s, "greenhouse_tech")) extra += 1;
  if (hasSkill(s, "harvest_god")) extra += 1;
  if (Math.random() < 0.2) extra += 1;
  const n = c.yield + extra;
  const got = addInv(s, c.id, n);
  if (got === 0) { if (!silent) ev.toast("انبار پر است! محصولات را بفروشید یا سیلو بسازید", "err"); return false; }
  s.stats.harvested += got;
  ev.fx(x, y, `+${got} ${c.icon}`, "#fff", c.color);
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
  if (!silent) { ev.fx(x, y, `-${seedCost}🪙`, "#ffd54f", c.leaf); ev.sound("plant"); }
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
    ev.fx(x, y, `+1 ${ITEMS[id]?.icon || "📦"}`, "#fff", "#ffe082");
  }
  if (any && !silent) ev.sound("coin");
  return any;
}

export function queueRecipe(s: State, t: Tile, ri: number, ev: Events, silent = false): boolean {
  const b = BMAP[t.b!]; if (!b) return false;
  const r = b.recipes[ri]; if (!r) return false;
  const maxQ = 3 + Math.floor(s.level / 4) + (hasTech(s, "auto_feed") ? 2 : 0);
  if ((t.q?.length || 0) >= maxQ) { if (!silent) ev.toast("صف تولید این کارگاه پر است", "err"); return false; }
  if (!has(s, r.inp)) { if (!silent) ev.toast("مواد اولیه کافی در انبار نیست", "err"); return false; }
  Object.entries(r.inp).forEach(([k, n]) => (s.inv[k] -= n));
  t.q = [...(t.q || []), ri]; t.lr = ri;
  if (!silent) ev.sound("plant");
  return true;
}

export function sell(s: State, id: string, n: number, ev: Events) {
  n = Math.min(n, s.inv[id] || 0);
  if (n <= 0) return;
  let total = 0;
  for (let i = 0; i < n; i++) {
    total += price(s, id);
    if (!s.market[id]) s.market[id] = { sat: 0, hist: [], ph: Math.random() * 6 };
    s.market[id].sat = Math.min(0.65, s.market[id].sat + 0.02);
  }
  s.inv[id] -= n; s.coins += total; s.stats.earned += total;
  addXp(s, Math.max(1, Math.round(total / 50)), ev);
  updateContract(s, "coins", total, ev);
  ev.toast(`فروش ${n} ${ITEMS[id]?.name || id}: +${total.toLocaleString("fa-IR")} 🪙`, "ok");
  ev.sound("coin");
}

export function fulfill(s: State, oi: number, ev: Events) {
  const o = s.orders[oi]; if (!o) return;
  if (!o.items.every((it) => (s.inv[it.id] || 0) >= it.n)) { ev.toast("اقلام سفارش آماده تحویل نیست", "err"); return; }
  o.items.forEach((it) => (s.inv[it.id] -= it.n));
  s.coins += o.coins; s.stats.earned += o.coins; s.stats.orders++;
  s.rep = Math.min(100, s.rep + o.repReward);
  addXp(s, o.xp, ev);
  updateContract(s, "orders", 1, ev);
  ev.toast(`🚚 سفارش ${NPCS[o.npc]?.n || "مشتری"} تحویل شد: +${o.coins.toLocaleString("fa-IR")} 🪙`, "ok");
  ev.sound("lvl");
  s.orders[oi] = genOrder(s);
}

export const expandCost = (s: State) => Math.round(500 * Math.pow(1.15, s.bought));

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
    ev.toast("🗺️ قطعه زمین جدید با موفقیت خریداری شد!", "lvl"); ev.sound("lvl"); return;
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
        ev.toast(`🌱 ${CMAP[t.crop]?.name || "گیاه"}: ${pct}% رشد کرده است ${t.wet ? "💧 آبیاری شده" : "⚠️ تشنه آبیاری"}`);
      }
      return;
    }
    if (t.k === "soil") {
      ev.toast("خاک آماده کاشت است. ابزار بذر (کلید ۲) را انتخاب کنید.");
      return;
    }
    if (t.k === "grass") {
      ev.toast("زمین چمن است. با بیل/شخم (کلید ۵) آن را به خاک کشاورزی تبدیل کنید.");
      return;
    }
    if (t.k === "tree" || t.k === "rock") {
      ev.toast("برای پاکسازی موانع از تبر/کلنگ (کلید ۷) استفاده کنید.");
      return;
    }
    return;
  }

  // 2. SEED TOOL: Only plants on tilled soil without a crop. Never clears grass, never harvests.
  if (tool === "seed") {
    if (t.k !== "soil") {
      ev.toast("بذر فقط روی خاک شخم‌خورده کاشته می‌شود! ابتدا با بیل (کلید ۵) شخم بزنید.", "err");
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
      ev.toast("این خاک هنوز خیس و مرطوب است.");
      return;
    }
    t.wet = true;
    ev.fx(x, y, "💧", "#b3e5fc", "#4fc3f7"); ev.sound("water");
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
    ev.fx(x, y, "✨+۲", "#fff59d", "#aed581"); ev.sound("plant");
    return;
  }

  // 6. CLEAR TOOL: Strictly for cutting trees, mining rocks, or removing buildings/soil.
  if (tool === "clear") {
    if (t.k === "tree" || t.k === "rock") {
      const c = CLEAR_COST[t.k];
      if (s.coins < c) { ev.toast("سکه کافی برای دستمزد پاکسازی ندارید", "err"); return; }
      s.coins -= c; s.stats.spent += c;
      ev.fx(x, y, "", "#fff", t.k === "tree" ? "#66bb6a" : "#9e9e9e");
      s.tiles[idx(x, y)] = { k: "grass", v: t.v }; addXp(s, 3, ev); ev.sound("dig");
      if (Math.random() < 0.35) addInv(s, t.k === "tree" ? "wood" : "stone", 1);
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
        s.coins += ref; ev.toast(`${b?.name || "ساختمان"} برچیده شد (+${ref} 🪙)`);
        s.tiles[idx(x, y)] = { k: "grass", v: t.v };
      }
      ev.sound("dig");
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
    ev.fx(x, y, `${b.icon} برپا شد`, "#fff", "#ffcc80"); ev.sound("build");
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
  ev.toast(`${w.icon} ${w.name} استخدام شد`, "ok"); ev.sound("coin");
}

export function unlockTech(s: State, id: string, ev: Events) {
  const t = TECH_TREE.find((x) => x.id === id);
  if (!t || s.techs.includes(id)) return;
  if (t.req && !s.techs.includes(t.req)) { ev.toast("ابتدا دانش پیش‌نیاز را بیاموزید", "err"); return; }
  if (s.coins < t.cost) { ev.toast("سکه کافی برای تحقیق ندارید", "err"); return; }
  s.coins -= t.cost; s.stats.spent += t.cost;
  s.techs.push(id);
  ev.toast(`🔬 تحقیق کامل شد: ${t.name}`, "lvl"); ev.sound("lvl");
}

export function learnSkill(s: State, id: string, ev: Events) {
  const sk = SKILLS.find((x) => x.id === id);
  if (!sk || s.skills.includes(id)) return;
  if (sk.req && !s.skills.includes(sk.req)) { ev.toast("ابتدا مهارت پیش‌نیاز را بیاموزید", "err"); return; }
  if (s.stats.skillPoints < sk.cost) { ev.toast(`امتیاز مهارت کافی ندارید (نیاز: ${sk.cost}، موجود: ${s.stats.skillPoints})`, "err"); return; }
  s.stats.skillPoints -= sk.cost;
  s.skills.push(id);
  if (id === "storage_master") ev.toast("📦 ظرفیت انبار +۱۵۰ واحد افزایش یافت", "ok");
  else if (id === "price_mind") ev.toast("💰 قیمت فروش تمامی کالاها +۱۰٪ شد", "lvl");
  else if (id === "harvest_god") ev.toast("🏆 محصول برداشتی در تمام مزارع +۱ افزایش یافت", "lvl");
  else ev.toast(`🧠 مهارت «${sk.name}» با موفقیت فراگرفته شد!`, "lvl");
  ev.sound("lvl");
}

export function claimContract(s: State, id: string, ev: Events) {
  const c = CONTRACTS.find((x) => x.id === id);
  const cs = s.contracts.find((x) => x.id === id);
  if (!c || !cs || cs.claimed || cs.progress < c.target) return;
  cs.claimed = true;
  s.coins += c.rewardCoins; s.rep = Math.min(100, s.rep + c.rewardRep); addXp(s, c.rewardXp, ev);
  ev.toast(`📜 پاداش قرارداد دولتی وصول شد: +${c.rewardCoins.toLocaleString("fa-IR")} 🪙`, "lvl"); ev.sound("lvl");
}

function updateContract(s: State, type: string, amount: number, _ev: Events) {
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
    if (ach.id === "level20" && s.level >= 25) ok = true;
    if (ach.id === "factory_master" && s.stats.produced >= 60) ok = true;
    if (ach.id === "land_baron" && s.bought >= 10) ok = true;
    if (ach.id === "automation_king" && countB(s, "harvester") + countB(s, "auto_planter") + countB(s, "auto_fertilizer") >= 5) ok = true;
    if (ach.id === "zoo" && countB(s, "coop")>0 && countB(s, "barn")>0 && countB(s, "sheep")>0 && countB(s, "pigpen")>0 && countB(s, "beehive")>0) ok = true;
    if (ach.id === "decorator" && s.stats.decorations >= 10) ok = true;
    if (ach.id === "skill_master" && s.skills.length >= 10) ok = true;
    if (ok) { s.achievements[ach.id] = true; s.coins += ach.reward; ev.toast(`🏆 دستاورد جدید: ${ach.title} (+${ach.reward}🪙)`, "lvl"); ev.sound("lvl"); }
  }
}

export function canPrestige(s: State) { return s.level >= 20 && s.coins >= 10000; }
export function doPrestige(s: State, ev: Events) {
  if (!canPrestige(s)) return;
  const prev = s.prestige;
  const fresh = newState();
  fresh.prestige = prev + 1;
  fresh.coins = 1000 * (prev + 1);
  fresh.stats.earned = s.stats.earned;
  fresh.stats.harvested = s.stats.harvested;
  fresh.stats.orders = s.stats.orders;
  fresh.stats.produced = s.stats.produced;
  fresh.stats.animals = s.stats.animals;
  fresh.stats.decorations = s.stats.decorations;
  fresh.stats.skillPoints = s.stats.skillPoints + 3;
  fresh.achievements = s.achievements;
  fresh.techs = s.techs;
  fresh.skills = s.skills;
  fresh.story = s.story;
  fresh.rep = s.rep;
  Object.assign(s, fresh);
  ev.toast(`👑 تناسخ مزرعه سطح ${prev+1}! ۳ امتیاز مهارت و ضرایب دائمی دریافت شد.`, "prestige"); ev.sound("lvl");
}

export function tick(s: State, dt: number, ev: Events) {
  const prevDay = Math.floor(s.time / DAY_LEN);
  s.time += dt;
  const day = Math.floor(s.time / DAY_LEN);
  if (day !== prevDay) {
    s.day = day + 1;
    s.seasonIndex = Math.floor((s.day - 1) / 5) % 4;
    let wage = s.workers.reduce((a, w) => a + WORKERS[w.kind].wage, 0);
    if (hasTech(s, "automation_tech")) wage = Math.round(wage * 0.85);
    if (wage) {
      if (s.coins >= wage) { s.coins -= wage; s.stats.spent += wage; ev.toast(`💼 حقوق روزانه کارکنان پرداخت شد: ${wage.toLocaleString("fa-IR")} 🪙`); }
      else { const w = s.workers.pop()!; ev.toast(`😞 ${WORKERS[w.kind].name} به دلیل عدم پرداخت حقوق استعفا داد`, "err"); }
    }
    const rand = Math.random();
    const sea = SEASONS[s.seasonIndex];
    if (sea.id === "winter") s.weather = rand < 0.5 ? "snow" : rand < 0.75 ? "fog" : "sun";
    else if (sea.id === "autumn") s.weather = rand < 0.45 ? "rain" : rand < 0.7 ? "fog" : "sun";
    else s.weather = rand < 0.3 ? "rain" : rand < 0.4 ? "heatwave" : "sun";
    s.weatherLeft = rnd(70, 160);
    if (s.weather !== "sun") {
      const n: Record<WeatherType, string> = { sun: "آفتابی", rain: "🌧️ باران ملایم", snow: "❄️ بارش برف", fog: "🌫️ مه صبحگاهی", heatwave: "🥵 موج گرما" };
      ev.toast(`تغییر هوا: ${n[s.weather]}`);
    }
  }
  if (s.weather !== "sun") { s.weatherLeft -= dt; if (s.weatherLeft <= 0) s.weather = "sun"; }
  s.eventAcc += dt;
  if (s.eventAcc > 120 && !s.currentEvent && Math.random() < 0.5) {
    s.eventAcc = 0;
    const ets: EventType[] = ["fair","market_boom","bountiful_harvest","livestock_show"];
    const pick = ets[Math.floor(Math.random() * ets.length)];
    const texts: Record<EventType, string> = {
      fair: "🎪 نمایشگاه بهاره دهکده! +۲۵٪ تقاضای محصولات",
      market_boom: "📈 رونق بزرگ بورس کالا! +۳۵٪ قیمت فروش",
      drought: "☀️ خشکسالی موقت در منطقه",
      bountiful_harvest: "🌾 جشن برکت زمین! +۱ محصول در درو",
      livestock_show: "🐎 نمایشگاه سالانه دام! +۵۰٪ قیمت کالاهای دامی",
    };
    s.currentEvent = { type: pick, endsAt: s.time + 120, text: texts[pick] };
    ev.toast(s.currentEvent.text, "lvl");
  }
  if (s.currentEvent && s.time >= s.currentEvent.endsAt) { s.currentEvent = null; ev.toast("رویداد فصلی دهکده به پایان رسید"); }
  const season = SEASONS[s.seasonIndex];
  let gMult = season.growthRate;
  if (s.currentEvent?.type === "bountiful_harvest") gMult *= 1.2;
  if (s.weather === "heatwave") gMult *= 0.9;
  if (s.weather === "snow") gMult *= 0.82;
  if (s.weather === "fog") gMult *= 0.95;
  if (hasSkill(s, "grow_master")) gMult *= 1.10;

  let autoR = 0;
  if (hasTech(s, "precision_agri")) autoR = 1;

  for (let i = 0; i < s.tiles.length; i++) {
    const t = s.tiles[i]; const x = i % N, y = Math.floor(i / N);
    if (s.weather === "rain" && t.k === "soil") t.wet = true;
    if (t.crop && (t.g || 0) < 1) {
      const c = CMAP[t.crop]; if (!c) continue;
      let sp = (dt / c.time) * gMult;
      if (t.wet) sp *= 1.8;
      if (t.fert) sp *= 1.2;
      if (hasTech(s, "greenhouse_tech")) sp *= 1.2;
      if (s.workers.some((w) => w.kind === "scientist")) sp *= 1.2;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x+dx, ny = y+dy;
        if (nx<0 || ny<0 || nx>=N || ny>=N) continue;
        const n = s.tiles[idx(nx, ny)];
        if (n.k === "bld" && n.b === "greenhouse") sp *= 1.25;
      }
      t.g = Math.min(1, (t.g||0) + sp);
    }
    if (t.k === "bld" && t.b) {
      const b = BMAP[t.b]; if (!b) continue;
      const r = (b.radius || 0) + autoR;
      if (t.b === "sprinkler" || t.b === "mega_sprinkler" || t.b === "well") {
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          const nx = x+dx, ny = y+dy;
          if (nx<0 || ny<0 || nx>=N || ny>=N) continue;
          if (Math.abs(dx)+Math.abs(dy) > r && t.b !== "mega_sprinkler") continue;
          const n = s.tiles[idx(nx, ny)];
          if (n.k === "soil") n.wet = true;
        }
      }
      if (t.b === "composter") {
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          const nx = x+dx, ny = y+dy;
          if (nx<0 || ny<0 || nx>=N || ny>=N) continue;
          if (Math.abs(dx)+Math.abs(dy) > r) continue;
          const n = s.tiles[idx(nx, ny)];
          if (n.k === "soil" && !n.fert && Math.random() < dt * 0.2) n.fert = true;
        }
      }
      if (t.b === "harvester") {
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          const nx = x+dx, ny = y+dy;
          if (nx<0 || ny<0 || nx>=N || ny>=N) continue;
          const n = s.tiles[idx(nx, ny)];
          if (n.crop && (n.g||0) >= 1 && invCount(s) < capacity(s)) harvest(s, nx, ny, ev, true);
        }
      }
      if (t.b === "auto_planter") {
        const cropsInInv = CROPS.filter((c) => (s.inv[c.id] || 0) > 0);
        if (cropsInInv.length > 0) {
          for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            const nx = x+dx, ny = y+dy;
            if (nx<0 || ny<0 || nx>=N || ny>=N) continue;
            const n = s.tiles[idx(nx, ny)];
            if (n.k === "soil" && !n.crop) {
              const cPick = cropsInInv[Math.floor(Math.random() * cropsInInv.length)].id as string;
              plant(s, nx, ny, cPick, ev, true);
            }
          }
        }
      }
      if (t.b === "auto_fertilizer") {
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          const nx = x+dx, ny = y+dy;
          if (nx<0 || ny<0 || nx>=N || ny>=N) continue;
          const n = s.tiles[idx(nx, ny)];
          if (n.k === "soil" && !n.fert && Math.random() < dt * 0.1) {
            if (s.coins >= Math.ceil(FERT_COST * 0.4)) { s.coins -= Math.ceil(FERT_COST * 0.4); s.stats.spent += Math.ceil(FERT_COST * 0.4); n.fert = true; }
          }
        }
      }
      if (b.recipes.length && t.q && t.q.length && (t.out?.length || 0) < 6) {
        const rIndex = t.q[0];
        const r = b.recipes[rIndex]; if (!r) continue;
        let timeR = r.time;
        if (hasTech(s, "speed_ovens")) timeR *= 0.75;
        if (hasSkill(s, "artisan")) timeR *= 0.85;
        if (s.workers.some((w) => w.kind === "vet") && b.recipes.some((rr) => ["egg","milk","wool","pork","honey","butter","cheese","sausage","sweater","feed"].includes(rr.out))) timeR *= 0.85;
        timeR *= (1 + s.prestige * 0.05);
        t.p = (t.p||0) + dt / timeR;
        if (t.p >= 1) {
          t.out = [...(t.out||[]), r.out];
          t.q = t.q.slice(1); t.p = 0;
          addXp(s, r.xp, ev);
          if (t.autoMode && t.lr !== undefined && has(s, b.recipes[t.lr].inp)) queueRecipe(s, t, t.lr, ev, true);
        }
      }
    }
  }
  Object.values(s.market).forEach((m) => (m.sat = Math.max(0, m.sat - dt * 0.0035)));
  s.histAcc += dt;
  if (s.histAcc > 7) {
    s.histAcc = 0;
    Object.keys(s.market).forEach((k) => { const h = s.market[k].hist; h.push(price(s, k)); if (h.length > 40) h.shift(); });
  }
  s.orders = s.orders.map((o) => (o.exp < s.time ? genOrder(s) : o));
  const maxOrders = Math.min(7, 3 + Math.floor(s.level / 3));
  while (s.orders.length < maxOrders) s.orders.push(genOrder(s));
  s.wAcc += dt;
  while (s.wAcc > 2.2) {
    s.wAcc -= 2.2;
    for (const w of s.workers) {
      if (w.kind === "farmhand") {
        for (let a = 0; a < 3; a++) {
          const i = s.tiles.findIndex((t, j) => t.crop && (t.g||0) >= 1 && !locked(s, j % N, Math.floor(j / N)));
          if (i >= 0) { const crop = s.tiles[i].crop!; const x = i % N, y = Math.floor(i / N); if (harvest(s, x, y, ev, true)) plant(s, x, y, crop, ev, true); }
          const d = s.tiles.find((t) => t.crop && !t.wet); if (d) d.wet = true;
        }
      } else if (w.kind === "operator") {
        s.tiles.forEach((t, i) => {
          if (t.k !== "bld") return;
          if (t.out?.length) collect(s, t, i % N, Math.floor(i / N), ev, true);
          if ((t.q?.length || 0) === 0 && t.lr !== undefined && BMAP[t.b!].recipes[t.lr]) queueRecipe(s, t, t.lr, ev, true);
        });
      }
    }
  }
}

export function migrate(d: unknown): State | null {
  const raw = d as Record<string, unknown>;
  if (!raw || raw.v !== 5 || !Array.isArray(raw.tiles) || raw.tiles.length !== N * N) return null;
  const s = raw as unknown as State;
  if (s.v !== 5) return null;
  Object.keys(ITEMS).forEach((k) => { if (!s.market[k]) s.market[k] = { sat: 0, hist: [], ph: Math.random() * 6 }; });
  if (!s.contracts) s.contracts = CONTRACTS.map((c) => ({ id: c.id, progress: 0, claimed: false }));
  if (!s.achievements) s.achievements = {};
  if (!s.techs) s.techs = [];
  if (!s.skills) s.skills = [];
  if (!s.stats) s.stats = { earned:0, harvested:0, orders:0, produced:0, spent:0, animals:0, decorations:0, skillPoints:0 };
  if (!s.currentEvent) s.currentEvent = null;
  if (!s.eventAcc) s.eventAcc = 0;
  if (!s.story) s.story = newStoryState();
  if (!Array.isArray(s.story.completed)) s.story.completed = [];
  return s;
}
