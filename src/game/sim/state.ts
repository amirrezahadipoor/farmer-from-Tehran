/**
 * src/game/sim/state.ts — انواع وضعیت، نقشه‌ی اولیه، کمکی‌های خالص و قواعد ثابت
 * (P5.11: logic.ts به چهار ماژول ≤ ۴۰۰ خط شکسته شد؛ همه از مسیر "./logic" صادر می‌شوند)
 */
import { ITEMS, N, CH, WorkerKind, CONTRACTS, WeatherType, EventType } from "../data";
import { stripEmoji } from "../noEmoji";
import type { Gender } from "../gender";
export type TileKind = "grass"|"soil"|"tree"|"rock"|"water"|"bld";
export interface Tile {
  k: TileKind; v: number; crop?: string; g?: number; wet?: boolean; fert?: boolean;
  /** ثانیه‌های باقی‌مانده‌ی رطوبت (P5.6): خاک بعد از WATER_SECONDS ثانیه خشک می‌شود */
  dry?: number;
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
  story: { name: string; gender: Gender; chapter: number; phase: "scenes"|"goal"|"end"; sceneIdx: number; done: boolean; shown: boolean; completed: string[] };
  savedAt: number; wAcc: number; histAcc: number; eventAcc: number;
  /** V.7: روزِ آخرین پاداشِ اولین برداشت */
  bonusDay?: number;
  /** V.5: فستیوال فصلی دهکده */
  fest?: { idx: number; day: number; choice: "invest" | "feast" | "rest" | null };
  /** تجربه‌ی کسریِ انبارشده — XP فقط تابع «ارزش» است نه تعداد کلیک (P5.7) */
  xpAcc?: number;
  /** اهداف روزانه/هفتگی، زنجیره و نشان‌ها (P6.2) — با اولین تیکِ روز ساخته می‌شود */
  quests?: import("./quests").QuestState;
  /** شجره‌نامه: کارنامه‌ی نسل‌های گذشته (P6.3) */
  generations?: import("./legacy").GenerationRecord[];
  /** داستانِ نسل‌ها: بنیان‌گذار، وارث‌ها و فصلِ نسلِ جاری (P6.4) */
  lineage?: import("./lineage").LineageState;
}

export function newStoryState() {
  return { name: "", gender: "n" as Gender, chapter: 0, phase: "scenes" as const, sceneIdx: 0, done: false, shown: true, completed: [] as string[] };
}

/**
 * Generates a large natural island: one big contiguous lake, a river flowing to
 * the sea, beaches, forest clusters and rocky highlands. Land is plentiful.
 */
export function generateMap(): Tile[] {
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
  // P6.5: «آب است؟» یک بار برای همسایگیِ کوچکِ هر حباب/نقطه حساب می‌شود، نه با some(Math.hypot) روی همه‌ی
  // نقطه‌های رود برای هر کاشی: اولین اجرای سرد در مرورگر (بارِ اولِ بازیکنِ تازه) ≈ ۲۵ms فقط صرفِ همین بود.
  // همان شرطِ hypot < r روی همان خانه‌ها و بی‌هیچ Math.random ⇒ نقشه‌ی تولیدی بیت‌به‌بیت همان است.
  const wet = new Uint8Array(N * N);
  const markWet = (px: number, py: number, r: number) => {
    const x0 = Math.max(0, Math.floor(px - r)), x1 = Math.min(N - 1, Math.ceil(px + r));
    const y0 = Math.max(0, Math.floor(py - r)), y1 = Math.min(N - 1, Math.ceil(py + r));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (Math.hypot(x - px, y - py) < r) wet[y * N + x] = 1;
  };
  for (const b of lakeBlobs) markWet(lakeX + b.x * lakeR, lakeY + b.y * lakeR, b.r * lakeR);
  for (const p of riverPts) markWet(p.x, p.y, p.r);

  // --- Rocky highland in the south-west
  const hillX = cx - N * 0.24, hillY = cy + N * 0.24, hillR = N * 0.13;

  const coastR = N * 0.40;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const d = Math.hypot(x - cx, y - cy);
      const coast = coastR + noise(x, y, 0.42, 3.1) * 1.6 + noise(x, y, 1.05, 7.7) * 0.75;
      if (d > coast) { tiles.push({ k: "water", v: 0.1 + Math.random() * 0.3 }); continue; }
      if (wet[y * N + x] && !inStart(x, y, 1)) {
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
export interface Fx { kind: "text"|"leaf"|"spark"|"water"|"coin"|"ring"; x: number; y: number; vx: number; vy: number; life: number; max: number; text?: string; icon?: string; color: string; }
/** همه‌ی جلوه‌های صوتی بازی (P5.12) — هر کلید در src/game/sound/sfx.ts دستورِ سنتزِ خودش را دارد */
export const SFX_KEYS = [
  "click", "tap", "err", "swoosh", "page", "start",
  "harvest", "plant", "water", "fert", "dig", "chop", "rock", "build", "demolish", "collect",
  "coin", "sell", "order", "contract", "expand", "hire",
  "unlock", "skill", "lvl", "achievement", "prestige", "chapter", "goal",
] as const;
export type SfxKey = (typeof SFX_KEYS)[number];

/**
 * پلِ منطق → نمایش. متن‌ها هرگز ایموجی ندارند؛ نماد با کلیدِ SVG جدا فرستاده می‌شود
 * («item:<id>» برای کالا، «ui:<name>» برای نمادهای رابط — icons.tsx).
 */
export interface Events {
  toast: (m: string, t?: "ok" | "err" | "lvl" | "prestige") => void;
  fx: (gx: number, gy: number, text: string, color?: string, burst?: string, icon?: string) => void;
  sound: (k: SfxKey) => void;
  /** V.3: جشنِ تمام‌صفحه (کاغذرنگی) برای سطح/دستاورد/تناسخ */
  celebrate?: (kind: "level" | "achievement" | "prestige") => void;
  /** V.3: لرزشِ ملایم دوربین برای رویدادهای بزرگ (خشکسالی، تناسخ) */
  shake?: () => void;
  /** V.3: سکه‌های پرنده به قرصِ سکه‌ی HUD */
  coins?: (n: number) => void;
  /** V.6: آمدنِ مهمانِ سپاسگزار پس از تحویل سفارش */
  guest?: (npc: number) => void;
}

export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const idx = (x: number, y: number) => y * N + x;
export const chunkOf = (x: number, y: number) => Math.floor(y / CH) * Math.ceil(N / CH) + Math.floor(x / CH);
export const locked = (s: State, x: number, y: number) => !s.chunks[chunkOf(x, y)];
export const NCH = Math.ceil(N / CH);

export const capacity = (s: State): number => {
  let b = 120;
  b += countB(s, "silo") * 120;
  if (s.techs.includes("storage1")) b += 100;
  if (s.techs.includes("storage2")) b += 250;
  if (s.techs.includes("mega_silo")) b += 600;
  if (s.skills.includes("storage_master")) b += 150;
  b += s.prestige * 140;
  return b;
};
export const invCount = (s: State) => Object.values(s.inv).reduce((a, b) => a + b, 0);
export const has = (s: State, inp: Record<string, number>) => Object.entries(inp).every(([k, n]) => (s.inv[k] || 0) >= n);
/** شمارِ ساختمانِ یک نوع — حلقه‌ی ساده، بی‌ساختنِ آرایه‌ی میانی (پرتکرار در منطق و رابط؛ P6.5) */
export const countB = (s: State, id: string) => {
  let n = 0;
  for (const t of s.tiles) if (t.b === id) n++;
  return n;
};
export const hasTech = (s: State, id: string) => s.techs.includes(id);
export const hasSkill = (s: State, id: string) => s.skills.includes(id);

/** مدت رطوبت خاک پس از هر آبیاری (ثانیه) — P5.6 */
export const WATER_SECONDS = 90;
/** رطوبتی که باران به خاک می‌دهد (کوتاه‌تر از آبیاری دستی) */
export const RAIN_SECONDS = 45;
/** رطوبتی که هر پاشنده/چاه در شعاع خود نگه می‌دارد */
export const SPRINKLER_SECONDS = 22;
/** درخت/سنگِ پاکسازی‌شده چند الوار/سنگ می‌دهد (+۱ با شانس ۳۰٪) */
export const CLEAR_YIELD = 2;
/** خشکسالی (رویداد تابستان): خشک‌شدن ۲ برابر، بی‌باران، رشدِ خاکِ خشک ×۰.۶، قیمت محصول +۲۰٪ */
export const DROUGHT = { dry: 2, dryGrowth: 0.6, price: 0.2 } as const;

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
  if (typeof s.xpAcc !== "number" || !Number.isFinite(s.xpAcc)) s.xpAcc = 0;
  // سیوهای پیش از P5.16 ممکن است ایموجی در نام یا متنِ رویداد داشته باشند
  s.story.name = stripEmoji(String(s.story.name || ""));
  if (s.currentEvent && typeof s.currentEvent.text === "string") s.currentEvent.text = stripEmoji(s.currentEvent.text);
  return s;
}
