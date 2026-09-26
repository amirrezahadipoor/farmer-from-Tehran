import { State, addXp, Events } from "./logic";

export type Mood = "sad" | "warm" | "tense" | "hope" | "epic" | "night";
export interface StoryScene { sp: string; role: string; av: string; bg: string; text: string; mood: Mood }
export type GoalKind =
  | "level" | "harvest" | "produced" | "orders" | "coins_total" | "workers"
  | "decorations" | "animals" | "skills" | "prestige" | "buildings" | "techs";
export interface StoryGoal { kind: GoalKind; target: number; ids?: string[]; label: string }
export interface StoryChapter {
  id: string; num: number; title: string; subtitle: string;
  scenes: StoryScene[]; endScenes: StoryScene[];
  goal?: StoryGoal; reward: { coins: number; xp: number; sp: number };
}

const OFFICE = "/images/story_office.webp";       // تهران، ساعت ۶:۴۲ عصر، باران روی شیشه‌ی طبقه‌ی چهاردهم، جعبه‌ی مقوایی اخراج
const WILL = "/images/story_will.webp";           // دفتر اسناد استاد وکیلی: چراغ نفتی، بوی کاغذ کهنه، وصیت‌نامه و سند
const FARM = "/images/story_farm.webp";           // دره زرین زیر مه طلایی صبح، جاده‌ی خاکی، آسیاب شکسته روی تپه
const GRANDPA = "/images/story_grandpa.webp";     // بابابزرگ رحیم، ایستاده وسط گندمزار با لبخند همیشگی (قاب عکس و وصیت‌نامه)
const FEST = "/images/story_festival.webp";       // شب جشن برداشت: فانوس بین داربست‌ها، میز بلند پر از نان و پای و عسل
const NIGHT = "/images/story_night.webp";         // شب مهتابی دره؛ حوض و فواره، نور فانوس، نیمکت چوبی و قاب عکس
const SUNSET = "/images/story_sunset.webp";       // غروب سینمایی گندمزار و کوه‌ها (پایان فصل‌ها و وصیت نسل بعد)
const HARVEST = "/images/story_harvest.webp";     // زعفران: گل‌های بنفش پیش از باز شدن، سبد رشته‌های سرخ، صبح زود
const LIVESTOCK = "/images/story_livestock.webp"; // دامداری و کندوها: مرغداری، گاو، گوسفند، شبدر
const FACTORY = "/images/story_factory.webp";     // کارگاه مدرن دره (کاری که ظلّی می‌خواست: کارخانه و انبار) — تصویر «نه» گفتن
const VILLAGE = "/images/story_village.webp";     // کوچه‌ی دهکده پس از باران، دیوار کاهگلی، پنجره‌ی روشن و آجر فرش خیس
const MILL = "/images/story_mill.webp";           // آسیاب بادی دره در طلوع؛ پره‌های چرخان و «هزار و دویست سکه‌ی رویا»
const LANDGRAB = "/images/story_landgrab.webp";   // ماشین سیاه گران‌قیمت خسرو ظلّی، مثل لکه‌ی جوهر روی کاغذ گندمزار
const EXPO = "/images/story_expo.webp";           // نمایشگاه ملی کشاورزی: غرفه‌ی دره زرین و داورها
const BARN = "/images/story_barn.webp";           // انبار کاه غروب؛ پاکت زرد از زیر تیرکِ سقف بیرون می‌افتد
const HOUSE = "/images/story_house.webp";         // ایوان خانه‌ی رحیم؛ کلید در گلدانِ شمعدانی (کلیدِ نسل بعد)
const MACHINES = "/images/story_machines.webp";   // عصر ماشین‌ها: دروگر و بذرپاش خودکار، چراغ‌های کوچک میان مه صبح

export const CHAPTERS: StoryChapter[] = [
  {
    id: "ch0", num: 0, title: "پیش‌پرده", subtitle: "روزی که همه‌چیز تمام شد، و روزی که همه‌چیز آغاز شد",
    scenes: [
      { sp: "راوی", role: "", av: "📖", bg: OFFICE, mood: "sad", text: "تهران، ساعت شش و چهل و دو دقیقه‌ی عصر. باران به شیشه‌ی طبقه‌ی چهاردهم می‌کوبید. {name} هنوز نمی‌دانست که این آخرین غروبِ زندگیِ قبلی‌اش است." },
      { sp: "آقای فَرّخ", role: "مدیرعامل", av: "🕴️", bg: OFFICE, mood: "tense", text: "{name} جان، بنشین. راستش را بگویم؟ هیئت‌مدیره دیشب تصمیم گرفت واحد بازاریابی را منحل کند. شش سال زحمت کشیدی، ولی... عدد و رقم احساس ندارد." },
      { sp: "{name}", role: "کارمند اخراجی", av: "🧑", bg: OFFICE, mood: "sad", text: "یعنی از فردا نیایم؟ فقط یک جعبه‌ی مقوایی و یک کارت خروج؟ آقای فَرّخ، من اجاره‌خانه دارم..." },
      { sp: "آقای فَرّخ", role: "مدیرعامل", av: "🕴️", bg: OFFICE, mood: "tense", text: "نگهبان دم در منتظر است. این هم حقوق دو ماه آخر. موفق باشی پسرم. شهر جای آدم‌های خسته نیست." },
      { sp: "راوی", role: "", av: "📖", bg: OFFICE, mood: "sad", text: "در جعبه‌ی مقوایی یک لیوانِ لب‌پریده بود، چند خودکارِ بی‌جوهر، و یک قاب عکس: بابابزرگ رحیم، ایستاده وسط گندمزار، با همان لبخندِ همیشگی." },
      { sp: "{name}", role: "با خودش", av: "🧑", bg: GRANDPA, mood: "sad", text: "بابابزرگ... تو همیشه می‌گفتی «شهر آدم را کوچک می‌کند، زمین بزرگش می‌کند». کاش حرفت را زودتر باور کرده بودم." },
      { sp: "راوی", role: "", av: "📖", bg: VILLAGE, mood: "warm", text: "سه روز بعد. دهکده‌ی «دره زرین»، دفتر اسنادِ استاد مراد وکیلی. چراغ نفتی سوسو می‌زد و بوی کاغذِ کهنه و چایِ تازه در اتاق پیچیده بود." },
      { sp: "استاد وکیلی", role: "دفتردار دهکده", av: "👴", bg: WILL, mood: "warm", text: "سلام پسرم. تسلیت می‌گویم. بابا رحیم مردِ بزرگی بود. وصیت‌نامه‌اش را با دستِ خطِ خودش نوشت، درست یک هفته قبل از اینکه... بفرما، بخوان." },
      { sp: "بابابزرگ رحیم", role: "از وصیت‌نامه", av: "🌾", bg: GRANDPA, mood: "warm", text: "{name} عزیزم. اگر داری این نامه را می‌خوانی، یعنی من رفته‌ام و تو خسته‌ای. من تو را می‌شناسم؛ می‌دانم شهر دلت را خشک کرده." },
      { sp: "بابابزرگ رحیم", role: "از وصیت‌نامه", av: "🌾", bg: MILL, mood: "hope", text: "تمام زمین، آسیاب بادی و آبروی خانوادگی را به تو می‌سپارم. فقط یک شرط دارم: تا «جشن برداشت» سال آینده، دره زرین باید دوباره زنده شود." },
      { sp: "بابابزرگ رحیم", role: "از وصیت‌نامه", av: "🌾", bg: GRANDPA, mood: "tense", text: "خسرو ظِلّی سال‌هاست می‌خواهد این دره را بخرد و به کارخانه و انبار سیمان تبدیل کند. اگر زمین را رها کنی، او می‌برد. اگر بمانی و بسازی... من برمی‌گردم. در هر خوشه‌ی گندم." },
      { sp: "استاد وکیلی", role: "دفتردار دهکده", av: "👴", bg: WILL, mood: "tense", text: "یک چیز دیگر هم هست، پسرم. هشتصد سکه بدهی بانکی روی زمین است. تا جشن برداشت باید صاف شود، وگرنه بانک زمین را به حراج می‌گذارد... و تنها خریدار، ظلّی است." },
      { sp: "{name}", role: "", av: "🧑", bg: WILL, mood: "sad", text: "در جیب کتم چهل سکه دارم. در حسابم هیچ. و در مقابلم یک دره‌ی خشک، یک بدهی، و مردی که هیچ‌وقت کشاورزی نکرده‌ام." },
      { sp: "استاد وکیلی", role: "دفتردار دهکده", av: "👴", bg: HOUSE, mood: "warm", text: "بابابزرگت هم روز اول هیچی بلد نبود. فقط هر روز آمد سرِ زمین. زمین به آدم یاد می‌دهد، اگر صبر داشته باشی. برو، کلید خانه در گلدانِ ایوان است." },
      { sp: "راوی", role: "", av: "📖", bg: FARM, mood: "hope", text: "صبح روز بعد. جاده‌ی خاکی، بوی نمِ باران و علفِ تازه. دره زرین زیر مه طلایی بیدار می‌شد و آسیابِ شکسته روی تپه، مثل دستی تکان می‌خورد." },
      { sp: "خاله رعنا", role: "همسایه‌ی دهکده", av: "👵", bg: FARM, mood: "warm", text: "آهای {name}! تویی؟ چقدر شبیه خودِ رحیمی... بیا، سوپ داغ برایت آوردم. دیشب دیدم چراغ خانه روشن شد، فهمیدم بالاخره آمدی." },
      { sp: "{name}", role: "", av: "🧑", bg: FARM, mood: "sad", text: "خاله، من هیچی بلد نیستم. نه شخم زدن، نه بذر، نه فروش. اگر شکست بخورم، زمین را می‌برند. اسم بابابزرگ هم با آن می‌رود." },
      { sp: "خاله رعنا", role: "همسایه‌ی دهکده", av: "👵", bg: FARM, mood: "warm", text: "ببین پسرم. گندم را نگاه کن. نه باد آن را می‌شکند، نه سرما. چون ریشه دارد. تو هم ریشه داری، فقط یادت رفته. از همین یک وجب خاک شروع کن." },
      { sp: "سارا", role: "مهندس کشاورزی", av: "👩‍🌾", bg: FARM, mood: "hope", text: "من سارا هستم. نقشه‌ی دره را برایت آوردم. قانونش ساده است: با بیل چمن را شخم بزن، با بذر بکار، با آبپاش سیرابش کن. بعد با دستِ خالی درو کن. همین چهار قدم." },
      { sp: "سارا", role: "مهندس کشاورزی", av: "👩‍🌾", bg: FARM, mood: "hope", text: "نوارِ پایین صفحه، جعبه‌ابزارِ توست؛ با یک ضربه انتخابش کن. هر ابزار فقط کارِ خودش را می‌کند، پس اشتباهی انتخابشان نکن. با یک انگشت نقشه را بکش تا جابه‌جا شود، و با دو انگشت آن را بزرگ و کوچک کن." },
      { sp: "راوی", role: "", av: "📖", bg: SUNSET, mood: "epic", text: "و این‌گونه، فصلِ اول آغاز شد. یک جعبه‌ی مقوایی، یک وصیت‌نامه، هشتصد سکه بدهی، و یک دره که منتظر بود دوباره سبز شود." },
    ],
    endScenes: [],
    reward: { coins: 0, xp: 0, sp: 0 },
  },
  {
    id: "ch1", num: 1, title: "خاک و خاطره", subtitle: "چهل دانه گندم برای یک قول",
    scenes: [
      { sp: "سارا", role: "مهندس کشاورزی", av: "👩‍🌾", bg: FARM, mood: "hope", text: "اولین کارت را بگویم؟ چهل محصول برداشت کن. دستت که با خاک آشنا شد، بقیه‌اش آسان است." },
      { sp: "خاله رعنا", role: "همسایه‌ی دهکده", av: "👵", bg: FARM, mood: "warm", text: "بابابزرگت هم اولین سالش فقط گندم کاشت. می‌گفت «گندم، نان است و نان، آبرو»." },
    ],
    endScenes: [
      { sp: "راوی", role: "", av: "📖", bg: LANDGRAB, mood: "hope", text: "غروب بود که صدای موتورِ گران‌قیمتی سکوتِ دره را شکست. یک ماشین سیاه، میان گندمزار، مثل لکه‌ی جوهر روی کاغذ." },
      { sp: "خسرو ظِلّی", role: "دلال زمین", av: "💼", bg: LANDGRAB, mood: "tense", text: "پس تو وارثِ رحیمی؟ ببین پسرجان، من احساساتی نیستم. این زمین را صد برابر قیمتِ واقعی‌اش می‌خرم. امضا کن و برگرد به شهرت. تو که کشاورزی بلد نیستی." },
      { sp: "{name}", role: "", av: "🧑", bg: LANDGRAB, mood: "epic", text: "درست است، بلد نیستم. ولی این زمین اسمِ بابابزرگم رویش است. اسم را نمی‌شود فروخت، آقای ظلّی." },
      { sp: "خسرو ظِلّی", role: "دلال زمین", av: "💼", bg: LANDGRAB, mood: "tense", text: "چه شاعرانه. پس تا جشن برداشت می‌بینمت. آن روز که بانک زمینت را حراج کند، خودم برنده‌ی مزایده‌ام. خوش بگذرد... کشاورز." },
    ],
    goal: { kind: "harvest", target: 40, label: "برداشت ۴۰ محصول از زمین" },
    reward: { coins: 500, xp: 40, sp: 1 },
  },
  {
    id: "ch2", num: 2, title: "دست‌های تنها", subtitle: "هیچ‌کس یک‌تنه یک دره را سبز نمی‌کند",
    scenes: [
      { sp: "خاله رعنا", role: "همسایه‌ی دهکده", av: "👵", bg: FARM, mood: "warm", text: "دستت تنهاست پسرم. یک کارگر بگیر. رحیم همیشه می‌گفت «کارگر، نانِ خودش را از زمینِ تو درمی‌آورد؛ یعنی شریک است، نه مزدور»." },
      { sp: "سارا", role: "مهندس کشاورزی", av: "👩‍🌾", bg: FARM, mood: "hope", text: "از منوی «مدیریت» کارگر استخدام کن. حقوقش روزانه است، ولی وقتت را می‌خرد. و وقت، گران‌ترین چیزِ یک کشاورز است." },
    ],
    endScenes: [
      { sp: "راوی", role: "", av: "📖", bg: BARN, mood: "warm", text: "اولین کارگر آمد: مردی ساکت با دست‌های پینه‌بسته. همان روز عصر، وقتی داشتید انبار کاه را تمیز می‌کردید، پاکتی زرد از زیرِ تیرکِ سقف بیرون افتاد." },
      { sp: "بابابزرگ رحیم", role: "نامه‌ی پیدا شده", av: "🌾", bg: GRANDPA, mood: "warm", text: "{name}، این نامه را آنجا گذاشتم که فقط خودت پیدایش کنی. یادت باشد: آب، مهم‌تر از بذر است. و صبر، مهم‌تر از هر دو." },
      { sp: "بابابزرگ رحیم", role: "نامه‌ی پیدا شده", av: "🌾", bg: MILL, mood: "hope", text: "پول را شمردم؛ هشتصد سکه بدهی داشتم و هزار و دویست سکه رویا. رویا را در آسیاب قایم کردم. اگر روزی آسیاب را تعمیر کردی، پیدایش می‌کنی." },
      { sp: "{name}", role: "", av: "🧑", bg: MILL, mood: "hope", text: "آسیاب... پس باید آسیاب را سرِ پا کنم. بابابزرگ، تو هنوز داری با من حرف می‌زنی." },
    ],
    goal: { kind: "workers", target: 1, label: "استخدام اولین کارگر مزرعه" },
    reward: { coins: 800, xp: 60, sp: 1 },
  },
  {
    id: "ch3", num: 3, title: "صدای آسیاب", subtitle: "بوی نان، نصفِ راهِ بازگشت است",
    scenes: [
      { sp: "سارا", role: "مهندس کشاورزی", av: "👩‍🌾", bg: FARM, mood: "hope", text: "گندم خام ارزان است، {name}. آرد کن، بعد نان بپز. ارزشِ کالا در کارگاه ساخته می‌شود، نه در زمین." },
      { sp: "خاله رعنا", role: "همسایه‌ی دهکده", av: "👵", bg: MILL, mood: "warm", text: "یک آسیاب بادی بساز و یک نانوایی. آن وقت کلِ دهکده بوی نان می‌گیرد... و دهکده‌ای که نانِ تو را بو کند، دیگر تنهایت نمی‌گذارد." },
    ],
    endScenes: [
      { sp: "راوی", role: "", av: "📖", bg: MILL, mood: "epic", text: "پره‌های آسیاب برای اولین بار پس از هفت سال چرخید. صدایش مثل تپشِ قلب بود. بچه‌های دهکده دویدند و زیرِ سایه‌اش ایستادند." },
      { sp: "خاله رعنا", role: "همسایه‌ی دهکده", av: "👵", bg: VILLAGE, mood: "warm", text: "رحیم... دیدی؟ آسیابت کار می‌کند. (چشم‌هایش خیس شد) ببخشید، بوی نانت دقیقاً بوی نانِ او را می‌دهد." },
      { sp: "استاد وکیلی", role: "دفتردار دهکده", av: "👴", bg: WILL, mood: "warm", text: "پسرم، خبرِ چرخیدنِ آسیاب به گوش بانک رسید. گفتند اگر تا جشن، درآمدِ زمین دو برابر شود، مهلتت را تمدید می‌کنند. راه باز است." },
      { sp: "{name}", role: "", av: "🧑", bg: MILL, mood: "hope", text: "هزار و دویست سکه‌ی رویا... باید توی همان آسیاب باشد. پس نان را می‌پزم، پول را پیدا می‌کنم، و دره را پس می‌گیرم." },
    ],
    goal: { kind: "buildings", target: 2, ids: ["mill", "bakery"], label: "ساخت آسیاب بادی و نانوایی" },
    reward: { coins: 1500, xp: 120, sp: 1 },
  },
  {
    id: "ch4", num: 4, title: "دره‌ی دام‌ها", subtitle: "جایی که مرغ باشد، صبح زودتر می‌آید",
    scenes: [
      { sp: "عمو نوروز", role: "چوپان پیر", av: "🧔", bg: LIVESTOCK, mood: "warm", text: "پسرِ رحیم! زمینِ بی‌دام، خانه‌ی بی‌چراغ است. مرغداری بساز، گاوداری، گوسفند. بعد ببین دره چطور صدا پیدا می‌کند." },
      { sp: "سارا", role: "مهندس کشاورزی", av: "👩‍🌾", bg: LIVESTOCK, mood: "hope", text: "برای دام، علوفه لازم داری: شبدر بکار. شبدر ارزان است ولی شیر و پشم گران. این یعنی زنجیره‌ی ارزش." },
    ],
    endScenes: [
      { sp: "عمو نوروز", role: "چوپان پیر", av: "🧔", bg: LIVESTOCK, mood: "warm", text: "برایت هدیه آوردم: دو قابِ کندوی عسل. بابات هم زنبور داشت. می‌گفت زنبور، تنها کارگری است که مرخصی نمی‌خواهد." },
      { sp: "خاله رعنا", role: "همسایه‌ی دهکده", av: "👵", bg: LIVESTOCK, mood: "warm", text: "صدای زنگوله‌ی گاوهایت تا ته دره می‌رود. دیشب خوابِ رحیم را دیدم؛ نشسته بود لبِ همین حوض و لبخند می‌زد." },
      { sp: "{name}", role: "", av: "🧑", bg: LIVESTOCK, mood: "hope", text: "شاید رویا همین باشد، خاله. نه پول. همین که صدای زندگی از این دره بلند شود." },
    ],
    goal: { kind: "animals", target: 25, label: "تولید ۲۵ فرآورده‌ی دامی" },
    reward: { coins: 2500, xp: 180, sp: 1 },
  },
  {
    id: "ch5", num: 5, title: "جشن برداشت", subtitle: "روزِ تسویه‌ی حساب با سرنوشت",
    scenes: [
      { sp: "استاد وکیلی", role: "دفتردار دهکده", av: "👴", bg: VILLAGE, mood: "tense", text: "جشن برداشت نزدیک است، پسرم. بانک ده سفارشِ تحویل‌شده می‌خواهد تا باور کند این زمین زنده است. ظلّی هم در کمیته‌ی داوری نشسته..." },
      { sp: "سارا", role: "مهندس کشاورزی", av: "👩‍🌾", bg: FARM, mood: "hope", text: "از تابلوی سفارش‌ها استفاده کن. سفارش‌ها از بازار گران‌ترند و اعتبار می‌آورند. اعتبار یعنی قیمتِ بهتر برای همه‌ی کالاهایت." },
      { sp: "خسرو ظِلّی", role: "دلال زمین", av: "💼", bg: LANDGRAB, mood: "tense", text: "در کمیته‌ی جشن می‌بینمت. امیدوارم برای جشن، نانی هم داشته باشی که روی میز بگذاری... وگرنه فقط یک بدهکاری با یک جعبه‌ی مقوایی." },
    ],
    endScenes: [
      { sp: "راوی", role: "", av: "📖", bg: FEST, mood: "epic", text: "شبِ جشن. فانوس‌ها بین داربست‌ها آویزان بود و میزِ بلندِ دهکده پر از نان، پای و عسل. همه آمدند؛ حتی آن‌هایی که سال‌ها از دره ناامید بودند." },
      { sp: "استاد وکیلی", role: "دفتردار دهکده", av: "👴", bg: FEST, mood: "epic", text: "گزارش بانک رسید: درآمدِ زمین دو برابر شده. بدهیِ هشتصد سکه‌ای... صاف شد. سندِ دره زرین، رسماً به نامِ {name} رحیم‌زاده صادر شد!" },
      { sp: "خاله رعنا", role: "همسایه‌ی دهکده", av: "👵", bg: FEST, mood: "warm", text: "دیدی پسرم؟ کلیدِ خانه دیگر مالِ گلدانِ ایوان نیست؛ مالِ جیبِ خودت است. رحیم امروز وسطِ همین گندمزار ایستاده. حسش نمی‌کنی؟" },
      { sp: "خسرو ظِلّی", role: "دلال زمین", av: "💼", bg: NIGHT, mood: "tense", text: "تبریک می‌گویم. واقعاً. ولی جشن نگیر؛ تازه بدهی را دادی. حالا باید ثروتمند شوی... و ثروت، بازیِ بزرگ‌ترهاست. منتظرت می‌مانم." },
    ],
    goal: { kind: "orders", target: 10, label: "تحویل ۱۰ سفارش به اهالی دهکده" },
    reward: { coins: 4000, xp: 250, sp: 2 },
  },
  {
    id: "ch6", num: 6, title: "طلای سرخ", subtitle: "گرانی‌ترین ادویه‌ی دنیا، ارزان‌ترین گل‌ها را دارد",
    scenes: [
      { sp: "سارا", role: "مهندس کشاورزی", av: "👩‍🌾", bg: HARVEST, mood: "hope", text: "حالا که دره مالِ توست، وقتِ کارِ بزرگ است. زعفران بکار. هر گلش یک دقیقه عمر می‌کند، ولی هر گرمش یک سکه‌ی طلاست." },
      { sp: "عمو نوروز", role: "چوپان پیر", av: "🧔", bg: HARVEST, mood: "warm", text: "بابابزرگت می‌گفت «زعفران، اشکِ خورشید است». سخت درمی‌آید، ولی اسمِ دره را تا شهرها می‌برد." },
    ],
    endScenes: [
      { sp: "راوی", role: "", av: "📖", bg: HARVEST, mood: "epic", text: "زمین‌های بالادست، بنفش شد. صبحِ زود، قبل از اینکه آفتاب گل‌ها را باز کند، همه‌ی دهکده آمدند برای چیدن. بچه‌ها می‌خندیدند و سارا آواز می‌خواند." },
      { sp: "سارا", role: "مهندس کشاورزی", av: "👩‍🌾", bg: HARVEST, mood: "hope", text: "{name}، یک خبر دارم. اتحادیه‌ی صادرات از من پرسید این زعفران مالِ کیست. گفتم مالِ کشاورزی که شش ماه پیش یک جعبه‌ی مقوایی داشت و هیچی بلد نبود." },
      { sp: "استاد وکیلی", role: "دفتردار دهکده", av: "👴", bg: WILL, mood: "warm", text: "مجوزِ صادرات برایت صادر شد. حالا کالاهایت را آن طرفِ کوه‌ها هم می‌خرند. قیمت‌ها را که دیدی، بفروش؛ بازار همیشه منتظرِ تو نمی‌ماند." },
    ],
    goal: { kind: "level", target: 12, label: "رسیدن به سطح ۱۲ کشاورزی" },
    reward: { coins: 6000, xp: 300, sp: 2 },
  },
  {
    id: "ch7", num: 7, title: "باغِ رؤیاها", subtitle: "زمینی که زیبا نباشد، خانه نیست",
    scenes: [
      { sp: "خاله رعنا", role: "همسایه‌ی دهکده", av: "👵", bg: FARM, mood: "warm", text: "پسرم، مزرعه‌ات کار می‌کند، ولی دل ندارد. رحیم همیشه می‌گفت «اول باغ را زیبا کن، بعد گندم را؛ زیبایی، آدم را سرِ کار نگه می‌دارد»." },
      { sp: "سارا", role: "مهندس کشاورزی", av: "👩‍🌾", bg: FARM, mood: "hope", text: "فناوریِ «طراحی منظر» را بخوان، بعد از منوی دکوراسیون فواره بگذار، آلاچیق، باغچه‌ی گل، پرچینِ سنگی. این‌ها خرج نیستند؛ سرمایه‌گذاری روی دلت هستند." },
    ],
    endScenes: [
      { sp: "راوی", role: "", av: "📖", bg: NIGHT, mood: "night", text: "شبِ مهتابی. آبِ فواره زیرِ نورِ فانوس می‌درخشید و بوی گلِ یاس تا ایوان می‌آمد. روی نیمکتِ چوبی، قابِ عکسِ بابابزرگ را گذاشتی." },
      { sp: "سارا", role: "مهندس کشاورزی", av: "👩‍🌾", bg: NIGHT, mood: "night", text: "می‌دانی چه چیزی مرا شگفت‌زده کرد؟ اینکه تو اول پول درآوردی، بعد زیبا ساختی. بیشتر آدم‌ها برعکس‌اش را می‌روند و شکست می‌خورند." },
      { sp: "{name}", role: "", av: "🧑", bg: NIGHT, mood: "night", text: "بابابزرگ می‌گفت زمین سه چیز می‌خواهد: عرق، صبر، و یک گوشه‌ی قشنگ برای نشستن و تماشا کردن. این گوشه، همان جایی است که او می‌خواست بسازد." },
      { sp: "خاله رعنا", role: "همسایه‌ی دهکده", av: "👵", bg: VILLAGE, mood: "warm", text: "امشب دهکده قرارِ شامش را اینجا گذاشته. گفتند «خانه‌ی رحیم دوباره چراغ دارد». این از هر سکه‌ای بیشتر است." },
    ],
    goal: { kind: "decorations", target: 8, label: "ساخت ۸ سازه‌ی دکوراسیون در مزرعه" },
    reward: { coins: 8000, xp: 320, sp: 2 },
  },
  {
    id: "ch8", num: 8, title: "عصرِ ماشین‌ها", subtitle: "دست‌ها استراحت می‌کنند، ولی رؤیا نه",
    scenes: [
      { sp: "سارا", role: "مهندس کشاورزی", av: "👩‍🌾", bg: MACHINES, mood: "hope", text: "زمین بزرگ شده و تو خسته. وقتِ اتوماسیون است: دروگرِ رباتیک، بذرپاشِ خودکار، کودپاش. بگذار ماشین‌ها کارِ تکراری بکنند تا تو فکر کنی." },
      { sp: "عمو نوروز", role: "چوپان پیر", av: "🧔", bg: LIVESTOCK, mood: "tense", text: "مراقب باش پسر. ماشین، گندم را می‌چیند ولی آسمان را نگاه نمی‌کند. نگذار دره فقط کارخانه شود؛ آن وقت فرقی با ظلّی نداری." },
    ],
    endScenes: [
      { sp: "راوی", role: "", av: "📖", bg: MACHINES, mood: "epic", text: "صبح، قبل از بیدار شدنِ تو، نیمی از مزرعه درو شده بود. چراغ‌های کوچکِ ماشین‌ها میانِ مه می‌رقصیدند. دره زرین حالا قلبِ دوم داشت: قلبی از فلز." },
      { sp: "خسرو ظِلّی", role: "دلال زمین", av: "💼", bg: FACTORY, mood: "tense", text: "آفرین! ماشین‌هایت را دیدم. پیشنهادِ جدید دارم: شریک شویم، اینجا کارخانه‌ی بسته‌بندی می‌سازیم. سودِ کلان، دردسرِ صفر." },
      { sp: "{name}", role: "", av: "🧑", bg: FARM, mood: "epic", text: "نه، آقای ظلّی. ماشین آوردم که خودم وقت داشته باشم، نه اینکه دره را به انبارِ سیمان تبدیل کنم. اینجا کارخانه نمی‌سازیم؛ اینجا نان می‌پزیم." },
      { sp: "خسرو ظِلّی", role: "دلال زمین", av: "💼", bg: LANDGRAB, mood: "tense", text: "احساساتی. احساسات سود نمی‌دهد... البته. پس در نمایشگاهِ ملی کشاورزی می‌بینمت. آنجا عدد و رقم حرف می‌زند، نه نان و شعر." },
    ],
    goal: { kind: "buildings", target: 2, ids: ["harvester", "auto_planter", "auto_fertilizer", "greenhouse", "mega_sprinkler"], label: "نصب ۲ دستگاه تمام‌خودکار" },
    reward: { coins: 12000, xp: 400, sp: 2 },
  },
  {
    id: "ch9", num: 9, title: "رقابتِ بزرگ", subtitle: "نمایشگاه ملی کشاورزی: دره زرین در برابر همه",
    scenes: [
      { sp: "سارا", role: "مهندس کشاورزی", av: "👩‍🌾", bg: EXPO, mood: "tense", text: "نمایشگاهِ ملی ثبت‌نام شد. داورها دنبالِ «بالاترین درآمدِ پایدار» هستند. ظلّی با سه کارخانه آمده. تو با یک دره." },
      { sp: "خاله رعنا", role: "همسایه‌ی دهکده", av: "👵", bg: EXPO, mood: "warm", text: "بستنیِ زعفرانی‌ات را ببر، عسلت را، پلیورِ پشمی‌ات را. چیزی ببر که هیچ کارخانه‌ای نتواند بسازد: چیزی که با صبر درست شده باشد." },
    ],
    endScenes: [
      { sp: "راوی", role: "", av: "📖", bg: EXPO, mood: "epic", text: "غرفه‌ی کوچکِ دره زرین، شلوغ‌ترین غرفه‌ی نمایشگاه شد. داورها بستنیِ زعفرانی چشیدند و ساکت شدند. آن سکوت، بلندترین تشویقِ دنیا بود." },
      { sp: "داور ارشد", role: "نمایشگاه ملی", av: "🎖️", bg: EXPO, mood: "epic", text: "جایزه‌ی اولِ کشاورزیِ پایدار: دره زرین. به خاطر زنجیره‌ی کاملِ تولید، اشتغالِ روستایی، و... به خاطر اینکه هنوز بوی نان می‌دهد." },
      { sp: "خسرو ظِلّی", role: "دلال زمین", av: "💼", bg: EXPO, mood: "sad", text: "سه کارخانه، دو سال برنامه‌ریزی، و من به یک مزرعه‌ی بیست‌هکتاری باختم... یک سؤال دارم پسرجان: چطور؟" },
      { sp: "{name}", role: "", av: "🧑", bg: FARM, mood: "epic", text: "چون من زمین را نمی‌فروشم، آقای ظلّی. من زمین را بزرگ می‌کنم. بابابزرگم گفت زمین آدم را کوچک می‌کند اگر بفروشدش، بزرگ می‌کند اگر رویش بمانی." },
      { sp: "استاد وکیلی", role: "دفتردار دهکده", av: "👴", bg: WILL, mood: "warm", text: "خبرِ بردنت در روزنامه آمد. قیمتِ زمینِ اطراف سه برابر شد... و همه می‌خواهند مثلِ تو شوند. رحیم، پسرش را ببین." },
    ],
    goal: { kind: "coins_total", target: 60000, label: "کسب ۶۰٬۰۰۰ سکه درآمد کل" },
    reward: { coins: 20000, xp: 600, sp: 3 },
  },
  {
    id: "ch10", num: 10, title: "پایانِ باز: نسلِ بعد", subtitle: "هر نسل، یک بار زمین را از نو زنده می‌کند",
    scenes: [
      { sp: "راوی", role: "", av: "📖", bg: GRANDPA, mood: "night", text: "بیست سال گذشت. موهای {name} سفید شد و دست‌هایش، دقیقاً مثلِ دست‌های رحیم. دره زرین حالا بزرگ‌ترین مزرعه‌ی منطقه بود." },
      { sp: "سارا", role: "همراه سال‌ها", av: "👩‍🌾", bg: HOUSE, mood: "warm", text: "یک روز دخترت آمد و گفت «می‌خواهم خودم مزرعه را بگردانم». و تو همان کاری را کردی که رحیم با تو کرد: کلید را دادی و رفتی روی نیمکت نشستی." },
      { sp: "{name}", role: "کشاورز پیر دره", av: "👴", bg: SUNSET, mood: "warm", text: "این وصیتِ من است: زمین را نفروش. روی هر قطعه‌اش یک درخت بکار. و اگر روزی خسته شدی، بنشین لبِ حوض و به آسیاب نگاه کن. می‌فهمی چرا ماندی." },
    ],
    endScenes: [
      { sp: "راوی", role: "", av: "📖", bg: FARM, mood: "epic", text: "«تناسخ مزرعه» آغاز شد. زمین از نو شخم خورد، نام از نو بر سردر نشست، و ضریبِ تجربه‌ی یک عمر، به نسلِ بعد منتقل شد. دره زرین جاودانه است." },
      { sp: "داستان", role: "", av: "🌾", bg: SUNSET, mood: "epic", text: "داستان تمام نمی‌شود؛ فقط فصل عوض می‌کند. هر بار که تناسخ کنی، یک نسلِ دیگر روی همین خاک می‌ایستد، با سودِ بیشتر، انبارِ بزرگ‌تر و همان قولِ قدیمی: زمین را نفروش." },
      { sp: "بابابزرگ رحیم", role: "در هر خوشه‌ی گندم", av: "🌾", bg: GRANDPA, mood: "warm", text: "دیدی {name}؟ گفتم برمی‌گردم. ممنون که ماندی. حالا برو؛ گندم‌ها منتظرند و فصل، هیچ‌وقت صبر نمی‌کند." },
    ],
    goal: { kind: "prestige", target: 1, label: "انجام اولین «تناسخ مزرعه» و سپردن زمین به نسل بعد" },
    reward: { coins: 50000, xp: 1000, sp: 3 },
  },
];

export const LAST_CH = CHAPTERS.length - 1;

export function goalProgress(s: State, ch: StoryChapter): { cur: number; target: number; label: string } {
  const g = ch.goal;
  if (!g) return { cur: 0, target: 1, label: "" };
  let cur = 0;
  switch (g.kind) {
    case "level": cur = s.level; break;
    case "harvest": cur = s.stats.harvested; break;
    case "produced": cur = s.stats.produced; break;
    case "orders": cur = s.stats.orders; break;
    case "coins_total": cur = Math.floor(s.stats.earned); break;
    case "workers": cur = s.workers.length; break;
    case "decorations": cur = s.stats.decorations; break;
    case "animals": cur = s.stats.animals; break;
    case "skills": cur = s.skills.length; break;
    case "prestige": cur = s.prestige; break;
    case "buildings": {
      const ids = g.ids || [];
      cur = new Set(s.tiles.filter((t) => t.b && ids.includes(t.b)).map((t) => t.b)).size;
      break;
    }
    case "techs": {
      const ids = g.ids || [];
      cur = ids.filter((i) => s.techs.includes(i)).length;
      break;
    }
  }
  return { cur, target: g.target, label: g.label };
}

export function currentChapter(s: State): StoryChapter {
  return CHAPTERS[Math.min(s.story.chapter, LAST_CH)];
}

export function isStoryFinished(s: State) {
  return s.story.chapter > LAST_CH || (s.story.chapter === LAST_CH && s.story.completed.includes(CHAPTERS[LAST_CH].id));
}

function finishChapter(s: State, ch: StoryChapter, ev: Events) {
  const st = s.story;
  if (!st.completed.includes(ch.id)) {
    st.completed.push(ch.id);
    if (ch.reward.coins) { s.coins += ch.reward.coins; s.stats.earned += ch.reward.coins; }
    if (ch.reward.sp) s.stats.skillPoints += ch.reward.sp;
    if (ch.reward.xp) addXp(s, ch.reward.xp, ev);
    if (ch.reward.coins > 0 || ch.reward.sp > 0) {
      ev.toast(`📖 فصل ${ch.num} «${ch.title}» تمام شد! +${ch.reward.coins.toLocaleString("fa-IR")} سکه و ${ch.reward.sp} امتیاز مهارت`, "lvl");
      ev.sound("lvl");
    }
  }
  st.chapter++;
  st.phase = "scenes";
  st.sceneIdx = 0;
  if (st.chapter > LAST_CH) { st.chapter = LAST_CH; st.done = true; st.shown = false; }
  else st.shown = true;
}

export function advanceStory(s: State, ev: Events) {
  const st = s.story;
  const ch = currentChapter(s);
  if (st.done && st.phase === "scenes" && st.chapter === LAST_CH) {
    // Epilogue already completed: replay closing scenes then stop
    st.sceneIdx++;
    if (st.sceneIdx >= ch.endScenes.length) { st.shown = false; }
    return;
  }
  if (st.phase === "scenes") {
    st.sceneIdx++;
    if (st.sceneIdx >= ch.scenes.length) {
      if (ch.goal) { st.phase = "goal"; st.sceneIdx = 0; st.shown = false; }
      else finishChapter(s, ch, ev);
    }
  } else if (st.phase === "end") {
    st.sceneIdx++;
    if (st.sceneIdx >= ch.endScenes.length) finishChapter(s, ch, ev);
  }
}

export function updateStory(s: State, ev: Events) {
  if (s.story.done) return;
  if (s.story.phase !== "goal") return;
  const ch = currentChapter(s);
  if (!ch.goal) return;
  const p = goalProgress(s, ch);
  if (p.cur >= p.target) {
    s.story.phase = "end";
    s.story.sceneIdx = 0;
    s.story.shown = true;
    ev.toast(`🎬 هدفِ فصل «${ch.title}» کامل شد! صحنه‌ی پایانی را ببین`, "lvl");
    ev.sound("lvl");
  }
}

export function sceneText(text: string, name: string) {
  return text.replace(/\{name\}/g, name || "کشاورز");
}
