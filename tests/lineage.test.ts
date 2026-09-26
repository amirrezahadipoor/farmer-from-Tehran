import { describe, it, expect, beforeEach } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  HEIR_NAMES,
  TRAITS,
  beginLineage,
  currentHeir,
  doPrestige,
  lineageChain,
  nameHeir,
  newState,
  normalizeLineage,
  prevName,
  setLineageShown,
  traitOf,
  type Events,
  type GenDeltas,
  type State,
  type Trait,
} from "../src/game/logic";
import {
  LINEAGE_GOALS,
  advanceLineage,
  lineageChapter,
  lineageProgress,
  lineageReward,
  lineageVars,
  lineageVisible,
  mainStoryPending,
  ordinalFa,
  updateLineage,
} from "../src/game/lineageStory";
import { CHAPTERS, LAST_CH, SPEAKERS } from "../src/game/story";
import { sanitizeSave } from "../src/game/sim/sanitize";
import { hasEmoji } from "../src/game/noEmoji";
import { ACHIEVEMENTS } from "../src/game/data";

/**
 * P6.4 — «داستان با متغیرهای نسل قبل ادامه دارد»: نام، سبک و عددهای نسلِ قبل در متنِ فصلِ
 * تازه می‌آیند و هدفِ فصل ادامه‌ی همان سبک است. داستانِ اصلی دست‌نخورده می‌ماند.
 */
const toasts: { m: string; t?: string }[] = [];
const sounds: string[] = [];
const ev: Events = { toast: (m, t) => toasts.push({ m, t }), fx: () => {}, sound: (k) => sounds.push(k) };
let s: State;
beforeEach(() => {
  toasts.length = 0;
  sounds.length = 0;
  s = newState();
  s.achievements = Object.fromEntries(["rich1", "rich2", "rich3", "first_harvest", "level10"].map((k) => [k, true]));
  s.story.name = "امید";
});
const ready = (st: State) => {
  st.level = 22;
  st.coins = 50_000;
};
const D = (p: Partial<GenDeltas> = {}): GenDeltas => ({ days: 30, harvested: 0, orders: 0, produced: 0, decorations: 0, earned: 0, ...p });
/** وارثِ نسلِ gen با سبکِ trait (بدون گذر از doPrestige) */
const withHeir = (gen: number, trait: Trait, name = "") => {
  const st = newState();
  st.story.name = "امید";
  const pick: Record<Trait, Partial<GenDeltas>> = { farmer: { harvested: 400 }, merchant: { orders: 30 }, artisan: { produced: 90 }, builder: { decorations: 12 } };
  for (let g = 1; g <= gen; g++) {
    st.prestige = g;
    beginLineage(st, D(g === gen ? { ...pick[trait], days: 41 } : { harvested: 10 }));
    nameHeir(st, g === gen ? name || HEIR_NAMES[g - 1] : HEIR_NAMES[g - 1]);
  }
  return st;
};
const allScenes = (st: State) => {
  const ch = lineageChapter(st)!;
  return [...ch.scenes, ...ch.endScenes];
};

describe("سبکِ نسل از آمارِ واقعی", () => {
  it("هر چهار سبک از کارِ غالبِ همان نسل؛ برابری و صفر = کشاورز", () => {
    expect(traitOf(D({ harvested: 400, orders: 5 }))).toBe("farmer");
    expect(traitOf(D({ harvested: 100, orders: 12 }))).toBe("merchant");
    expect(traitOf(D({ harvested: 100, produced: 80 }))).toBe("artisan");
    expect(traitOf(D({ harvested: 100, decorations: 9 }))).toBe("builder");
    expect(traitOf(D())).toBe("farmer");
    expect(traitOf(D({ harvested: 120, orders: 6 }))).toBe("farmer");
  });
});

describe("تناسخ ← وارث", () => {
  it("اولین تناسخ: بنیان‌گذار = نامِ بازیکن، وارثِ نسل ۱ با کارنامه‌ی همان نسل، پرده‌ی نام باز", () => {
    ready(s);
    s.day = 37;
    s.stats.harvested = 500;
    s.stats.orders = 4;
    s.stats.produced = 20;
    s.stats.decorations = 2;
    doPrestige(s, ev);
    expect(s.prestige).toBe(1);
    const L = s.lineage!;
    expect(L.founder).toBe("امید");
    expect(L.phase).toBe("name");
    expect(L.shown).toBe(true);
    expect(currentHeir(s)).toMatchObject({ gen: 1, name: "", trait: "farmer", days: 37, harvested: 500, orders: 4, produced: 20, decorations: 2 });
    expect(prevName(s)).toBe("امید");
  });

  it("تناسخِ دوم: کارنامه تفاضلِ همین نسل است نه کلِ عمر؛ زنجیره‌ی نام‌ها ادامه دارد", () => {
    ready(s);
    s.stats.harvested = 500;
    doPrestige(s, ev);
    nameHeir(s, "مهسا");
    ready(s);
    s.day = 12;
    s.stats.harvested = 560; // فقط ۶۰ در نسلِ دوم
    s.stats.orders = 40; // همه در همین نسل
    doPrestige(s, ev);
    const h = currentHeir(s)!;
    expect(h).toMatchObject({ gen: 2, harvested: 60, orders: 40, days: 12, trait: "merchant" });
    expect(prevName(s)).toBe("مهسا");
    nameHeir(s, "آرش");
    expect(lineageChain(s)).toEqual(["رحیم", "امید", "مهسا", "آرش"]);
    expect(s.lineage!.founder).toBe("امید");
  });

  it("رکوردِ قدیمیِ بدونِ produced/decorations: نامعلوم = صفر (سبک به‌خاطرِ کلِ عمرِ مزرعه صنعتگر نمی‌شود)", () => {
    s.prestige = 1;
    s.generations = [{ gen: 0, day: 20, level: 20, earned: 1000, harvested: 300, orders: 3, coins: 5000, inherited: 500 }];
    ready(s);
    s.stats.harvested = 800;
    s.stats.produced = 5000;
    doPrestige(s, ev);
    expect(currentHeir(s)).toMatchObject({ harvested: 500, produced: 0, trait: "farmer" });
  });

  it("نامِ وارث: ایموجی و طولِ زیاد پاک می‌شود و نامِ خالی = پیشنهادِ پیش‌فرض", () => {
    ready(s);
    doPrestige(s, ev);
    nameHeir(s, "\u{1F33E}   ");
    expect(currentHeir(s)!.name).toBe(HEIR_NAMES[0]);
    nameHeir(s, "یک نامِ خیلی خیلی بلند برای وارث");
    expect(currentHeir(s)!.name.length).toBeLessThanOrEqual(16);
    expect(s.lineage!.phase).toBe("scenes");
  });
});

describe("متنِ فصل از متغیرهای نسلِ قبل", () => {
  it("همه‌ی نسل‌ها × همه‌ی سبک‌ها: هیچ {متغیرِ} پرنشده، ایموجی یا گوینده/تصویرِ ناموجود", () => {
    for (let gen = 1; gen <= 5; gen++) {
      for (const trait of TRAITS) {
        const st = withHeir(gen, trait);
        const ch = lineageChapter(st)!;
        expect(ch.id).toBe(`lin${gen}`);
        expect(ch.num).toBe(LAST_CH + gen);
        for (const sc of allScenes(st)) {
          for (const t of [sc.sp, sc.role, sc.text, ch.title, ch.subtitle, ch.goal!.label]) {
            expect(t, t).not.toMatch(/[{}]/);
            expect(hasEmoji(t), t).toBe(false);
          }
          expect(SPEAKERS as readonly string[]).toContain(sc.av);
          expect(existsSync(join(process.cwd(), "public", sc.bg)), sc.bg).toBe(true);
        }
      }
    }
  });

  it("نسلِ قبل با عددهای خودش حرف می‌زند؛ هدف ادامه‌ی همان سبک است", () => {
    const want: Record<Trait, string> = { farmer: "۴۰۰", merchant: "۳۰", artisan: "۹۰", builder: "۱۲" };
    for (const trait of TRAITS) {
      const st = withHeir(1, trait, "نیلوفر");
      const ch = lineageChapter(st)!;
      const elder = ch.scenes[1];
      expect(elder.sp).toBe("امید");
      expect(elder.text).toContain("۴۱ روز");
      expect(elder.text).toContain(want[trait]);
      expect(ch.goal!.kind).toBe(LINEAGE_GOALS[trait].kind);
      expect(ch.goal!.target).toBe(LINEAGE_GOALS[trait].target(1));
      // قولِ وارث همان عددِ هدف را می‌گوید
      expect(ch.scenes[3].sp).toBe("نیلوفر");
      expect(ch.scenes[3].text).toContain(lineageVars(st)!.target);
    }
  });

  it("آغاز و عنوان بسته به نسل فرق می‌کند و پایان، نام‌های قبلی را روی گردو می‌آورد", () => {
    const t = [1, 2, 3, 6].map((g) => lineageChapter(withHeir(g, "farmer"))!);
    expect(t.map((c) => c.title)).toEqual(["وارث", "نوه‌ی دره", "نسلِ چهارم", "نسلِ هفتم"]);
    expect(new Set(t.map((c) => c.scenes[0].text)).size).toBe(4);
    expect(t[0].scenes[2].sp).toBe("خاله رعنا");
    expect(t[1].scenes[2].text).toContain("امید");
    const st = withHeir(3, "builder", "کاوه");
    const end = lineageChapter(st)!.endScenes[0].text;
    expect(end).toContain("کاوه");
    expect(end).toContain("رحیم، امید، مهسا و آرش");
    expect(lineageChapter(st)!.endScenes[1].text).toContain("آرش"); // کنارِ نامِ نسلِ قبل
    expect(ordinalFa(2)).toBe("دوم");
    expect(ordinalFa(21)).toBe("۲۱ام");
  });
});

describe("ماشینِ حالت: نام ← صحنه‌ها ← قول ← پایان", () => {
  it("پیشرفتِ هدف از لحظه‌ی قول شمرده می‌شود و پاداش فقط یک بار", () => {
    ready(s);
    s.stats.harvested = 900;
    doPrestige(s, ev);
    expect(lineageProgress(s).cur).toBe(0);
    nameHeir(s, "مهسا");
    const ch = lineageChapter(s)!;
    for (let i = 0; i < ch.scenes.length; i++) advanceLineage(s, ev);
    const L = s.lineage!;
    expect(L.phase).toBe("goal");
    expect(L.shown).toBe(false);
    expect(L.goalBase).toBe(900);
    expect(lineageProgress(s).cur).toBe(0);
    const target = LINEAGE_GOALS.farmer.target(1);
    s.stats.harvested = 900 + target - 1;
    updateLineage(s, ev);
    expect(L.phase).toBe("goal");
    s.stats.harvested = 900 + target;
    updateLineage(s, ev);
    expect(L.phase).toBe("end");
    expect(L.shown).toBe(true);
    expect(sounds).toContain("goal");
    // تا XPِ پاداش، پاداشِ لِوِل‌آپ یا دستاورد را قاطیِ سکه‌ها نکند
    s.level = 60;
    s.achievements = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, true]));
    const coins = s.coins;
    const sp = s.stats.skillPoints;
    for (let i = 0; i < ch.endScenes.length; i++) advanceLineage(s, ev);
    expect(L.phase).toBe("done");
    expect(L.completed).toEqual([1]);
    expect(s.coins - coins).toBe(lineageReward(1).coins);
    expect(s.stats.skillPoints - sp).toBe(2);
    expect(toasts.some((x) => x.m.includes("«وارث»"))).toBe(true);
    // باز کردنِ دوباره پاداشِ دوباره نمی‌دهد
    advanceLineage(s, ev);
    expect(s.coins - coins).toBe(lineageReward(1).coins);
    setLineageShown(s, true);
    expect(L.shown).toBe(false);
  });

  it("پرده‌ی نسل پشتِ داستانِ اصلی صبر می‌کند (همان ثانیه‌ای که تناسخ هدفِ فصلِ ۱۰ را کامل می‌کند)", () => {
    s.story.chapter = LAST_CH;
    s.story.phase = "goal";
    s.story.shown = false;
    ready(s);
    doPrestige(s, ev);
    expect(CHAPTERS[LAST_CH].goal!.kind).toBe("prestige");
    expect(mainStoryPending(s)).toBe(true);
    expect(lineageVisible(s)).toBe(false);
    s.story.phase = "end";
    s.story.shown = true;
    expect(lineageVisible(s)).toBe(false);
    s.story.done = true;
    s.story.shown = false;
    expect(lineageVisible(s)).toBe(true);
  });
});

describe("سیو", () => {
  it("شجره از sanitize سالم می‌گذرد؛ مقدارِ خراب اصلاح یا حذف می‌شود", () => {
    ready(s);
    doPrestige(s, ev);
    nameHeir(s, "مهسا");
    const back = sanitizeSave(JSON.parse(JSON.stringify(s)))!;
    expect(back.lineage).toEqual(s.lineage);
    expect(normalizeLineage("x")).toBeUndefined();
    expect(normalizeLineage({ heirs: "x" })).toBeUndefined();
    const bad = normalizeLineage({
      founder: "\u{1F600}",
      heirs: [null, { gen: -3, name: "نامِ خیلی خیلی خیلی بلند", trait: "wizard", harvested: -9, days: "7" }],
      phase: "boss",
      sceneIdx: 1e9,
      shown: "yes",
      completed: [1, 1, "2"],
    })!;
    expect(bad.founder).toBe("کشاورز");
    expect(bad.heirs).toHaveLength(1);
    expect(bad.heirs[0]).toMatchObject({ gen: 1, trait: "farmer", harvested: 0, days: 7 });
    expect(bad.heirs[0].name.length).toBeLessThanOrEqual(16);
    expect(bad.phase).toBe("done");
    expect(bad.sceneIdx).toBe(99);
    expect(bad.shown).toBe(false);
    expect(bad.completed).toEqual([1, 2]);
    const cleared = sanitizeSave({ ...JSON.parse(JSON.stringify(s)), lineage: 5 })!;
    expect(cleared.lineage).toBeUndefined();
  });
});
