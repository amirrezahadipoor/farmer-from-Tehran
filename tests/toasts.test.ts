import { describe, expect, it } from "vitest";
import { newGate, pass, TOAST_WINDOW_MS } from "../src/game/ui/toastGate";

describe("دروازه‌ی توست‌ها (B/T3) — کمترِ پیام، همان حرفِ مهم", () => {
  it("همان پیام در پنجره‌ی نوعش پخش نمی‌شود؛ بعد از پنجره دوباره می‌آید", () => {
    const g = newGate();
    expect(pass(g, "انبار پر است", "err", 1000)).toBe(true);
    expect(pass(g, "انبار پر است", "err", 3000)).toBe(false);
    expect(pass(g, "انبار پر است", "err", 1000 + TOAST_WINDOW_MS.err + 1)).toBe(true);
  });

  it("راهنماها ۴۵ ثانیه ساکت‌اند — شلوغیِ اصلیِ گزارش‌شده همین‌ها بودند", () => {
    const g = newGate();
    expect(pass(g, "این زمین چمن است — با ابزار «شخم» به خاک کشاورزی تبدیلش کن.", "info", 1000)).toBe(true);
    expect(pass(g, "این زمین چمن است — با ابزار «شخم» به خاک کشاورزی تبدیلش کن.", "info", 5000)).toBe(false);
    expect(pass(g, "این زمین چمن است — با ابزار «شخم» به خاک کشاورزی تبدیلش کن.", "info", 46_500)).toBe(true);
  });

  it("پیامِ متفاوت همیشه می‌گذرد؛ حتی بلافاصله", () => {
    const g = newGate();
    expect(pass(g, "الف", "info", 1000)).toBe(true);
    expect(pass(g, "ب", "info", 1100)).toBe(true);
  });

  it("موفقیت‌ها ۱۰ ثانیه و سطح‌ها ۴ ثانیه پنجره دارند", () => {
    const g = newGate();
    expect(pass(g, "بازی ذخیره شد", "ok", 1000)).toBe(true);
    expect(pass(g, "بازی ذخیره شد", "ok", 9000)).toBe(false);
    expect(pass(g, "بازی ذخیره شد", "ok", 11_500)).toBe(true);
    expect(pass(g, "سطح ۵! پاداش ۲۲۵ سکه", "lvl", 1000)).toBe(true);
    expect(pass(g, "سطح ۵! پاداش ۲۲۵ سکه", "lvl", 3000)).toBe(false);
    expect(pass(g, "سطح ۵! پاداش ۲۲۵ سکه", "lvl", 6000)).toBe(true);
  });

  it("نوعِ ناشناخته = پنجره‌ی محافظه‌کارانه‌ی ۱۰ ثانیه", () => {
    const g = newGate();
    expect(pass(g, "متن", "نامعلوم", 1000)).toBe(true);
    expect(pass(g, "متن", "نامعلوم", 2000)).toBe(false);
  });
});
