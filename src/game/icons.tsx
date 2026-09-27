/* Hand-drawn SVG icon system for Golden Valley.
 * Every icon is a string, so the same art is used by React (inline SVG) and by
 * the canvas renderer (cached <img> from a data URL). Style: flat colour with a
 * warm dark outline and a soft highlight — a consistent "sticker" look.
 * P6.6: the SVG data lives in src/game/art/ (svgKit, uiIcons, itemIcons, portraits);
 * this module keeps the lookups, the canvas cache and the React components. */
import type { CSSProperties } from "react";
import { wrap } from "./art/svgKit";
import { UI_ICONS } from "./art/uiIcons";
import { ITEM_SVG } from "./art/itemIcons";
export { portraitSvg, speakerSvg, npcSvg, workerSvg, type PortraitSpec } from "./art/portraits";

/* ---------------------------------------------------------- lookups */
// رشته‌ی نهایی هر آیکون یک بار ساخته می‌شود (همان رشته برای React و کشِ بوم)
const svgMemo = new Map<string, string>();
const memoSvg = (key: string, make: () => string) => {
  let s = svgMemo.get(key);
  if (s === undefined) svgMemo.set(key, (s = make()));
  return s;
};
export const uiSvg = (name: string) => memoSvg("ui:" + name, () => wrap(UI_ICONS[name] || UI_ICONS.help));
export const itemSvg = (id: string) => memoSvg("item:" + id, () => wrap(ITEM_SVG[id] || UI_ICONS.box));
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

/* No emoji anywhere (P5.16): the guard lives in noEmoji.ts; re-exported for UI code */
export { EMOJI_RE, dropEmoji, stripEmoji } from "./noEmoji";

/* ------------------------------------------------------------ React */
/**
 * React 19 پراپِ dangerouslySetInnerHTML را با «هویتِ شیء» مقایسه می‌کند، نه با رشته: شیءِ تازه در هر
 * رندر یعنی innerHTML دوباره و پارسِ دوباره‌ی SVG — برای هر آیکونِ HUD چهار بار در ثانیه و در
 * هیدریتِ اسپلش دو بار (P6.5، دیده‌شده در ردِ اجرا). برای هر رشته یک شیءِ ثابت نگه می‌داریم.
 */
const htmlProps = new Map<string, { __html: string }>();
function htmlProp(html: string) {
  let o = htmlProps.get(html);
  if (!o) {
    o = { __html: html };
    htmlProps.set(html, o);
  }
  return o;
}

function Svg({ html, size, className, style, title }: { html: string; size: number | string; className?: string; style?: CSSProperties; title?: string }) {
  const px = typeof size === "number" ? `${size}px` : size;
  return (
    <span
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={`inline-block shrink-0 align-middle ${className || ""}`}
      style={{ width: px, height: px, ...style }}
      dangerouslySetInnerHTML={htmlProp(html)}
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
