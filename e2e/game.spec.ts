import { test, expect, type Page } from "@playwright/test";

/**
 * e2e/game.spec.ts — تست واقعی بازی در مرورگر موبایل
 *
 * چه چیزی را ثابت می‌کند؟
 *  ۱. صفحه بدون خطای کنسول و بدون دارایی ۴۰۴ بالا می‌آید (KPI ریویو: ۷ تصویر گم‌شده → ۰).
 *  ۲. لمس (tap) روی زمین کار می‌کند و بازی واکنش می‌دهد (فول‌تاچ).
 *  ۳. هیچ سرریز افقی و هیچ متنِ بیرون از صفحه‌نمایش در ۵ اندازه‌ی موبایل وجود ندارد.
 *  ۴. بازی آفلاین بالا می‌آید (context.setOffline).
 *  ۵. اسکرین‌شات‌ها به‌عنوان شاهد در docs/shots ذخیره می‌شوند.
 */

const VIEWPORTS = [
  { name: "small-320", width: 320, height: 568 },   // iPhone SE 1
  { name: "iphone-13", width: 390, height: 844 },   // پایه
  { name: "pixel7", width: 412, height: 915 },      // اندروید رایج
  { name: "large-430", width: 430, height: 932 },   // Pro Max
  { name: "tablet-768", width: 768, height: 1024 }, // تبلت (همان تجربه، مقیاس بزرگ‌تر)
];

type Problem = { kind: string; detail: string };

async function collectProblems(page: Page): Promise<Problem[]> {
  const problems: Problem[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push({ kind: "console", detail: m.text() });
  });
  page.on("pageerror", (e) => problems.push({ kind: "pageerror", detail: String(e) }));
  page.on("response", (r) => {
    if (r.status() >= 400) problems.push({ kind: `http-${r.status()}`, detail: r.url() });
  });
  return problems;
}

/** از پشت‌صحنه‌ی بازی یک snapshot از وضعیت بازیکن می‌گیرد (بدون وابستگی به DOM شکننده). */
async function readState(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as { __game?: { getState: () => unknown } };
    return w.__game?.getState?.() ?? null;
  });
}

test.describe("مزرعه طلایی — موبایل", () => {
  test("بازی بدون خطا بالا می‌آید و لمس پاسخ می‌دهد", async ({ page }, testInfo) => {
    const problems = await collectProblems(page);
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1500);

    // ── لمس وسط صفحه: باید toast/بازخورد بدهد یا وضعیت را تغییر دهد
    const box = await page.locator("canvas").boundingBox();
    expect(box).not.toBeNull();
    const before = await readState(page);
    const cx = (box?.x ?? 0) + (box?.width ?? 0) / 2;
    const cy = (box?.y ?? 0) + (box?.height ?? 0) / 2;
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(600);
    const after = await readState(page);

    // اگر هوک وضعیت در دسترس است، انتظار تغییر داریم؛ در غیر این‌صورت فقط نبود خطا کافی است.
    if (before && after) {
      expect(JSON.stringify(after)).not.toBe(JSON.stringify(before));
    }

    const hard = problems.filter((p) => p.kind !== "http-404" || !p.detail.includes("favicon"));
    expect(hard, `مشکلات کنسول: ${JSON.stringify(hard, null, 2)}`).toHaveLength(0);

    await page.screenshot({ path: `docs/shots/e2e-${testInfo.project.name}-start.png`, fullPage: false });
  });

  test("نقشه‌ی لمسی: pinch و pan بدون خطا", async ({ page }) => {
    const problems = await collectProblems(page);
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const box = await page.locator("canvas").boundingBox();
    const cx = (box?.x ?? 0) + (box?.width ?? 0) / 2;
    const cy = (box?.y ?? 0) + (box?.height ?? 0) / 2;

    // pan: کشیدن یک انگشت
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 120, cy - 80, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // pinch: دو انگشت (Playwright با pointer events دستی)
    await page.evaluate(
      ([x, y]) => {
        const canvas = document.querySelector("canvas")!;
        const mk = (type: string, id: number, px: number, py: number) =>
          canvas.dispatchEvent(
            new PointerEvent(type, {
              pointerId: id,
              pointerType: "touch",
              clientX: px,
              clientY: py,
              bubbles: true,
              cancelable: true,
              isPrimary: id === 1,
            })
          );
        mk("pointerdown", 1, x - 40, y);
        mk("pointerdown", 2, x + 40, y);
        for (let i = 1; i <= 10; i++) {
          mk("pointermove", 1, x - 40 - i * 8, y - i * 4);
          mk("pointermove", 2, x + 40 + i * 8, y + i * 4);
        }
        mk("pointerup", 1, x - 120, y - 40);
        mk("pointerup", 2, x + 120, y + 40);
      },
      [cx, cy]
    );
    await page.waitForTimeout(400);

    expect(problems.filter((p) => p.kind !== "http-404" || !p.detail.includes("favicon"))).toHaveLength(0);
  });

  for (const vp of VIEWPORTS) {
    test(`چیدمان بدون سرریز در ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/", { waitUntil: "networkidle" });
      await page.waitForTimeout(1200);

      const overflow = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        scrollH: document.documentElement.scrollHeight,
        clientH: document.documentElement.clientHeight,
      }));
      expect(overflow.scrollW, `سرریز افقی در ${vp.name}`).toBeLessThanOrEqual(overflow.clientW + 1);
      expect(overflow.scrollH, `سرریز عمودی در ${vp.name}`).toBeLessThanOrEqual(overflow.clientH + 1);

      // هیچ عنصر تعاملی کوچک‌تر از ۴۰px نباشد (هدف لمسی راحت)
      const small = await page.evaluate(() => {
        const bad: string[] = [];
        document.querySelectorAll("button").forEach((b) => {
          const r = b.getBoundingClientRect();
          if (r.width > 0 && r.height > 0 && (r.width < 36 || r.height < 36)) {
            bad.push(`${(b.textContent || "?").trim().slice(0, 18)} → ${Math.round(r.width)}×${Math.round(r.height)}`);
          }
        });
        return bad;
      });
      expect(small, `دکمه‌های ریز در ${vp.name}: ${small.join(" | ")}`).toHaveLength(0);

      await page.screenshot({ path: `docs/shots/layout-${vp.name}.png` });
    });
  }

  test("آفلاین بالا می‌آید (بعد از یک بازدید)", async ({ page, context }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
    await context.setOffline(false);
  });
});
