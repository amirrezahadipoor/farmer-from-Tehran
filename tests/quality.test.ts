import { describe, expect, it } from "vitest";
import { lockFor, qualityPref, QUALITY_MODES } from "../src/game/quality";
import { rt } from "../src/game/store";
import { applyQuality } from "../src/game/quality";

describe("کیفیت تصویر (B/T1) — انتخاب بازیکن روی قفلِ رزولوشن", () => {
  it("خودکار = بدون قفل؛ تیز = سقف دستگاه تا ۲؛ روان = ۰.۹ ثابت", () => {
    expect(lockFor("auto", 3)).toBeNull();
    expect(lockFor("sharp", 3)).toBe(2);
    expect(lockFor("sharp", 1.5)).toBe(1.5);
    expect(lockFor("smooth", 3)).toBe(0.9);
  });

  it("ترجیحِ نامعتبر یا نبودِ ذخیره = خودکار", () => {
    expect(qualityPref()).toBe("auto");
  });

  it("applyQuality روی rt.dprLock می‌نشیند (حلقه همان فریم می‌پیوندد)", () => {
    const before = rt.dprLock;
    applyQuality("smooth", 2);
    expect(rt.dprLock).toBe(0.9);
    applyQuality("sharp", 1.25);
    expect(rt.dprLock).toBe(1.25);
    applyQuality("auto", 2);
    expect(rt.dprLock).toBeNull();
    rt.dprLock = before;
  });

  it("هر سه حالت در پنل تنظیمات با برچسبِ فارسی هست", () => {
    expect(QUALITY_MODES.map((m) => m.id)).toEqual(["auto", "sharp", "smooth"]);
    expect(QUALITY_MODES.every((m) => m.name.length > 2 && m.hint.length > 5)).toBe(true);
  });
});
