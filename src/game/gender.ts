/**
 * src/game/gender.ts — خطاب و چهره‌ی قهرمان به انتخابِ بازیکن (نقشه‌ی راه، مورد ۷)
 *
 * فارسی ضمیرِ جنسیتی ندارد؛ فقط چند خطاب (پسرم، پسرجان، پسرِ رحیم) جنسیتی بودند. متنِ داستان به‌جای آن‌ها
 * نشانه دارد و هنگامِ نمایش با انتخابِ بازیکن پر می‌شود. پیش‌فرض خنثی است.
 */
export type Gender = "m" | "f" | "n";

export const GENDERS: { id: Gender; label: string }[] = [
  { id: "f", label: "زن" },
  { id: "m", label: "مرد" },
  { id: "n", label: "ترجیح می‌دهم نگویم" },
];

export const GENDER_WORDS: Record<string, Record<Gender, string>> = {
  "{child}": { m: "پسرم", f: "دخترم", n: "فرزندم" },
  "{childJan}": { m: "پسرجان", f: "دخترجان", n: "جوان" },
  "{rahimChild}": { m: "پسرِ رحیم", f: "دخترِ رحیم", n: "یادگارِ رحیم" },
};

export const asGender = (v: unknown): Gender => (v === "m" || v === "f" || v === "n" ? v : "n");

export function genderize(text: string, g: Gender): string {
  let t = text;
  for (const [token, words] of Object.entries(GENDER_WORDS)) t = t.split(token).join(words[g]);
  return t;
}

/** چهره‌ی قهرمان: «hero» جوان و «hero_old» صحنه‌ی آخر، هر کدام به انتخابِ بازیکن */
export function heroAvatar(av: string, g: Gender): string {
  if (av === "hero") return g === "f" ? "hero_f" : g === "n" ? "hero_n" : "hero";
  if (av === "hero_old") return `hero_old_${g}`;
  return av;
}
