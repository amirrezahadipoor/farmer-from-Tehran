/**
 * src/game/logic.ts — درگاهِ واحدِ منطق بازی (headless و تست‌پذیر)
 *
 * P5.11: پیاده‌سازی در چهار ماژولِ ≤ ۴۰۰ خط است و همه‌ی واردکننده‌ها همچنان از "./logic" می‌خوانند:
 *   sim/state.ts ..... انواع، نقشه، کمکی‌های خالص، ثابت‌های قواعد، migrate
 *   sim/economy.ts ... newState، قیمت، سفارش، تجربه، فروش، قرارداد، دستاورد، تناسخ
 *   sim/actions.ts ... برداشت/کاشت/کارگاه، ابزارها، ساخت، استخدام، تحقیق، مهارت
 *   sim/tick.ts ...... شبیه‌سازیِ زمان (هوا، رشد، ماشین‌ها، کارگرها)
 */
export * from "./sim/state";
export * from "./sim/economy";
export * from "./sim/actions";
export * from "./sim/tick";
export * from "./sim/quests";
