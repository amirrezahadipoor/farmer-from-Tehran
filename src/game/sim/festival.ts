/**
 * src/game/sim/festival.ts — V.5: فستیوال فصلی دهکده
 * روزِ اولِ هر فصل، دهکده فستیوال دارد و بازیکن یکی از سه راه را برمی‌گزیند:
 * سرمایه‌گذاری (قیمت فروش)، ضیافت (تجربه و اعتبار) یا آرامش (رشد محصولات).
 */
import type { State, Events } from "./state";
import { addXp } from "./economy";

export type FestChoice = "invest" | "feast" | "rest";

export const FEST_CHOICES: { id: FestChoice; name: string; cost: number; desc: string }[] = [
  { id: "invest", name: "سرمایه‌گذاری بازار", cost: 600, desc: "تا آخر فصل، قیمت فروش محصولات ۱۰٪ بیشتر می‌شود" },
  { id: "feast", name: "جشن و پذیرایی", cost: 250, desc: "همین حالا تجربه می‌گیری و اعتبار دهکده بالا می‌رود" },
  { id: "rest", name: "آرامش مزرعه", cost: 0, desc: "تا آخر فصل، رشد محصولات ۱۰٪ سریع‌تر می‌شود" },
];

/** آیا فستیوال با انتخابِ مشخص در فصل جاری فعال است؟ */
export const festActive = (s: State, choice: FestChoice) =>
  !!s.fest && s.fest.choice === choice && s.fest.idx === s.seasonIndex;

/** روز اول هر فصل، یک‌بار پیشنهاد فستیوال می‌دهد */
export function proposeFestival(s: State): boolean {
  if ((s.day - 1) % 5 !== 0) return false;
  if (s.fest && s.fest.idx === s.seasonIndex) return false;
  s.fest = { idx: s.seasonIndex, day: s.day, choice: null };
  return true;
}

/** بازیکن یکی از سه راه فستیوال را برمی‌گزیند */
export function holdFestival(s: State, choice: FestChoice, ev: Events): boolean {
  if (!s.fest || s.fest.choice !== null) return false;
  const def = FEST_CHOICES.find((c) => c.id === choice);
  if (!def) return false;
  if (s.coins < def.cost) {
    ev.toast("سکه برای این انتخاب کافی نیست!", "err");
    return false;
  }
  s.coins -= def.cost;
  if (def.cost) s.stats.spent += def.cost;
  if (choice === "feast") {
    addXp(s, 20 + s.level * 4, ev);
    s.rep += 5;
  }
  s.fest.choice = choice;
  ev.sound("goal");
  ev.celebrate?.("level");
  ev.toast(`فستیوال: ${def.name} — دهکده جشن گرفت`, "lvl");
  return true;
}
