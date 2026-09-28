import { test, expect, type Page } from "@playwright/test";

/**
 * e2e/a11y.spec.ts — دسترس‌پذیریِ واقعی: فقط صفحه‌کلید، بدون ماوس
 *
 * چرا این فایل لازم است؟ ریویوی سخت‌گیرانه دقیقاً همین را کسری گرفته بود: «تستِ
 * واقعیِ صفحه‌خوان/صفحه‌کلید وجود ندارد». قراردادِ ایستا در tests/a11y.test.ts
 * بررسی می‌شود (سریع، بدون مرورگر)؛ اینجا همان قرارداد روی مرورگرِ واقعی و با
 * نامِ دسترس‌پذیرِ محاسبه‌شده‌ی خودِ مرورگر سنجیده می‌شود.
 */

/** مسیر واقعی بازیکن تا رسیدن به مزرعه (مثل e2e/game.spec.ts) */
async function enterGame(page: Page) {
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
  await page.evaluate(() => {
    const w = window as unknown as {
      __game?: { getState: () => { story: { shown: boolean } } | null; setState: (s: unknown) => void };
    };
    const g = w.__game;
    const st = g?.getState?.();
    if (st?.story) {
      st.story.shown = false;
      g?.setState(st);
    }
  });
  await page.waitForTimeout(600);
}

/** نامِ دسترس‌پذیرِ محاسبه‌شده برای عنصرِ فعال */
async function activeName(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return "";
    const label = el.getAttribute("aria-label") || el.textContent || "";
    return label.replace(/\s+/g, " ").trim().slice(0, 40);
  });
}

test.describe("دسترس‌پذیری — صفحه‌کلید و صفحه‌خوان", () => {
  test("هر دکمه‌ی دیده‌شده نامِ دسترس‌پذیرِ واقعی دارد (صفحه‌خوان چیزی برای خواندن دارد)", async ({ page }) => {
    await enterGame(page);
    const buttons = page.locator("button:visible");
    const n = await buttons.count();
    expect(n).toBeGreaterThan(3);
    const nameless: string[] = [];
    for (let i = 0; i < n; i++) {
      const b = buttons.nth(i);
      // نامِ دسترس‌پذیر را خودِ مرورگر از درخت دسترس‌پذیری حساب می‌کند
      const name = (await b.evaluate((el) => {
        const e = el as HTMLElement;
        return (e.getAttribute("aria-label") || e.getAttribute("title") || e.textContent || "").trim();
      })) as string;
      if (!name) nameless.push(`#${i} <${await b.evaluate((el) => el.className.slice(0, 40))}>`);
    }
    expect(nameless, nameless.join(" | ")).toEqual([]);
  });

  test("با Tab به رابط می‌رسیم و حلقه‌ی تمرکز دیدنی است", async ({ page }) => {
    await enterGame(page);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

    const seen: string[] = [];
    let focused = false;
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const name = await activeName(page);
      if (name) {
        seen.push(name);
        focused = true;
        // تمرکز باید دیده شود: outline یا box-shadow (globals.css: 3px solid #0ea5e9)
        const ring = await page.evaluate(() => {
          const cs = getComputedStyle(document.activeElement as HTMLElement);
          return { style: cs.outlineStyle, width: cs.outlineWidth, shadow: cs.boxShadow };
        });
        expect(ring.style !== "none" || ring.shadow !== "none", `بدون نشانِ تمرکز روی «${name}»`).toBe(true);
      }
    }
    expect(focused, "هیچ دکمه‌ای با Tab گرفته نشد").toBe(true);
    expect(seen.length).toBeGreaterThan(1);
  });

  test("منوی اصلی با Enter باز می‌شود، تمرکز داخلش می‌رود و Escape آن را می‌بندد و تمرکز برمی‌گردد", async ({ page }) => {
    await enterGame(page);
    const menuBtn = page.getByRole("button", { name: "منو" }).first();
    await menuBtn.focus();
    await page.keyboard.press("Enter");

    const menu = page.getByRole("dialog", { name: "منوی اصلی بازی" });
    await expect(menu).toBeVisible({ timeout: 5_000 });

    // تمرکز داخل منو رفته است (نه روی نقشه)
    const inside = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"][aria-label="منوی اصلی بازی"]');
      return !!d && !!document.activeElement && d.contains(document.activeElement);
    });
    expect(inside, "تمرکز با باز شدنِ منو داخل آن نرفت").toBe(true);

    // Tab بین آیتم‌های منو می‌چرخد و از منو بیرون نمی‌زند
    for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
    const stillInside = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"][aria-label="منوی اصلی بازی"]');
      return !!d && !!document.activeElement && d.contains(document.activeElement);
    });
    expect(stillInside, "Tab از منو بیرون زد").toBe(true);

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden({ timeout: 5_000 });
    const back = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return (el?.getAttribute("aria-label") || el?.textContent || "").trim();
    });
    expect(back).toContain("منو"); // تمرکز به دکمه‌ی بازکننده برگشت
  });

  test("پنل با صفحه‌کلید باز و بسته می‌شود (Escape) و عنوانش برای صفحه‌خوان خوانده می‌شود", async ({ page }) => {
    await enterGame(page);
    const menuBtn = page.getByRole("button", { name: "منو" }).first();
    await menuBtn.focus();
    await page.keyboard.press("Enter");
    const help = page.getByRole("button", { name: "راهنما" }).first();
    await help.focus();
    await page.keyboard.press("Enter");

    const panel = page.getByRole("dialog").first();
    await expect(panel).toBeVisible({ timeout: 5_000 });
    const label = await panel.getAttribute("aria-label");
    expect(label && label.length).toBeGreaterThan(1);
    await expect(panel).toHaveAttribute("aria-modal", "true");

    const focusInside = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return !!d && !!document.activeElement && d.contains(document.activeElement);
    });
    expect(focusInside, "تمرکز با باز شدنِ پنل داخل آن نرفت").toBe(true);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 5_000 });
  });

  test("پیام‌ها در ناحیه‌ی زنده اعلام می‌شوند (صفحه‌خوان بدونِ فوکس هم می‌شنود)", async ({ page }) => {
    await enterGame(page);
    const live = page.locator('[aria-live="polite"]').first();
    await expect(live).toHaveCount(1);
    await expect(live).toHaveAttribute("role", "status");
  });

  test("چیدمان در ۳۲۰ پیکسل: همه‌ی دکمه‌ها درونِ دید و نوارِ بالا و پایین هم‌پوشانی ندارند", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await enterGame(page);

    const boxes = await page.evaluate(() => {
      const out: { label: string; x: number; y: number; w: number; h: number }[] = [];
      /** داخلِ نوارِ افقیِ قابل‌اسکرول بودن طبیعی است (ابزارها کشیده می‌شوند) */
      const inScroller = (el: Element) => {
        for (let n: Element | null = el; n; n = n.parentElement) {
          const ox = getComputedStyle(n).overflowX;
          if (ox === "auto" || ox === "scroll") return true;
        }
        return false;
      };
      for (const el of Array.from(document.querySelectorAll("button"))) {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        if (inScroller(el)) continue;
        out.push({
          label: (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 30),
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
        });
      }
      return out;
    });
    expect(boxes.length).toBeGreaterThan(3);
    const outside = boxes.filter((b) => b.x < 0 || b.y < 0 || b.x + b.w > 320 || b.y + b.h > 568);
    expect(outside, `خارج از دید در ۳۲۰px: ${JSON.stringify(outside)}`).toEqual([]);

    // نوار بالا (HUD با دکمه‌ی منو) و نوار پایین (ابزار) نباید روی هم بیفتند
    const menu = boxes.find((b) => b.label === "منو");
    expect(menu, "دکمه‌ی منو پیدا نشد").toBeDefined();
    const lowestTop = Math.min(...boxes.filter((b) => b.y > menu!.y + 40).map((b) => b.y));
    expect(menu!.y + menu!.h, "نوار بالا روی نوار پایین می‌افتد").toBeLessThanOrEqual(lowestTop);

    // شاهدِ بصری برای بازبینی‌ی انسان (artifactِ playtest-shots)
    await page.screenshot({ path: `docs/shots/e2e-${testInfo.project.name}-a11y-320.png`, fullPage: false });
  });
});
