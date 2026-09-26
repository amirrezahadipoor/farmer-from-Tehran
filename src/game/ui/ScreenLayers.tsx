"use client";

/**
 * src/game/ui/ScreenLayers.tsx — لایه‌های صفحه‌ای که لازم نیست هر فریم روی بوم کشیده شوند (P6.6)
 *
 * آسمان، تیرگیِ آسمان، رنگِ غروب، تیرگیِ شب، مه و وینیت پیش از این در هر فریم چند بار کلِ
 * صفحه را روی بوم رنگ می‌کردند (در رندرِ نرم‌افزاری ≈ ۲ میلی‌ثانیه از هر فریم). حالا لایه‌ی
 * CSS هستند: کامپوزیتور ترکیبشان می‌کند و حلقه‌ی بازی فقط وقتی مقدارشان عوض شود شفافیت را
 * می‌نویسد (render/scene.ts → applyScreenFx). هیچ‌کدام لمس را نمی‌گیرد.
 */
import { memo } from "react";

const LAYER = "pointer-events-none absolute inset-0";

/** زیرِ بوم: تصویرِ آسمان (با گرادیانِ جایگزین تا بارگذاری) و تیرگیِ آسمان در شب */
export const SkyLayers = memo(function SkyLayers() {
  return (
    <>
      <div aria-hidden className={`${LAYER} bg-cover bg-center`} style={{ backgroundImage: "url(/images/bg_sky.webp), linear-gradient(#64c3eb, #1c73af)" }} />
      <div aria-hidden data-fx="sky" className={LAYER} style={{ background: "rgb(5,15,40)", opacity: 0 }} />
    </>
  );
});

/** روی بوم (زیرِ HUD): رنگِ غروب، تیرگیِ شب، مه و وینیت */
export const TintLayers = memo(function TintLayers() {
  return (
    <>
      <div aria-hidden data-fx="dusk" className={LAYER} style={{ background: "rgb(255,140,60)", opacity: 0 }} />
      <div aria-hidden data-fx="dark" className={LAYER} style={{ background: "rgb(10,20,60)", opacity: 0 }} />
      <div aria-hidden data-fx="fog" className={LAYER} style={{ background: "linear-gradient(rgba(240,245,255,0.35), rgba(230,235,245,0.05))", opacity: 0 }} />
      <div aria-hidden className={LAYER} style={{ background: "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 35vmin, rgba(0,0,0,0.42) 80vmax)" }} />
    </>
  );
});
