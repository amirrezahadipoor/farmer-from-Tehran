/**
 * src/game/sim/lineage.ts — متغیرهای داستانیِ بینِ نسل‌ها (P6.4)
 *
 * هر تناسخ یک «وارث» می‌سازد و این‌ها را از نسلِ قبل به داستانِ نسلِ تازه می‌برد:
 *  • نامِ بنیان‌گذار (بازیکنِ نسلِ اول) و زنجیره‌ی نام‌ها: رحیم، بنیان‌گذار، وارث‌ها
 *  • نامِ کسی که کلید را سپرد و سبکِ کارش (کشاورز، بازرگان، صنعتگر، آبادگر) —
 *    از روی آمارِ واقعیِ همان نسل، نه انتخابِ دستی
 *  • عددهای همان نسل (روز، برداشت، سفارش، تولید، دکور) که در متنِ فصل گفته می‌شوند
 * ماشینِ حالتِ فصل (نام ← صحنه‌ها ← هدف ← پایان) این‌جاست؛ متنِ فصل در lineageStory.ts.
 */
import type { State } from "./state";
import { stripEmoji } from "../noEmoji";

export type Trait = "farmer" | "merchant" | "artisan" | "builder";
export const TRAITS: Trait[] = ["farmer", "merchant", "artisan", "builder"];
export const TRAIT_NAME: Record<Trait, string> = { farmer: "کشاورز", merchant: "بازرگان", artisan: "صنعتگر", builder: "آبادگر" };

/** کارنامه‌ی نسلی که تمام شد */
export interface GenDeltas {
  days: number;
  harvested: number;
  orders: number;
  produced: number;
  decorations: number;
  earned: number;
}
export interface Heir extends GenDeltas {
  /** نسلی که این وارث قهرمانش است (۱ = نسلِ دوم) */
  gen: number;
  name: string;
  /** سبکِ نسلِ قبل که به وارث سپرده شد */
  trait: Trait;
}
export type LineagePhase = "name" | "scenes" | "goal" | "end" | "done";
export interface LineageState {
  founder: string;
  heirs: Heir[];
  phase: LineagePhase;
  sceneIdx: number;
  shown: boolean;
  /** مقدارِ آمار در آغازِ هدف (پیشرفت = تفاضل) */
  goalBase: number;
  completed: number[];
}

export const HEIR_NAMES = ["مهسا", "آرش", "نیلوفر", "کاوه", "پرستو", "بردیا", "ترانه", "سهراب", "شیرین", "بهرام"];
export const suggestHeirName = (gen: number) => HEIR_NAMES[(Math.max(1, gen) - 1) % HEIR_NAMES.length];
export const MAX_NAME = 16;

/** سبکِ یک نسل: هر کدام از چهار کار (مقیاس‌شده) بیشتر بود؛ برابری = کشاورز */
export function traitOf(d: GenDeltas): Trait {
  const score: [Trait, number][] = [
    ["farmer", d.harvested / 120],
    ["merchant", d.orders / 6],
    ["artisan", d.produced / 25],
    ["builder", d.decorations / 3],
  ];
  let best = score[0];
  for (const x of score) if (x[1] > best[1]) best = x;
  return best[0];
}

/** با هر تناسخ: وارثِ تازه با سبک و کارنامه‌ی نسلِ قبل؛ فصلش با پرسیدنِ نام آغاز می‌شود */
export function beginLineage(s: State, d: GenDeltas) {
  const gen = s.prestige;
  const prev = s.lineage;
  const founder = prev?.founder || s.story.name || "کشاورز";
  const heirs = (prev?.heirs ?? []).filter((h) => h.gen < gen);
  heirs.push({ gen, name: "", trait: traitOf(d), ...d });
  s.lineage = { founder, heirs: heirs.slice(-50), phase: "name", sceneIdx: 0, shown: true, goalBase: 0, completed: prev?.completed ?? [] };
}

export const currentHeir = (s: State): Heir | null => s.lineage?.heirs.find((h) => h.gen === s.prestige) ?? null;

/** نامِ کسی که کلید را به وارثِ فعلی سپرد */
export function prevName(s: State): string {
  const L = s.lineage;
  if (!L) return "";
  const h = currentHeir(s);
  const before = L.heirs.filter((x) => x.gen < (h?.gen ?? Infinity) && x.name);
  return before.length ? before[before.length - 1].name : L.founder;
}

/** زنجیره‌ی نام‌ها از رحیم تا وارثِ فعلی */
export function lineageChain(s: State): string[] {
  const L = s.lineage;
  if (!L) return [];
  return ["رحیم", L.founder, ...L.heirs.filter((h) => h.name).map((h) => h.name)];
}

/** «الف، ب، پ و ت» */
export function joinFa(list: string[]): string {
  if (list.length <= 1) return list.join("");
  return `${list.slice(0, -1).join("، ")} و ${list[list.length - 1]}`;
}

export function nameHeir(s: State, name: string) {
  const h = currentHeir(s);
  if (!h || !s.lineage) return;
  h.name = stripEmoji(name).slice(0, MAX_NAME) || suggestHeirName(h.gen);
  s.lineage.phase = "scenes";
  s.lineage.sceneIdx = 0;
  s.lineage.shown = true;
}

export function setLineageShown(s: State, v: boolean) {
  if (s.lineage) s.lineage.shown = v && s.lineage.phase !== "goal" && s.lineage.phase !== "done";
}

/* ------------------------------------------------------------ سیو */
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const n = (x: unknown, max = 1e15) => (Number.isFinite(Number(x)) ? Math.min(max, Math.max(0, Math.round(Number(x)))) : 0);
const PHASES: LineagePhase[] = ["name", "scenes", "goal", "end", "done"];
const cleanName = (v: unknown) => (typeof v === "string" ? stripEmoji(v).slice(0, MAX_NAME) : "");

export function normalizeLineage(raw: unknown): LineageState | undefined {
  if (!isObj(raw) || !Array.isArray(raw.heirs)) return undefined;
  const heirs: Heir[] = raw.heirs
    .filter(isObj)
    .map((h) => ({
      gen: Math.max(1, n(h.gen, 999)),
      name: cleanName(h.name),
      trait: TRAITS.includes(h.trait as Trait) ? (h.trait as Trait) : "farmer",
      days: n(h.days, 1e6),
      harvested: n(h.harvested),
      orders: n(h.orders),
      produced: n(h.produced),
      decorations: n(h.decorations, 1e6),
      earned: n(h.earned),
    }))
    .slice(-50);
  return {
    founder: cleanName(raw.founder) || "کشاورز",
    heirs,
    phase: PHASES.includes(raw.phase as LineagePhase) ? (raw.phase as LineagePhase) : "done",
    sceneIdx: n(raw.sceneIdx, 99),
    shown: raw.shown === true,
    goalBase: n(raw.goalBase),
    completed: Array.isArray(raw.completed) ? [...new Set(raw.completed.map((x) => n(x, 999)))].slice(-50) : [],
  };
}
