import { faNum } from "./faNum";

export interface CropDef {
  id: string; name: string; seed: number; time: number; yield: number; lvl: number; xp: number;
  color: string; leaf: string; rare?: boolean; animalFeed?: number;
  /** کالای برداشتی اگر با شناسه‌ی محصول فرق کند (صنوبر ← الوار) */
  out?: string;
  /** ظاهرِ عمومی برای محصول‌هایی که نقاشیِ اختصاصی ندارند */
  look?: "tree" | "bush" | "paddy" | "boll" | "tuber" | "cane" | "pod" | "vine" | "umbel";
}
export interface ItemDef { id: string; name: string; base: number; tier?: number; }
export interface Recipe { out: string; n: number; inp: Record<string, number>; time: number; xp: number; /** سطحِ لازم (اگر از خودِ کارگاه بالاتر باشد) */ lvl?: number; /** P6.3: نسلِ لازم (دستورِ خانوادگی) */ gen?: number; }
export interface BuildingDef {
  id: string; name: string; cost: number; lvl: number; desc: string;
  recipes: Recipe[]; wall: string; roof: string; limit?: number; isAuto?: boolean;
  radius?: number; draw?: "coop"|"barn"|"sheep"|"pigpen"|"beehive"|"mill"|"silo"|"sprinkler"|"mega_sprinkler"|"harvester"|"auto_planter"|"auto_fertilizer"|"bakery"|"dairy"|"press"|"sweet_shop"|"feedmill"|"composter"|"well"|"greenhouse"|"statue"|"windmill_deco"|"pergola"|"flowerbed"|"pond_deco"|"bamboo"|"stone_wall"|"gate"|"fountain"|"gazebo"|"sawmill"|"quarry"|"stonemason"|"workshop"|"qanat"|"caravanserai"|"tiled_pool"|"windcatcher"|"tiled_portal"|"scarecrow"|"seesaw"|"haystack"|"lantern"|"flower_arch"|"rock_spring"|"golden_tree";
  isDecor?: boolean; flowerColor?: string; pondColor?: string;
}
export interface TechItem { id: string; name: string; cost: number; desc: string; req?: string; /** سطحِ لازم برای تحقیق */ lvl?: number; }
export interface SkillItem { id: string; name: string; desc: string; cost: number; req?: string; effect?: string; }
export interface AchievementItem { id: string; title: string; desc: string; reward: number; }
export interface ContractDef { id: string; title: string; desc: string; target: number; type: "harvest"|"produce"|"coins"|"orders"|"animals"; rewardCoins: number; rewardRep: number; rewardXp: number; }

export type WeatherType = "sun"|"rain"|"snow"|"fog"|"heatwave";
export const WEATHER_TYPES: WeatherType[] = ["sun","rain","snow","fog","heatwave"];
export interface Season { id: string; name: string; desc: string; growthRate: number; colorFilter: string; ground: string; foliage: string; }
export const SEASONS: Season[] = [
  { id: "spring", name: "بهار", desc: "فصل شکوفه‌ها، رشد عالی", growthRate: 1.15, colorFilter: "rgba(255,240,245,0.06)", ground: "#c8e6c9", foliage: "#81c784" },
  { id: "summer", name: "تابستان", desc: "آفتاب شدید و رشد سریع‌تر", growthRate: 1.32, colorFilter: "rgba(255,220,100,0.09)", ground: "#a5d6a7", foliage: "#4caf50" },
  { id: "autumn", name: "پاییز", desc: "فصل برداشت طلایی", growthRate: 1.05, colorFilter: "rgba(255,150,50,0.10)", ground: "#d7ccc8", foliage: "#ffb74d" },
  { id: "winter", name: "زمستان", desc: "سرما و رشد کندتر", growthRate: 0.68, colorFilter: "rgba(180,220,255,0.16)", ground: "#f5f5f5", foliage: "#cfd8dc" },
];

export type EventType = "fair"|"market_boom"|"drought"|"bountiful_harvest"|"livestock_show";
export const EVENT_TYPES: EventType[] = ["fair","market_boom","drought","bountiful_harvest","livestock_show"];

export const CROPS: CropDef[] = [
  { id: "wheat", name: "گندم", seed: 2, time: 18, yield: 2, lvl: 1, xp: 1, color: "#e8c35a", leaf: "#8fbf3f", animalFeed: 1 },
  { id: "carrot", name: "هویج", seed: 5, time: 35, yield: 2, lvl: 1, xp: 2, color: "#f07b1e", leaf: "#4fa83a", animalFeed: 1 },
  { id: "corn", name: "ذرت", seed: 8, time: 55, yield: 2, lvl: 2, xp: 3, color: "#f7d433", leaf: "#5c9e32", animalFeed: 2 },
  { id: "tomato", name: "گوجه", seed: 12, time: 80, yield: 2, lvl: 3, xp: 4, color: "#e3342f", leaf: "#3f8f2f" },
  { id: "strawberry", name: "توت‌فرنگی", seed: 18, time: 110, yield: 2, lvl: 4, xp: 5, color: "#ff2d55", leaf: "#2f8a3a" },
  { id: "sunflower", name: "آفتابگردان", seed: 24, time: 135, yield: 2, lvl: 5, xp: 6, color: "#ffc300", leaf: "#4d8f2a" },
  { id: "pumpkin", name: "کدو حلوایی", seed: 32, time: 180, yield: 2, lvl: 6, xp: 9, color: "#f58220", leaf: "#3d7d2a" },
  { id: "grape", name: "انگور", seed: 45, time: 220, yield: 3, lvl: 7, xp: 12, color: "#8e24aa", leaf: "#2e7d32", rare: true },
  { id: "melon", name: "خربزه", seed: 60, time: 270, yield: 2, lvl: 8, xp: 16, color: "#c0ca33", leaf: "#388e3c" },
  { id: "saffron", name: "زعفران", seed: 120, time: 360, yield: 2, lvl: 10, xp: 30, color: "#d81b60", leaf: "#1b5e20", rare: true },
  { id: "clover", name: "شبدر علوفه", seed: 6, time: 40, yield: 3, lvl: 2, xp: 1, color: "#66bb6a", leaf: "#388e3c", animalFeed: 3 },
  { id: "tulip", name: "لاله", seed: 10, time: 50, yield: 1, lvl: 3, xp: 2, color: "#e91e63", leaf: "#4caf50" },
  { id: "rose", name: "گل رز", seed: 28, time: 100, yield: 1, lvl: 6, xp: 4, color: "#c62828", leaf: "#2e7d32" },
  { id: "poplar", name: "نهال صنوبر", seed: 14, time: 150, yield: 2, lvl: 4, xp: 4, color: "#7cb342", leaf: "#558b2f", out: "wood" },
  { id: "pistachio", name: "پسته", seed: 150, time: 420, yield: 2, lvl: 11, xp: 32, color: "#c5b358", leaf: "#6b8e23", rare: true, look: "tree" },
  { id: "rice", name: "برنج", seed: 60, time: 200, yield: 3, lvl: 12, xp: 14, color: "#e8e1b0", leaf: "#7cb342", look: "paddy" },
  { id: "cotton", name: "پنبه", seed: 70, time: 240, yield: 3, lvl: 13, xp: 16, color: "#fafafa", leaf: "#689f38", look: "boll" },
  { id: "tea", name: "چای", seed: 90, time: 260, yield: 3, lvl: 14, xp: 18, color: "#43a047", leaf: "#2e7d32", look: "bush" },
  { id: "pomegranate", name: "انار", seed: 170, time: 400, yield: 2, lvl: 15, xp: 34, color: "#c62828", leaf: "#388e3c", rare: true, look: "tree" },
  { id: "dates", name: "خرما", seed: 200, time: 450, yield: 2, lvl: 17, xp: 38, color: "#8d5524", leaf: "#558b2f", look: "tree" },
  { id: "walnut", name: "گردو", seed: 220, time: 480, yield: 2, lvl: 19, xp: 42, color: "#a1887f", leaf: "#33691e", look: "tree" },
  { id: "barberry", name: "زرشک", seed: 150, time: 330, yield: 3, lvl: 20, xp: 36, color: "#e53935", leaf: "#558b2f", look: "bush" },
  { id: "almond", name: "بادام", seed: 240, time: 500, yield: 2, lvl: 21, xp: 45, color: "#d7b98e", leaf: "#7cb342", look: "tree" },
  { id: "fig", name: "انجیر", seed: 260, time: 520, yield: 2, lvl: 23, xp: 48, color: "#6a1b9a", leaf: "#2e7d32", rare: true, look: "tree" },
  { id: "lavender", name: "اسطوخودوس", seed: 35, time: 130, yield: 1, lvl: 8, xp: 6, color: "#7e57c2", leaf: "#388e3c" },
  { id: "watermelon", name: "هندوانه", seed: 26, time: 140, yield: 2, lvl: 5, xp: 7, color: "#2e7d32", leaf: "#388e3c" },
  { id: "apple", name: "سیب", seed: 95, time: 300, yield: 3, lvl: 9, xp: 20, color: "#e53935", leaf: "#43a047", look: "tree" },
  { id: "cherry", name: "آلبالو", seed: 160, time: 380, yield: 3, lvl: 16, xp: 35, color: "#880e4f", leaf: "#2e7d32", look: "tree" },
  { id: "mint", name: "نعنا", seed: 45, time: 120, yield: 3, lvl: 18, xp: 14, color: "#26a69a", leaf: "#00897b", look: "bush" },
  // ── W.1: بسته‌ی محصولاتِ ۲ — صیفی، حبوبات، دانه‌ها، صنعتی، درختی و معطر
  { id: "cucumber", name: "خیار", seed: 11, time: 70, yield: 2, lvl: 3, xp: 3, color: "#43a047", leaf: "#2e7d32", look: "vine" },
  { id: "potato", name: "سیب‌زمینی", seed: 16, time: 100, yield: 3, lvl: 4, xp: 5, color: "#c8a165", leaf: "#558b2f", look: "tuber" },
  { id: "onion", name: "پیاز", seed: 20, time: 120, yield: 3, lvl: 5, xp: 5, color: "#d19a45", leaf: "#7cb342", look: "tuber" },
  { id: "eggplant", name: "بادمجان", seed: 30, time: 170, yield: 2, lvl: 6, xp: 8, color: "#4a148c", leaf: "#33691e", look: "vine" },
  { id: "chickpea", name: "نخود", seed: 34, time: 190, yield: 3, lvl: 7, xp: 10, color: "#e0c38c", leaf: "#689f38", look: "pod" },
  { id: "lentil", name: "عدس", seed: 36, time: 200, yield: 3, lvl: 8, xp: 11, color: "#c1813d", leaf: "#7cb342", look: "pod" },
  { id: "garlic", name: "سیر", seed: 50, time: 240, yield: 3, lvl: 9, xp: 15, color: "#f3efe6", leaf: "#9ccc65", look: "tuber" },
  { id: "sesame", name: "کنجد", seed: 55, time: 230, yield: 3, lvl: 10, xp: 14, color: "#f8e1e7", leaf: "#558b2f", look: "umbel" },
  { id: "sugar_beet", name: "چغندرقند", seed: 60, time: 260, yield: 3, lvl: 11, xp: 16, color: "#f1d4d4", leaf: "#2e7d32", look: "tuber" },
  { id: "mulberry", name: "توت", seed: 110, time: 330, yield: 3, lvl: 12, xp: 24, color: "#efe4b0", leaf: "#4caf50", look: "tree" },
  { id: "cumin", name: "زیره", seed: 80, time: 280, yield: 3, lvl: 14, xp: 20, color: "#fafafa", leaf: "#9ccc65", look: "umbel" },
  { id: "apricot", name: "زردآلو", seed: 190, time: 430, yield: 3, lvl: 18, xp: 36, color: "#ffa726", leaf: "#43a047", look: "tree" },
  { id: "sugarcane", name: "نیشکر", seed: 140, time: 360, yield: 4, lvl: 22, xp: 34, color: "#c5d86d", leaf: "#7cb342", look: "cane" },
  { id: "olive", name: "زیتون", seed: 280, time: 540, yield: 3, lvl: 24, xp: 50, color: "#556b2f", leaf: "#8d9f6f", look: "tree" },
  { id: "quince", name: "به", seed: 300, time: 560, yield: 3, lvl: 26, xp: 54, color: "#fdd835", leaf: "#558b2f", rare: true, look: "tree" },
  { id: "orange", name: "پرتقال", seed: 320, time: 600, yield: 3, lvl: 28, xp: 58, color: "#fb8c00", leaf: "#2e7d32", look: "tree" },
];

export const ITEMS: Record<string, ItemDef> = {
  wheat: { id: "wheat", name: "گندم", base: 4, tier: 1 },
  carrot: { id: "carrot", name: "هویج", base: 9, tier: 1 },
  corn: { id: "corn", name: "ذرت", base: 14, tier: 1 },
  tomato: { id: "tomato", name: "گوجه", base: 21, tier: 1 },
  strawberry: { id: "strawberry", name: "توت‌فرنگی", base: 30, tier: 1 },
  sunflower: { id: "sunflower", name: "آفتابگردان", base: 36, tier: 1 },
  pumpkin: { id: "pumpkin", name: "کدو حلوایی", base: 54, tier: 1 },
  grape: { id: "grape", name: "انگور", base: 75, tier: 1 },
  melon: { id: "melon", name: "خربزه", base: 95, tier: 1 },
  saffron: { id: "saffron", name: "زعفران", base: 240, tier: 1 },
  clover: { id: "clover", name: "شبدر علوفه", base: 3, tier: 1 },
  tulip: { id: "tulip", name: "لاله", base: 12, tier: 1 },
  rose: { id: "rose", name: "گل رز", base: 22, tier: 1 },
  lavender: { id: "lavender", name: "اسطوخودوس", base: 38, tier: 1 },
  wood: { id: "wood", name: "الوار", base: 12, tier: 1 },
  stone: { id: "stone", name: "سنگ", base: 18, tier: 1 },
  planks: { id: "planks", name: "تخته", base: 40, tier: 2 },
  crate: { id: "crate", name: "جعبه‌ی چوبی", base: 110, tier: 2 },
  cut_stone: { id: "cut_stone", name: "سنگ تراش‌خورده", base: 60, tier: 2 },
  millstone: { id: "millstone", name: "سنگ آسیاب", base: 230, tier: 3 },
  sangak: { id: "sangak", name: "نان سنگک", base: 95, tier: 2 },
  pistachio: { id: "pistachio", name: "پسته", base: 280, tier: 1 },
  rice: { id: "rice", name: "برنج", base: 70, tier: 1 },
  cotton: { id: "cotton", name: "پنبه", base: 75, tier: 1 },
  tea: { id: "tea", name: "چای", base: 85, tier: 1 },
  pomegranate: { id: "pomegranate", name: "انار", base: 300, tier: 1 },
  dates: { id: "dates", name: "خرما", base: 340, tier: 1 },
  walnut: { id: "walnut", name: "گردو", base: 370, tier: 1 },
  barberry: { id: "barberry", name: "زرشک", base: 190, tier: 1 },
  almond: { id: "almond", name: "بادام", base: 400, tier: 1 },
  fig: { id: "fig", name: "انجیر", base: 430, tier: 1 },
  watermelon: { id: "watermelon", name: "هندوانه", base: 40, tier: 1 },
  apple: { id: "apple", name: "سیب", base: 130, tier: 1 },
  cherry: { id: "cherry", name: "آلبالو", base: 260, tier: 1 },
  mint: { id: "mint", name: "نعنا", base: 90, tier: 1 },
  // W.1
  cucumber: { id: "cucumber", name: "خیار", base: 18, tier: 1 },
  potato: { id: "potato", name: "سیب‌زمینی", base: 18, tier: 1 },
  onion: { id: "onion", name: "پیاز", base: 20, tier: 1 },
  eggplant: { id: "eggplant", name: "بادمجان", base: 52, tier: 1 },
  chickpea: { id: "chickpea", name: "نخود", base: 38, tier: 1 },
  lentil: { id: "lentil", name: "عدس", base: 40, tier: 1 },
  garlic: { id: "garlic", name: "سیر", base: 62, tier: 1 },
  sesame: { id: "sesame", name: "کنجد", base: 60, tier: 1 },
  sugar_beet: { id: "sugar_beet", name: "چغندرقند", base: 70, tier: 1 },
  mulberry: { id: "mulberry", name: "توت", base: 120, tier: 1 },
  cumin: { id: "cumin", name: "زیره", base: 95, tier: 1 },
  apricot: { id: "apricot", name: "زردآلو", base: 215, tier: 1 },
  sugarcane: { id: "sugarcane", name: "نیشکر", base: 130, tier: 1 },
  olive: { id: "olive", name: "زیتون", base: 290, tier: 1 },
  quince: { id: "quince", name: "به", base: 320, tier: 1 },
  orange: { id: "orange", name: "پرتقال", base: 345, tier: 1 },
  melon_juice: { id: "melon_juice", name: "آب‌هندوانه", base: 95, tier: 2 },
  ab_albaloo: { id: "ab_albaloo", name: "آب‌آلبالو", base: 560, tier: 2 },
  lavashak: { id: "lavashak", name: "لواشک", base: 850, tier: 2 },
  apple_jam: { id: "apple_jam", name: "مربای سیب", base: 300, tier: 2 },
  mint_tea: { id: "mint_tea", name: "چای نعنا", base: 240, tier: 2 },
  roasted_pistachio: { id: "roasted_pistachio", name: "پسته‌ی بوداده", base: 700, tier: 2 },
  nut_mix: { id: "nut_mix", name: "آجیل شب یلدا", base: 1350, tier: 3 },
  shirberenj: { id: "shirberenj", name: "شیربرنج", base: 330, tier: 2 },
  fabric: { id: "fabric", name: "پارچه‌ی پنبه‌ای", base: 320, tier: 2 },
  carpet: { id: "carpet", name: "قالی دستباف", base: 2400, tier: 3 },
  brewed_tea: { id: "brewed_tea", name: "چای تازه‌دم", base: 260, tier: 2 },
  herbal_tea: { id: "herbal_tea", name: "دمنوش گل‌محمدی", base: 330, tier: 2 },
  pom_paste: { id: "pom_paste", name: "رب انار", base: 1100, tier: 2 },
  fig_jam: { id: "fig_jam", name: "مربای انجیر", base: 1500, tier: 2 },
  rosewater: { id: "rosewater", name: "گلاب", base: 420, tier: 2 },
  gaz: { id: "gaz", name: "گز", base: 1250, tier: 3 },
  noghl: { id: "noghl", name: "نقل", base: 1100, tier: 3 },
  zereshk_polo: { id: "zereshk_polo", name: "زرشک‌پلو", base: 900, tier: 3 },
  premium_saffron: { id: "premium_saffron", name: "زعفران سرگل", base: 1500, tier: 3 },
  souvenir: { id: "souvenir", name: "بسته‌ی سوغات", base: 3200, tier: 3 },
  flour: { id: "flour", name: "آرد گندم", base: 18, tier: 2 },
  popcorn: { id: "popcorn", name: "پاپ‌کورن", base: 42, tier: 2 },
  egg: { id: "egg", name: "تخم‌مرغ", base: 16, tier: 2 },
  milk: { id: "milk", name: "شیر", base: 55, tier: 2 },
  wool: { id: "wool", name: "پشم", base: 48, tier: 2 },
  pork: { id: "pork", name: "گوشت خوک", base: 95, tier: 2 },
  honey: { id: "honey", name: "عسل طبیعی", base: 140, tier: 2 },
  feed: { id: "feed", name: "خوراک دام", base: 22, tier: 2 },
  compost: { id: "compost", name: "کمپوست", base: 18, tier: 2 },
  bread: { id: "bread", name: "نان", base: 75, tier: 2 },
  cake: { id: "cake", name: "کیک", base: 280, tier: 3 },
  pie: { id: "pie", name: "پای کدو", base: 190, tier: 2 },
  cheese: { id: "cheese", name: "پنیر", base: 150, tier: 2 },
  butter: { id: "butter", name: "کره", base: 95, tier: 2 },
  jam: { id: "jam", name: "مربا", base: 125, tier: 2 },
  oil: { id: "oil", name: "روغن", base: 150, tier: 2 },
  ketchup: { id: "ketchup", name: "سس گوجه", base: 90, tier: 2 },
  juice: { id: "juice", name: "آبمیوه", base: 210, tier: 2 },
  icecream: { id: "icecream", name: "بستنی زعفرانی", base: 490, tier: 3 },
  chocolate: { id: "chocolate", name: "شکلات", base: 340, tier: 3 },
  mead: { id: "mead", name: "شربت عسل", base: 380, tier: 3 },
  sausage: { id: "sausage", name: "سوسیس", base: 260, tier: 3 },
  sweater: { id: "sweater", name: "پلیور بافتنی", base: 420, tier: 3 },
  // P6.3: دستورِ خانوادگی — فقط از نسلِ دوم به بعد پخته می‌شود
  grandma_halva: { id: "grandma_halva", name: "حلوای مادربزرگ", base: 520, tier: 2 },
};

export const BUILDINGS: BuildingDef[] = [
  { id: "coop", name: "مرغداری", cost: 200, lvl: 1, desc: "مرغ‌ها با گندم تغذیه می‌شوند و تخم‌مرغ می‌دهند.", wall: "#e9d7b0", roof: "#c0392b", draw: "coop", recipes: [{ out: "egg", n: 1, inp: { wheat: 2 }, time: 28, xp: 2 }] },
  { id: "well", name: "چاه آب", cost: 180, lvl: 2, desc: "۴ زمینِ مجاور را همیشه خیس نگه می‌دارد.", wall: "#607d8b", roof: "#4fc3f7", draw: "well", recipes: [], isAuto: true, radius: 1 },
  { id: "mill", name: "آسیاب بادی", cost: 350, lvl: 2, desc: "گندم را آرد و ذرت را پاپ‌کورن می‌کند.", wall: "#f1e4c9", roof: "#6d4c41", draw: "mill", recipes: [{ out: "flour", n: 1, inp: { wheat: 3 }, time: 24, xp: 2 }, { out: "popcorn", n: 1, inp: { corn: 2 }, time: 34, xp: 3 }] },
  { id: "silo", name: "سیلو", cost: 480, lvl: 2, desc: "+۱۲۰ ظرفیت انبار برای هر سیلو.", wall: "#cfd8dc", roof: "#90a4ae", draw: "silo", recipes: [] },
  { id: "sprinkler", name: "آب‌پاش گردان", cost: 280, lvl: 3, desc: "۸ زمینِ اطرافش را خودکار آبیاری می‌کند.", wall: "#78909c", roof: "#4fc3f7", draw: "sprinkler", recipes: [], isAuto: true, radius: 1 },
  { id: "composter", name: "کمپوست‌ساز", cost: 330, lvl: 3, desc: "۴ زمینِ مجاور را کم‌کم رایگان کود می‌دهد و کمپوست هم می‌سازد.", wall: "#795548", roof: "#8d6e63", draw: "composter", isAuto: true, radius: 1, recipes: [{ out: "compost", n: 1, inp: { wheat: 1, carrot: 1 }, time: 45, xp: 2 }] },
  { id: "barn", name: "گاوداری", cost: 720, lvl: 3, desc: "گاوهای شیری با ذرت و هویج شیر می‌دهند.", wall: "#b83227", roof: "#5d4037", draw: "barn", recipes: [{ out: "milk", n: 1, inp: { corn: 2, carrot: 1 }, time: 45, xp: 4 }] },
  { id: "sheep", name: "گوسفندداری", cost: 800, lvl: 4, desc: "گوسفندها با شبدر، پشمِ مرغوب می‌دهند.", wall: "#f5f5f5", roof: "#9e9e9e", draw: "sheep", recipes: [{ out: "wool", n: 1, inp: { clover: 3 }, time: 70, xp: 4 }] },
  { id: "pigpen", name: "خوکداری", cost: 960, lvl: 5, desc: "پرواربندی با هویج و ذرت برای تولید گوشت.", wall: "#d7ccc8", roof: "#6d4c41", draw: "pigpen", recipes: [{ out: "pork", n: 1, inp: { carrot: 2, corn: 2 }, time: 90, xp: 6 }] },
  { id: "beehive", name: "کلنی زنبور", cost: 700, lvl: 5, desc: "زنبورها از آفتابگردان و توت‌فرنگی عسل می‌سازند.", wall: "#ffd54f", roof: "#8d6e63", draw: "beehive", recipes: [{ out: "honey", n: 1, inp: { sunflower: 1, strawberry: 1 }, time: 80, xp: 5 }] },
  { id: "feedmill", name: "کارخانه خوراک", cost: 950, lvl: 4, desc: "از شبدر و ذرت، خوراکِ مغذیِ دام می‌سازد.", wall: "#8d6e63", roof: "#5d4037", draw: "feedmill", recipes: [{ out: "feed", n: 2, inp: { clover: 2, corn: 1 }, time: 35, xp: 3 }] },
  { id: "bakery", name: "نانوایی", cost: 1050, lvl: 4, desc: "نان، پای کدو، کیک، نان سنگک (روی سنگِ داغ) و از نسلِ دوم حلوای مادربزرگ.", wall: "#f5deb3", roof: "#d35400", draw: "bakery", recipes: [{ out: "bread", n: 1, inp: { flour: 2, egg: 1 }, time: 48, xp: 5 }, { out: "pie", n: 1, inp: { pumpkin: 1, flour: 1, egg: 1 }, time: 90, xp: 9 }, { out: "cake", n: 1, inp: { flour: 2, egg: 2, milk: 1, strawberry: 2 }, time: 125, xp: 15 }, { out: "sangak", n: 1, inp: { flour: 2, stone: 1 }, time: 60, xp: 6 }, { out: "grandma_halva", n: 1, inp: { flour: 2, honey: 1 }, time: 120, xp: 30, gen: 1 }] },
  { id: "dairy", name: "لبنیات", cost: 1300, lvl: 5, desc: "کره، پنیر و سوسیس.", wall: "#eceff1", roof: "#1e88e5", draw: "dairy", recipes: [{ out: "butter", n: 1, inp: { milk: 1, egg: 1 }, time: 50, xp: 5 }, { out: "cheese", n: 1, inp: { milk: 2 }, time: 75, xp: 7 }, { out: "sausage", n: 1, inp: { pork: 1, flour: 1 }, time: 120, xp: 10 }] },
  { id: "press", name: "کارگاه فرآوری", cost: 1600, lvl: 6, desc: "سس گوجه، مربا، روغن، آبمیوه، رب انار و مربای انجیر.", wall: "#d7ccc8", roof: "#2e7d32", draw: "press", recipes: [{ out: "ketchup", n: 1, inp: { tomato: 3 }, time: 65, xp: 6 }, { out: "jam", n: 1, inp: { strawberry: 3 }, time: 80, xp: 7 }, { out: "oil", n: 1, inp: { sunflower: 3 }, time: 90, xp: 8 }, { out: "juice", n: 1, inp: { grape: 3 }, time: 100, xp: 9 }, { out: "pom_paste", n: 1, inp: { pomegranate: 3 }, time: 150, xp: 40, lvl: 15 }, { out: "fig_jam", n: 1, inp: { fig: 3 }, time: 170, xp: 55, lvl: 23 }, { out: "melon_juice", n: 1, inp: { watermelon: 2 }, time: 70, xp: 10 }, { out: "ab_albaloo", n: 1, inp: { cherry: 2 }, time: 90, xp: 18, lvl: 16 }] },
  { id: "sawmill", name: "نجاری", cost: 900, lvl: 4, desc: "الوار را تخته و تخته را جعبه‌ی چوبی می‌کند.", wall: "#c8a27a", roof: "#6d4c41", draw: "sawmill", recipes: [{ out: "planks", n: 1, inp: { wood: 2 }, time: 40, xp: 3 }, { out: "crate", n: 1, inp: { planks: 2 }, time: 70, xp: 6 }] },
  { id: "quarry", name: "معدن سنگ", cost: 1100, lvl: 5, desc: "با داربستِ چوبی از دلِ کوه سنگ درمی‌آورد: هر الوار = ۲ سنگ.", wall: "#9e9e9e", roof: "#795548", draw: "quarry", recipes: [{ out: "stone", n: 2, inp: { wood: 1 }, time: 45, xp: 3 }] },
  { id: "stonemason", name: "سنگ‌تراشی", cost: 1400, lvl: 6, desc: "سنگ را می‌تراشد و با تخته، سنگ آسیاب می‌سازد.", wall: "#cfd8dc", roof: "#546e7a", draw: "stonemason", recipes: [{ out: "cut_stone", n: 1, inp: { stone: 2 }, time: 50, xp: 4 }, { out: "millstone", n: 1, inp: { cut_stone: 2, planks: 1 }, time: 110, xp: 12 }] },
  { id: "nut_roaster", name: "آجیل‌بوی", cost: 5000, lvl: 11, desc: "پسته را بو می‌دهد و آجیل شب یلدا می‌سازد.", wall: "#d7a86e", roof: "#8d3b1f", draw: "workshop", recipes: [{ out: "roasted_pistachio", n: 1, inp: { pistachio: 2 }, time: 120, xp: 28 }, { out: "nut_mix", n: 1, inp: { pistachio: 1, walnut: 1, dates: 1 }, time: 180, xp: 50, lvl: 19 }] },
  { id: "textile", name: "کارگاه نساجی", cost: 5500, lvl: 13, desc: "پنبه را می‌ریسد و پارچه می‌بافد.", wall: "#e3f2fd", roof: "#1565c0", draw: "workshop", recipes: [{ out: "fabric", n: 1, inp: { cotton: 3 }, time: 100, xp: 22 }] },
  { id: "teahouse", name: "چایخانه", cost: 6000, lvl: 14, desc: "چای تازه‌دم و دمنوش گل‌محمدی.", wall: "#ffe0b2", roof: "#00897b", draw: "workshop", recipes: [{ out: "brewed_tea", n: 1, inp: { tea: 2 }, time: 60, xp: 16 }, { out: "herbal_tea", n: 1, inp: { tea: 1, rose: 2 }, time: 90, xp: 20 }, { out: "mint_tea", n: 1, inp: { mint: 2 }, time: 50, xp: 15, lvl: 18 }] },
  { id: "distillery", name: "گلاب‌گیری", cost: 7000, lvl: 16, desc: "گلاب ناب به رسمِ قمصر کاشان.", wall: "#fce4ec", roof: "#6a1b9a", draw: "workshop", recipes: [{ out: "rosewater", n: 1, inp: { rose: 4 }, time: 140, xp: 30 }] },
  { id: "carpet_loom", name: "دار قالی", cost: 9000, lvl: 17, desc: "با پشم و پارچه، قالیِ دستبافِ گران‌بها می‌بافد.", wall: "#efebe9", roof: "#b71c1c", draw: "workshop", recipes: [{ out: "carpet", n: 1, inp: { wool: 3, fabric: 2 }, time: 360, xp: 90 }] },
  { id: "gaz_factory", name: "گزسازی", cost: 9500, lvl: 18, desc: "گزِ پسته‌ای اصفهان و نقلِ بادامی.", wall: "#fff8e1", roof: "#0277bd", draw: "workshop", recipes: [{ out: "gaz", n: 1, inp: { honey: 1, pistachio: 2, egg: 1 }, time: 200, xp: 55 }, { out: "noghl", n: 1, inp: { almond: 2, honey: 1 }, time: 160, xp: 48, lvl: 21 }] },
  { id: "kitchen", name: "آشپزخانه‌ی سنتی", cost: 10000, lvl: 20, desc: "زرشک‌پلو با زعفران برای مهمانی‌های بزرگ.", wall: "#fff3e0", roof: "#e65100", draw: "workshop", recipes: [{ out: "zereshk_polo", n: 1, inp: { rice: 2, barberry: 1, saffron: 1 }, time: 150, xp: 45 }] },
  { id: "qanat", name: "قنات", cost: 12000, lvl: 22, desc: "آبِ زیرزمینی ۲۴ زمینِ اطرافش را همیشه خیس نگه می‌دارد.", wall: "#bcaaa4", roof: "#4fc3f7", draw: "qanat", recipes: [], isAuto: true, radius: 3 },
  { id: "saffron_house", name: "زعفران‌سرا", cost: 15000, lvl: 24, desc: "کلاله‌های زعفران را جدا و سرگلِ درجه‌یک بسته‌بندی می‌کند.", wall: "#f3e5f5", roof: "#8e24aa", draw: "workshop", recipes: [{ out: "premium_saffron", n: 1, inp: { saffron: 4 }, time: 240, xp: 60 }] },
  { id: "caravanserai", name: "کاروانسرا", cost: 20000, lvl: 25, desc: "بسته‌ی سوغاتِ دره (گز، پسته، گلاب) را برای کاروان‌ها آماده می‌کند.", wall: "#d7ccc8", roof: "#795548", draw: "caravanserai", recipes: [{ out: "souvenir", n: 1, inp: { gaz: 1, roasted_pistachio: 1, rosewater: 1 }, time: 300, xp: 110 }] },
  { id: "mega_sprinkler", name: "آب‌پاش صنعتی", cost: 1500, lvl: 6, desc: "۲۴ زمینِ اطرافش (شعاع ۲) را خودکار آبیاری می‌کند.", wall: "#455a64", roof: "#00bcd4", draw: "mega_sprinkler", recipes: [], isAuto: true, radius: 2 },
  { id: "greenhouse", name: "گلخانه هوشمند", cost: 2400, lvl: 7, desc: "گیاهانِ ۸ زمینِ اطرافش ۲۵٪ سریع‌تر رشد می‌کنند.", wall: "#b3e5fc", roof: "#e1f5fe", draw: "greenhouse", recipes: [], isAuto: true, radius: 1 },
  { id: "harvester", name: "دروگر رباتیک", cost: 2800, lvl: 7, desc: "محصولِ رسیده‌ی ۸ زمینِ اطرافش را خودکار برمی‌دارد (اگر انبار جا داشته باشد).", wall: "#37474f", roof: "#e65100", draw: "harvester", recipes: [], isAuto: true, radius: 1 },
  { id: "auto_planter", name: "بذرپاش خودکار", cost: 3100, lvl: 8, desc: "۸ زمینِ اطرافش را خودکار می‌کارد و برای هر کاشت یک محصول از انبار برمی‌دارد.", wall: "#263238", roof: "#43a047", draw: "auto_planter", recipes: [], isAuto: true, radius: 1 },
  { id: "auto_fertilizer", name: "کودپاش رباتیک", cost: 3600, lvl: 9, desc: "۸ زمینِ اطرافش را خودکار کود می‌دهد (هر بار ۴ سکه).", wall: "#6a1b9a", roof: "#ab47bc", draw: "composter", recipes: [], isAuto: true, radius: 1 },
  { id: "sweet_shop", name: "شیرینی‌پزی اشرافی", cost: 4000, lvl: 9, desc: "شکلات، بستنی زعفرانی، شربت عسل، پلیور بافتنی و شیربرنج.", wall: "#fce4ec", roof: "#ad1457", draw: "sweet_shop", recipes: [{ out: "chocolate", n: 1, inp: { butter: 1, milk: 1, flour: 1 }, time: 110, xp: 18 }, { out: "icecream", n: 1, inp: { saffron: 1, milk: 2, egg: 1 }, time: 150, xp: 25 }, { out: "mead", n: 1, inp: { honey: 2, juice: 1 }, time: 140, xp: 22 }, { out: "sweater", n: 1, inp: { wool: 3 }, time: 160, xp: 24 }, { out: "shirberenj", n: 1, inp: { rice: 2, milk: 1 }, time: 90, xp: 22, lvl: 12 }, { out: "lavashak", n: 1, inp: { cherry: 3 }, time: 130, xp: 26, lvl: 17 }, { out: "apple_jam", n: 1, inp: { apple: 2 }, time: 80, xp: 12, lvl: 9 }] },
  { id: "statue", name: "مجسمه‌ی سنگی", cost: 1300, lvl: 5, desc: "نمادی باشکوه در میانه‌ی باغ.", wall: "#90a4ae", roof: "#b0bec5", draw: "statue", isDecor: true, recipes: [] },
  { id: "windmill_deco", name: "آسیابک تزئینی", cost: 900, lvl: 4, desc: "پره‌های رنگی که با نسیم می‌چرخند.", wall: "#f5f5f5", roof: "#37474f", draw: "windmill_deco", isDecor: true, recipes: [] },
  { id: "pergola", name: "داربست تاک", cost: 750, lvl: 4, desc: "کوچه‌ی سبز و سایه‌دار زیر داربستِ چوبی.", wall: "#8d6e63", roof: "#795548", draw: "pergola", isDecor: true, recipes: [] },
  { id: "flowerbed", name: "باغچه‌ی گل", cost: 500, lvl: 3, desc: "گل‌های رنگارنگ در خاکِ نرم.", wall: "#a5d6a7", roof: "#81c784", draw: "flowerbed", isDecor: true, flowerColor: "#f06292", recipes: [] },
  { id: "pond_deco", name: "حوض نیلوفر", cost: 650, lvl: 4, desc: "حوضِ کوچک با نیلوفرهای آبی.", wall: "#4fc3f7", roof: "#29b6f6", draw: "pond_deco", isDecor: true, pondColor: "#4fc3f7", recipes: [] },
  { id: "bamboo", name: "گلدان بامبو", cost: 600, lvl: 4, desc: "ساقه‌های بلند و سبزِ بامبو.", wall: "#263238", roof: "#455a64", draw: "bamboo", isDecor: true, recipes: [] },
  { id: "stone_wall", name: "دیوار سنگی", cost: 700, lvl: 4, desc: "دیوارچه‌ی سنگچین برای مرزبندی باغ.", wall: "#9e9e9e", roof: "#616161", draw: "stone_wall", isDecor: true, recipes: [] },
  { id: "gate", name: "دروازه‌ی چوبی", cost: 550, lvl: 3, desc: "سردرِ چوبیِ ورودِ مزرعه.", wall: "#8d6e63", roof: "#5d4037", draw: "gate", isDecor: true, recipes: [] },
  { id: "fountain", name: "فواره‌ی مرمری", cost: 1500, lvl: 6, desc: "فواره‌ی بلند با غبارِ خنکِ آب.", wall: "#ffffff", roof: "#4fc3f7", draw: "fountain", isDecor: true, recipes: [] },
  { id: "gazebo", name: "کلاه‌فرنگی", cost: 1100, lvl: 5, desc: "سایه‌بانِ چوبی برای عصرهای تابستان.", wall: "#a1887f", roof: "#5d4037", draw: "gazebo", isDecor: true, recipes: [] },
  { id: "tiled_pool", name: "حوض کاشی", cost: 2500, lvl: 16, desc: "حوضِ فیروزه‌ای با کاشی‌های هفت‌رنگ.", wall: "#26a69a", roof: "#4dd0e1", draw: "tiled_pool", isDecor: true, recipes: [] },
  { id: "windcatcher", name: "بادگیر", cost: 3500, lvl: 22, desc: "برجِ خنک‌کننده‌ی یزدی با دریچه‌های بلند.", wall: "#d7b98e", roof: "#a1887f", draw: "windcatcher", isDecor: true, recipes: [] },
  { id: "tiled_portal", name: "سردر کاشی‌کاری", cost: 5000, lvl: 25, desc: "سردرِ طاق‌دار با کاشیِ لاجوردی؛ نشانِ اربابِ دره.", wall: "#1e88e5", roof: "#fdd835", draw: "tiled_portal", isDecor: true, recipes: [] },
  { id: "scarecrow", name: "مترسک", cost: 800, lvl: 6, desc: "نگهبانِ گنجشک‌ها با کلاهِ حصیری و پیراهنِ چهارخانه.", wall: "#8d6e63", roof: "#fbc02d", draw: "scarecrow", isDecor: true, recipes: [] },
  { id: "seesaw", name: "الاکلنگ", cost: 650, lvl: 5, desc: "برای بچه‌های دهکده؛ صدای خنده‌شان تا آسیاب می‌رسد.", wall: "#ef6c00", roof: "#ffb74d", draw: "seesaw", isDecor: true, recipes: [] },
  { id: "haystack", name: "کندر کاه", cost: 450, lvl: 4, desc: "کاهِ طلاییِ پیچیده‌شده با طناب؛ بوی نان و آفتاب.", wall: "#e0a63c", roof: "#c68a2a", draw: "haystack", isDecor: true, recipes: [] },
  { id: "lantern", name: "فانوس باغ", cost: 900, lvl: 7, desc: "شب‌ها مسیر جوی را روشن می‌کند و کرم‌های شب‌تاب را می‌خواند.", wall: "#37474f", roof: "#ffd54f", draw: "lantern", isDecor: true, recipes: [] },
  { id: "flower_arch", name: "طاق گل", cost: 1400, lvl: 8, desc: "طاقِ چوبی پوشیده از رز؛ دروازه‌ی عکسِ هر عروسیِ ده.", wall: "#6d4c41", roof: "#ec407a", draw: "flower_arch", isDecor: true, recipes: [] },
  { id: "rock_spring", name: "آب‌سنگ", cost: 2200, lvl: 10, desc: "چشمه‌ای که از دلِ سنگ می‌جهد؛ صدای آب، آرامشِ باغ.", wall: "#78909c", roof: "#4fc3f7", draw: "rock_spring", isDecor: true, recipes: [] },
  { id: "mirror_pool", name: "حوض آینه‌ها", cost: 20000, lvl: 18, desc: "آبِ آرامش مثل آینه، آسمانِ دره را نگه می‌دارد. (چاهِ سکه‌ی افسانه‌ای)", wall: "#26a69a", roof: "#4dd0e1", draw: "tiled_pool", isDecor: true, limit: 1, recipes: [] },
  { id: "golden_tree", name: "درخت زرین دره", cost: 30000, lvl: 20, desc: "برگ‌های طلایی‌اش شب مثل فانوس می‌درخشند؛ یادگارِ آبادانی. (چاهِ سکه‌ی افسانه‌ای)", wall: "#fbc02d", roof: "#f57f17", draw: "golden_tree", isDecor: true, limit: 1, recipes: [] },
  { id: "valley_portal", name: "سردر زرین دره", cost: 50000, lvl: 22, desc: "سردرِ زرینِ کاشی؛ تنها برای کسی که دره را به رویا رساند. (چاهِ سکه‌ی افسانه‌ای)", wall: "#1e88e5", roof: "#fdd835", draw: "tiled_portal", isDecor: true, limit: 1, recipes: [] },
];

export const BMAP: Record<string, BuildingDef> = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));
export const CMAP: Record<string, CropDef> = Object.fromEntries(CROPS.map((c) => [c.id, c]));

export const NPCS = [
  "خاله رعنا (سرآشپز)", "آقا مهدی (کافه‌دار)", "سارا (گیاه‌شناس)", "عمو نوروز (جهانگرد)",
  "رستوران سنتی بهارستان", "هتل بین‌المللی ستاره", "مدرسه شبانه‌روزی ده", "کافه دنج بازارچه",
  "کاروانسرا تجاری", "بیمارستان مهرگان", "فرمانداری دهکده",
];

export const WORKERS = {
  farmhand: { name: "کارگر مزرعه", wage: 50, hire: 380, lvl: 2, desc: "محصولِ رسیده را برمی‌دارد، دوباره می‌کارد و خاکِ خشک را آب می‌دهد" },
  operator: { name: "اپراتور", wage: 85, hire: 650, lvl: 4, desc: "خروجیِ کارگاه‌ها را جمع می‌کند و آخرین دستور را دوباره در صف می‌گذارد" },
  trader: { name: "دلال بورس", wage: 130, hire: 1100, lvl: 5, desc: "قیمت فروش +۱۲٪ (برای هر دلال)" },
  scientist: { name: "دانشمند", wage: 200, hire: 1800, lvl: 7, desc: "رشد گیاهان +۲۰٪" },
  vet: { name: "دامپزشک", wage: 150, hire: 1300, lvl: 5, desc: "تولید دامی ۱۵٪ سریع‌تر" },
} as const;
export type WorkerKind = keyof typeof WORKERS;

export const TECH_TREE: TechItem[] = [
  { id: "seeds1", name: "بذر اصلاح‌شده", cost: 450, desc: "هزینه‌ی بذر −۲۰٪" },
  { id: "crop_xp", name: "اگرونومی", cost: 700, desc: "تجربه (XP) +۲۵٪", req: "seeds1" },
  { id: "storage1", name: "قفسه‌بندی", cost: 550, desc: "+۱۰۰ ظرفیت انبار" },
  { id: "storage2", name: "انبار هوشمند", cost: 1300, desc: "+۲۵۰ ظرفیت انبار", req: "storage1" },
  { id: "mega_silo", name: "لجستیک غلات", cost: 3000, desc: "+۶۰۰ ظرفیت انبار", req: "storage2" },
  { id: "speed_ovens", name: "کوره صنعتی", cost: 1000, desc: "زمان فرآوری کارگاه‌ها −۲۵٪" },
  { id: "greenhouse_tech", name: "فناوری گلخانه", cost: 1500, desc: "رشد +۲۰٪ و +۱ محصول در هر برداشت", req: "seeds1" },
  { id: "market1", name: "تحلیل بازار", cost: 1200, desc: "قیمت فروش +۸٪" },
  { id: "export_license", name: "مجوز صادرات", cost: 3500, desc: "قیمت فروش +۲۰٪", req: "market1" },
  { id: "order_bonus", name: "قرارداد تشویقی", cost: 1800, desc: "پاداش سکه‌ی سفارش‌ها +۲۵٪" },
  { id: "auto_feed", name: "خوراک‌دهی خودکار", cost: 2300, desc: "گرانیِ ساختمانِ تکراری کمتر و +۲ جای صف تولید" },
  { id: "automation_tech", name: "اتوماسیون جامع", cost: 4800, desc: "حقوق کارکنان −۱۵٪", req: "auto_feed" },
  { id: "fertilizer_master", name: "کود بیولوژیک", cost: 2800, desc: "۳۰٪ شانس کود رایگان هنگام کاشت", req: "greenhouse_tech" },
  { id: "animal_husbandry", name: "دامپروری پیشرفته", cost: 2600, desc: "تولید دامی ۲۵٪ سریع‌تر" },
  { id: "precision_agri", name: "کشاورزی دقیق", cost: 4000, desc: "شعاع همه‌ی ماشین‌های خودکار +۱", req: "automation_tech" },
  { id: "irrigation_engineering", name: "مهندسی آبیاری", cost: 2200, desc: "شعاع چاه و آب‌پاش‌ها +۱", req: "seeds1" },
  { id: "landscape_design", name: "طراحی منظر", cost: 2000, desc: "ساختِ سازه‌های تزئینی آزاد می‌شود" },
  { id: "export_pack", name: "بسته‌بندی صادراتی", cost: 8000, desc: "قیمت فروش کالاهای کارگاهی +۱۰٪", lvl: 15 },
  { id: "qanat_net", name: "شبکه‌ی قنات", cost: 10000, desc: "خاکِ آبیاری‌شده ۵۰٪ دیرتر خشک می‌شود", lvl: 18 },
  { id: "global_market", name: "بازار جهانی", cost: 15000, desc: "پاداش سکه‌ی سفارش‌ها +۱۵٪", lvl: 21, req: "export_pack" },
  { id: "biotech", name: "زیست‌فناوری", cost: 20000, desc: "رشد گیاهان +۱۵٪", lvl: 24, req: "greenhouse_tech" },
];

export const SKILLS: SkillItem[] = [
  { id: "master_planter", name: "استاد کاشت", desc: "هزینه‌ی بذر −۱۰٪", cost: 1, effect: "بذر ارزان‌تر" },
  { id: "fert_soil", name: "خاک حاصلخیز", desc: "۱۵٪ شانس کود رایگان هنگام کاشت", cost: 1, req: "master_planter", effect: "کود رایگان" },
  { id: "harvest_god", name: "دروگر افسانه‌ای", desc: "+۱ محصول در هر برداشت", cost: 2, req: "master_planter", effect: "۱ محصول اضافه" },
  { id: "price_mind", name: "بازارشناس", desc: "قیمت فروش +۱۰٪ دائمی", cost: 2, req: "fert_soil", effect: "سود بیشتر" },
  { id: "storage_master", name: "انباردار خردمند", desc: "ظرفیت انبار +۱۵۰ واحد دائمی", cost: 2, req: "price_mind", effect: "انبار بزرگ‌تر" },
  { id: "grow_master", name: "استاد رشد", desc: "رشد گیاهان +۱۰٪ دائمی", cost: 3, req: "fert_soil", effect: "رشد سریع‌تر" },
  { id: "water_wise", name: "میراب", desc: "شعاع چاه و آب‌پاش‌ها +۱", cost: 3, req: "grow_master", effect: "آبیاری گسترده‌تر" },
  { id: "animal_tamer", name: "دامدار مهربان", desc: "تولید دامی ۱۵٪ سریع‌تر", cost: 3, req: "harvest_god", effect: "دام‌های شاد" },
  { id: "artisan", name: "صنعتگر چیره‌دست", desc: "زمان فرآوری کارگاه‌ها −۱۵٪", cost: 4, req: "price_mind", effect: "تولید سریع‌تر" },
  { id: "landscape_art", name: "طراح باغ", desc: "قیمت سازه‌های تزئینی -۲۰٪", cost: 4, req: "storage_master", effect: "زیبایی ارزان" },
  { id: "zen_master", name: "آرامش باغ", desc: "پاداش سفارش‌ها +۵٪ و تجربه +۱۰٪", cost: 5, req: "artisan", effect: "تمرکز و آرامش" },
  { id: "crop_lord", name: "ارباب کشتزار", desc: "تجربه +۱۰٪ (رسیدن سریع‌تر به سطح‌های بالا)", cost: 5, req: "zen_master", effect: "فرمانروایی" },
  { id: "economist", name: "اقتصاددان", desc: "قیمت فروش +۱۵٪ دائمی", cost: 6, req: "crop_lord", effect: "سود بیشتر" },
];

export const CONTRACTS: ContractDef[] = [
  { id: "c_harvest1", title: "تأمین مایحتاج", desc: "برداشت ۱۰۰ محصول", target: 100, type: "harvest", rewardCoins: 900, rewardRep: 5, rewardXp: 35 },
  { id: "c_harvest2", title: "ذخایر ملی", desc: "برداشت ۶۰۰ محصول", target: 600, type: "harvest", rewardCoins: 4200, rewardRep: 14, rewardXp: 100 },
  { id: "c_produce1", title: "صنعت روستایی", desc: "تولید ۴۰ کالا", target: 40, type: "produce", rewardCoins: 1500, rewardRep: 9, rewardXp: 55 },
  { id: "c_produce2", title: "انقلاب صنعتی", desc: "تولید ۳۰۰ کالا", target: 300, type: "produce", rewardCoins: 7500, rewardRep: 22, rewardXp: 180 },
  { id: "c_orders1", title: "توزیع معتمد", desc: "تحویل ۱۲ سفارش", target: 12, type: "orders", rewardCoins: 1800, rewardRep: 18, rewardXp: 70 },
  { id: "c_coins1", title: "بازرگان طلایی", desc: "۶۰٬۰۰۰ سکه درآمد", target: 60000, type: "coins", rewardCoins: 3500, rewardRep: 12, rewardXp: 90 },
  { id: "c_animals1", title: "دامپرور نمونه", desc: "تولید ۸۰ کالای دامی", target: 80, type: "animals", rewardCoins: 3200, rewardRep: 14, rewardXp: 95 },
];

export const ACHIEVEMENTS: AchievementItem[] = [
  { id: "first_harvest", title: "اولین جوانه", desc: "برداشت اولین محصول", reward: 60 },
  { id: "rich1", title: "پس‌انداز اولیه", desc: "داشتن ۱٬۰۰۰ سکه", reward: 180 },
  { id: "rich2", title: "سرمایه‌دار محلی", desc: "داشتن ۱۰٬۰۰۰ سکه", reward: 900 },
  { id: "rich3", title: "ثروتمند دره", desc: "داشتن ۱۰۰٬۰۰۰ سکه", reward: 6000 },
  { id: "level10", title: "کشاورز باتجربه", desc: "رسیدن به سطح ۱۰", reward: 700 },
  { id: "level20", title: "استاد اعظم", desc: "رسیدن به سطح ۲۰", reward: 3000 },
  { id: "level25", title: "افسانه‌ی دره", desc: "رسیدن به سطح ۲۵", reward: 6000 },
  { id: "factory_master", title: "چرخ‌های صنعت", desc: "۶۰ تولید در کارگاه‌ها", reward: 600 },
  { id: "land_baron", title: "مالک بزرگ", desc: "خرید ۱۰ قطعه زمین", reward: 1400 },
  { id: "automation_king", title: "عصر ماشین‌ها", desc: "۵ ماشین خودکار (دروگر، بذرپاش، کودپاش)", reward: 2500 },
  { id: "zoo", title: "باغ‌وحش کوچک", desc: "داشتن هر پنج دامداری", reward: 3000 },
  { id: "decorator", title: "استاد باغ", desc: "ساخت ۱۰ سازه‌ی تزئینی", reward: 2200 },
  { id: "skill_master", title: "استاد مهارت‌ها", desc: "یادگیری ۱۰ مهارت", reward: 3000 },
];

export const N = 36;
export const CH = 4;
export const DAY_LEN = 240;
export const FERT_COST = 10;
export const HOE_COST = 5;
export const CLEAR_COST = { tree: 20, rock: 30 } as const;

/**
 * تجربه‌ی لازم برای سطحِ بعد (P5.4): تا سطح ۱۰ همان منحنیِ قبلی؛ بعد از آن ملایم‌تر
 * (رشدِ توانِ ۱.۲۵ به‌جای ۱.۶) تا بازه‌ی ۱۰..۲۰ خسته‌کننده نباشد — هر سطح محتوای تازه دارد.
 */
export const xpFor = (lvl: number) =>
  lvl <= 10 ? Math.round(40 * Math.pow(lvl, 1.6)) : Math.round(40 * Math.pow(10, 1.6) + 140 * Math.pow(lvl - 10, 1.25));
/**
 * عددِ صحیحِ فارسی (کفِ عدد). بی‌ICU (faNum.ts): toLocaleString در هر فراخوانی NumberFormatِ تازه
 * می‌ساخت و حتی یک نمونه‌ی کش‌شده هم بارِ اولش ۱۰ تا ۱۶ میلی‌ثانیه داده‌ی ICU بار می‌کرد (P6.5).
 */
export const fmt = (n: number) => faNum(Math.floor(n));
