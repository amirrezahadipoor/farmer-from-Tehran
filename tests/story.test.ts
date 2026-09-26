import { describe, it, expect } from "vitest";
import { newState, idx, type State, type Events } from "../src/game/logic";
import { CHAPTERS, LAST_CH, currentChapter, goalProgress, advanceStory, updateStory, isStoryFinished, sceneText } from "../src/game/story";

/**
 * P5.11 — داستان ۱۱ فصلی: هر فصل صحنه → هدف واقعی در بازی → صحنه‌ی پایانی → پاداش
 */

const quiet: Events = { toast: () => {}, fx: () => {}, sound: () => {} };

function fresh(): State {
  const s = newState();
  s.story.name = "امید";
  return s;
}

/** همه‌ی صحنه‌های فاز فعلی را رد می‌کند */
function skipScenes(s: State) {
  const ch = currentChapter(s);
  const list = s.story.phase === "end" ? ch.endScenes : ch.scenes;
  for (let i = 0; i < list.length; i++) advanceStory(s, quiet);
}

/** هدفِ فصلِ فعلی را در وضعیت برآورده می‌کند */
function satisfy(s: State) {
  const g = currentChapter(s).goal;
  if (!g) return;
  switch (g.kind) {
    case "level": s.level = g.target; break;
    case "harvest": s.stats.harvested = g.target; break;
    case "produced": s.stats.produced = g.target; break;
    case "orders": s.stats.orders = g.target; break;
    case "coins_total": s.stats.earned = g.target; break;
    case "workers": s.workers = Array.from({ length: g.target }, (_, i) => ({ id: 100 + i, kind: "farmhand" as const })); break;
    case "decorations": s.stats.decorations = g.target; break;
    case "animals": s.stats.animals = g.target; break;
    case "skills": s.skills = Array.from({ length: g.target }, (_, i) => `sk${i}`); break;
    case "prestige": s.prestige = g.target; break;
    case "buildings": (g.ids || []).slice(0, g.target).forEach((b, i) => (s.tiles[idx(2 + i, 2)] = { k: "bld", v: 0.5, b, q: [], p: 0, out: [] })); break;
    case "techs": s.techs.push(...(g.ids || []).slice(0, g.target)); break;
  }
}

describe("جریان داستان", () => {
  it("فصل اول بعد از صحنه‌ها به «هدف» می‌رود و پرده بسته می‌شود", () => {
    const s = fresh();
    expect(currentChapter(s).id).toBe(CHAPTERS[0].id);
    skipScenes(s);
    const ch = CHAPTERS[0];
    if (ch.goal) {
      expect(s.story.phase).toBe("goal");
      expect(s.story.shown).toBe(false);
    } else {
      expect(s.story.chapter).toBe(1);
    }
  });

  it("هدفِ برآورده → صحنه‌ی پایانی → پاداش و فصل بعد", () => {
    const s = fresh();
    // تا رسیدن به اولین فصلِ هدف‌دار
    while (!currentChapter(s).goal) skipScenes(s);
    skipScenes(s);
    const ch = currentChapter(s);
    expect(s.story.phase).toBe("goal");
    updateStory(s, quiet);
    expect(s.story.phase).toBe("goal"); // هنوز هدف برآورده نشده
    satisfy(s);
    updateStory(s, quiet);
    expect(s.story.phase).toBe("end");
    expect(s.story.shown).toBe(true);
    const coins0 = s.coins,
      sp0 = s.stats.skillPoints;
    skipScenes(s);
    expect(s.story.completed).toContain(ch.id);
    expect(s.coins).toBeGreaterThanOrEqual(coins0 + ch.reward.coins);
    expect(s.stats.skillPoints).toBeGreaterThanOrEqual(sp0 + ch.reward.sp);
    expect(currentChapter(s).num).toBe(ch.num + 1);
  });

  it("کل ۱۱ فصل تا پایان قابل‌بازی است و در پایان «تمام‌شده» است", () => {
    const s = fresh();
    for (let guard = 0; guard < 200 && !isStoryFinished(s); guard++) {
      if (s.story.phase === "goal") {
        satisfy(s);
        updateStory(s, quiet);
      } else skipScenes(s);
    }
    expect(isStoryFinished(s)).toBe(true);
    expect(s.story.completed.length).toBe(CHAPTERS.length);
    expect(s.story.chapter).toBe(LAST_CH);
    expect(s.story.done).toBe(true);
    // بازپخشِ صحنه‌های پایانی بعد از پایان داستان، بازی را قفل نمی‌کند
    s.story.shown = true;
    s.story.sceneIdx = 0;
    for (let i = 0; i < 10; i++) advanceStory(s, quiet);
    expect(s.story.shown).toBe(false);
    // updateStory بعد از پایان هیچ کاری نمی‌کند
    updateStory(s, quiet);
    expect(s.story.done).toBe(true);
  });

  it("پاداشِ هر فصل فقط یک بار داده می‌شود", () => {
    const s = fresh();
    while (!currentChapter(s).goal) skipScenes(s);
    skipScenes(s);
    satisfy(s);
    updateStory(s, quiet);
    skipScenes(s);
    const done = s.story.completed.length;
    const coins = s.coins;
    updateStory(s, quiet); // فصلِ بعد هنوز در صحنه‌هاست
    expect(s.story.completed.length).toBe(done);
    expect(s.coins).toBe(coins);
  });
});

describe("پیشرفتِ هدف برای همه‌ی انواع", () => {
  it.each(CHAPTERS.filter((c) => c.goal).map((c) => [c.id, c] as const))("فصل %s", (_id, ch) => {
    const s = fresh();
    s.story.chapter = CHAPTERS.indexOf(ch);
    const before = goalProgress(s, ch);
    expect(before.target).toBe(ch.goal!.target);
    expect(before.cur).toBeLessThan(before.target);
    satisfy(s);
    expect(goalProgress(s, ch).cur).toBeGreaterThanOrEqual(ch.goal!.target);
    expect(goalProgress(s, ch).label).toBe(ch.goal!.label);
  });

  it("فصل بدون هدف → پیشرفتِ خنثی", () => {
    const noGoal = { ...CHAPTERS[0], goal: undefined };
    expect(goalProgress(fresh(), noGoal)).toEqual({ cur: 0, target: 1, label: "" });
  });
});

describe("متن صحنه‌ها", () => {
  it("{name} با نام بازیکن جایگزین می‌شود و بی‌نام = «کشاورز»", () => {
    expect(sceneText("سلام {name}، {name} جان", "امید")).toBe("سلام امید، امید جان");
    expect(sceneText("سلام {name}", "")).toBe("سلام کشاورز");
  });

  it("هر صحنه تصویر، گوینده و متن دارد", () => {
    for (const ch of CHAPTERS)
      for (const sc of [...ch.scenes, ...ch.endScenes]) {
        expect(sc.bg).toMatch(/^\/images\/story_\w+\.webp$/);
        expect(sc.sp.length).toBeGreaterThan(0);
        expect(sc.text.length).toBeGreaterThan(10);
      }
  });
});
