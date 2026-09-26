/**
 * tests/no-emoji.test.ts — قاعده‌ی پروژه (P5.16): «هیچ‌جا ایموجی نه».
 *
 * نگهبانِ کل مخزن: هر فایلِ متنیِ ردیابی‌شده (کد، متن بازی، اسناد، ابزارها، ورک‌فلوها)
 * نباید هیچ نماد تصویری یونیکد داشته باشد. نمادها SVG دست‌سازند (src/game/icons.tsx و docs/icons/).
 */
import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { EMOJI_RE, dropEmoji, hasEmoji, stripEmoji } from "../src/game/noEmoji";
import { CHAPTERS, SPEAKERS } from "../src/game/story";
import { ACHIEVEMENTS, BUILDINGS, CROPS, ITEMS, NPCS, SEASONS, SKILLS, TECH_TREE, WORKERS } from "../src/game/data";

const ROOT = join(__dirname, "..");
/** ایموجی‌های نمونه فقط با کُدپوینت ساخته می‌شوند تا خودِ این فایل هم پاک بماند */
const E = (...cps: number[]) => String.fromCodePoint(...cps);
const WHEAT = E(0x1f33e), FARMER_W = E(0x1f469, 0x200d, 0x1f33e), SUN = E(0x2600, 0xfe0f), SCIENTIST = E(0x1f9d1, 0x200d, 0x1f52c);
const SUNFLOWER = E(0x1f33b), CIRCUS = E(0x1f3aa);
const BINARY = /\.(png|jpe?g|webp|gif|ico|woff2?|ttf|otf|mp3|ogg|wav|zip|gz|pdf|tsbuildinfo)$/i;
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "test-results", "playwright-report", "coverage"]);

function repoFiles(): string[] {
  try {
    // ردیابی‌شده + فایل‌های تازه‌ای که هنوز کامیت نشده‌اند (ولی نادیده‌گرفته نشده‌اند)
    return execSync("git ls-files -co --exclude-standard", { cwd: ROOT }).toString().split("\n").filter(Boolean);
  } catch {
    const out: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (SKIP_DIRS.has(name)) continue;
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else out.push(relative(ROOT, p));
      }
    };
    walk(ROOT);
    return out;
  }
}

describe("P5.16 — هیچ ایموجی‌ای در مخزن نیست", () => {
  it("هیچ فایلِ متنی نماد تصویری یونیکد ندارد (کد، داستان، اسناد، ابزار)", () => {
    const hits: string[] = [];
    let scanned = 0;
    for (const f of repoFiles()) {
      if (BINARY.test(f)) continue;
      let text: string;
      try {
        text = readFileSync(join(ROOT, f), "utf8");
      } catch {
        continue; // فایلِ حذف‌شده در درختِ کاری
      }
      scanned++;
      text.split("\n").forEach((line, i) => {
        if (hasEmoji(line)) hits.push(`${f}:${i + 1}: ${line.trim().slice(0, 80)}`);
      });
    }
    expect(scanned).toBeGreaterThan(60);
    expect(hits, hits.slice(0, 20).join("\n")).toEqual([]);
  });

  it("داده‌های بازی هیچ فیلدِ ایموجی ندارند (نماد = SVG با شناسه)", () => {
    const rows: unknown[] = [SEASONS, CROPS, Object.values(ITEMS), BUILDINGS, TECH_TREE, SKILLS, ACHIEVEMENTS, NPCS, Object.values(WORKERS)];
    const json = JSON.stringify(rows);
    expect(hasEmoji(json)).toBe(false);
    for (const list of [CROPS, Object.values(ITEMS), BUILDINGS, TECH_TREE, SKILLS, ACHIEVEMENTS]) {
      for (const d of list) expect(d as object).not.toHaveProperty("icon");
    }
  });

  it("هر گوینده‌ی داستان شناسه‌ی متنیِ معتبر دارد (چهره‌ی SVG، نه ایموجی)", () => {
    const used = new Set(CHAPTERS.flatMap((c) => [...c.scenes, ...c.endScenes].map((s) => s.av)));
    for (const av of used) expect(SPEAKERS).toContain(av);
    expect(used.size).toBeGreaterThanOrEqual(8);
  });

  it("نگهبانِ ورودی: نامِ بازیکن و متنِ سیوِ قدیمی از ایموجی پاک می‌شوند", () => {
    expect(stripEmoji(`امید ${WHEAT} رضا ${FARMER_W}`)).toBe("امید رضا");
    expect(dropEmoji("علی ")).toBe("علی "); // هنگام تایپ، فاصله‌ی آخر نباید بپرد
    expect(hasEmoji("سلام ✓ → ★")).toBe(false); // نمادهای تایپوگرافیک مجازند
    expect(hasEmoji(SUN)).toBe(true);
    expect(`x${SCIENTIST}y`.replace(EMOJI_RE, "")).toBe("xy");
  });

  it("پیام‌ها و افکت‌های زمانِ اجرا بی‌ایموجی‌اند و نمادِ افکت، SVG واقعی است", async () => {
    const L = await import("../src/game/logic");
    const { hasItemIcon, uiSvg } = await import("../src/game/icons");
    const out: string[] = [];
    const icons: string[] = [];
    const ev: import("../src/game/logic").Events = {
      toast: (m) => out.push(m),
      fx: (_x, _y, text, _c, _b, icon) => {
        out.push(text);
        if (icon) icons.push(icon);
      },
      sound: () => {},
    };
    const s = L.newState();
    s.coins = 90_000;
    const at = (x: number, y: number) => s.tiles[L.idx(x, y)];
    const X = 17, Y = 17;
    s.tiles[L.idx(X, Y)] = { k: "soil", v: 0.5, crop: "wheat", g: 1 };
    L.toolAction(s, X, Y, "hand", "", ev); // برداشت
    L.toolAction(s, X, Y, "seed", "wheat", ev); // کاشت
    L.toolAction(s, X, Y, "water", "", ev);
    L.toolAction(s, X, Y, "fert", "", ev);
    L.toolAction(s, X, Y, "hand", "", ev); // «٪ رشد کرده»
    s.tiles[L.idx(X + 1, Y)] = { k: "tree", v: 0.5 };
    L.toolAction(s, X + 1, Y, "clear", "", ev);
    s.tiles[L.idx(X + 2, Y)] = { k: "grass", v: 0.5 };
    L.toolAction(s, X + 2, Y, "build", "coop", ev);
    at(X + 2, Y).out = ["egg"];
    L.toolAction(s, X + 2, Y, "hand", "", ev);
    L.addXp(s, 5000, ev); // چند سطح + پاداش + دستاورد
    L.unlockTech(s, "seeds1", ev);
    s.stats.skillPoints = 5;
    L.learnSkill(s, "master_planter", ev);
    L.hire(s, "farmhand", ev);
    for (let i = 0; i < 400; i++) L.tick(s, 0.5, ev); // هوا، رویداد، حقوق
    expect(out.length).toBeGreaterThan(8);
    for (const m of out) expect(hasEmoji(m), m).toBe(false);
    expect(icons).toContain("item:wheat");
    for (const k of icons) {
      const [kind, id] = k.split(":");
      if (kind === "item") expect(hasItemIcon(id), k).toBe(true);
      else expect(uiSvg(id), k).not.toBe(uiSvg("__missing__"));
    }
  });

  it("migrate سیوهای پیش از P5.16 را پاک‌سازی می‌کند", async () => {
    const { migrate, newState } = await import("../src/game/logic");
    const s = newState();
    s.story.name = `مریم ${SUNFLOWER}`;
    s.currentEvent = { type: "fair", endsAt: 999, text: `${CIRCUS} نمایشگاه بهاره` };
    const m = migrate(JSON.parse(JSON.stringify(s)))!;
    expect(m.story.name).toBe("مریم");
    expect(m.currentEvent?.text).toBe("نمایشگاه بهاره");
  });
});
