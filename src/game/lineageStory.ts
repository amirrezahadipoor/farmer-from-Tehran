/**
 * src/game/lineageStory.ts — فصل‌های نسل (P6.4): داستانی که با هر تناسخ ادامه دارد
 *
 * داستانِ اصلی (story.ts) دست‌نخورده می‌ماند؛ این‌جا با هر تناسخ یک فصلِ تازه از روی
 * متغیرهای نسلِ قبل ساخته می‌شود (sim/lineage.ts):
 *  • صحنه‌ی آغاز بسته به شماره‌ی نسل فرق دارد (وارث / نوه / نسل‌های بعد)
 *  • نسلِ قبل با «سبکِ» واقعی‌اش حرف می‌زند و عددهای خودش را می‌گوید
 *  • هدفِ فصل ادامه‌ی همان سبک است و از لحظه‌ی قول شمرده می‌شود (نه از کلِ عمرِ مزرعه)
 *  • پایان: نامِ وارث کنارِ نام‌های قبلی روی تنه‌ی گردوی پیر
 * صحنه‌ها قالب‌اند: {name} {prev} {founder} {gen} {days} {harvested} {orders} {produced}
 * {decorations} {target} {line} {count} پیش از نمایش پر می‌شوند.
 */
import { fmt } from "./data";
import { addXp, currentHeir, joinFa, lineageChain, prevName, suggestHeirName, type Events, type State, type Trait } from "./logic";
import { LAST_CH, currentChapter, goalProgress, type GoalKind, type StoryChapter, type StoryScene } from "./story";

export { nameHeir, setLineageShown } from "./sim/lineage";

const HEIR = "/images/story_heir.webp";       // ایوانِ خانه در سپیده: دفترچه‌ی کهنه‌ی حلوا، کلید و بشقاب حلوا روی میز
const LINEAGE = "/images/story_lineage.webp"; // غروب: گردوی پیر با فانوس‌های آویزان، نیمکت چوبی، آسیاب و دهکده
const FARM = "/images/story_farm.webp";       // دره زرین زیر مه طلایی صبح (قولِ وارث)
const GRANDPA = "/images/story_grandpa.webp"; // بابابزرگ رحیم وسطِ گندمزار (دعای پایانی)

/* ------------------------------------------------------------ قالب‌ها */
/** آغاز: ۱ = وارث (دخترِ فصلِ ۱۰)، ۲ = نوه، ۳ = نسل‌های بعد */
const OPENING: Record<1 | 2 | 3, StoryScene> = {
  1: { sp: "راوی", role: "", av: "narrator", bg: HEIR, mood: "hope", text: "صبحِ روزی که {prev} کلید را سپرد، مهِ دره هنوز روی گندم‌ها بود. {name} همان کسی بود که روزی گفته بود «می‌خواهم خودم مزرعه را بگردانم». حالا روی میزِ ایوان یک کلید بود، یک دفترچه‌ی کهنه و یک بشقاب حلوا." },
  2: { sp: "راوی", role: "", av: "narrator", bg: HEIR, mood: "hope", text: "نسلِ {gen}. {name} در همین ایوان بزرگ شده بود؛ لای گندم‌ها قایم‌موشک بازی کرده بود و صدای پره‌های آسیاب لالایی‌اش بود. امروز کلید را {prev} روی میز گذاشت و گفت نوبتِ توست." },
  3: { sp: "راوی", role: "", av: "narrator", bg: HEIR, mood: "hope", text: "نسلِ {gen}. روی تنه‌ی گردوی پیر حالا {count} نام کنده شده بود: {line}. {name} کلید را از دستِ {prev} گرفت و صدای آشنای درِ انبار را شنید." },
};

/** نسلِ قبل، با عددهای واقعیِ کارنامه‌اش */
const ELDER: Record<Trait, StoryScene> = {
  farmer: { sp: "{prev}", role: "کشاورزِ نسلِ پیش", av: "notary", bg: HEIR, mood: "warm", text: "در {days} روزِ کارم {harvested} بار محصول از این خاک برداشتم. رازش ساده است: زمین را هیچ صبحی تنها نگذار. خاک قدرِ دستی را که هر روز می‌آید می‌داند." },
  merchant: { sp: "{prev}", role: "بازرگانِ نسلِ پیش", av: "notary", bg: HEIR, mood: "warm", text: "در {days} روز {orders} سفارش را سرِ وقت به کاروان‌ها رساندم. مردم این دره را به قولش می‌شناسند، نه به انبارش. قولِ دره زرین را نشکن." },
  artisan: { sp: "{prev}", role: "صنعتگرِ نسلِ پیش", av: "notary", bg: HEIR, mood: "warm", text: "در {days} روز کارگاه‌های دره {produced} بار کالا بیرون دادند؛ نان و روغن و پارچه. محصولِ خام را هر کسی می‌فروشد؛ تو هنرِ دست را بفروش." },
  builder: { sp: "{prev}", role: "آبادگرِ نسلِ پیش", av: "notary", bg: HEIR, mood: "warm", text: "در {days} روز {decorations} نشانه‌ی تازه در دره گذاشتم؛ حوض و فانوس و درخت. آدم‌ها برای محصول می‌آیند، ولی برای زیبایی می‌مانند." },
};

/** دفترچه‌ی حلوای مادربزرگ (دستورِ خانوادگیِ P6.3) */
const RECIPE: Record<1 | 2, StoryScene> = {
  1: { sp: "خاله رعنا", role: "همسایه‌ی دهکده", av: "rana", bg: HEIR, mood: "warm", text: "این دفترچه را مادربزرگت با خطِ خودش نوشته: آرد، عسل و صبر. {prev} هم اولِ کار حلوایش سوخت. نگران نباش؛ حلوای دره زرین همیشه بارِ دوم خوب می‌شود." },
  2: { sp: "راوی", role: "", av: "narrator", bg: HEIR, mood: "warm", text: "حاشیه‌ی دفترچه‌ی حلوا پر از خط‌های جورواجور بود: خطِ لرزانِ خاله رعنا، خطِ تندِ {founder} و حالا جای خالی برای {name}. زیرِ دستور کسی نوشته بود: «بارِ دوم خوب می‌شود.»" },
};

/** قولِ وارث = هدفِ فصل */
const PROMISE: Record<Trait, StoryScene> = {
  farmer: { sp: "{name}", role: "وارثِ نسلِ {gen}", av: "hero", bg: FARM, mood: "hope", text: "قول می‌دهم در همین نسل {target} بار محصول از این خاک بردارم. گندم‌ها منتظرند و من دیگر مهمانِ این دره نیستم." },
  merchant: { sp: "{name}", role: "وارثِ نسلِ {gen}", av: "hero", bg: FARM, mood: "hope", text: "قول می‌دهم {target} سفارش را سرِ وقت تحویل بدهم. قولِ دره زرین از امروز قولِ من است." },
  artisan: { sp: "{name}", role: "وارثِ نسلِ {gen}", av: "hero", bg: FARM, mood: "hope", text: "قول می‌دهم کارگاه‌ها در این نسل {target} بار کالا بیرون بدهند. هنرِ دست را از یاد نمی‌بریم." },
  builder: { sp: "{name}", role: "وارثِ نسلِ {gen}", av: "hero", bg: FARM, mood: "hope", text: "قول می‌دهم {target} نشانه‌ی تازه در دره بگذارم تا نسلِ بعد، دره را زیباتر از من تحویل بگیرد." },
};

const ENDING: StoryScene[] = [
  { sp: "راوی", role: "", av: "narrator", bg: LINEAGE, mood: "epic", text: "غروبِ همان سال، {name} با چاقوی کوچکِ رحیم نامش را روی تنه‌ی گردوی پیر کند، زیرِ {count} نامِ دیگر: {line}. فانوس‌ها یکی‌یکی روشن شدند و آسیاب، مثلِ هر شب، آرام چرخید." },
  { sp: "بابابزرگ رحیم", role: "در هر خوشه‌ی گندم", av: "grandpa", bg: GRANDPA, mood: "warm", text: "{name}، نامت کنارِ نامِ {prev} خوش نشسته. هر نسل یک بار زمین را از نو زنده می‌کند و تو کردی. حالا کمی روی نیمکت بنشین؛ فصل عوض می‌شود، قول نه." },
];

/* ------------------------------------------------------------ هدف */
type StatKey = "harvested" | "orders" | "produced" | "decorations";
interface GoalDef { stat: StatKey; kind: GoalKind; target: (gen: number) => number; label: (t: string) => string }
export const LINEAGE_GOALS: Record<Trait, GoalDef> = {
  farmer: { stat: "harvested", kind: "harvest", target: (g) => 150 + 100 * g, label: (t) => `برداشتِ ${t} محصول در این نسل` },
  merchant: { stat: "orders", kind: "orders", target: (g) => 8 + 4 * g, label: (t) => `تحویلِ ${t} سفارش در این نسل` },
  artisan: { stat: "produced", kind: "produced", target: (g) => 25 + 15 * g, label: (t) => `تولیدِ ${t} کالا در کارگاه‌ها در این نسل` },
  builder: { stat: "decorations", kind: "decorations", target: (g) => 3 + 2 * g, label: (t) => `گذاشتنِ ${t} دکورِ تازه در این نسل` },
};
export const lineageReward = (gen: number) => ({ coins: 2000 + 4000 * gen, xp: 250 + 150 * gen, sp: 2 });

/* ------------------------------------------------------------ ساختِ فصل */
const ORD = ["", "اول", "دوم", "سوم", "چهارم", "پنجم", "ششم", "هفتم", "هشتم", "نهم", "دهم", "یازدهم", "دوازدهم", "سیزدهم", "چهاردهم", "پانزدهم", "شانزدهم", "هفدهم", "هجدهم", "نوزدهم", "بیستم"];
/** «دوم»، «سوم»، ... و پس از بیستم «۲۱ام» */
export const ordinalFa = (n: number) => ORD[n] ?? `${fmt(n)}ام`;

export function lineageTitle(gen: number) {
  if (gen <= 1) return { title: "وارث", subtitle: "کلید، دفترچه‌ی حلوا و قولی قدیمی" };
  if (gen === 2) return { title: "نوه‌ی دره", subtitle: "نسلِ سوم روی همان خاک" };
  return { title: `نسلِ ${ordinalFa(gen + 1)}`, subtitle: "نام‌ها روی تنه‌ی گردو بیشتر می‌شوند" };
}

/** متغیرهای فصلِ جاری (برای تست و نمایش) */
export function lineageVars(s: State): Record<string, string> | null {
  const L = s.lineage;
  const h = currentHeir(s);
  if (!L || !h) return null;
  const before = lineageChain(s).filter((_, i, a) => !(h.name && i === a.length - 1));
  return {
    name: h.name || suggestHeirName(h.gen),
    prev: prevName(s),
    founder: L.founder,
    gen: ordinalFa(h.gen + 1),
    days: fmt(h.days),
    harvested: fmt(h.harvested),
    orders: fmt(h.orders),
    produced: fmt(h.produced),
    decorations: fmt(h.decorations),
    target: fmt(LINEAGE_GOALS[h.trait].target(h.gen)),
    line: joinFa(before),
    count: fmt(before.length),
  };
}

export const fillVars = (text: string, v: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, k: string) => v[k] ?? m);

export function lineageChapter(s: State): StoryChapter | null {
  const h = currentHeir(s);
  const v = lineageVars(s);
  if (!h || !v) return null;
  const fill = (sc: StoryScene): StoryScene => ({ ...sc, sp: fillVars(sc.sp, v), role: fillVars(sc.role, v), text: fillVars(sc.text, v) });
  const g = LINEAGE_GOALS[h.trait];
  const target = g.target(h.gen);
  const opening = OPENING[h.gen >= 3 ? 3 : (h.gen as 1 | 2)];
  return {
    id: `lin${h.gen}`,
    num: LAST_CH + h.gen,
    ...lineageTitle(h.gen),
    scenes: [opening, ELDER[h.trait], RECIPE[h.gen === 1 ? 1 : 2], PROMISE[h.trait]].map(fill),
    endScenes: ENDING.map(fill),
    goal: { kind: g.kind, target, label: g.label(fmt(target)) },
    reward: lineageReward(h.gen),
  };
}

/* ------------------------------------------------------------ ماشینِ حالت */
export function lineageProgress(s: State): { cur: number; target: number; label: string } {
  const L = s.lineage;
  const h = currentHeir(s);
  if (!L || !h) return { cur: 0, target: 1, label: "" };
  const g = LINEAGE_GOALS[h.trait];
  const target = g.target(h.gen);
  const raw = Math.max(0, (s.stats[g.stat] ?? 0) - L.goalBase);
  const cur = L.phase === "goal" ? raw : L.phase === "end" || L.phase === "done" ? target : 0;
  return { cur, target, label: g.label(fmt(target)) };
}

export function advanceLineage(s: State, ev: Events) {
  const L = s.lineage;
  const h = currentHeir(s);
  const ch = lineageChapter(s);
  if (!L || !h || !ch) return;
  if (L.phase === "scenes") {
    L.sceneIdx++;
    if (L.sceneIdx >= ch.scenes.length) {
      L.phase = "goal";
      L.sceneIdx = 0;
      L.shown = false;
      L.goalBase = s.stats[LINEAGE_GOALS[h.trait].stat] ?? 0;
    }
  } else if (L.phase === "end") {
    L.sceneIdx++;
    if (L.sceneIdx >= ch.endScenes.length) finishLineage(s, ch, ev);
  } else if (L.phase !== "name") {
    L.shown = false;
  }
}

function finishLineage(s: State, ch: StoryChapter, ev: Events) {
  const L = s.lineage!;
  const gen = s.prestige;
  L.phase = "done";
  L.sceneIdx = 0;
  L.shown = false;
  if (L.completed.includes(gen)) return;
  L.completed.push(gen);
  s.coins += ch.reward.coins;
  s.stats.earned += ch.reward.coins;
  s.stats.skillPoints += ch.reward.sp;
  addXp(s, ch.reward.xp, ev);
  ev.toast(`فصل ${fmt(ch.num)} «${ch.title}» تمام شد! +${fmt(ch.reward.coins)} سکه و ${fmt(ch.reward.sp)} امتیاز مهارت`, "lvl");
  ev.sound("chapter");
}

/** هر ثانیه از loop: آیا قولِ وارث عملی شد؟ */
export function updateLineage(s: State, ev: Events) {
  const L = s.lineage;
  if (!L || L.phase !== "goal") return;
  const p = lineageProgress(s);
  if (p.cur < p.target) return;
  L.phase = "end";
  L.sceneIdx = 0;
  L.shown = true;
  const ch = lineageChapter(s);
  ev.toast(`قولِ فصل «${ch?.title ?? ""}» عملی شد! صحنه‌ی پایانی را ببین`, "lvl");
  ev.sound("goal");
}

/** همان ثانیه‌ای که تناسخ هدفِ فصلِ اصلی را کامل می‌کند، اول صحنه‌ی پایانیِ داستانِ اصلی بیاید */
export function mainStoryPending(s: State): boolean {
  if (s.story.done || s.story.phase !== "goal") return false;
  const ch = currentChapter(s);
  if (!ch.goal) return false;
  const p = goalProgress(s, ch);
  return p.cur >= p.target;
}

/** پرده‌ی نسل الان باید دیده شود؟ */
export const lineageVisible = (s: State) => !!s.lineage?.shown && !s.story.shown && !mainStoryPending(s);
