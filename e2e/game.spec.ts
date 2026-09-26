import { test, expect, type Page } from "@playwright/test";

/**
 * e2e/game.spec.ts — تست واقعی بازی در مرورگر موبایل
 *
 * چه چیزی را ثابت می‌کند؟
 *  ۱. صفحه بدون خطای کنسول و بدون دارایی ۴۰۴ بالا می‌آید (KPI ریویو: ۷ تصویر گم‌شده → ۰).
 *  ۲. مسیر واقعی بازیکن کار می‌کند: صفحه‌ی شروع → نام → داستان → بازی.
 *  ۳. لمس روی زمین بازی را تغییر می‌دهد (فول‌تاچ).
 *  ۴. هیچ سرریز افقی و هیچ دکمه‌ی ریزتر از ۳۶px در ۵ اندازه‌ی موبایل وجود ندارد.
 *  ۵. اسکرین‌شات‌ها به‌عنوان شاهد در docs/shots ذخیره می‌شوند.
 */

const VIEWPORTS = [
  { name: "small-320", width: 320, height: 568 },
  { name: "iphone-13", width: 390, height: 844 },
  { name: "pixel7", width: 412, height: 915 },
  { name: "large-430", width: 430, height: 932 },
  { name: "tablet-768", width: 768, height: 1024 },
];

type Problem = { kind: string; detail: string };

function collectProblems(page: Page): Problem[] {
  const problems: Problem[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push({ kind: "console", detail: m.text().slice(0, 200) });
  });
  page.on("pageerror", (e) => problems.push({ kind: "pageerror", detail: String(e).slice(0, 200) }));
  page.on("response", (r) => {
    if (r.status() >= 400 && !r.url().includes("favicon")) problems.push({ kind: `http-${r.status()}`, detail: r.url() });
  });
  return problems;
}

async function readState(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as { __game?: { getState: () => Record<string, unknown> | null } };
    return w.__game?.getState?.() ?? null;
  });
}

/** مسیر واقعی بازیکن: شروع → نامِ بازیکن → رد کردن داستان → بازی */
async function enterGame(page: Page) {
  // آموزش تعاملی اولین‌بار (P4.7) فقط یک‌بار برای بازیکن تازه می‌آید و روی نقشه شیت می‌گذارد.
  // این تست‌ها به بازی می‌رسند، پس مثل بازیکن باتجربه پرچم آموزش را از قبل ست می‌کنیم.
  await page.addInitScript(() => {
    try {
      localStorage.setItem("farm_onboard", "1");
    } catch {
      /* ignore */
    }
  });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /آغاز|شروع|بازی/ }).first().tap();
  await page.waitForTimeout(1200);

  const nameInput = page.locator("input").first();
  await nameInput.tap({ timeout: 10_000 });
  await nameInput.fill("امید");
  const gate = page.getByRole("button", { name: "آغاز داستان" });
  if (await gate.count()) await gate.last().tap();
  await page.waitForTimeout(800);

  // داستان را با ضربه جلو می‌بریم و بعد بقیه را رد می‌کنیم تا به بازی برسیم
  await page.touchscreen.tap(160, 300).catch(() => {});
  await page.evaluate(() => {
    const w = window as unknown as { __game?: { getState: () => { story: { shown: boolean } } | null; setState: (s: unknown) => void } };
    const g = w.__game;
    const st = g?.getState?.();
    if (st?.story) {
      st.story.shown = false;
      g?.setState(st);
    }
  });
  await page.waitForTimeout(600);
}

test.describe("مزرعه طلایی — موبایل", () => {
  test("بازی بدون خطا بالا می‌آید و لمس پاسخ می‌دهد", async ({ page }, testInfo) => {
    const problems = collectProblems(page);
    await enterGame(page);

    const box = await page.locator("canvas").boundingBox();
    expect(box).not.toBeNull();
    const before = await readState(page);
    await page.touchscreen.tap((box?.x ?? 0) + (box?.width ?? 0) / 2, (box?.y ?? 0) + (box?.height ?? 0) / 2);
    await page.waitForTimeout(800);
    const after = await readState(page);
    expect(before).not.toBeNull();
    expect(JSON.stringify(after)).not.toBe(JSON.stringify(before));

    expect(problems, `مشکلات: ${JSON.stringify(problems, null, 2)}`).toHaveLength(0);
    await page.screenshot({ path: `docs/shots/e2e-${testInfo.project.name}-game.png` });
  });

  test("نقشه‌ی لمسی: pan و pinch بدون خطا", async ({ page }) => {
    const problems = collectProblems(page);
    await enterGame(page);
    const box = await page.locator("canvas").boundingBox();
    const cx = (box?.x ?? 0) + (box?.width ?? 0) / 2;
    const cy = (box?.y ?? 0) + (box?.height ?? 0) / 2;

    // pan: کشیدن یک انگشت
    await page.touchscreen.tap(cx, cy);
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 120, cy - 80, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // pinch: دو انگشت هم‌زمان
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
    expect(problems).toHaveLength(0);
  });

  test("منوی موبایل باز می‌شود و پنل بازار در شیت نمایش داده می‌شود", async ({ page }) => {
    await enterGame(page);
    await page.getByRole("button", { name: "منو" }).first().tap();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "بازار" }).first().tap();
    await page.waitForTimeout(600);
    await expect(page.getByText("بازار و انبار", { exact: false })).toBeVisible();
  });

  for (const vp of VIEWPORTS) {
    test(`چیدمان بدون سرریز در ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await enterGame(page);

      const overflow = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollW, `سرریز افقی در ${vp.name}`).toBeLessThanOrEqual(overflow.clientW + 1);

      const small = await page.evaluate(() =>
        [...document.querySelectorAll("button")]
          .map((b) => {
            const r = b.getBoundingClientRect();
            return { t: (b.getAttribute("aria-label") || b.textContent || "?").trim().slice(0, 18), w: r.width, h: r.height };
          })
          .filter((b) => b.w > 0 && b.h > 0 && (b.w < 36 || b.h < 36))
          .map((b) => `${b.t} → ${Math.round(b.w)}×${Math.round(b.h)}`)
      );
      expect(small, `دکمه‌های ریز در ${vp.name}`).toHaveLength(0);

      await page.screenshot({ path: `docs/shots/layout-${vp.name}.png` });
    });
  }

  // تست‌های آفلاین در e2e/offline.spec.ts پیاده‌سازی شدند (P3.2/P3.3).
});
