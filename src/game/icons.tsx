/* Hand-drawn SVG icon system for Golden Valley.
 * Every icon is a string, so the same art is used by React (inline SVG) and by
 * the canvas renderer (cached <img> from a data URL). Style: flat colour with a
 * warm dark outline and a soft highlight — a consistent "sticker" look. */
import type { CSSProperties } from "react";

const OL = "#3a2614";
const S = `stroke="${OL}" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round"`;
const HL = `fill="#ffffff" fill-opacity=".45"`;
const wrap = (b: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">${b}</svg>`;

function gearPath(cx: number, cy: number, r: number, teeth: number) {
  let d = "";
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const a2 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.78;
    d += `${i === 0 ? "M" : "L"}${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)} L${(cx + Math.cos(a2) * rr).toFixed(2)} ${(cy + Math.sin(a2) * rr).toFixed(2)} `;
  }
  return d + "Z";
}
function starPath(cx: number, cy: number, r1: number, r2: number, n = 5) {
  let d = "";
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i / (n * 2)) * Math.PI * 2;
    const r = i % 2 ? r2 : r1;
    d += `${i ? "L" : "M"}${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)} `;
  }
  return d + "Z";
}
const cloud = (fill: string, y = 0) =>
  `<path d="M6.5 ${16 + y}a3.5 3.5 0 0 1-.4-7 5 5 0 0 1 9.6-1.2A3.8 3.8 0 0 1 18 ${16 + y}z" fill="${fill}" ${S}/>`;

/* ---------------------------------------------------------------- UI icons */
const UI_ICONS: Record<string, string> = {
  hand: `<path d="M8 20c-2-1-3.5-3.2-4.2-5.4-.3-1 .9-1.7 1.6-.9L7 15.5V6.3c0-.9.6-1.5 1.4-1.5s1.4.6 1.4 1.5V11h.4V4.5c0-.9.6-1.5 1.4-1.5s1.4.6 1.4 1.5V11h.4V5.3c0-.9.6-1.5 1.4-1.5s1.4.6 1.4 1.5V11.5h.4V7.8c0-.9.6-1.5 1.4-1.5s1.4.6 1.4 1.5V14c0 3.8-2.6 6.8-6.3 6.8-1.6 0-2.9-.3-3.8-.8z" fill="#f6c89a" ${S}/><path d="M8.4 6v5" stroke="#fff" stroke-opacity=".5" stroke-width="1" stroke-linecap="round"/>`,
  seed: `<path d="M6 10.5c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2l1 7.7c.2 1.6-1 2.8-2.6 2.8H7.6C6 21 4.8 19.8 5 18.2z" fill="#c9995a" ${S}/><path d="M6.4 11.5h11.2" ${S} fill="none"/><path d="M12 8.2c.1-2.8 1.6-4.4 4.3-5-.1 2.6-1.6 4.3-4.3 5z" fill="#6dbb4a" ${S}/><path d="M12 8.2c-.1-2.1-1.3-3.4-3.5-3.8.2 2 1.4 3.3 3.5 3.8z" fill="#8fd35f" ${S}/><circle cx="10" cy="16" r="1" fill="#8a5a2b"/><circle cx="13.6" cy="17.4" r="1" fill="#8a5a2b"/>`,
  water: `<path d="M8 10.4V8a2.6 2.6 0 0 1 5.2 0v2.4" fill="none" ${S}/><path d="M4.5 10.4h10v7.8a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2z" fill="#4fb3e8" ${S}/><path d="M14.5 13.2l5.6-4 1.2 1.6-5.8 4.8z" fill="#3a9bd4" ${S}/><path d="M6 12.5h3" stroke="#fff" stroke-opacity=".6" stroke-width="1.2" stroke-linecap="round"/><path d="M21 13.5c.6 1 .9 1.6.9 2a.9.9 0 0 1-1.8 0c0-.4.3-1 .9-2z" fill="#7fd0ff" ${S}/>`,
  fert: `<path d="M9 3h6v2.2l-.4.4V9l4 7.3c1 1.8-.3 4.2-2.4 4.2H7.8c-2.1 0-3.4-2.4-2.4-4.2L9.4 9V5.6L9 5.2z" fill="#eef6ff" ${S}/><path d="M6.6 15.8l2.5-4.3h5.8l2.5 4.3c.6 1.1-.1 2.4-1.3 2.4H7.9c-1.2 0-1.9-1.3-1.3-2.4z" fill="#8bd14f"/><circle cx="11" cy="14.6" r=".9" ${HL}/><circle cx="13.4" cy="16.4" r=".6" ${HL}/><path d="M9 3h6" ${S}/>`,
  hoe: `<path d="M4.2 19.2l11.4-12 1.5 1.3L5.7 20.6z" fill="#b07a45" ${S}/><path d="M13.6 3.6l6.6 2.1-2.1 5.4-3.3-1.2z" fill="#a8b4bd" ${S}/><path d="M15 5l3.8 1.2" stroke="#fff" stroke-opacity=".6" stroke-width="1"/>`,
  build: `<rect x="11.5" y="13.5" width="9.5" height="7.5" rx=".8" fill="#d9764a" ${S}/><path d="M11.5 17.2h9.5M15.2 13.5v3.7M17.8 17.2V21" ${S}/><path d="M11.6 3h6.2l2.1 3-2.1 1.1-2.1-1.1h-3.2z" fill="#9aa6ae" ${S}/><path d="M12.4 6.4l1.9 1.6-8.1 9.2a1.35 1.35 0 0 1-2-1.8z" fill="#b07a45" ${S}/>`,
  clear: `<path d="M5.4 21.2l-1.4-1.1L14.6 6.2 16 7.3z" fill="#b07a45" ${S}/><path d="M12.6 3.6c3.6-1.1 6.8.8 7.8 4.2l-3.4 2.3-5.1-3.8z" fill="#b9c4cc" ${S}/><path d="M14.3 4.6c1.8-.3 3.4.4 4.5 1.9" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1"/>`,
  story: `<path d="M2.8 5.6c3.2-1.1 6.3-.8 9.2 1.1v13.2c-2.9-1.8-6-2.1-9.2-1z" fill="#fff4dc" ${S}/><path d="M21.2 5.6c-3.2-1.1-6.3-.8-9.2 1.1v13.2c2.9-1.8 6-2.1 9.2-1z" fill="#fbe8bf" ${S}/><path d="M5 9.3c1.7-.3 3.4-.1 5 .7M5 12.3c1.7-.3 3.4-.1 5 .7M14 10c1.6-.8 3.3-1 5-.7" stroke="#b88b4a" stroke-width="1" stroke-linecap="round" fill="none"/><path d="M16 5.2v5l1.3-1 1.3 1v-5.3" fill="#e2574c" ${S}/>`,
  market: `<rect x="4" y="10" width="16" height="10.5" fill="#f3dfb7" ${S}/><path d="M2.8 4.5h18.4l-1.2 5.5H4z" fill="#e2574c" ${S}/><path d="M7.3 4.5 6.8 10M11.1 4.5 10.9 10M14.9 4.5l.2 5.5M18.7 4.5l.5 5.5" stroke="#fff" stroke-width="1.6"/><rect x="9.5" y="14" width="5" height="6.5" fill="#9b6a3f" ${S}/><rect x="5.5" y="12.2" width="3" height="3" fill="#8fd35f" ${S}/><rect x="15.5" y="12.2" width="3" height="3" fill="#f5b041" ${S}/>`,
  orders: `<rect x="1.8" y="6.5" width="12.4" height="9.5" rx="1" fill="#f2b544" ${S}/><path d="M14.2 9.5h4.2l3.2 3.3v3.2h-7.4z" fill="#e2574c" ${S}/><path d="M15.6 10.8h2.3l1.7 1.8h-4z" fill="#bfe8ff" ${S}/><circle cx="6" cy="17.3" r="2" fill="#4a3a2e" ${S}/><circle cx="17.5" cy="17.3" r="2" fill="#4a3a2e" ${S}/><circle cx="6" cy="17.3" r=".7" fill="#ddd"/><circle cx="17.5" cy="17.3" r=".7" fill="#ddd"/><path d="M4 9h6" stroke="#fff" stroke-opacity=".6" stroke-width="1.2" stroke-linecap="round"/>`,
  biz: `<rect x="3" y="7.8" width="18" height="12.4" rx="2" fill="#9b6a3f" ${S}/><path d="M9 7.8V5.6c0-.6.5-1 1-1h4c.5 0 1 .4 1 1v2.2" fill="none" ${S}/><path d="M3 12.6h18" ${S}/><rect x="10.3" y="11.2" width="3.4" height="2.8" rx=".5" fill="#f5c542" ${S}/><path d="M5 9.6h4" stroke="#fff" stroke-opacity=".45" stroke-width="1.2" stroke-linecap="round"/>`,
  skills: `<path d="M12 2.8a6.2 6.2 0 0 0-3.6 11.2v2.3h7.2V14A6.2 6.2 0 0 0 12 2.8z" fill="#ffd54a" ${S}/><rect x="8.6" y="16.3" width="6.8" height="2" fill="#b0bec5" ${S}/><rect x="9.4" y="18.3" width="5.2" height="2.2" rx=".8" fill="#90a4ae" ${S}/><path d="M9.6 8.2a2.8 2.8 0 0 1 2.4-2.4" stroke="#fff" stroke-width="1.3" stroke-linecap="round" fill="none"/><path d="M10.6 16.2v-3.4l1.4-1.2 1.4 1.2v3.4" fill="none" stroke="#c98a12" stroke-width="1"/>`,
  tech: `<ellipse cx="12" cy="12" rx="9.3" ry="3.7" fill="none" stroke="#5b6ee1" stroke-width="1.7"/><ellipse cx="12" cy="12" rx="9.3" ry="3.7" transform="rotate(60 12 12)" fill="none" stroke="#8e5be1" stroke-width="1.7"/><ellipse cx="12" cy="12" rx="9.3" ry="3.7" transform="rotate(-60 12 12)" fill="none" stroke="#3bb4c9" stroke-width="1.7"/><circle cx="12" cy="12" r="2.4" fill="#e2574c" ${S}/>`,
  decor: `<path d="M12 21v-7" stroke="#4d9a3a" stroke-width="1.8" stroke-linecap="round"/><path d="M12 17.5c-2.6-.3-4-1.6-4.3-3.8 2.4.2 3.9 1.5 4.3 3.8z" fill="#6dbb4a" ${S}/><circle cx="12" cy="6" r="2.9" fill="#f48fb1" ${S}/><circle cx="8.4" cy="8.7" r="2.9" fill="#f06292" ${S}/><circle cx="15.6" cy="8.7" r="2.9" fill="#f06292" ${S}/><circle cx="9.8" cy="12.4" r="2.9" fill="#f48fb1" ${S}/><circle cx="14.2" cy="12.4" r="2.9" fill="#f48fb1" ${S}/><circle cx="12" cy="9.4" r="2.3" fill="#ffd54a" ${S}/>`,
  contracts: `<rect x="5" y="3.5" width="13" height="17" rx="1" fill="#fff0cf" ${S}/><path d="M5 3.5h-.6a1.6 1.6 0 0 0 0 3.2H5M18 20.5h.6a1.6 1.6 0 0 0 0-3.2H18" fill="#e9d3a4" ${S}/><path d="M8 8h7M8 11h7M8 14h4" stroke="#b88b4a" stroke-width="1.1" stroke-linecap="round"/><circle cx="15" cy="16.5" r="2.4" fill="#e2574c" ${S}/><path d="M14 18.4l-.6 2.6 1.6-.9 1.6.9-.6-2.6" fill="#e2574c" ${S}/>`,
  trophy: `<path d="M7 3.5h10v4.8a5 5 0 0 1-10 0z" fill="#f5c542" ${S}/><path d="M7 5H4.2c0 3 1.2 4.6 3.4 4.8M17 5h2.8c0 3-1.2 4.6-3.4 4.8" fill="none" ${S}/><path d="M10.6 13.2h2.8v3.3h-2.8z" fill="#e0a82e" ${S}/><rect x="7.5" y="16.5" width="9" height="3.8" rx=".8" fill="#9b6a3f" ${S}/><path d="M9.2 5.3v3" stroke="#fff" stroke-opacity=".7" stroke-width="1.3" stroke-linecap="round"/>`,
  help: `<circle cx="12" cy="12" r="9.2" fill="#4fb3e8" ${S}/><path d="M9.3 9.3a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2.9-1.2 1.8v.5" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.2" fill="#fff"/>`,
  coin: `<circle cx="12" cy="12" r="9" fill="#f5c542" ${S}/><circle cx="12" cy="12" r="6.6" fill="none" stroke="#c98a12" stroke-width="1.1"/><path d="M12 7.6l1.3 2.7 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4z" fill="#e0a82e"/><path d="M7.4 9a5.3 5.3 0 0 1 3.2-3" stroke="#fff" stroke-opacity=".8" stroke-width="1.3" stroke-linecap="round" fill="none"/>`,
  box: `<path d="M3.5 8 12 4l8.5 4v9L12 21l-8.5-4z" fill="#c9995a" ${S}/><path d="M3.5 8 12 12l8.5-4M12 12v9" fill="none" ${S}/><path d="M7.7 6 16.2 10v3" fill="none" stroke="#8a5a2b" stroke-width="1.2"/><path d="M12 12l8.5-4v9L12 21z" fill="#000" fill-opacity=".12"/>`,
  star: `<path d="${starPath(12, 12.5, 9.4, 4.2)}" fill="#ffd54a" ${S}/><path d="M9 9.6l1.9-.4" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>`,
  lock: `<path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="${OL}" stroke-width="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="#b0bec5" stroke-width="1"/><rect x="5.5" y="10.5" width="13" height="10" rx="2" fill="#f5c542" ${S}/><circle cx="12" cy="14.8" r="1.4" fill="${OL}"/><path d="M12 15.5v2.4" stroke="${OL}" stroke-width="1.4" stroke-linecap="round"/>`,
  check: `<circle cx="12" cy="12" r="9.2" fill="#43a047" ${S}/><path d="M7.4 12.3l3.1 3.1 6.1-6.3" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>`,
  clock: `<circle cx="12" cy="12.5" r="8.6" fill="#fffaf0" ${S}/><path d="M12 7.6v5.2l3.3 2" fill="none" stroke="${OL}" stroke-width="1.6" stroke-linecap="round"/><path d="M9 2.8h6" stroke="${OL}" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="12.8" r="1" fill="#e2574c"/>`,
  target: `<circle cx="11" cy="13" r="8.2" fill="#fff" ${S}/><circle cx="11" cy="13" r="5.6" fill="#e2574c" ${S}/><circle cx="11" cy="13" r="2.8" fill="#fff" ${S}/><path d="M11 13 19.5 4.5" stroke="${OL}" stroke-width="1.6" stroke-linecap="round"/><path d="M17.2 3.6l2.3.9.9 2.3" fill="#4fb3e8" ${S}/>`,
  repeat: `<path d="M5 11a7 7 0 0 1 12-4.8" fill="none" stroke="#43a047" stroke-width="2.3" stroke-linecap="round"/><path d="M17.8 3.2v3.6h-3.6" fill="none" stroke="#43a047" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 13a7 7 0 0 1-12 4.8" fill="none" stroke="#2e7d32" stroke-width="2.3" stroke-linecap="round"/><path d="M6.2 20.8v-3.6h3.6" fill="none" stroke="#2e7d32" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>`,
  play: `<circle cx="12" cy="12" r="9.2" fill="#43a047" ${S}/><path d="M10 7.8v8.4l6.6-4.2z" fill="#fff"/>`,
  close: `<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`,
  save: `<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h11l3.5 3.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z" fill="#5b6ee1" ${S}/><rect x="7.5" y="4" width="8" height="5" fill="#e8ecff" ${S}/><rect x="7" y="13" width="10" height="7" rx=".6" fill="#fff" ${S}/><rect x="12.6" y="5" width="1.8" height="3" fill="${OL}"/>`,
  cloud: cloud("#ffffff"),
  sun: `<g stroke="#f59e0b" stroke-width="2" stroke-linecap="round"><path d="M12 1.8v2.6M12 19.6v2.6M1.8 12h2.6M19.6 12h2.6M4.8 4.8l1.8 1.8M17.4 17.4l1.8 1.8M4.8 19.2l1.8-1.8M17.4 6.6l1.8-1.8"/></g><circle cx="12" cy="12" r="5.3" fill="#ffd54a" ${S}/><path d="M9.6 10.2a2.8 2.8 0 0 1 1.8-1.6" stroke="#fff" stroke-width="1.2" stroke-linecap="round" fill="none"/>`,
  moon: `<path d="M15.6 3.5A8.8 8.8 0 1 0 20.5 16a7 7 0 0 1-4.9-12.5z" fill="#fff3b0" ${S}/><circle cx="10" cy="14" r="1.2" fill="#e6d68a"/><circle cx="13" cy="17.2" r=".8" fill="#e6d68a"/><path d="M19 4.5l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z" fill="#fff"/>`,
  sunset: `<path d="M5.2 15.5a6.8 6.8 0 0 1 13.6 0z" fill="#ff9d4a" ${S}/><g stroke="#f57c00" stroke-width="1.8" stroke-linecap="round"><path d="M12 4.6v2.2M4.7 8.2l1.5 1.5M19.3 8.2l-1.5 1.5"/></g><path d="M2.5 15.5h19M5 18.5h14M8 21h8" stroke="${OL}" stroke-width="1.4" stroke-linecap="round"/>`,
  rain: `${cloud("#dfe9f2", -3)}<g stroke="#3a9bd4" stroke-width="1.8" stroke-linecap="round"><path d="M8 16.5l-1 3M12 16.5l-1 3M16 16.5l-1 3"/></g>`,
  snow: `${cloud("#f4f8fb", -3)}<g stroke="#5fa8d3" stroke-width="1.4" stroke-linecap="round"><path d="M8 16.5v4M6.3 17.5l3.4 2M9.7 17.5l-3.4 2M15.5 16.5v4M13.8 17.5l3.4 2M17.2 17.5l-3.4 2"/></g>`,
  fog: `${cloud("#e5e9ee", -3)}<g stroke="#90a4ae" stroke-width="1.8" stroke-linecap="round"><path d="M4 16.5h16M6 19.5h12M8.5 22h7"/></g>`,
  heat: `<circle cx="9" cy="9" r="4.5" fill="#ff8a3d" ${S}/><g stroke="#f4511e" stroke-width="1.6" stroke-linecap="round" fill="none"><path d="M3 17c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0 3 1.2 4.5 0"/><path d="M3 20.5c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0 3 1.2 4.5 0"/></g><rect x="16" y="3" width="3" height="9" rx="1.5" fill="#fff" ${S}/><circle cx="17.5" cy="12.5" r="2.2" fill="#e2574c" ${S}/>`,
  spring: `<g transform="translate(12 12)">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-5" rx="3.3" ry="4.6" transform="rotate(${a})" fill="#f8bbd0" ${S}/>`).join("")}</g><circle cx="12" cy="12" r="2.6" fill="#ffd54a" ${S}/>`,
  summer: "",
  autumn: `<path d="M12 21.5v-5M12 2.5l1.9 4 3.3-1.4-.7 3.7 3.8.5-2.6 2.6 2.2 2-3.8.8.6 2.6-3.1-1.2-1.6 2.3-1.6-2.3-3.1 1.2.6-2.6-3.8-.8 2.2-2-2.6-2.6 3.8-.5-.7-3.7 3.3 1.4z" fill="#ef7d2c" ${S}/><path d="M12 6.5v10M12 11l-3-2M12 11l3-2" stroke="#b5501a" stroke-width="1" fill="none"/>`,
  winter: `<g stroke="#4fa3d8" stroke-width="2.1" stroke-linecap="round" fill="none"><path d="M12 2.5v19M3.8 7.3l16.4 9.4M3.8 16.7l16.4-9.4"/><path d="M9.6 4.6 12 6.8l2.4-2.2M9.6 19.4 12 17.2l2.4 2.2M4.1 10.5l3.2-.7-1-3.1M19.9 13.5l-3.2.7 1 3.1M4.1 13.5l3.2.7-1 3.1M19.9 10.5l-3.2-.7 1-3.1"/></g>`,
  crown: `<path d="M3 8.5l4.4 3.6L12 5l4.6 7.1L21 8.5l-1.7 10H4.7z" fill="#f5c542" ${S}/><rect x="4.7" y="18.5" width="14.6" height="2.2" rx=".6" fill="#e0a82e" ${S}/><circle cx="12" cy="14.2" r="1.4" fill="#e2574c" ${S}/><circle cx="7.6" cy="15.4" r="1" fill="#4fb3e8" ${S}/><circle cx="16.4" cy="15.4" r="1" fill="#43a047" ${S}/>`,
  user: `<circle cx="12" cy="8.5" r="4.2" fill="#f6c89a" ${S}/><path d="M4 21c.6-4.2 3.8-6.6 8-6.6s7.4 2.4 8 6.6z" fill="#5b6ee1" ${S}/>`,
  workers: `<circle cx="8.3" cy="8.8" r="3.3" fill="#f6c89a" ${S}/><path d="M2.5 19.5c.4-3.3 2.8-5.2 5.8-5.2s5.4 1.9 5.8 5.2z" fill="#43a047" ${S}/><circle cx="16" cy="7.6" r="3.3" fill="#e8b184" ${S}/><path d="M11.5 18.8c.5-3.4 2.4-5.4 4.5-5.4 3 0 5.2 1.9 5.6 5.4z" fill="#f2b544" ${S}/><path d="M5 6.8h6.6M12.8 5.6h6.4" stroke="${OL}" stroke-width="1.3" stroke-linecap="round"/>`,
  trendUp: `<rect x="2.8" y="2.8" width="18.4" height="18.4" rx="4" fill="#e8f5e9" ${S}/><path d="M6 16.5l4.2-4.4 3 2.7 4.8-5.6" fill="none" stroke="#2e7d32" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.5 9h3.6v3.6" fill="none" stroke="#2e7d32" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  trendDown: `<rect x="2.8" y="2.8" width="18.4" height="18.4" rx="4" fill="#ffebee" ${S}/><path d="M6 8l4.2 4.4 3-2.7 4.8 5.6" fill="none" stroke="#c62828" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.5 15.4h3.6v-3.6" fill="none" stroke="#c62828" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  bag: `<path d="M9 5.5 7.6 2.8h8.8L15 5.5" fill="#c9995a" ${S}/><path d="M9 5.5h6c3.8 2.3 5.8 6.1 5.8 9.6 0 3.6-2.6 6.1-8.8 6.1S3.2 18.7 3.2 15.1c0-3.5 2-7.3 5.8-9.6z" fill="#d9a85f" ${S}/><circle cx="12" cy="14.5" r="3.4" fill="#f5c542" ${S}/><path d="M12 12.6v3.8" stroke="${OL}" stroke-width="1.2" stroke-linecap="round"/>`,
  leaf: `<path d="M5 19C4.5 10 10 4.5 20 4c.2 9.6-5 15-15 15z" fill="#6dbb4a" ${S}/><path d="M5 19c3.5-4.4 7-7.6 11-10.5" fill="none" stroke="#3d7d2a" stroke-width="1.3" stroke-linecap="round"/>`,
  cow: `<path d="M5.5 6.5 3 4.5M18.5 6.5 21 4.5" stroke="${OL}" stroke-width="1.8" stroke-linecap="round"/><path d="M5.5 6.6 3.6 4.8M18.5 6.6l1.9-1.8" stroke="#e8d9b8" stroke-width="1" stroke-linecap="round"/><ellipse cx="12" cy="11" rx="7" ry="6.3" fill="#fafafa" ${S}/><path d="M6.3 8.2c1.3-.7 2.8-.4 3.3.8.5 1.3-.5 2.5-1.9 2.6-1.4 0-2.3-.7-2.4-1.6z" fill="#3a3a3a"/><path d="M15 6c1.5 0 2.7.8 2.8 1.8-.8.9-2.1 1-3 .4-.6-.5-.5-1.5.2-2.2z" fill="#3a3a3a"/><ellipse cx="12" cy="16.5" rx="5" ry="3.4" fill="#f8bbd0" ${S}/><ellipse cx="10.2" cy="16.5" rx=".8" ry="1.1" fill="${OL}"/><ellipse cx="13.8" cy="16.5" rx=".8" ry="1.1" fill="${OL}"/><circle cx="9.3" cy="11.4" r=".9" fill="${OL}"/><circle cx="14.7" cy="11.4" r=".9" fill="${OL}"/>`,
  factory: `<path d="M3 20.5V10.5l5 3v-3l5 3v-3l5 3V4.5h3v16z" fill="#b0bec5" ${S}/><rect x="5.3" y="15.5" width="2.5" height="2.5" fill="#ffd54a" ${S}/><rect x="10.3" y="15.5" width="2.5" height="2.5" fill="#ffd54a" ${S}/><rect x="15.3" y="15.5" width="2.5" height="2.5" fill="#ffd54a" ${S}/><circle cx="19.6" cy="3" r="1.4" fill="#eceff1" ${S}/>`,
  gear: `<path d="${gearPath(12, 12, 9.4, 9)}" fill="#90a4ae" ${S}/><circle cx="12" cy="12" r="3.2" fill="#eceff1" ${S}/>`,
  bolt: `<path d="M13.6 2.5 5 13.6h6l-1.6 7.9 8.8-11.3h-6.1z" fill="#ffd54a" ${S}/>`,
  sparkle: `<path d="M12 2.5c.8 5 2.3 6.6 7.5 7.5-5.2.9-6.7 2.5-7.5 7.5-.8-5-2.3-6.6-7.5-7.5 5.2-.9 6.7-2.5 7.5-7.5z" fill="#ffd54a" ${S}/><path d="M18.5 15.5c.3 1.9.9 2.5 2.8 2.8-1.9.3-2.5.9-2.8 2.8-.3-1.9-.9-2.5-2.8-2.8 1.9-.3 2.5-.9 2.8-2.8z" fill="#f48fb1" ${S}/>`,
  tree: `<rect x="10.6" y="14" width="2.8" height="7" fill="#8a5a2b" ${S}/><circle cx="12" cy="9.5" r="6.8" fill="#4caf50" ${S}/><circle cx="9.6" cy="7.6" r="2.4" ${HL}/><circle cx="14.5" cy="11" r="1" fill="#e2574c"/><circle cx="9.5" cy="12" r="1" fill="#e2574c"/>`,
  map: `<path d="M3 5.5l5.5-2 7 2.5 5.5-2v15l-5.5 2-7-2.5-5.5 2z" fill="#fff0cf" ${S}/><path d="M8.5 3.5v15M15.5 6v15" stroke="${OL}" stroke-width="1.1"/><path d="M5 9c1.5 1 3 .5 4.5 2s3.5 1 5 3" fill="none" stroke="#e2574c" stroke-width="1.3" stroke-dasharray="1.6 1.6" stroke-linecap="round"/><circle cx="17.8" cy="13" r="1.3" fill="#43a047"/>`,
  gift: `<rect x="3.5" y="9.5" width="17" height="11" rx="1" fill="#e2574c" ${S}/><rect x="2.8" y="7" width="18.4" height="3.6" rx=".8" fill="#ef6c62" ${S}/><path d="M12 7v13.5" stroke="#ffd54a" stroke-width="2.4"/><path d="M12 7c-1.5-3.3-5.2-4-5.2-1.8C6.8 6.6 9.3 7 12 7zm0 0c1.5-3.3 5.2-4 5.2-1.8 0 1.4-2.5 1.8-5.2 1.8z" fill="#ffd54a" ${S}/>`,
  alert: `<path d="M12 3 22 20.5H2z" fill="#ffca28" ${S}/><path d="M12 9.5v5" stroke="${OL}" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17.4" r="1.2" fill="${OL}"/>`,
  film: `<rect x="2.5" y="8.5" width="19" height="12" rx="1.5" fill="#37474f" ${S}/><path d="M2.5 8.5 20.2 3.4l.8 2.8-17.7 5.1z" fill="#eceff1" ${S}/><path d="M6.5 7.4 8 10.3M11 6.1l1.5 2.9M15.5 4.8 17 7.7" stroke="${OL}" stroke-width="1.6"/><path d="M6 13h12M6 16.5h8" stroke="#90a4ae" stroke-width="1.3" stroke-linecap="round"/>`,
  sprout: `<path d="M12 21v-8" stroke="#4d9a3a" stroke-width="2" stroke-linecap="round"/><path d="M12 13c.1-4 2.3-6.3 6.3-7-.1 3.8-2.3 6.3-6.3 7z" fill="#6dbb4a" ${S}/><path d="M12 14.2c-.1-3-1.7-4.8-4.8-5.3.1 2.9 1.8 4.7 4.8 5.3z" fill="#8fd35f" ${S}/><path d="M6 21h12" stroke="#8a5a2b" stroke-width="2" stroke-linecap="round"/>`,
  plus: `<path d="M12 5v14M5 12h14" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`,
  arrow: `<path d="M19 12H5M11 6 5 12l6 6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  settings: `<path d="${gearPath(12, 12, 9.6, 8)}" fill="#90a4ae" ${S}/><circle cx="12" cy="12" r="3.4" fill="#eceff1" ${S}/><circle cx="12" cy="12" r="1.3" fill="#607d8b"/>`,
  zoomIn: `<circle cx="10.5" cy="10.5" r="6.8" fill="#e3f2fd" ${S}/><path d="M15.6 15.6 21 21" stroke="${OL}" stroke-width="2.6" stroke-linecap="round"/><path d="M10.5 7.6v5.8M7.6 10.5h5.8" stroke="#1565c0" stroke-width="2" stroke-linecap="round"/>`,
  zoomOut: `<circle cx="10.5" cy="10.5" r="6.8" fill="#e3f2fd" ${S}/><path d="M15.6 15.6 21 21" stroke="${OL}" stroke-width="2.6" stroke-linecap="round"/><path d="M7.6 10.5h5.8" stroke="#1565c0" stroke-width="2" stroke-linecap="round"/>`,
  center: `<circle cx="12" cy="12" r="7.4" fill="none" stroke="${OL}" stroke-width="1.6"/><circle cx="12" cy="12" r="2.6" fill="#e2574c" ${S}/><path d="M12 1.6v3.4M12 19v3.4M1.6 12h3.4M19 12h3.4" stroke="${OL}" stroke-width="2" stroke-linecap="round"/>`,
  sound: `<path d="M4 9.5h3.6L12 5.4v13.2L7.6 14.5H4z" fill="#546e7a" ${S}/><path d="M15 9a4.2 4.2 0 0 1 0 6M17.6 6.4a7.8 7.8 0 0 1 0 11.2" fill="none" stroke="#43a047" stroke-width="2" stroke-linecap="round"/>`,
  mute: `<path d="M4 9.5h3.6L12 5.4v13.2L7.6 14.5H4z" fill="#90a4ae" ${S}/><path d="M15.6 9.6l5 4.8M20.6 9.6l-5 4.8" stroke="#c62828" stroke-width="2.2" stroke-linecap="round"/>`,
  trash: `<path d="M4.5 6.5h15" stroke="${OL}" stroke-width="2" stroke-linecap="round"/><path d="M9 6.5V4.8c0-.7.6-1.3 1.3-1.3h3.4c.7 0 1.3.6 1.3 1.3v1.7" fill="none" ${S}/><path d="M6.4 6.5h11.2l-.9 13a1.6 1.6 0 0 1-1.6 1.5H8.9a1.6 1.6 0 0 1-1.6-1.5z" fill="#ef9a9a" ${S}/><path d="M10 10.5v7M14 10.5v7" stroke="#b71c1c" stroke-width="1.5" stroke-linecap="round"/>`,
  info: `<circle cx="12" cy="12" r="9.2" fill="#78909c" ${S}/><circle cx="12" cy="7.6" r="1.3" fill="#fff"/><path d="M12 10.8v6.4" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`,
  home: `<path d="M3 11.2 12 3.8l9 7.4" fill="none" ${S}/><path d="M5.2 10v10.2h13.6V10L12 4.6z" fill="#f3dfb7" ${S}/><path d="M2.5 11.6 12 3.6l9.5 8-1.5 1.6L12 6.6 4 13.2z" fill="#e2574c" ${S}/><rect x="10" y="14" width="4" height="6.2" fill="#9b6a3f" ${S}/>`,
};
UI_ICONS.summer = UI_ICONS.sun;

/* ------------------------------------------------------------- item icons */
const shp = {
  grain: (c: string) =>
    `<path d="M12 22V9" stroke="#b58a2e" stroke-width="1.6" stroke-linecap="round"/>` +
    [4, 7, 10, 13].map((y) => `<ellipse cx="9.4" cy="${y + 1}" rx="2" ry="3" transform="rotate(-30 9.4 ${y + 1})" fill="${c}" ${S}/><ellipse cx="14.6" cy="${y + 1}" rx="2" ry="3" transform="rotate(30 14.6 ${y + 1})" fill="${c}" ${S}/>`).join("") +
    `<ellipse cx="12" cy="3.6" rx="1.8" ry="2.6" fill="${c}" ${S}/>`,
  root: (c: string) =>
    `<path d="M12 5c-1.7-2-3.4-2.6-5-2 1.4 1.6 3 2.3 5 2zm0 0c.2-2 1.2-3.4 3-4 .1 2-.9 3.4-3 4zm0 0c1.7-1.6 3.4-2 5.2-1.2-1.5 1.5-3.2 1.9-5.2 1.2z" fill="#5fae3e" ${S}/><path d="M8 6.4c2.6-1.3 5.4-1.3 8 0L12.8 21.5c-.3 1-1.3 1-1.6 0z" fill="${c}" ${S}/><path d="M9.4 9.5h2M10 13h2M10.6 16.5h1.4" stroke="#b5501a" stroke-width="1" stroke-linecap="round"/>`,
  cob: (c: string) =>
    `<ellipse cx="12" cy="11" rx="4.3" ry="8.3" fill="${c}" ${S}/><path d="M9 6.5h6M8.3 9.5h7.4M8.2 12.5h7.6M8.6 15.5h6.8M9.2 5v13M12 3v16M14.8 5v13" stroke="#d49b12" stroke-width=".7"/><path d="M7.6 12c-2 3-1.6 6.6.8 9.5 1.2-2.4 2.6-5 3.6-7.8M16.4 12c2 3 1.6 6.6-.8 9.5-1.2-2.4-2.6-5-3.6-7.8" fill="#6dbb4a" ${S}/>`,
  round: (c: string) =>
    `<circle cx="12" cy="13.3" r="7.8" fill="${c}" ${S}/><path d="M12 6.6l1.4-2.7 1 2.4 2.7-.6-1.9 2.1 1.8 1.9-2.8-.3-1.1 2.3-1.1-2.3-2.8.3 1.8-1.9-1.9-2.1 2.7.6 1-2.4z" fill="#4d9a3a" ${S}/><ellipse cx="8.8" cy="11.8" rx="1.7" ry="2.3" ${HL}/>`,
  berry: (c: string) =>
    `<path d="M12 21.3C6 17.6 4 13.2 4.8 10.3 5.7 7.4 9 7 12 8.4c3-1.4 6.3-1 7.2 1.9.8 2.9-1.2 7.3-7.2 11z" fill="${c}" ${S}/><path d="M8 7.2c1.3-2 2.6-2.8 4-2.6 1.4-.2 2.7.6 4 2.6-1.4.8-2.7 1-4 .5-1.3.5-2.6.3-4-.5z" fill="#4d9a3a" ${S}/>` +
    [[9, 11.5], [12, 12], [15, 11.5], [10.2, 14.8], [13.8, 14.8], [12, 17.6]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx=".5" ry=".8" fill="#fff59d"/>`).join(""),
  sunflower: (c: string) =>
    `<g transform="translate(12 12)">${Array.from({ length: 12 }, (_, i) => `<ellipse cx="0" cy="-6.8" rx="2" ry="3.4" transform="rotate(${i * 30})" fill="${c}" ${S}/>`).join("")}</g><circle cx="12" cy="12" r="4.4" fill="#6d4c41" ${S}/><circle cx="11" cy="11" r="1.2" fill="#8d6e63"/>`,
  pumpkin: (c: string) =>
    `<path d="M12 6.5c.2-1.8 1-3 2.6-3.6" fill="none" stroke="#5d4037" stroke-width="2" stroke-linecap="round"/><ellipse cx="7.8" cy="13.6" rx="4.3" ry="6.4" fill="${c}" ${S}/><ellipse cx="16.2" cy="13.6" rx="4.3" ry="6.4" fill="${c}" ${S}/><ellipse cx="12" cy="13.6" rx="4.2" ry="7" fill="${c}" ${S}/><ellipse cx="10.8" cy="11" rx="1.1" ry="2.4" ${HL}/>`,
  grapes: (c: string) =>
    `<path d="M12 5.5V2.8M12 4c2-.6 3.9-.1 5.3 1.4" fill="none" stroke="#5d4037" stroke-width="1.5" stroke-linecap="round"/><path d="M13.5 3.5c1.5-.3 3.4.3 4.4 1.7-1.8.6-3.3.2-4.4-1.7z" fill="#6dbb4a" ${S}/>` +
    [[8.6, 8.2], [12, 7.4], [15.4, 8.2], [10.3, 11.4], [13.7, 11.4], [7.8, 11.6], [16.2, 11.6], [12, 14.6], [9.4, 14.8], [14.6, 14.8], [12, 18]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.35" fill="${c}" ${S}/>`).join("") +
    `<circle cx="11.2" cy="6.8" r=".7" ${HL}/>`,
  melon: (c: string) =>
    `<ellipse cx="12" cy="13" rx="8.8" ry="7.2" fill="${c}" ${S}/><path d="M6 8.4c1.4 3 1.4 6.3 0 9.4M9.3 6.2c1.2 4.3 1.2 9 0 13.4M14.7 6.2c-1.2 4.3-1.2 9 0 13.4M18 8.4c-1.4 3-1.4 6.3 0 9.4" fill="none" stroke="#7a8f1a" stroke-width="1.1"/><path d="M12 6c0-1.6.6-2.8 1.8-3.4" stroke="#5d4037" stroke-width="1.5" stroke-linecap="round"/>`,
  crocus: (c: string) =>
    `<path d="M12 22v-8" stroke="#4d9a3a" stroke-width="1.8" stroke-linecap="round"/><path d="M12 14C8 13 6.6 9.2 7.8 4.2c2 1.2 3.4 3 4.2 5.2.8-2.2 2.2-4 4.2-5.2 1.2 5-.2 8.8-4.2 9.8z" fill="${c}" ${S}/><path d="M12 13V6.2M12 9l-2.2-4M12 9l2.2-4" stroke="#e53935" stroke-width="1.3" stroke-linecap="round"/>`,
  clover: (c: string) =>
    `<path d="M12 21.5c0-3.4.4-6 1.5-8.5" stroke="#3d7d2a" stroke-width="1.6" stroke-linecap="round" fill="none"/>` +
    [0, 120, 240].map((a) => `<path d="M12 12c-3.8-.4-5.6-3.3-4-5.6 1.2-1.7 3.6-1.2 4 .6.4-1.8 2.8-2.3 4-.6 1.6 2.3-.2 5.2-4 5.6z" transform="rotate(${a} 12 12)" fill="${c}" ${S}/>`).join(""),
  bloom: (c: string, petals: number) =>
    `<path d="M12 22v-9" stroke="#4d9a3a" stroke-width="1.8" stroke-linecap="round"/><path d="M12 17.5c-2.8-.3-4.3-1.8-4.6-4 2.6.2 4.2 1.6 4.6 4z" fill="#6dbb4a" ${S}/><g transform="translate(12 8)">${Array.from({ length: petals }, (_, i) => `<ellipse cx="0" cy="-3.2" rx="2.4" ry="3.6" transform="rotate(${(i * 360) / petals})" fill="${c}" ${S}/>`).join("")}</g><circle cx="12" cy="8" r="1.7" fill="#ffd54a" ${S}/>`,
  tulip: (c: string) =>
    `<path d="M12 22v-10" stroke="#4d9a3a" stroke-width="1.8" stroke-linecap="round"/><path d="M12 19c-3-.3-4.8-2.2-5.2-5 2.8.3 4.6 2 5.2 5z" fill="#6dbb4a" ${S}/><path d="M6.8 5.2 9.3 7.6 12 3.8l2.7 3.8 2.5-2.4c.6 4.8-1.2 7.8-5.2 7.8S6.2 10 6.8 5.2z" fill="${c}" ${S}/><path d="M9 8.8c.3 1.4.9 2.2 1.8 2.6" stroke="#fff" stroke-opacity=".6" stroke-width="1" fill="none" stroke-linecap="round"/>`,
  lavender: (c: string) =>
    `<path d="M12 22V9M9 22l1.4-9M15 22l-1.4-9" stroke="#4d9a3a" stroke-width="1.4" stroke-linecap="round"/>` +
    [[12, 3], [11, 5.2], [13, 5.2], [11, 7.6], [13, 7.6], [9.4, 10], [10.8, 12], [14.6, 10], [13.2, 12]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.4" ry="1.9" fill="${c}" ${S}/>`).join(""),
  log: () =>
    `<path d="M3.5 8.5h12v9h-12z" fill="#a1683a" ${S}/><path d="M5 11h9M5.5 14.5h7" stroke="#6d4424" stroke-width="1" stroke-linecap="round"/><ellipse cx="16.5" cy="13" rx="4" ry="4.5" fill="#e8c28f" ${S}/><ellipse cx="16.5" cy="13" rx="2.3" ry="2.7" fill="none" stroke="#b07a45" stroke-width="1"/><circle cx="16.5" cy="13" r=".8" fill="#b07a45"/>`,
  stone: () =>
    `<path d="M3.5 16.5 6 9l5-3.5 6 1.3 3.5 5.2-1.6 5.8-7 2.2z" fill="#9aa5ad" ${S}/><path d="M6 9l5 3 6-5.2M11 12l1 8" fill="none" stroke="#6f7c85" stroke-width="1"/><path d="M7.5 9.5 10.5 7" stroke="#fff" stroke-opacity=".6" stroke-width="1.2" stroke-linecap="round"/>`,
  sack: (c: string, band: string) =>
    `<path d="M8 6.5C6 9 5 12.3 5 15.4 5 19 7.5 21 12 21s7-2 7-5.6c0-3.1-1-6.4-3-8.9z" fill="${c}" ${S}/><path d="M8 6.5c1-1 2.2-1.6 4-1.6s3 .6 4 1.6" fill="none" ${S}/><path d="M9.2 3.5c.8 1.6 1.8 2.3 2.8 2.3s2-.7 2.8-2.3" fill="${c}" ${S}/><rect x="7.4" y="12.6" width="9.2" height="3.6" rx="1" fill="${band}" ${S}/>`,
  egg: () =>
    `<path d="M12 2.8c3.7 0 6.6 5.6 6.6 10.4 0 4.3-2.9 7.5-6.6 7.5S5.4 17.5 5.4 13.2C5.4 8.4 8.3 2.8 12 2.8z" fill="#fbf3e2" ${S}/><ellipse cx="9.4" cy="9.6" rx="1.5" ry="2.6" ${HL}/><path d="M3.5 20.5h17" stroke="#c9995a" stroke-width="1.6" stroke-linecap="round"/>`,
  bottle: (c: string, cap: string) =>
    `<rect x="9.6" y="2.6" width="4.8" height="2.6" rx=".6" fill="${cap}" ${S}/><path d="M10.2 5.2h3.6v2.3c2.3 1 3.4 2.8 3.4 5v7.5c0 .9-.7 1.6-1.6 1.6H8.4c-.9 0-1.6-.7-1.6-1.6V12.5c0-2.2 1.1-4 3.4-5z" fill="${c}" ${S}/><rect x="7.6" y="13" width="8.8" height="4.4" rx=".6" fill="#fff" fill-opacity=".85" ${S}/><path d="M8.6 10.5v8" stroke="#fff" stroke-opacity=".5" stroke-width="1.2" stroke-linecap="round"/>`,
  jar: (c: string, lid: string) =>
    `<rect x="6.8" y="3.4" width="10.4" height="3.2" rx="1" fill="${lid}" ${S}/><path d="M6.4 6.6h11.2c.9 1.1 1.6 2.4 1.6 4.2v7.6c0 1.6-1.3 2.9-2.9 2.9H7.7c-1.6 0-2.9-1.3-2.9-2.9v-7.6c0-1.8.7-3.1 1.6-4.2z" fill="${c}" ${S}/><rect x="7" y="11.5" width="10" height="4.6" rx=".8" fill="#fff4dc" ${S}/><path d="M7.4 8.6c-.7 1.4-.8 2.5-.7 3.5" stroke="#fff" stroke-opacity=".55" stroke-width="1.2" stroke-linecap="round" fill="none"/>`,
  can: (c: string) =>
    `<ellipse cx="12" cy="5" rx="5.6" ry="1.9" fill="#cfd8dc" ${S}/><path d="M6.4 5v13.6c0 1.1 2.5 2 5.6 2s5.6-.9 5.6-2V5" fill="${c}" ${S}/><path d="M6.4 9.2c0 1.1 2.5 2 5.6 2s5.6-.9 5.6-2M6.4 15.2c0 1.1 2.5 2 5.6 2s5.6-.9 5.6-2" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1"/><circle cx="12" cy="13" r="1.8" fill="#6dbb4a" ${S}/>`,
  bread: () =>
    `<path d="M3.5 13.5C3.5 9 7.3 6 12 6s8.5 3 8.5 7.5v4c0 1.4-1.1 2.5-2.5 2.5H6c-1.4 0-2.5-1.1-2.5-2.5z" fill="#d9924a" ${S}/><path d="M8 9.5 9.5 12M11.6 8.6l1.3 2.8M15.2 9.3l1.2 2.5" stroke="#f5d29a" stroke-width="1.6" stroke-linecap="round"/><path d="M4.5 16.5h15" stroke="#b56d2e" stroke-width="1"/>`,
  cake: () =>
    `<rect x="4.5" y="12" width="15" height="8.5" rx="1.2" fill="#f8bbd0" ${S}/><path d="M4.5 15.5h15" stroke="#fff" stroke-width="1.6"/><path d="M4.5 12c0-1.4 1.1-2.4 2.5-2.4h10c1.4 0 2.5 1 2.5 2.4 0 1-.7 1.6-1.6 1.6-.8 0-1.2-.7-1.9-.7s-1.2.7-2.2.7-1.4-.7-2.1-.7-1.2.7-2.1.7-1.3-.7-2-.7-1.2.7-1.9.7c-.8 0-1.2-.6-1.2-1.6z" fill="#fff" ${S}/><rect x="11.2" y="4.6" width="1.6" height="5" fill="#90caf9" ${S}/><path d="M12 1.8c.8 1 1.2 1.8 1.2 2.4a1.2 1.2 0 0 1-2.4 0c0-.6.4-1.4 1.2-2.4z" fill="#ffb300" ${S}/><circle cx="8" cy="9.4" r="1.1" fill="#e53935" ${S}/><circle cx="16" cy="9.4" r="1.1" fill="#e53935" ${S}/>`,
  pie: () =>
    `<path d="M2.8 13.2h18.4l-1.7 5.6c-.3 1-1.2 1.7-2.2 1.7H6.7c-1 0-1.9-.7-2.2-1.7z" fill="#c9995a" ${S}/><path d="M3.4 13.2C4.6 9 7.9 6.8 12 6.8s7.4 2.2 8.6 6.4z" fill="#f28c28" ${S}/><path d="M6.5 12.2 17.5 9.5M8 9.6l9.4 3.2M12 7.2v6" stroke="#f5d29a" stroke-width="1.5" stroke-linecap="round"/>`,
  cheese: () =>
    `<path d="M2.8 17.5 17 5.5l4.2 4.5v8.5c0 .6-.4 1-1 1H3.8c-.6 0-1-.4-1-1z" fill="#ffd54a" ${S}/><path d="M2.8 17.5h18.4" stroke="${OL}" stroke-width="1.1"/><circle cx="9" cy="15.5" r="1.4" fill="#e0a82e"/><circle cx="14.5" cy="12" r="1.8" fill="#e0a82e"/><circle cx="17.5" cy="16" r="1.1" fill="#e0a82e"/><circle cx="12" cy="18.5" r=".8" fill="#e0a82e"/>`,
  butter: () =>
    `<ellipse cx="12" cy="17" rx="9.5" ry="3.6" fill="#e3f2fd" ${S}/><path d="M5.5 9.5 12 7l6.5 2.5v6L12 18l-6.5-2.5z" fill="#ffe082" ${S}/><path d="M5.5 9.5 12 12l6.5-2.5M12 12v6" fill="none" ${S}/><path d="M12 12l6.5-2.5v6L12 18z" fill="#000" fill-opacity=".08"/>`,
  meat: () =>
    `<path d="M4 12.5c0-4.4 3.6-8 8.6-8 4.6 0 7.4 2.8 7.4 6.4 0 4.6-4 8.6-9.4 8.6-3.9 0-6.6-2.7-6.6-7z" fill="#e57373" ${S}/><path d="M6.4 12.5c0-3 2.6-5.6 6.2-5.6 3.3 0 5.3 2 5.3 4.4 0 3.3-2.9 6-6.6 6-2.8 0-4.9-1.8-4.9-4.8z" fill="#ef9a9a"/><circle cx="12.4" cy="11.6" r="2" fill="#fff8e1" ${S}/>`,
  wool: () =>
    `<circle cx="12" cy="12" r="8.6" fill="#f06292" ${S}/><path d="M5.4 8.6c3.4 1 6 3.4 7.4 11.8M8.6 4.4c2.6 2.2 4.4 5.8 4.8 11M3.6 13c3.6-.6 7.2 1 9.6 5M13.4 3.6c.2 3.4 2.6 6.4 6.8 7.6" fill="none" stroke="#ad1457" stroke-width="1.1"/><path d="M19.5 17.5c1.4 1 2 2.2 1.8 3.6" stroke="${OL}" stroke-width="1.2" stroke-linecap="round" fill="none"/>`,
  honeycomb: () =>
    [[8, 8], [16, 8], [12, 14.6], [4, 14.6], [20, 14.6], [8, 21], [16, 21]].map(([x, y]) => `<path d="M${x} ${y - 4.2}l3.6 2.1v4.2L${x} ${y + 2.4}l-3.6-2.1v-4.2z" fill="#ffc107" ${S}/>`).join("") +
    `<circle cx="12" cy="13.8" r="1.2" fill="#fff59d"/>`,
  popcorn: () =>
    `<path d="M5 9h14l-2 12.5H7z" fill="#fff" ${S}/><path d="M7.6 9 8.6 21.5M12 9v12.5M16.4 9l-1 12.5" stroke="#e53935" stroke-width="2"/>` +
    [[6.5, 7.8], [9.6, 6], [13, 5.6], [16.4, 6.6], [18, 8.6], [11, 8.4], [14.6, 8.4]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.1" fill="#fff8e1" ${S}/>`).join(""),
  icecream: () =>
    `<path d="M6.8 11.5h10.4L12.8 22c-.3.7-1.3.7-1.6 0z" fill="#e0a86a" ${S}/><path d="M8 13.5l6.8 4.4M9.8 16.8l5-3.3M10.3 12l3.8 2.6" stroke="#b07a45" stroke-width=".9"/><circle cx="9.2" cy="9.8" r="3.3" fill="#ffd54a" ${S}/><circle cx="14.8" cy="9.8" r="3.3" fill="#ffab40" ${S}/><circle cx="12" cy="6" r="3.3" fill="#fff3c4" ${S}/><circle cx="12" cy="3" r="1.2" fill="#e53935" ${S}/>`,
  chocolate: () =>
    `<rect x="5" y="3" width="14" height="18" rx="1.4" fill="#6d4c41" ${S}/><path d="M5 9h14M5 15h14M12 3v18" stroke="#4e342e" stroke-width="1.3"/><path d="M5 16.5h14v4.5H5z" fill="#e2574c" ${S}/><path d="M6.4 4.6h3.4" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" stroke-linecap="round"/>`,
  sausage: () =>
    `<path d="M4 16c-1.6-1.6-1-4 1.3-4.6 3-.7 5.6 1.4 8.7 1 2.7-.3 4.4-2.6 6.4-1.6 1.8.9 1.7 3.6-.4 4.8-3.4 2-7.5 1.2-10.5 1.4-2.2.2-4 .6-5.5-1z" fill="#c1614b" ${S}/><path d="M6.5 13.5c1 .2 1.8.6 2.6 1M14.5 13.6c1-.1 2-.4 2.8-.9" stroke="#fff" stroke-opacity=".55" stroke-width="1.1" stroke-linecap="round" fill="none"/><path d="M5 9.5c2-1.8 4.6-1.9 7-1s4.8.8 6.6-.6" fill="none" stroke="#f5c542" stroke-width="1.6" stroke-linecap="round"/>`,
  sweater: () =>
    `<path d="M8.5 3.5 3 6.5l1.8 5.5 2.4-1V20.5h9.6V11l2.4 1L21 6.5l-5.5-3c-.6 1.6-2 2.5-3.5 2.5s-2.9-.9-3.5-2.5z" fill="#5b6ee1" ${S}/><path d="M7.2 13.5h9.6M7.2 16.5h9.6" stroke="#ffd54a" stroke-width="1.4"/><path d="M9.5 15l1-1.2 1 1.2 1-1.2 1 1.2 1-1.2" fill="none" stroke="#fff" stroke-width="1"/>`,
  feedBowl: () =>
    `<path d="M3 13h18l-1.8 5.4c-.3.9-1.1 1.4-2 1.4H6.8c-.9 0-1.7-.5-2-1.4z" fill="#8d6e63" ${S}/>` +
    [[7, 11.6], [10, 10.6], [13, 11], [16, 10.4], [9, 12.4], [15, 12.4], [12, 9.6]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.8" ry="1.1" fill="#d7a64a" ${S}/>`).join(""),
};

const ITEM_SVG: Record<string, string> = {
  wheat: shp.grain("#f0c75a"),
  carrot: shp.root("#f07b1e"),
  corn: shp.cob("#f7d433"),
  tomato: shp.round("#e3342f"),
  strawberry: shp.berry("#ff2d55"),
  sunflower: shp.sunflower("#ffc300"),
  pumpkin: shp.pumpkin("#f58220"),
  grape: shp.grapes("#8e24aa"),
  melon: shp.melon("#c9d84a"),
  saffron: shp.crocus("#9c6ade"),
  clover: shp.clover("#66bb6a"),
  tulip: shp.tulip("#ec407a"),
  rose: shp.bloom("#d32f2f", 7),
  lavender: shp.lavender("#8e7cc3"),
  wood: shp.log(),
  stone: shp.stone(),
  flour: shp.sack("#f5ecd7", "#90caf9"),
  popcorn: shp.popcorn(),
  egg: shp.egg(),
  milk: shp.bottle("#ffffff", "#4fb3e8"),
  wool: shp.wool(),
  pork: shp.meat(),
  honey: shp.jar("#ffb300", "#8d6e63"),
  feed: shp.feedBowl(),
  compost: shp.sack("#8d6e63", "#8fd35f"),
  bread: shp.bread(),
  cake: shp.cake(),
  pie: shp.pie(),
  cheese: shp.cheese(),
  butter: shp.butter(),
  jam: shp.jar("#d81b60", "#e2574c"),
  oil: shp.bottle("#c6d84a", "#6d4c41"),
  ketchup: shp.can("#e53935"),
  juice: shp.bottle("#8e24aa", "#6dbb4a"),
  icecream: shp.icecream(),
  chocolate: shp.chocolate(),
  mead: shp.bottle("#e0a82e", "#8d6e63"),
  sausage: shp.sausage(),
  sweater: shp.sweater(),
};

/* ------------------------------------------------------------ portraits */
export interface PortraitSpec {
  skin: string; hair: string; cloth: string; bg: string;
  hat?: "straw" | "cap" | "helmet" | "top" | "scarf" | "none";
  hatColor?: string; beard?: string; glasses?: boolean; tie?: string; long?: boolean; bald?: boolean;
}
export function portraitSvg(p: PortraitSpec) {
  const hat = p.hat || "none";
  let hairBack = "";
  let hairFront = "";
  if (!p.bald && hat !== "scarf") {
    hairBack = p.long ? `<path d="M6.2 11.5c-.6 3.8 0 6.6 1.6 8.2h8.4c1.6-1.6 2.2-4.4 1.6-8.2z" fill="${p.hair}" ${S}/>` : "";
    hairFront = `<path d="M7 10.6c-.2-3.6 2-5.8 5-5.8s5.2 2.2 5 5.8c-1.6-.6-2.8-1.8-3.4-3.2-1.6 1.8-4 2.9-6.6 3.2z" fill="${p.hair}" ${S}/>`;
  }
  let hatSvg = "";
  const hc = p.hatColor || "#e6c36a";
  if (hat === "straw") hatSvg = `<ellipse cx="12" cy="7.6" rx="8.6" ry="2.4" fill="${hc}" ${S}/><path d="M7.6 7.6c0-3 2-4.6 4.4-4.6s4.4 1.6 4.4 4.6z" fill="${hc}" ${S}/><path d="M7.8 6.6h8.4" stroke="#b5501a" stroke-width="1.2"/>`;
  if (hat === "cap") hatSvg = `<path d="M6.8 8.6c0-3.2 2.4-5 5.2-5s5.2 1.8 5.2 5z" fill="${hc}" ${S}/><path d="M11 8.6h8c.4 0 .5.6.1.8-1.6.7-4.6.8-8.1.4z" fill="${hc}" ${S}/>`;
  if (hat === "helmet") hatSvg = `<path d="M6.2 9c0-3.6 2.6-5.8 5.8-5.8s5.8 2.2 5.8 5.8z" fill="${hc}" ${S}/><rect x="5" y="8.4" width="14" height="1.6" rx=".8" fill="${hc}" ${S}/><path d="M12 3.4V9" stroke="${OL}" stroke-width="1"/>`;
  if (hat === "top") hatSvg = `<rect x="8.4" y="1.4" width="7.2" height="6.4" rx=".6" fill="#2b2b2b" ${S}/><rect x="6" y="7.4" width="12" height="1.6" rx=".8" fill="#2b2b2b" ${S}/><rect x="8.4" y="5.6" width="7.2" height="1.2" fill="#c62828"/>`;
  if (hat === "scarf") hatSvg = `<path d="M5.6 12.4C5.2 6.8 8 3.8 12 3.8s6.8 3 6.4 8.6c-.8-2.8-2.4-4.6-3.2-5-1.4 1-2.4 1.4-3.2 1.4s-1.8-.4-3.2-1.4c-.8.4-2.4 2.2-3.2 5z" fill="${hc}" ${S}/>`;
  const beard = p.beard ? `<path d="M7.6 12.6c.4 4 2.2 6 4.4 6s4-2 4.4-6c-1.2 1-2.6 1.4-4.4 1.4s-3.2-.4-4.4-1.4z" fill="${p.beard}" ${S}/>` : "";
  const glasses = p.glasses ? `<circle cx="10" cy="11" r="1.7" fill="none" stroke="${OL}" stroke-width="1"/><circle cx="14" cy="11" r="1.7" fill="none" stroke="${OL}" stroke-width="1"/><path d="M11.7 11h.6" stroke="${OL}" stroke-width="1"/>` : "";
  const tie = p.tie ? `<path d="M12 18.6l-1 1.4 1 3.2 1-3.2z" fill="${p.tie}" ${S}/>` : "";
  return wrap(
    `<circle cx="12" cy="12" r="11.4" fill="${p.bg}"/>` +
    hairBack +
    `<path d="M3.6 24c.6-4.2 3.8-6.6 8.4-6.6s7.8 2.4 8.4 6.6z" fill="${p.cloth}" ${S}/>` +
    `<path d="M10.4 16.2h3.2v2.6c-.8.8-2.4.8-3.2 0z" fill="${p.skin}" ${S}/>` +
    `<ellipse cx="12" cy="11" rx="4.9" ry="5.6" fill="${p.skin}" ${S}/>` +
    `<circle cx="10" cy="11" r=".75" fill="${OL}"/><circle cx="14" cy="11" r=".75" fill="${OL}"/>` +
    `<path d="M10.5 13.8c.9.7 2.1.7 3 0" fill="none" stroke="${OL}" stroke-width="1" stroke-linecap="round"/>` +
    `<circle cx="8.8" cy="12.9" r=".9" fill="#f48fb1" fill-opacity=".5"/><circle cx="15.2" cy="12.9" r=".9" fill="#f48fb1" fill-opacity=".5"/>` +
    hairFront + beard + glasses + hatSvg + tie
  );
}

const SPK: Record<string, PortraitSpec> = {
  hero: { skin: "#f1c29c", hair: "#3e2a1e", cloth: "#eceff1", bg: "#90caf9", tie: "#5b6ee1" },
  boss: { skin: "#e9b98f", hair: "#1c1c1c", cloth: "#263238", bg: "#b0bec5", tie: "#b71c1c", glasses: true },
  notary: { skin: "#e8b48a", hair: "#eeeeee", cloth: "#5d4037", bg: "#ffe0b2", glasses: true, beard: "#e0e0e0", bald: true },
  grandpa: { skin: "#e3a877", hair: "#f5f5f5", cloth: "#8d6e63", bg: "#fff59d", hat: "straw", beard: "#fafafa" },
  rana: { skin: "#eab48d", hair: "#9e9e9e", cloth: "#6a1b9a", bg: "#f8bbd0", hat: "scarf", hatColor: "#c2185b" },
  sara: { skin: "#f3c6a2", hair: "#4e342e", cloth: "#43a047", bg: "#c8e6c9", hat: "straw", hatColor: "#f2d27a", long: true },
  nowruz: { skin: "#d9a070", hair: "#5d4037", cloth: "#795548", bg: "#d7ccc8", hat: "cap", hatColor: "#455a64", beard: "#6d4c41" },
  zelli: { skin: "#e6b58c", hair: "#212121", cloth: "#111111", bg: "#ef9a9a", tie: "#f5c542" },
  judge: { skin: "#e0a97c", hair: "#9e9e9e", cloth: "#1a237e", bg: "#c5cae9", glasses: true, tie: "#f5c542" },
  farmhand: { skin: "#e3a877", hair: "#4e342e", cloth: "#1e88e5", bg: "#bbdefb", hat: "straw" },
  operator: { skin: "#f1c29c", hair: "#3e2723", cloth: "#fb8c00", bg: "#ffe0b2", hat: "helmet", hatColor: "#ffca28" },
  trader: { skin: "#e9b98f", hair: "#212121", cloth: "#37474f", bg: "#cfd8dc", hat: "top", tie: "#c62828" },
  scientist: { skin: "#f3c6a2", hair: "#6d4c41", cloth: "#f5f5f5", bg: "#e1bee7", glasses: true, long: true },
  vet: { skin: "#d9a070", hair: "#212121", cloth: "#00897b", bg: "#b2dfdb", hat: "cap", hatColor: "#00796b" },
};
const AV_TO_SPK: Record<string, string> = {
  "🧑": "hero", "🕴️": "boss", "👴": "notary", "🌾": "grandpa", "👵": "rana", "👩‍🌾": "sara",
  "🧔": "nowruz", "💼": "zelli", "🎖️": "judge",
};
const NPC_SPECS: PortraitSpec[] = [
  SPK.rana,
  { skin: "#eab48d", hair: "#3e2723", cloth: "#fafafa", bg: "#ffccbc", hat: "cap", hatColor: "#fafafa" },
  SPK.sara,
  SPK.nowruz,
  { skin: "#e3a877", hair: "#212121", cloth: "#bf360c", bg: "#ffe0b2", beard: "#3e2723" },
  { skin: "#f1c29c", hair: "#5d4037", cloth: "#283593", bg: "#c5cae9", tie: "#f5c542" },
  { skin: "#f3c6a2", hair: "#8d6e63", cloth: "#2e7d32", bg: "#dcedc8", long: true },
  { skin: "#e9b98f", hair: "#4e342e", cloth: "#6d4c41", bg: "#d7ccc8", hat: "scarf", hatColor: "#00897b" },
  { skin: "#d9a070", hair: "#212121", cloth: "#f9a825", bg: "#fff9c4", hat: "scarf", hatColor: "#fafafa", beard: "#212121" },
  { skin: "#f1c29c", hair: "#212121", cloth: "#e3f2fd", bg: "#b3e5fc", glasses: true },
  SPK.judge,
];
export const speakerSvg = (av: string) => (av === "📖" ? wrap(`<circle cx="12" cy="12" r="11.4" fill="#fff3e0"/><g transform="translate(2.4 2.6) scale(.8)">${UI_ICONS.story}</g>`) : portraitSvg(SPK[AV_TO_SPK[av] || "hero"]));
export const npcSvg = (i: number) => portraitSvg(NPC_SPECS[i % NPC_SPECS.length]);
export const workerSvg = (kind: string) => portraitSvg(SPK[kind] || SPK.farmhand);

/* ---------------------------------------------------------- lookups */
export const uiSvg = (name: string) => wrap(UI_ICONS[name] || UI_ICONS.help);
export const itemSvg = (id: string) => wrap(ITEM_SVG[id] || UI_ICONS.box);
export const hasItemIcon = (id: string) => !!ITEM_SVG[id];

const TECH_ICON: Record<string, string> = {
  seeds1: "seed", crop_xp: "story", storage1: "box", storage2: "home", mega_silo: "factory", speed_ovens: "bolt",
  greenhouse_tech: "leaf", market1: "trendUp", export_license: "orders", order_bonus: "contracts", auto_feed: "gear",
  automation_tech: "gear", fertilizer_master: "sparkle", animal_husbandry: "cow", precision_agri: "target",
  irrigation_engineering: "water", landscape_design: "tree",
};
const SKILL_ICON: Record<string, string> = {
  master_planter: "sprout", fert_soil: "fert", harvest_god: "trophy", price_mind: "coin", storage_master: "box",
  grow_master: "leaf", water_wise: "water", animal_tamer: "cow", artisan: "gear", landscape_art: "tree",
  zen_master: "sparkle", crop_lord: "crown", economist: "trendUp",
};
const ACH_ICON: Record<string, string> = {
  first_harvest: "sprout", rich1: "coin", rich2: "bag", rich3: "crown", level10: "star", level20: "crown",
  factory_master: "factory", land_baron: "map", automation_king: "gear", zoo: "cow", decorator: "decor", skill_master: "skills",
};
export const techIcon = (id: string) => TECH_ICON[id] || "tech";
export const skillIcon = (id: string) => SKILL_ICON[id] || "skills";
export const achIcon = (id: string) => ACH_ICON[id] || "trophy";

/* --------------------------------------------- canvas image cache */
const imgCache = new Map<string, HTMLImageElement>();
export function iconImage(key: string): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  let img = imgCache.get(key);
  if (!img) {
    const [kind, id] = key.split(":");
    const svg = kind === "item" ? itemSvg(id) : uiSvg(id);
    img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    imgCache.set(key, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}
export function drawIcon(ctx: CanvasRenderingContext2D, key: string, x: number, y: number, size: number) {
  const img = iconImage(key);
  if (img) ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
}

/* Emoji → item id, used to turn legacy emoji strings from game logic into icons */
export const EMOJI_RE = /(\p{Extended_Pictographic}(\uFE0F|\u200D\p{Extended_Pictographic})*)/gu;
export const stripEmoji = (s: string) => s.replace(EMOJI_RE, "").replace(/\s{2,}/g, " ").trim();

/* ------------------------------------------------------------ React */
function Svg({ html, size, className, style, title }: { html: string; size: number | string; className?: string; style?: CSSProperties; title?: string }) {
  const px = typeof size === "number" ? `${size}px` : size;
  return (
    <span
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={`inline-block shrink-0 align-middle ${className || ""}`}
      style={{ width: px, height: px, ...style }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
export const Icon = ({ name, size = 22, className, title }: { name: string; size?: number | string; className?: string; title?: string }) => (
  <Svg html={uiSvg(name)} size={size} className={className} title={title} />
);
export const ItemIcon = ({ id, size = 26, className }: { id: string; size?: number | string; className?: string }) => (
  <Svg html={itemSvg(id)} size={size} className={className} />
);
export const Portrait = ({ html, size = 44, className }: { html: string; size?: number | string; className?: string }) => (
  <Svg html={html} size={size} className={`overflow-hidden rounded-full ${className || ""}`} />
);
