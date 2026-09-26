/**
 * src/game/art/svgKit.ts — ابزارهای مشترکِ آیکون‌های SVGِ دست‌ساز (خطِ دورِ گرم، برجستگیِ نرم)
 * (P6.6: icons.tsx ۴۹۴ خطی به فایل‌های ≤ ۴۰۰ خط شکسته شد)
 */
export const OL = "#3a2614";
export const S = `stroke="${OL}" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round"`;
export const HL = `fill="#ffffff" fill-opacity=".45"`;
export const wrap = (b: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">${b}</svg>`;

export function gearPath(cx: number, cy: number, r: number, teeth: number) {
  let d = "";
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const a2 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.78;
    d += `${i === 0 ? "M" : "L"}${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)} L${(cx + Math.cos(a2) * rr).toFixed(2)} ${(cy + Math.sin(a2) * rr).toFixed(2)} `;
  }
  return d + "Z";
}
export function starPath(cx: number, cy: number, r1: number, r2: number, n = 5) {
  let d = "";
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i / (n * 2)) * Math.PI * 2;
    const r = i % 2 ? r2 : r1;
    d += `${i ? "L" : "M"}${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)} `;
  }
  return d + "Z";
}
export const cloud = (fill: string, y = 0) =>
  `<path d="M6.5 ${16 + y}a3.5 3.5 0 0 1-.4-7 5 5 0 0 1 9.6-1.2A3.8 3.8 0 0 1 18 ${16 + y}z" fill="${fill}" ${S}/>`;

/** نشانِ زنجیره: روبان + مدال با رنگِ رده و ۱ تا ۴ ستاره (P6.2) */
export function medal(fill: string, rim: string, stars: number) {
  const at: Record<number, [number, number, number][]> = {
    1: [[12, 15.2, 2.9]],
    2: [[9.9, 15.2, 1.9], [14.1, 15.2, 1.9]],
    3: [[12, 12.9, 1.7], [9.6, 16.6, 1.7], [14.4, 16.6, 1.7]],
    4: [[9.8, 13, 1.6], [14.2, 13, 1.6], [9.8, 17.2, 1.6], [14.2, 17.2, 1.6]],
  };
  const st = at[stars].map(([x, y, r]) => `<path d="${starPath(x, y, r, r * 0.45)}" fill="#fff" stroke="${rim}" stroke-width=".6" stroke-linejoin="round"/>`).join("");
  return `<path d="M7.2 2.5h3.4l2.2 6.2-2.6 1.3zM16.8 2.5h-3.4l-2.2 6.2 2.6 1.3z" fill="#5b6ee1" ${S}/><circle cx="12" cy="15" r="6.9" fill="${fill}" ${S}/><circle cx="12" cy="15" r="5.2" fill="none" stroke="${rim}" stroke-width="1.1"/>${st}`;
}
