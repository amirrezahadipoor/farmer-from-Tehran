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
import { asset } from "../base";

const LAYER = "pointer-events-none absolute inset-0";

const SKY_GRADIENT = "linear-gradient(#64c3eb, #1c73af)";

/**
 * زیرِ بوم: تصویرِ آسمان (با گرادیانِ جایگزین تا بارگذاری) و تیرگیِ آسمان در شب.
 * withImage=false پشتِ اسپلش/صفحه‌ی بارگذاری: آنجا تصویر دیده نمی‌شود و ۳۸KB از مسیرِ بحرانیِ
 * بارگذاریِ اول کم می‌شود (P6.5)؛ با ورود به بازی تصویر روی همان گرادیان می‌نشیند.
 */
export const SkyLayers = memo(function SkyLayers({ withImage = true }: { withImage?: boolean }) {
  return (
    <>
      <div aria-hidden className={`${LAYER} bg-cover bg-center`} style={{ backgroundImage: withImage ? `url(${asset("/images/bg_sky.webp")}), ${SKY_GRADIENT}` : SKY_GRADIENT }} />
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
