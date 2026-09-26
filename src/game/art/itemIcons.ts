/**
 * src/game/art/itemIcons.ts — آیکونِ کالاها: چند شکلِ پایه (دانه، میوه، شیشه، جعبه …) با رنگِ هر کالا
 */
import { OL, S, HL } from "./svgKit";

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
  poplar: () =>
    `<path d="M12 22v-5" stroke="#6d4424" stroke-width="2" stroke-linecap="round"/><path d="M12 1.8c3 3.2 4.4 7.4 4.4 10.6 0 3.2-2 5.2-4.4 5.2s-4.4-2-4.4-5.2c0-3.2 1.4-7.4 4.4-10.6z" fill="#7cb342" ${S}/><path d="M12 5v11M12 8.5l2-1.6M12 11.5l-2.2-1.6M12 14l2.2-1.5" stroke="#558b2f" stroke-width="1" stroke-linecap="round" fill="none"/><ellipse cx="10.3" cy="8" rx="1" ry="2.4" ${HL}/>`,
  planks: () =>
    [15.5, 11.5, 7.5].map((y, i) => `<path d="M3 ${y}h18v3.4H3z" transform="rotate(${-6 + i * 3} 12 ${y + 1.7})" fill="${["#d7a86e", "#c8955a", "#e0b57e"][i]}" ${S}/>`).join("") +
    `<path d="M6 17.2h4M13 13.2h5M5 9.2h6" stroke="#8d5a2b" stroke-width=".9" stroke-linecap="round"/>`,
  crate: () =>
    `<path d="M3.5 7.5 12 4l8.5 3.5v9.5L12 20.5 3.5 17z" fill="#c8955a" ${S}/><path d="M3.5 7.5 12 11l8.5-3.5M12 11v9.5" fill="none" ${S}/><path d="M12 11l8.5-3.5V17L12 20.5z" fill="#000" fill-opacity=".1"/><path d="M5 10.8l5.6 2.3M5 14l5.6 2.3M13.4 13.1 19 10.8M13.4 16.3 19 14" stroke="#8d5a2b" stroke-width="1" stroke-linecap="round"/>`,
  cutStone: () =>
    `<path d="M3 9.5 12 5l9 4.5v6.5L12 20.5 3 16z" fill="#b0bec5" ${S}/><path d="M3 9.5 12 14l9-4.5M12 14v6.5" fill="none" ${S}/><path d="M12 14l9-4.5V16L12 20.5z" fill="#000" fill-opacity=".12"/><path d="M6.2 8.6 12 11.4" stroke="#fff" stroke-opacity=".7" stroke-width="1.2" stroke-linecap="round"/>`,
  millstone: () =>
    `<ellipse cx="12" cy="15" rx="9" ry="4.2" fill="#78909c" ${S}/><path d="M3 12.2v2.8c0 2.3 4 4.2 9 4.2s9-1.9 9-4.2v-2.8" fill="#90a4ae" ${S}/><ellipse cx="12" cy="12.2" rx="9" ry="4.2" fill="#b0bec5" ${S}/><ellipse cx="12" cy="12.2" rx="2.2" ry="1.1" fill="#546e7a" ${S}/><path d="M12 12.2 6 10M12 12.2l6.4-1.6M12 12.2l-4.6 3M12 12.2l4.8 2.7" stroke="#78909c" stroke-width=".8"/><path d="M11 3.5h2v7h-2z" fill="#a1683a" ${S}/>`,
  sangak: () =>
    `<path d="M3.2 14.5C3 9 7 5.2 12.4 5.4c5.2.2 8.6 3.6 8.4 8.4-.2 4.4-3.8 6.8-8.8 6.8-5 0-8.6-2-8.8-6.1z" fill="#d9a15a" ${S}/>` +
    [[8, 10], [12, 9], [16, 10.5], [9.5, 14], [13.5, 13.4], [17, 14.6], [11.2, 17]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.3" ry=".9" fill="#8d5a2b"/>`).join("") +
    `<path d="M6 12c1.6-3 4-4.4 7-4.4" stroke="#f5d29a" stroke-width="1.2" stroke-linecap="round" fill="none"/>`,
  pistachioNut: (shell: string, kernel: string) =>
    `<path d="M12 3.2c4.4 0 7.4 4.3 7.4 9.2 0 4.8-3.2 8.4-7.4 8.4s-7.4-3.6-7.4-8.4c0-4.9 3-9.2 7.4-9.2z" fill="${shell}" ${S}/><path d="M9 6.2c1.7-1.4 4.3-1.4 6 0l-1.2 7.6c-.5 1.2-3.1 1.2-3.6 0z" fill="${kernel}" ${S}/><path d="M12 6.4v7" stroke="#33691e" stroke-width=".8"/><ellipse cx="8.2" cy="11" rx="1.2" ry="2.6" ${HL}/>`,
  almondNut: (c: string) =>
    `<path d="M12 2.8c3.8 3.4 6.4 7.4 6.4 11.2 0 3.8-2.8 6.6-6.4 6.6S5.6 17.8 5.6 14C5.6 10.2 8.2 6.2 12 2.8z" fill="${c}" ${S}/><path d="M9.2 9.5c.8 1 1 2.4.8 3.6M12.4 7.5c.9 1.6 1.2 3.4.8 5.4M14.8 10.5c.6 1.2.6 2.6.2 3.8" stroke="#8d6e63" stroke-width=".9" stroke-linecap="round" fill="none"/>`,
  walnutNut: () =>
    `<circle cx="12" cy="12.6" r="8.4" fill="#c9a27e" ${S}/><path d="M12 4.2v16.8" stroke="${OL}" stroke-width="1.1"/><path d="M6.6 8.6c1.4 1.2 1.4 3 0 4.2 1.4 1.2 1.4 3 0 4.2M17.4 8.6c-1.4 1.2-1.4 3 0 4.2-1.4 1.2-1.4 3 0 4.2M9.4 6.4c.8 1.4.8 2.6 0 4M14.6 6.4c-.8 1.4-.8 2.6 0 4" stroke="#8d6e63" stroke-width="1" fill="none" stroke-linecap="round"/>`,
  pomegranateFruit: (c: string) =>
    `<circle cx="12" cy="13.4" r="7.8" fill="${c}" ${S}/><path d="M9.4 5.8 10.2 3.4 12 5 13.8 3.4 14.6 5.8z" fill="${c}" ${S}/><ellipse cx="9" cy="11" rx="1.6" ry="2.4" ${HL}/><circle cx="14.6" cy="15.6" r="1" fill="#ff8a80"/>`,
  figFruit: (c: string) =>
    `<path d="M12 4.2c.6 2.4 1.6 3.6 3.4 5 2.6 2 3.8 4.2 3.8 6.6 0 3-3.2 5-7.2 5s-7.2-2-7.2-5c0-2.4 1.2-4.6 3.8-6.6 1.8-1.4 2.8-2.6 3.4-5z" fill="${c}" ${S}/><path d="M12 4.2c-.2-1 .2-1.8 1.2-2.4" stroke="#6d4c41" stroke-width="1.4" stroke-linecap="round"/><ellipse cx="9.4" cy="13" rx="1.4" ry="2.4" ${HL}/>`,
  datesFruit: (c: string) =>
    [[8, 9, -20], [14.5, 8.6, 18], [11.2, 15, 0]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="3.2" ry="5.4" transform="rotate(${r} ${x} ${y})" fill="${c}" ${S}/><ellipse cx="${x - 1}" cy="${y - 2}" rx=".9" ry="1.8" transform="rotate(${r} ${x} ${y})" ${HL}/>`).join(""),
  berriesTwig: (c: string) =>
    `<path d="M4 20c4-3 8-8 15-15" stroke="#6d4c41" stroke-width="1.6" stroke-linecap="round" fill="none"/>` +
    [[7, 15], [9.6, 16.6], [10.4, 12.4], [13, 13.6], [13.4, 9.4], [16, 10.4], [16.4, 6.6]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.9" ry="2.6" fill="${c}" ${S}/>`).join("") +
    `<path d="M15 4.8c1.8-.4 3.2.2 4 1.6-1.8.4-3.2-.2-4-1.6z" fill="#6dbb4a" ${S}/>`,
  cottonBoll: () =>
    `<path d="M12 21v-5" stroke="#6d4c41" stroke-width="1.6" stroke-linecap="round"/><path d="M7 15.5 12 13l5 2.5-2 2.6h-6z" fill="#8d6e63" ${S}/>` +
    [[9, 10.4, 3.6], [15, 10.4, 3.6], [12, 7, 4], [12, 12.4, 3.4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fafafa" ${S}/>`).join(""),
  teaLeaves: (c: string) =>
    `<path d="M12 21c0-4 .4-7.4 2-10" stroke="#5d4037" stroke-width="1.4" stroke-linecap="round" fill="none"/><path d="M12.4 13C7 13 4 9.6 4.4 4.4c5.2-.2 8.4 3 8 8.6z" fill="${c}" ${S}/><path d="M13.6 11.6c.2-4.4 2.8-7 6.8-7.2.4 4.2-2.2 7-6.8 7.2z" fill="${c}" ${S}/><path d="M12 12.6 6.4 6.4M14.2 10.8l4.6-4.6" stroke="#fff" stroke-opacity=".5" stroke-width=".9" stroke-linecap="round"/>`,
  bowlOf: (cols: string[]) =>
    [[8, 10.6], [11.2, 9.6], [14.6, 10.4], [9.6, 8], [13.2, 7.6], [16.4, 8.6], [6.8, 9]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="2.1" ry="1.5" fill="${cols[i % cols.length]}" ${S}/>`).join("") +
    `<path d="M3 11h18c-.6 5.4-4.4 9-9 9s-8.4-3.6-9-9z" fill="#5c6bc0" ${S}/><path d="M6 14.4c1.8.8 4 1.2 6 1.2s4.2-.4 6-1.2" stroke="#fdd835" stroke-width="1.2" fill="none"/>`,
  plateOf: (mound: string, dots: string) =>
    `<ellipse cx="12" cy="16.4" rx="9.6" ry="3.8" fill="#eceff1" ${S}/><path d="M5 15.4c0-4.4 3.2-8 7-8s7 3.6 7 8z" fill="${mound}" ${S}/>` +
    [[9, 11.6], [12.4, 10], [14.6, 12.4], [10.8, 13.6], [13.6, 14.4], [7.8, 14.2], [16, 14.6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".95" fill="${dots}"/>`).join(""),
  fabricRoll: (c: string) =>
    `<path d="M5 6h11v12H5z" fill="${c}" ${S}/><ellipse cx="16" cy="12" rx="3.2" ry="6" fill="${c}" ${S}/><ellipse cx="16" cy="12" rx="1.2" ry="2.4" fill="#fff" ${S}/><path d="M5 18c-1.4 1.2-2 2.2-1.6 3h10" fill="none" ${S}/><path d="M7.4 6v12M10.4 6v12" stroke="#fff" stroke-opacity=".45" stroke-width="1"/>`,
  carpetRug: () =>
    `<rect x="4" y="3" width="16" height="18" rx="1" fill="#b71c1c" ${S}/><rect x="6" y="5" width="12" height="14" fill="none" stroke="#1a237e" stroke-width="1.6"/><path d="M12 7.6 15.2 12 12 16.4 8.8 12z" fill="#fdd835" ${S}/><circle cx="12" cy="12" r="1.2" fill="#1a237e"/><path d="M5 21v1.6M7.5 21v1.6M10 21v1.6M12.5 21v1.6M15 21v1.6M17.5 21v1.6M5 3V1.4M7.5 3V1.4M10 3V1.4M12.5 3V1.4M15 3V1.4M17.5 3V1.4" stroke="#fff3e0" stroke-width=".9"/>`,
  teaGlass: (c: string) =>
    `<ellipse cx="12" cy="19.6" rx="7" ry="2" fill="#eceff1" ${S}/><path d="M8 5.4h8l-1 12.4c-.1.9-.8 1.6-1.7 1.6h-2.6c-.9 0-1.6-.7-1.7-1.6z" fill="#fff" fill-opacity=".7" ${S}/><path d="M8.4 9h7.2l-.8 8.8c-.1.7-.6 1.2-1.3 1.2h-3c-.7 0-1.2-.5-1.3-1.2z" fill="${c}"/><path d="M9.6 10v6" stroke="#fff" stroke-opacity=".5" stroke-width="1" stroke-linecap="round"/>`,
  teapot: (c: string) =>
    `<ellipse cx="11" cy="14" rx="6.6" ry="5.6" fill="${c}" ${S}/><path d="M17 12.6c2.2-.4 3.6.4 4 2-1.6.4-3 .6-4.2 0" fill="none" ${S}/><path d="M4.6 12.4C2.6 12.6 2 14.4 3 15.8c1 1.2 2.2 1 2.4.6" fill="none" ${S}/><rect x="9" y="6.4" width="4" height="2.6" rx="1" fill="${c}" ${S}/><circle cx="11" cy="5.6" r="1.1" fill="#fdd835" ${S}/><path d="M7 13.4c1.6 1.2 5.4 1.2 8 0" stroke="#fff" stroke-width="1.1" fill="none"/>`,
  sweetBox: (c: string, band: string) =>
    `<rect x="3.5" y="8" width="17" height="12" rx="1.4" fill="${c}" ${S}/><path d="M3.5 12h17" stroke="${band}" stroke-width="2"/>` +
    [[7, 15.8], [12, 15.8], [17, 15.8]].map(([x, y]) => `<rect x="${x - 2}" y="${y - 1.6}" width="4" height="3.2" rx=".8" fill="#fffde7" ${S}/><circle cx="${x}" cy="${y}" r=".7" fill="#7cb342"/>`).join("") +
    `<path d="M9 8c.4-2.4 1.4-3.6 3-3.6S14.6 5.6 15 8" fill="none" stroke="${band}" stroke-width="1.6"/>`,
  giftBox: (c: string, ribbon: string) =>
    `<rect x="4" y="9.5" width="16" height="11" rx="1.2" fill="${c}" ${S}/><rect x="3" y="6.8" width="18" height="3.6" rx="1" fill="${c}" ${S}/><path d="M12 6.8v13.7" stroke="${ribbon}" stroke-width="2.6"/><path d="M12 6.8C9.4 3 6.4 3.6 7 5.6c.4 1.2 2.6 1.4 5 1.2zm0 0c2.6-3.8 5.6-3.2 5-1.2-.4 1.2-2.6 1.4-5 1.2z" fill="${ribbon}" ${S}/>`,
  saffronTin: () =>
    `<ellipse cx="12" cy="18" rx="7.4" ry="2.6" fill="#b71c1c" ${S}/><path d="M4.6 10v8c0 1.4 3.3 2.6 7.4 2.6s7.4-1.2 7.4-2.6v-8" fill="#c62828" ${S}/><ellipse cx="12" cy="10" rx="7.4" ry="2.6" fill="#fdd835" ${S}/><path d="M10 9.6c.4-3 1-5 2.2-6.6M12 9.8c.2-2.8.8-4.6 2-6M13.8 9.6c.4-2 1.2-3.2 2.4-4" stroke="#d50000" stroke-width="1.2" stroke-linecap="round" fill="none"/><path d="M7 14.4h10" stroke="#fdd835" stroke-width="1.2"/>`,
  feedBowl: () =>
    `<path d="M3 13h18l-1.8 5.4c-.3.9-1.1 1.4-2 1.4H6.8c-.9 0-1.7-.5-2-1.4z" fill="#8d6e63" ${S}/>` +
    [[7, 11.6], [10, 10.6], [13, 11], [16, 10.4], [9, 12.4], [15, 12.4], [12, 9.6]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.8" ry="1.1" fill="#d7a64a" ${S}/>`).join(""),
};

export const ITEM_SVG: Record<string, string> = {
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
  poplar: shp.poplar(),
  planks: shp.planks(),
  crate: shp.crate(),
  cut_stone: shp.cutStone(),
  millstone: shp.millstone(),
  sangak: shp.sangak(),
  pistachio: shp.pistachioNut("#e8d9b0", "#8bc34a"),
  roasted_pistachio: shp.pistachioNut("#c9a36b", "#689f38"),
  almond: shp.almondNut("#c8955a"),
  walnut: shp.walnutNut(),
  pomegranate: shp.pomegranateFruit("#c62828"),
  fig: shp.figFruit("#6a1b9a"),
  dates: shp.datesFruit("#8d5524"),
  barberry: shp.berriesTwig("#e53935"),
  rice: shp.grain("#f1ead0"),
  cotton: shp.cottonBoll(),
  tea: shp.teaLeaves("#43a047"),
  nut_mix: shp.bowlOf(["#c8955a", "#8bc34a", "#8d5524", "#c9a27e"]),
  noghl: shp.bowlOf(["#fffde7", "#fff8e1", "#fce4ec"]),
  shirberenj: shp.plateOf("#fffaf0", "#8d6e63"),
  // P6.3: حلوای مادربزرگ — قرصِ قهوه‌ایِ نقش‌دار با خلالِ پسته و زعفران
  grandma_halva:
    `<ellipse cx="12" cy="16.6" rx="9.8" ry="3.9" fill="#eceff1" ${S}/><path d="M4.4 13.6v1.6c0 2 3.4 3.6 7.6 3.6s7.6-1.6 7.6-3.6v-1.6" fill="#7b3f1d" ${S}/><ellipse cx="12" cy="13.6" rx="7.6" ry="3.6" fill="#a8582a" ${S}/>` +
    [0, 30, 60, 90, 120, 150].map((a) => `<path d="M${12 + 6.2 * Math.cos((a * Math.PI) / 180)} ${13.6 + 2.9 * Math.sin((a * Math.PI) / 180)}L${12 - 6.2 * Math.cos((a * Math.PI) / 180)} ${13.6 - 2.9 * Math.sin((a * Math.PI) / 180)}" stroke="#7b3f1d" stroke-width=".7" stroke-linecap="round"/>`).join("") +
    `<ellipse cx="12" cy="13.6" rx="2.1" ry="1" fill="#f4b400" stroke="#7b3f1d" stroke-width=".6"/>` +
    [[8.3, 12.6, 25], [15.8, 12.9, -20], [10.4, 15.4, -35], [14.2, 15.2, 30]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="1.1" ry=".45" transform="rotate(${r} ${x} ${y})" fill="#7cb342"/>`).join(""),
  zereshk_polo: shp.plateOf("#fff3c4", "#e53935"),
  fabric: shp.fabricRoll("#90caf9"),
  carpet: shp.carpetRug(),
  brewed_tea: shp.teaGlass("#c1440e"),
  herbal_tea: shp.teapot("#f48fb1"),
  pom_paste: shp.jar("#7f0000", "#5d4037"),
  fig_jam: shp.jar("#6a1b9a", "#8d6e63"),
  rosewater: shp.bottle("#f8bbd0", "#ad1457"),
  gaz: shp.sweetBox("#e3f2fd", "#1565c0"),
  premium_saffron: shp.saffronTin(),
  souvenir: shp.giftBox("#43a047", "#fdd835"),
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
