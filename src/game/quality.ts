/**
 * src/game/quality.ts — کیفیتِ تصویر به انتخابِ بازیکن (فازِ B/T1 — بازخوردِ «بازی تار است»)
 *
 * سه حالت:
 *  • خودکار: حلقه‌ی بازی با adaptDpr رزولوشن را می‌سنجد (رفتارِ قبلی، با کفِ بالاتر)
 *  • تیز: قفل روی بیشینه‌ی دستگاه (تا ۲) — وضوحِ کامل، حتی اگر روی دستگاهِ ضعیف فریم بیفتد
 *  • روان: قفل روی ۰.۹ — پایدارتر روی دستگاه‌های ضعیف، همچنان نسبتاً شارپ
 *
 * انتخاب در localStorage می‌ماند و در آغازِ حلقه و از پنلِ تنظیمات اعمال می‌شود.
 * پیاده‌سازی روی همان rt.dprLock سوار است (قفلِ موجودِ حلقه) — بدونِ تغییر در مسیرِ رندر.
 */
import { readLS, writeLS } from "./persist";
import { rt } from "./store";

export type QualityMode = "auto" | "sharp" | "smooth";

const KEY = "farm_quality";

/** ردیف‌های پنلِ تنظیمات — برچسب همان aria-label است تا تست و صفحه‌خوان پیدایش کنند */
export const QUALITY_MODES: { id: QualityMode; name: string; hint: string }[] = [
  { id: "auto", name: "خودکار", hint: "بازی خودش تنظیم می‌کند" },
  { id: "sharp", name: "تیز", hint: "بیشترین رزولوشنِ دستگاه" },
  { id: "smooth", name: "روان", hint: "پایدار روی دستگاهِ ضعیف" },
];

/** ترجیحِ ذخیره‌شده؛ مقدارِ نامعتبر یا نبودِ آن = خودکار */
export const qualityPref = (): QualityMode => {
  const v = readLS(KEY);
  return v === "sharp" || v === "smooth" ? v : "auto";
};

/** قفلِ رزولوشن برای هر حالت (خالص و تست‌پذیر) — null یعنی خودکار */
export function lockFor(mode: QualityMode, maxDpr: number): number | null {
  if (mode === "sharp") return Math.min(2, maxDpr);
  if (mode === "smooth") return 0.9;
  return null;
}

/** اعمالِ ترجیح: ذخیره + قفلِ فوری روی زمانِ اجرا (حلقه در همان فریم می‌پیوندد) */
export function applyQuality(mode: QualityMode, maxDpr: number): void {
  writeLS(KEY, mode);
  rt.dprLock = lockFor(mode, maxDpr);
}
