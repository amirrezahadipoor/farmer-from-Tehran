/**
 * src/game/art/portraits.ts — چهره‌ی گوینده‌های داستان، کارگرها و مشتری‌ها (SVGِ پارامتری)
 */
import { OL, S, wrap } from "./svgKit";
import { UI_ICONS } from "./uiIcons";

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
  // مورد ۷: قهرمانِ زن و خنثی، و خودِ قهرمان در پیری (صحنه‌ی آخر) — همان رنگِ آبیِ شاخصِ قهرمان
  hero_f: { skin: "#f1c29c", hair: "#3e2a1e", cloth: "#eceff1", bg: "#90caf9", hat: "scarf", hatColor: "#5b6ee1" },
  hero_n: { skin: "#f1c29c", hair: "#3e2a1e", cloth: "#eceff1", bg: "#90caf9", hat: "cap", hatColor: "#5b6ee1" },
  hero_old_m: { skin: "#e6ad84", hair: "#e0e0e0", cloth: "#5b6ee1", bg: "#ffe0b2", hat: "straw", beard: "#eeeeee" },
  hero_old_f: { skin: "#e6ad84", hair: "#e0e0e0", cloth: "#5b6ee1", bg: "#ffe0b2", hat: "scarf", hatColor: "#f5f5f5" },
  hero_old_n: { skin: "#e6ad84", hair: "#e0e0e0", cloth: "#5b6ee1", bg: "#ffe0b2", hat: "straw", glasses: true },
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
/** چهره‌ی گوینده‌ی داستان با شناسه‌ی متنی («narrator» = کتابِ راوی) */
export const speakerSvg = (av: string) =>
  av === "narrator" ? wrap(`<circle cx="12" cy="12" r="11.4" fill="#fff3e0"/><g transform="translate(2.4 2.6) scale(.8)">${UI_ICONS.story}</g>`) : portraitSvg(SPK[av] || SPK.hero);

export const npcSvg = (i: number) => portraitSvg(NPC_SPECS[i % NPC_SPECS.length]);
export const workerSvg = (kind: string) => portraitSvg(SPK[kind] || SPK.farmhand);
