import { describe, it, expect, beforeEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cropFrame, resolveAtlas, setAtlas, clearAtlas, artVersion, isAtlasReady, CROP_KF, type AtlasManifest } from "../src/game/render/atlas";

const hasPython = () => {
  try {
    execSync("python3 -c 'import PIL'", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};
const py = hasPython();

/**
 * tests/atlas.test.ts — نگهبانِ منطقِ اطلسِ آرت (نقشه‌ی راه، فاز A)
 *
 * cropFrame باید آینه‌ی دقیقِ crop_frame در tools/pack-atlas.py باشد (هر دو به همین
 * نقاطِ قطع و مقیاس می‌رسند). resolveAtlas کلیدهایِ محصول (q=۰..۲۰) را به ۵ فریمِ
 * کلیدی + مقیاسِ میان‌یابی‌شده نگاشت می‌کند.
 */
const fakeManifest = (): AtlasManifest => ({
  atlases: { world: "/art/atlas/world.png" },
  entries: {
    "g|grass|spring": { a: "world", x: 0, y: 0, w: 88, h: 44, an: "c" },
    "t|spring|b": { a: "world", x: 90, y: 0, w: 72, h: 94 },
    "c|wheat|0|spring|1": { a: "world", x: 0, y: 50, w: 104, h: 112 },
    "c|wheat|5|spring|1": { a: "world", x: 110, y: 50, w: 104, h: 112 },
    "c|wheat|10|spring|1": { a: "world", x: 220, y: 50, w: 104, h: 112 },
    "c|wheat|15|spring|1": { a: "world", x: 330, y: 50, w: 104, h: 112 },
    "c|wheat|20|spring|1": { a: "world", x: 440, y: 50, w: 104, h: 112 },
  },
});
const fakeImg = { fake: "image" };

beforeEach(() => clearAtlas());

describe("cropFrame (آینه‌ی pack-atlas.py)", () => {
  it("q=۰ → فریمِ ۰ با مقیاسِ حداقل", () => {
    expect(cropFrame(0)).toEqual({ k: 0, s: 0.62 });
  });
  it("q=۲۰ → فریمِ ۴ با مقیاسِ ۱", () => {
    expect(cropFrame(20)).toEqual({ k: 4, s: 1 });
  });
  it("نقاطِ قطعِ پله‌ای دقیقاً روی پله می‌نشینند", () => {
    for (const [i, q] of CROP_KF.entries()) {
      expect(cropFrame(q)).toEqual({ k: i, s: 0.62 + 0.38 * (i / 4) });
    }
  });
  it("میانِ پله‌ها: مقیاسِ خطی و فریمِ پایین‌تر", () => {
    // q=۲ → بازه‌ی [۰,۵]، t=۰٫۴ → s = ۰٫۶۲ + ۰٫۰۹۵×۰٫۴
    const { k, s } = cropFrame(2);
    expect(k).toBe(0);
    expect(s).toBeCloseTo(0.62 + (0.715 - 0.62) * 0.4, 5);
  });
  it("محدوده: خارجِ ۰..۲۰ هم شکسته نمی‌شود", () => {
    expect(cropFrame(-3).k).toBe(0);
    expect(cropFrame(99).k).toBe(4);
  });
  it("تطابق با اعدادِ pack-atlas.py (برداشت‌های نمونه)", () => {
    // همین اعداد در tests/python-mirror.txt توسطِ CI کنترل می‌شوند (فاز A.2)
    expect(cropFrame(3).s).toBeCloseTo(0.677, 5);
    expect(cropFrame(12).s).toBeCloseTo(0.848, 5);
    expect(cropFrame(18).s).toBeCloseTo(0.962, 5);
  });
});

describe("resolveAtlas", () => {
  it("بدونِ اطلس: همه‌چیز null (رسمِ رویه‌ای می‌ماند)", () => {
    expect(resolveAtlas("g|grass|spring")).toBeNull();
    expect(isAtlasReady()).toBe(false);
    expect(artVersion()).toBe(0);
  });

  it("کلیدِ دقیقِ کاشی و درخت", () => {
    setAtlas(fakeManifest(), { world: fakeImg });
    const g = resolveAtlas("g|grass|spring")!;
    expect(g).toBeTruthy();
    expect(g.e.an).toBe("c");
    expect(resolveAtlas("t|spring|b")!.e.w).toBe(72);
    expect(resolveAtlas("nope")).toBeNull();
    expect(isAtlasReady()).toBe(true);
    expect(artVersion()).toBe(1);
  });

  it("محصول: q=۰..۲۰ به فریمِ کلیدیِ درست + مقیاسِ cropFrame", () => {
    setAtlas(fakeManifest(), { world: fakeImg });
    for (const q of [0, 1, 4, 5, 9, 10, 15, 19, 20]) {
      const hit = resolveAtlas(`c|wheat|${q}|spring|1`)!;
      expect(hit, `q=${q}`).toBeTruthy();
      expect(hit.e).toMatchObject(cropFrame(q).k === 0 ? { x: 0 } : cropFrame(q).k === 1 ? { x: 110 } : cropFrame(q).k === 2 ? { x: 220 } : cropFrame(q).k === 3 ? { x: 330 } : { x: 440 });
      expect(hit.s).toBeCloseTo(cropFrame(q).s, 5);
    }
  });

  it("کلیدِ محصولِ ناشناخته null می‌ماند (fallback)", () => {
    setAtlas(fakeManifest(), { world: fakeImg });
    expect(resolveAtlas("c|corn|7|spring|1")).toBeNull();
  });

  it("artVersion با هر setAtlas بالا می‌رود (امضای کشِ زمین)", () => {
    setAtlas(fakeManifest(), { world: fakeImg });
    const n1 = artVersion();
    setAtlas(fakeManifest(), { world: fakeImg });
    expect(artVersion()).toBe(n1 + 1);
  });
});

describe("پایپ‌لاینِ هم‌ترازی (tools/align-assets.py)", () => {
  it("تصویرِ مصنوعی: کلیدِ سبز حذف، trim و هم‌اندازه‌سازی درست", () => {
    if (!py) return; // بدونِ Pillow: تستِ پایپ‌لاین رد می‌شود (CI ubuntu لایه‌شده دارد)
    const dir = mkdtempSync(join(tmpdir(), "align-"));
    const out = join(dir, "out.png");
    const res = execSync(
      `python3 tools/align-assets.py --src tests/fixtures/align-synthetic.png --out "${out}" --w 40 --h 40 --fit contain`,
      { encoding: "utf8" },
    );
    const report = JSON.parse(res.trim().split("\n").pop()!);
    expect(report.ok).toBe(true);
    expect(report.final).toEqual([40, 40]);
    // محتوا (مستطیلِ قهوه‌ای ۸۰×۴۰) وسطِ ۴۰×۴۰ می‌نشیند؛ نوارِ بالایی شفاف می‌ماند
    const checkPy = join(dir, "check.py");
    writeFileSync(
      checkPy,
      `from PIL import Image
im = Image.open(${JSON.stringify(out)}).convert("RGBA")
assert im.size == (40, 40)
assert im.getpixel((20, 20))[3] > 200, "center must be opaque"
assert im.getpixel((1, 1))[3] == 0, "top corner must be transparent"
assert im.getpixel((19, 20))[0] > 150, "brownish pixel"
print("ok")
`,
    );
    expect(execSync(`python3 ${checkPy}`, { encoding: "utf8" })).toContain("ok");
  }, 30_000);
});
