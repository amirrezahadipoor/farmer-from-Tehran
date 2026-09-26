import { test, expect, type Page } from "@playwright/test";

/**
 * e2e/gestures.spec.ts — شاهدِ «فول‌تاچ» و چرخه‌ی آفلاین‌تایم
 *
 *  ۱. نگه‌داشتن انگشت (long-press) = عمل دسته‌ای روی ۳×۳ زمین (نه ۹ بار ضربه).
 *  ۲. ذخیره‌ی قدیمی (دو ساعت پیش) = کارت «در غیاب شما» با اعداد واقعی رشد.
 */

/**
 * سیو را «قدیمی» می‌کند.
 * نکته‌ی مهم: هندلر beforeunload هنگام reload یک سیوِ تازه می‌نویسد، پس باید
 * تاریخ را در *شروع سند بعدی* بازنویسی کنیم (addInitScript).
 */
async function ageSaveOnNextLoad(page: Page, minutesAgo: number) {
  await page.addInitScript((m: number) => {
    try {
      const raw = localStorage.getItem("farm_save");
      if (!raw) return;
      const data = JSON.parse(raw);
      data.savedAt = Date.now() - m * 60_000;
      localStorage.setItem("farm_save", JSON.stringify(data));
    } catch {
      /* سیو نامعتبر */
    }
  }, minutesAgo);
}

async function enterGame(page: Page) {
  // آموزش تعاملی اولین‌بار (P4.7) روی نقشه شیت می‌گذارد؛ تست‌های ژست به بازی رسیده نیاز دارند.
  await page.addInitScript(() => {
    try {
      localStorage.setItem("farm_onboard", "1");
    } catch {
      /* ignore */
    }
  });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
  // صفحه‌ی شروع (اسپلش) → دکمه‌ی ورود
  await page.getByRole("button", { name: /آغاز|شروع|بازی/ }).first().tap();
  await page.waitForTimeout(1000);
  // اگر دروازه‌ی نام آمد، پر کن
  const nameInput = page.locator("input").first();
  if (await nameInput.count()) {
    await nameInput.fill("امید").catch(() => undefined);
    const gate = page.getByRole("button", { name: "آغاز داستان" });
    if (await gate.count()) await gate.last().tap().catch(() => undefined);
    await page.waitForTimeout(600);
  }
  // داستان را رد کن تا به نقشه‌ی بازی برسیم
  await page.evaluate(() => {
    const w = window as unknown as {
      __game?: { getState: () => { story?: { shown: boolean } } | null; setState: (s: unknown) => void };
    };
    const st = w.__game?.getState?.();
    if (st?.story) {
      st.story.shown = false;
      w.__game?.setState(st);
    }
  });
  await page.waitForTimeout(700);
  // مطمئن شو هیچ لایه‌ی تمام‌صفحه‌ای روی نقشه نیست (داستان، اسپلش، آموزش اولین‌بار)
  await expect(page.locator("div.absolute.inset-0.z-50, div.absolute.inset-0.z-\\[60\\]"))
    .toHaveCount(0, { timeout: 10_000 })
    .catch(() => undefined);
}

const toolCount = (page: Page, kind: string) =>
  page.evaluate(
    (k) =>
      (window as unknown as { __game?: { getState: () => { tiles: { k: string }[] } | null } })
        .__game?.getState?.()
        ?.tiles.filter((t) => t.k === k).length ?? -1,
    kind
  );

test.describe("فول‌تاچ و آفلاین‌تایم", () => {
  test("نگه‌داشتن انگشت، ابزار را روی ۳×۳ زمین اجرا می‌کند", async ({ page }) => {
    await enterGame(page);

    // ابزار «شخم» را از نوار پایین انتخاب کن (شاهدِ لمسی، بدون صفحه‌کلید)
    await page.getByRole("button", { name: "شخم" }).first().tap();
    await page.waitForTimeout(300);

    const before = await toolCount(page, "soil");
    const box = await page.locator("canvas").boundingBox();
    const cx = (box?.x ?? 0) + (box?.width ?? 0) / 2;
    const cy = (box?.y ?? 0) + (box?.height ?? 0) / 2;

    // pointerdown → ۷۰۰ms نگه‌داشتن → pointerup
    await page.evaluate(
      ([x, y]) => {
        const canvas = document.querySelector("canvas")!;
        const mk = (type: string) =>
          canvas.dispatchEvent(
            new PointerEvent(type, {
              pointerId: 1,
              pointerType: "touch",
              clientX: x,
              clientY: y,
              bubbles: true,
              cancelable: true,
              isPrimary: true,
            })
          );
        mk("pointerdown");
        return new Promise<void>((resolve) => setTimeout(() => { mk("pointerup"); resolve(); }, 700));
      },
      [cx, cy]
    );
    await page.waitForTimeout(500);

    const after = await toolCount(page, "soil");
    // ضربه‌ی ساده فقط یک زمین را عوض می‌کند؛ نگه‌داشتن باید چند زمین را با هم
    expect(after - before, "عمل دسته‌ای باید بیش از یک زمین را شخم بزند").toBeGreaterThan(1);
    await page.screenshot({ path: "docs/shots/gesture-longpress.png" });
  });

  test("سیوِ دو ساعت پیش → کارت «در غیاب شما» با اعداد رشد", async ({ page, context }) => {
    // اول یک سیو واقعی بساز، بعد savedAt را به دو ساعت قبل برگردان
    await enterGame(page);
    await page.evaluate(async () => {
      const w = window as unknown as { __game?: { save?: () => Promise<void> } };
      await w.__game?.save?.();
    });
    await page.waitForTimeout(500);

    await ageSaveOnNextLoad(page, 120); // دو ساعت

    // ابر در دسترس نیست تا سیوِ محلی (۲ ساعت پیش) مرجع باشد، نه نسخه‌ی تازه‌ی سرور.
    // (قطع‌کردن کامل مرورگر در WebKit با reload خطای داخلی می‌دهد؛ این روش در هر دو مرورگر کار می‌کند.)
    await context.route("**/api/save*", (route) => route.fulfill({ status: 200, json: { data: null, mode: "offline" } }));
    await page.reload({ waitUntil: "load" });
    await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
    const splash = page.getByRole("button", { name: /آغاز|شروع|بازی/ }).first();
    if (await splash.count()) await splash.tap().catch(() => undefined);
    await expect(page.getByText("در غیاب شما")).toBeVisible({ timeout: 15_000 });

    const detail = await page.getByText("دقیقه بیرون بودی").first().innerText();
    expect(detail).toContain("۱۲۰");
    await page.screenshot({ path: "docs/shots/offline-report.png" });

    // بستن کارت با لمس
    await page.getByRole("button", { name: "بستن گزارش غیاب" }).tap();
    await expect(page.getByText("در غیاب شما")).toBeHidden();
    await context.unroute("**/api/save*");
  });
});
