/**
 * src/game/sim/achieve.ts — V.8: پیشرفت زنده‌ی دستاوردها برای دیوار مدال‌ها
 * هر دستاورد یک عدد ۰ تا  برمی‌گرداند؛ دیوار مدال‌ها نوار پیشرفت را زنده نشان می‌دهد.
 */
import type { State } from "./state";
import { BMAP } from "../data";

const AUTO = new Set(["harvester", "auto_planter", "auto_fertilizer"]);
const ZOO = new Set(["coop", "barn", "sheep", "pigpen", "beehive"]);

export function achievementProgress(s: State, id: string): number {
  if (s.achievements[id]) return 1;
  const st = s.stats;
  let v = 0;
  switch (id) {
    case "first_harvest": v = st.harvested; break;
    case "rich1": v = s.coins / 1000; break;
    case "rich2": v = s.coins / 10_000; break;
    case "rich3": v = s.coins / 100_000; break;
    case "level10": v = s.level / 10; break;
    case "level20": v = s.level / 20; break;
    case "level25": v = s.level / 25; break;
    case "factory_master": v = st.produced / 60; break;
    case "land_baron": v = s.bought / 10; break;
    case "automation_king": v = s.tiles.filter((t) => t.b && AUTO.has(t.b)).length / 5; break;
    case "zoo": v = new Set(s.tiles.filter((t) => t.b && ZOO.has(t.b)).map((t) => t.b)).size / 5; break;
    case "decorator": v = s.tiles.filter((t) => t.b && BMAP[t.b]?.isDecor).length / 10; break;
    case "skill_master": v = s.skills.length / 10; break;
    default: v = 0;
  }
  return Math.max(0, Math.min(1, v));
}
