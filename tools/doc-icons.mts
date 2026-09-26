/**
 * tools/doc-icons.mts — نمادهای SVG اسناد (README / ROADMAP) از همان مجموعه‌ی نمادِ بازی.
 * قاعده‌ی پروژه (P5.16): هیچ ایموجی‌ای در اسناد نیست؛ هر جا نماد لازم است، SVG دست‌ساز.
 *
 * اجرا:  npm run doc-icons   →  docs/icons/*.svg
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { uiSvg, itemSvg } from "../src/game/icons";

const OUT = new URL("../docs/icons/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const sized = (svg: string, px = 24) => svg.replace('width="100%" height="100%"', `width="${px}" height="${px}"`);
const raw = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">${body}</svg>`;

const files: Record<string, string> = {
  // README — ستونِ ویژگی‌ها
  engine: sized(uiSvg("sunset")),
  story: sized(uiSvg("story")),
  systems: sized(uiSvg("gear")),
  touch: sized(uiSvg("hand")),
  save: sized(uiSvg("save")),
  persian: sized(uiSvg("contracts")),
  wheat: sized(itemSvg("wheat")),
  // ROADMAP — وضعیت آیتم‌ها و KPI
  done: sized(uiSvg("check")),
  doing: raw(`<circle cx="12" cy="12" r="9.2" fill="#fff8e1" stroke="#f59e0b" stroke-width="2"/><path d="M12 2.8a9.2 9.2 0 0 1 0 18.4z" fill="#f59e0b"/>`),
  todo: raw(`<circle cx="12" cy="12" r="9" fill="#fff" stroke="#94a3b8" stroke-width="2" stroke-dasharray="3.2 2.4"/>`),
  blocked: sized(uiSvg("alert")),
  wait: sized(uiSvg("clock")),
};

for (const [name, svg] of Object.entries(files)) writeFileSync(OUT + name + ".svg", svg + "\n");
console.log(`docs/icons: ${Object.keys(files).length} SVG نوشته شد`);
