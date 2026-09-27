import { it, expect } from "vitest";
import {
  newState, tick, harvest, plant, collect, sell, queueRecipe, unlockTech, learnSkill,
  fulfill, claimContract, hire, toolAction, prestigeCoins,
} from "../src/game/logic";
import { BMAP, CROPS, CONTRACTS, TECH_TREE, SKILLS, xpFor, DAY_LEN, N } from "../src/game/data";
import type { State, Events } from "../src/game/logic";

const ev: Events = { toast: () => {}, fx: () => {}, sound: () => {} };
const idx = (x: number, y: number) => y * N + x;

const BUILD_ORDER = ["well", "mill", "bakery", "coop", "sprinkler", "barn", "sheep", "pigpen", "beehive", "greenhouse", "silo", "harvester", "auto_planter", "auto_fertilizer", "feedmill", "dairy", "composter"];
const TECH_ORDER = ["seeds1", "speed_ovens", "market1", "greenhouse_tech", "storage1", "export_license", "order_bonus", "auto_feed", "animal_husbandry", "crop_xp", "storage2", "automation_tech", "precision_agri", "irrigation_engineering", "fertilizer_master", "mega_silo", "export_pack", "qanat_net", "global_market", "biotech"];
const SKILL_ORDER = ["master_planter", "fert_soil", "harvest_god", "price_mind", "grow_master", "storage_master", "water_wise", "animal_tamer", "artisan", "crop_lord", "economist", "zen_master"];

function freeTile(s: State): [number, number] | null {
  for (let y = 6; y < N - 6; y++)
    for (let x = 6; x < N - 6; x++) {
      const t = s.tiles[idx(x, y)];
      if (t.k === "grass") return [x, y];
    }
  return null;
}

function manage(s: State) {
  // harvest + collect
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = s.tiles[idx(x, y)];
    if (t.crop && (t.g || 0) >= 1) harvest(s, x, y, ev, true);
    if (t.k === "bld") collect(s, t, x, y, ev, true);
  }
  // orders
  s.orders.forEach((o, i) => { if (o.items.every((it) => (s.inv[it.id] || 0) >= it.n)) fulfill(s, i, ev); });
  // water + plant
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = s.tiles[idx(x, y)];
    if (t.k === "soil") {
      if (!t.wet) toolAction(s, x, y, "water", "", ev);
      if (!t.crop) {
        const best = [...CROPS].filter((c) => c.lvl <= s.level && c.seed <= s.coins / 8).sort((a, b) => b.lvl - a.lvl)[0];
        if (best) plant(s, x, y, best.id, ev, true);
      }
    }
  }
  // hoe more soil early/mid
  const soil = s.tiles.filter((t) => t.k === "soil").length;
  const wantSoil = Math.min(160, 24 + s.level * 6);
  if (soil < wantSoil && s.coins > 400) {
    outer: for (let y = 10; y < N - 10; y++) for (let x = 10; x < N - 10; x++) {
      const t = s.tiles[idx(x, y)];
      if (t.k === "grass") { toolAction(s, x, y, "hoe", "", ev); if (s.tiles[idx(x, y)].k === "soil") break outer; }
    }
  }
  // clear trees/rocks inside farm area for build space occasionally
  // buildings
  for (const id of BUILD_ORDER) {
    const b = BMAP[id];
    if (!b || b.lvl > s.level) continue;
    const count = s.tiles.filter((t) => t.b === id).length;
    if (count >= 1) continue;
    const spot = freeTile(s);
    if (spot && s.coins > b.cost * 2.2) toolAction(s, spot[0], spot[1], "build", id, ev);
  }
  // queue recipes
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = s.tiles[idx(x, y)];
    if (t.k === "bld" && t.b) {
      const b = BMAP[t.b];
      b.recipes.forEach((r, ri) => {
        if ((r.lvl ?? 0) > s.level) return;
        if (Object.entries(r.inp).every(([k, n]) => (s.inv[k] || 0) >= n * 2)) queueRecipe(s, t, ri, ev, true);
      });
    }
  }
  // sell surplus (gradual to keep prices sane)
  for (const k of Object.keys(s.inv)) {
    const n = (s.inv[k] || 0) - 12;
    if (n > 8) sell(s, k, Math.min(n, 24), ev);
  }
  // workers
  if (s.level >= 2 && s.coins > 2500 && !s.workers.some((w) => w.kind === "farmhand")) hire(s, "farmhand", ev);
  if (s.level >= 4 && s.coins > 4000 && !s.workers.some((w) => w.kind === "operator")) hire(s, "operator", ev);
  if (s.level >= 7 && s.coins > 6000 && !s.workers.some((w) => w.kind === "scientist")) hire(s, "scientist", ev);
  // tech & skills
  for (const id of TECH_ORDER) if (!s.techs.includes(id) && s.coins > 3000) unlockTech(s, id, ev);
  for (const id of SKILL_ORDER) if (!s.skills.includes(id) && s.stats.skillPoints > 0) learnSkill(s, id, ev);
  // contracts
  for (const c of CONTRACTS) claimContract(s, c.id, ev);
}

it("bot plays to prestige — timing estimate", () => {
  const s = newState();
  s.story.shown = false;
  let t12 = -1, t20 = -1, t10k = -1;
  const MAX = 60 * 60 * 30; // 30h sim cap
  for (; s.time < MAX; s.time += 1) {
    tick(s, 1, ev);
    if (Math.floor(s.time) % 2 === 0) manage(s);
    if (t12 < 0 && s.level >= 12) t12 = s.time;
    if (t20 < 0 && s.level >= 20) t20 = s.time;
    if (t10k < 0 && s.coins >= 10000) t10k = s.time;
    if (s.level >= 20 && s.coins >= prestigeCoins(s)) break; // V.7: آستانه‌ی پویا
  }
  const h = (t: number) => (t / 3600).toFixed(2);
  // V.7: معیارهای رضایت — در هر اجرا در لاگ ثبت می‌شوند
  const hours = s.time / 3600;
  const ratio = s.coins / prestigeCoins(s);
  expect(hours).toBeGreaterThanOrEqual(0.5);
  expect(hours).toBeLessThanOrEqual(1.5);
  expect(ratio).toBeLessThanOrEqual(5);
  console.log("SIM RESULT:", JSON.stringify({
    reachedPrestige: s.level >= 20 && s.coins >= prestigeCoins(s),
    timeToPrestigeHours: h(s.time),
    timeToLevel12Hours: h(t12),
    timeToLevel20Hours: h(t20),
    timeTo10kCoinsHours: h(t10k),
    coinsAtPrestige: s.coins, threshold: prestigeCoins(s), ratio: +ratio.toFixed(2),
    final: { level: s.level, coins: s.coins, day: s.day, harvested: s.stats.harvested, produced: s.stats.produced, orders: s.stats.orders, earned: s.stats.earned },
  }));
  // xp curve sanity for reporting
  let cum = 0; for (let l = 1; l < 20; l++) cum += xpFor(l);
  console.log("XP to 20:", cum, " XP to 25:", (() => { let c = 0; for (let l = 1; l < 25; l++) c += xpFor(l); return c; })());
}, 120000);
