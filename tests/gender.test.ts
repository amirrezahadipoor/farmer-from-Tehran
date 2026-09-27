import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CHAPTERS, sceneText } from "../src/game/story";
import { GENDERS, GENDER_WORDS, asGender, genderize, heroAvatar, type Gender } from "../src/game/gender";
import { speakerSvg } from "../src/game/art/portraits";
import { newState } from "../src/game/logic";
import { sanitizeSave } from "../src/game/sim/sanitize";
import { setPlayerName } from "../src/game/sim/actions";

/** tests/gender.test.ts — خطاب و چهره‌ی قهرمان به انتخابِ بازیکن (نقشه‌ی راه، مورد ۷) */
const GENDERED = /پسرم|پسرجان|پسر جان|پسرِ رحیم|دخترم|دخترجان|دخترِ رحیم/;
const scenes = CHAPTERS.flatMap((c) => [...c.scenes, ...c.endScenes]);
const G: Gender[] = ["m", "f", "n"];

describe("خطاب در متنِ داستان", () => {
  it("هیچ خطابِ جنسیتیِ ثابتی در متن‌های داستان و نسل‌ها نمانده است", () => {
    for (const f of ["src/game/story.ts", "src/game/lineageStory.ts"]) {
      const src = readFileSync(join(__dirname, "..", f), "utf8");
      expect(src.match(GENDERED)?.[0], f).toBeUndefined();
    }
  });

  it("هر نشانه‌ی خطاب برای هر سه انتخاب پر می‌شود و چیزی جا نمی‌ماند", () => {
    const used = new Set(scenes.flatMap((s) => s.text.match(/\{[a-zA-Z]+\}/g) ?? []));
    for (const t of used) if (t !== "{name}") expect(GENDER_WORDS[t], t).toBeDefined();
    for (const s of scenes) for (const g of G) expect(sceneText(s.text, "مریم", g)).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it("همان جمله برای مرد، زن و خنثی درست خطاب می‌کند", () => {
    const line = scenes.find((s) => s.text.includes("موفق باشی {child}"))?.text as string;
    expect(sceneText(line, "امید", "m")).toContain("موفق باشی پسرم");
    expect(sceneText(line, "مریم", "f")).toContain("موفق باشی دخترم");
    expect(sceneText(line, "کیان", "n")).toContain("موفق باشی فرزندم");
    expect(genderize("{rahimChild}!", "n")).toBe("یادگارِ رحیم!");
    expect(sceneText(line, "امید"), "پیش‌فرض خنثی").toContain("فرزندم");
  });
});

describe("چهره‌ی قهرمان", () => {
  it("هر صحنه‌ای که خودِ قهرمان حرف می‌زند چهره‌ی قهرمان دارد و پایانِ فصلِ ۱۰ چهره‌ی پیرِ خودش را", () => {
    for (const s of scenes.filter((x) => x.sp === "{name}")) expect(["hero", "hero_old"], s.text.slice(0, 30)).toContain(s.av);
    const last = CHAPTERS[CHAPTERS.length - 1];
    const will = [...last.scenes, ...last.endScenes].find((s) => s.sp === "{name}" && s.text.includes("وصیت"));
    expect(will?.av).toBe("hero_old");
  });

  it("چهره‌ها برای هر انتخاب واقعاً متفاوت‌اند و هیچ‌کدام به چهره‌ی پیش‌فرض برنمی‌گردد", () => {
    const young = G.map((g) => speakerSvg(heroAvatar("hero", g)));
    const old = G.map((g) => speakerSvg(heroAvatar("hero_old", g)));
    expect(new Set(young).size).toBe(3);
    expect(new Set(old).size).toBe(3);
    for (const o of old) {
      expect(o).not.toBe(speakerSvg("notary"));
      expect(young).not.toContain(o);
    }
    expect(heroAvatar("sara", "f"), "دیگران دست‌نخورده").toBe("sara");
  });
});

describe("ذخیره‌ی انتخاب", () => {
  it("دروازه‌ی نام انتخاب را ثبت می‌کند و sanitize مقدارِ نامعتبر یا سیوِ قدیمی را خنثی می‌کند", () => {
    const s = newState();
    expect(s.story.gender).toBe("n");
    setPlayerName(s, " مریم ", "f");
    expect(s.story).toMatchObject({ name: "مریم", gender: "f" });
    expect(sanitizeSave(JSON.parse(JSON.stringify(s)))?.story.gender).toBe("f");
    const bad = JSON.parse(JSON.stringify(s));
    bad.story.gender = "x";
    expect(sanitizeSave(bad)?.story.gender).toBe("n");
    delete bad.story.gender;
    expect(sanitizeSave(bad)?.story.gender).toBe("n");
    expect(asGender("m")).toBe("m");
    expect(GENDERS.map((g) => g.label)).toEqual(["زن", "مرد", "ترجیح می‌دهم نگویم"]);
  });
});
