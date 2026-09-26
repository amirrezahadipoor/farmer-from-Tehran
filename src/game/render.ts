/**
 * src/game/render.ts — موتور رندرِ ایزومتریک روی Canvas 2D (دروازه‌ی ماژول‌ها)
 *
 * P5.14/P6.6: فایلِ ۱۲۲۸ خطی به ماژول‌های ≤ ۴۰۰ خط در src/game/render/ شکسته شد و
 * کشِ زمین و اسپرایت‌ها اضافه شد:
 *   core.ts ........ ثابت‌ها، مختصات، ابزارهای رسم، هاله‌ی ازپیش‌کشیده
 *   ground.ts ...... زمین در یک بومِ کش (بازسازیِ ناحیه‌ای) + جاندارهای آب، دسته‌ای
 *   nature.ts ...... درخت، سنگ و کاشیِ محصول از اسپرایت (باد با کجی) + کارگرها
 *   buildings.ts ... پایه‌ی ساختمان + حبابِ آماده؛ دسته‌ها: bFarm / bCraft / bDecor
 *   scene.ts ....... یک فریم: آسمان، زمین، اشیا به ترتیبِ عمق، افکت، نور، هوا، وینیت
 */
export { TW, TH, tileCenter, screenToTile, lightInfo, type View, type Walker } from "./render/core";
export { render, renderStats, screenFx, applyScreenFx, type ScreenFx } from "./render/scene";
export { drawBuildingThumb } from "./render/buildings";
