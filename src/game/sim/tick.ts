/**
 * src/game/sim/tick.ts — شبیه‌سازیِ زمان: روز و حقوق، هوا و رویداد، رشد، رطوبت، ماشین‌ها و کارگرها
 * (P5.11: logic.ts به چهار ماژول ≤ ۴۰۰ خط شکسته شد؛ همه از مسیر "./logic" صادر می‌شوند)
 */
import { BMAP, CMAP, CROPS, N, DAY_LEN, WORKERS, FERT_COST, SEASONS, WeatherType, EventType, fmt } from "../data";
import {
  type State, type Events, idx, locked, capacity, invCount, has, hasTech, hasSkill, rnd,
  WATER_SECONDS, RAIN_SECONDS, SPRINKLER_SECONDS, DROUGHT,
} from "./state";
import { genOrder, price, addXp } from "./economy";
import { workshopTimeFactor } from "./legacy";
import { harvest, plant, collect, queueRecipe } from "./actions";

/** کارگاه‌های دامی (مرغداری، گاوداری، …) — هدفِ دامپزشک، دامپروری پیشرفته و دامدار مهربان */
const ANIMAL_OUT = new Set(["egg", "milk", "wool", "pork", "honey"]);
export const isAnimalBuilding = (b: { recipes: { out: string }[] }) => b.recipes.some((r) => ANIMAL_OUT.has(r.out));

/** ضریب زمانِ تولید دامی: دامپزشک ۱۵٪، «دامپروری پیشرفته» ۲۵٪ و «دامدار مهربان» ۱۵٪ سریع‌تر */
export function animalTimeFactor(s: State): number {
  let f = 1;
  if (s.workers.some((w) => w.kind === "vet")) f *= 0.85;
  if (hasTech(s, "animal_husbandry")) f /= 1.25;
  if (hasSkill(s, "animal_tamer")) f /= 1.15;
  return f;
}

export function tick(s: State, dt: number, ev: Events) {
  const prevDay = Math.floor(s.time / DAY_LEN);
  s.time += dt;
  const day = Math.floor(s.time / DAY_LEN);
  if (day !== prevDay) {
    s.day = day + 1;
    s.seasonIndex = Math.floor((s.day - 1) / 5) % 4;
    let wage = s.workers.reduce((a, w) => a + WORKERS[w.kind].wage, 0);
    if (hasTech(s, "automation_tech")) wage = Math.round(wage * 0.85);
    if (wage) {
      if (s.coins >= wage) { s.coins -= wage; s.stats.spent += wage; ev.toast(`حقوق روزانه کارکنان پرداخت شد: ${fmt(wage)} سکه`); }
      else { const w = s.workers.pop()!; ev.toast(`${WORKERS[w.kind].name} به دلیل عدم پرداخت حقوق استعفا داد`, "err"); }
    }
    const rand = Math.random();
    const sea = SEASONS[s.seasonIndex];
    if (sea.id === "winter") s.weather = rand < 0.5 ? "snow" : rand < 0.75 ? "fog" : "sun";
    else if (sea.id === "autumn") s.weather = rand < 0.45 ? "rain" : rand < 0.7 ? "fog" : "sun";
    else s.weather = rand < 0.3 ? "rain" : rand < 0.4 ? "heatwave" : "sun";
    if (s.currentEvent?.type === "drought" && (s.weather === "rain" || s.weather === "snow")) s.weather = rand < 0.5 ? "heatwave" : "sun"; // خشکسالی: بی‌باران
    s.weatherLeft = rnd(70, 160);
    if (s.weather !== "sun") {
      const n: Record<WeatherType, string> = { sun: "آفتابی", rain: "باران ملایم", snow: "بارش برف", fog: "مه صبحگاهی", heatwave: "موج گرما" };
      ev.toast(`تغییر هوا: ${n[s.weather]}`);
    }
  }
  if (s.weather !== "sun") { s.weatherLeft -= dt; if (s.weatherLeft <= 0) s.weather = "sun"; }
  s.eventAcc += dt;
  if (s.eventAcc > 120 && !s.currentEvent && Math.random() < 0.5) {
    s.eventAcc = 0;
    // خشکسالی فقط در تابستان وارد چرخه‌ی رویدادها می‌شود (P5.8)
    const ets: EventType[] = ["fair","market_boom","bountiful_harvest","livestock_show"];
    if (SEASONS[s.seasonIndex].id === "summer") ets.push("drought");
    const pick = ets[Math.floor(Math.random() * ets.length)];
    const texts: Record<EventType, string> = {
      fair: "نمایشگاه بهاره دهکده! +۲۵٪ تقاضای محصولات",
      market_boom: "رونق بزرگ بورس کالا! +۳۵٪ قیمت فروش",
      drought: "خشکسالی! خاک ۲ برابر زودتر خشک می‌شود، باران نمی‌بارد و قیمت محصولات ۲۰٪ بالا رفته",
      bountiful_harvest: "جشن برکت زمین! +۱ محصول در درو",
      livestock_show: "نمایشگاه سالانه دام! +۵۰٪ قیمت کالاهای دامی",
    };
    s.currentEvent = { type: pick, endsAt: s.time + 120, text: texts[pick] };
    if (pick === "drought" && s.weather === "rain") s.weather = "sun";
    ev.toast(s.currentEvent.text, "lvl");
  }
  if (s.currentEvent && s.time >= s.currentEvent.endsAt) { s.currentEvent = null; ev.toast("رویداد فصلی دهکده به پایان رسید"); }
  const season = SEASONS[s.seasonIndex];
  const drought = s.currentEvent?.type === "drought";
  // خشکسالی خشک‌شدن را تند و «شبکه‌ی قنات» کُند می‌کند (رطوبت ۵۰٪ ماندگارتر)
  const dryRate = (drought ? DROUGHT.dry : 1) / (hasTech(s, "qanat_net") ? 1.5 : 1);
  let gMult = season.growthRate;
  if (s.currentEvent?.type === "bountiful_harvest") gMult *= 1.2;
  if (s.weather === "heatwave") gMult *= 0.9;
  if (s.weather === "snow") gMult *= 0.82;
  if (s.weather === "fog") gMult *= 0.95;
  if (hasSkill(s, "grow_master")) gMult *= 1.10;
  if (hasTech(s, "biotech")) gMult *= 1.15;

  let autoR = 0;
  if (hasTech(s, "precision_agri")) autoR = 1;
  // مهندسی آبیاری (تحقیق) و «میراب» (مهارت) هر کدام شعاع آبیاری را ۱ خانه بیشتر می‌کنند
  const waterBonus = (hasTech(s, "irrigation_engineering") ? 1 : 0) + (hasSkill(s, "water_wise") ? 1 : 0);

  for (let i = 0; i < s.tiles.length; i++) {
    const t = s.tiles[i]; const x = i % N, y = Math.floor(i / N);
    // ── رطوبتِ زمان‌دار: خاک بعد از مدت محدود خشک می‌شود (P5.6)
    if (t.k === "soil" && t.wet) {
      if (t.dry === undefined) t.dry = WATER_SECONDS;
      t.dry -= dt * dryRate;
      if (t.dry <= 0) { t.dry = 0; t.wet = false; }
    }
    if (s.weather === "rain" && t.k === "soil") { t.wet = true; t.dry = Math.max(t.dry ?? 0, RAIN_SECONDS); }
    if (t.crop && (t.g || 0) < 1) {
      const c = CMAP[t.crop]; if (!c) continue;
      let sp = (dt / c.time) * gMult;
      if (t.wet) sp *= 1.8;
      else if (drought) sp *= DROUGHT.dryGrowth; // خاکِ تشنه در خشکسالی کند رشد می‌کند
      if (t.fert) sp *= 1.2;
      if (hasTech(s, "greenhouse_tech")) sp *= 1.2;
      if (s.workers.some((w) => w.kind === "scientist")) sp *= 1.2;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x+dx, ny = y+dy;
        if (nx<0 || ny<0 || nx>=N || ny>=N) continue;
        const n = s.tiles[idx(nx, ny)];
        if (n.k === "bld" && n.b === "greenhouse") sp *= 1.25;
      }
      t.g = Math.min(1, (t.g||0) + sp);
    }
    if (t.k === "bld" && t.b) {
      const b = BMAP[t.b]; if (!b) continue;
      const r = (b.radius || 0) + autoR;
      if (t.b === "sprinkler" || t.b === "mega_sprinkler" || t.b === "well" || t.b === "qanat") {
        // چاه و قنات = لوزی (فاصله‌ی منهتن)؛ آب‌پاش‌ها = مربعِ کامل (۸ و ۲۴ زمین)
        const diamondShape = t.b === "well" || t.b === "qanat";
        const wr = r + waterBonus;
        for (let dy = -wr; dy <= wr; dy++) for (let dx = -wr; dx <= wr; dx++) {
          const nx = x+dx, ny = y+dy;
          if (nx<0 || ny<0 || nx>=N || ny>=N) continue;
          if (diamondShape && Math.abs(dx)+Math.abs(dy) > wr) continue;
          const n = s.tiles[idx(nx, ny)];
          if (n.k === "soil") { n.wet = true; n.dry = Math.max(n.dry ?? 0, SPRINKLER_SECONDS); }
        }
      }
      if (t.b === "composter") {
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          const nx = x+dx, ny = y+dy;
          if (nx<0 || ny<0 || nx>=N || ny>=N) continue;
          if (Math.abs(dx)+Math.abs(dy) > r) continue;
          const n = s.tiles[idx(nx, ny)];
          if (n.k === "soil" && !n.fert && Math.random() < dt * 0.2) n.fert = true;
        }
      }
      if (t.b === "harvester") {
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          const nx = x+dx, ny = y+dy;
          if (nx<0 || ny<0 || nx>=N || ny>=N) continue;
          const n = s.tiles[idx(nx, ny)];
          if (n.crop && (n.g||0) >= 1 && invCount(s) < capacity(s)) harvest(s, nx, ny, ev, true);
        }
      }
      if (t.b === "auto_planter") {
        // P5.5: بذرپاش باید بذرِ واقعی از انبار مصرف کند؛ وگرنه با یک بذرِ ذخیره‌شده
        // می‌شد بی‌نهایت زمین کاشت و حلقه‌ی سود بی‌پایان ساخت.
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          const nx = x+dx, ny = y+dy;
          if (nx<0 || ny<0 || nx>=N || ny>=N) continue;
          const n = s.tiles[idx(nx, ny)];
          if (n.k !== "soil" || n.crop) continue;
          const cPick = CROPS.filter((c) => (s.inv[c.id] || 0) > 0)[0];
          if (!cPick) break; // بذر در انبار نیست → ماشین می‌ایستد
          const before = s.inv[cPick.id];
          if (plant(s, nx, ny, cPick.id, ev, true)) s.inv[cPick.id] = Math.max(0, before - 1); // یک بذر مصرف شد
        }
      }
      if (t.b === "auto_fertilizer") {
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          const nx = x+dx, ny = y+dy;
          if (nx<0 || ny<0 || nx>=N || ny>=N) continue;
          const n = s.tiles[idx(nx, ny)];
          if (n.k === "soil" && !n.fert && Math.random() < dt * 0.1) {
            if (s.coins >= Math.ceil(FERT_COST * 0.4)) { s.coins -= Math.ceil(FERT_COST * 0.4); s.stats.spent += Math.ceil(FERT_COST * 0.4); n.fert = true; }
          }
        }
      }
      if (b.recipes.length && t.q && t.q.length && (t.out?.length || 0) < 6) {
        const rIndex = t.q[0];
        const r = b.recipes[rIndex]; if (!r) continue;
        let timeR = r.time;
        if (hasTech(s, "speed_ovens")) timeR *= 0.75;
        if (hasSkill(s, "artisan")) timeR *= 0.85;
        if (isAnimalBuilding(b)) timeR *= animalTimeFactor(s);
        timeR *= workshopTimeFactor(s.prestige); // P6.3: نسل‌های بعد تندترند (پیش از این کُندتر می‌شدند)
        t.p = (t.p||0) + dt / timeR;
        if (t.p >= 1) {
          t.out = [...(t.out||[]), ...Array<string>(Math.max(1, r.n || 1)).fill(r.out)];
          t.q = t.q.slice(1); t.p = 0;
          addXp(s, r.xp, ev);
          if (t.autoMode && t.lr !== undefined && has(s, b.recipes[t.lr].inp)) queueRecipe(s, t, t.lr, ev, true);
        }
      }
    }
  }
  Object.values(s.market).forEach((m) => (m.sat = Math.max(0, m.sat - dt * 0.0035)));
  s.histAcc += dt;
  if (s.histAcc > 7) {
    s.histAcc = 0;
    Object.keys(s.market).forEach((k) => { const h = s.market[k].hist; h.push(price(s, k)); if (h.length > 40) h.shift(); });
  }
  s.orders = s.orders.map((o) => (o.exp < s.time ? genOrder(s) : o));
  const maxOrders = Math.min(7, 3 + Math.floor(s.level / 3));
  while (s.orders.length < maxOrders) s.orders.push(genOrder(s));
  s.wAcc += dt;
  while (s.wAcc > 2.2) {
    s.wAcc -= 2.2;
    for (const w of s.workers) {
      if (w.kind === "farmhand") {
        for (let a = 0; a < 3; a++) {
          const i = s.tiles.findIndex((t, j) => t.crop && (t.g||0) >= 1 && !locked(s, j % N, Math.floor(j / N)));
          if (i >= 0) {
            const crop = s.tiles[i].crop!; const x = i % N, y = Math.floor(i / N);
            // P5.5: کاشتِ دوباره‌ی کارگر هم بذر می‌خواهد (یک عدد از همان محصول در انبار)
            if (harvest(s, x, y, ev, true) && (s.inv[crop] || 0) >= 1) {
              if (plant(s, x, y, crop, ev, true)) s.inv[crop] -= 1;
            }
          }
          const d = s.tiles.find((t) => t.crop && !t.wet); if (d) { d.wet = true; d.dry = Math.max(d.dry ?? 0, SPRINKLER_SECONDS); }
        }
      } else if (w.kind === "operator") {
        s.tiles.forEach((t, i) => {
          if (t.k !== "bld") return;
          if (t.out?.length) collect(s, t, i % N, Math.floor(i / N), ev, true);
          if ((t.q?.length || 0) === 0 && t.lr !== undefined && BMAP[t.b!].recipes[t.lr]) queueRecipe(s, t, t.lr, ev, true);
        });
      }
    }
  }
}
