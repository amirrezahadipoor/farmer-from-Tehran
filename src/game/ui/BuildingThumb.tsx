"use client";

/**
 * src/game/ui/BuildingThumb.tsx — پیش‌نمایشِ ساختمان روی بومِ کوچک
 *
 * جدا از common.tsx (P6.5): رندررِ ساختمان‌ها سنگین است و فقط پنل‌های «ساخت» و «پیشرفت» — که
 * تکه‌ی جدا هستند — لازمش دارند؛ HUD و اسپلش دیگر آن را در بسته‌ی اولیه نمی‌کشند.
 */
import { useEffect, useRef } from "react";
import { drawBuildingThumb } from "../render/buildings";

export function BuildingThumb({ id, dim, size = 84 }: { id: string; dim?: boolean; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = size * dpr;
    cv.height = size * dpr;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawBuildingThumb(ctx, id, size, size);
    };
    draw();
    const t = setTimeout(draw, 250); // بعد از بارگذاری فونت/تصاویر
    return () => clearTimeout(t);
  }, [id, size]);
  return <canvas ref={ref} aria-hidden="true" style={{ width: size, height: size }} className={`mx-auto block ${dim ? "opacity-40 grayscale" : ""}`} />;
}
