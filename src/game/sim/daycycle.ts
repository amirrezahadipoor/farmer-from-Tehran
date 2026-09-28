/**
 * src/game/sim/daycycle.ts — چرخه‌ی روز: گذرِ روز و حقوق، آب‌وهوا، رویدادهای فصلی و فستیوال
 * (شکسته‌شده از tick.ts — رفتار و ترتیب کاملاً بدون تغییر)
 */
import { DAY_LEN, WORKERS, SEASONS, WeatherType, EventType, fmt } from "../data";
import { type State, type Events, hasTech, rnd } from "./state";
import { proposeFestival } from "./festival";

/** گذرِ یک تیکِ زمان روی چرخه‌ی روز: روز جدید و حقوق، شمارشِ آب‌وهوا، رویدادها و فستیوال */
export function stepDay(s: State, dt: number, ev: Events): void {
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
    if (pick === "drought") ev.shake?.(); // V.3: لرزش ملایم هشدار خشکسالی
    ev.toast(s.currentEvent.text, "lvl");
  }
  if (s.currentEvent && s.time >= s.currentEvent.endsAt) { s.currentEvent = null; ev.toast("رویداد فصلی دهکده به پایان رسید"); }
  // V.5: روز اول هر فصل، فستیوال دهکده پیشنهاد می‌شود (یک‌بار در هر فصل)
  if (proposeFestival(s)) ev.toast(`فستیوالِ فصل ${SEASONS[s.seasonIndex].name} رسید — یکی از سه راه را برگزین`, "lvl");
}
