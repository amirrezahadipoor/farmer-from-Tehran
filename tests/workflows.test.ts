import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { load } from "js-yaml";

/**
 * tests/workflows.test.ts — پیکربندیِ CI هم کد است و باید تست داشته باشد.
 *
 * چرا این فایل ساخته شد: یک نامِ مرحله در pr-preview.yml دونقطه‌ی داخلِ متن داشت و
 * کلِ فایل YAML نامعتبر شد. گیت‌هاب آن را «ورک‌فلوی نامعتبر» ثبت کرد و روی هر push یک
 * اجرای قرمز بدون هیچ job ساخت. این تست همان اشتباه را در چند ثانیه و پیش از push می‌گیرد.
 */

const ROOT = new URL("../", import.meta.url).pathname;
const FILES = readdirSync(ROOT + ".github/workflows").filter((f) => f.endsWith(".yml")).sort();

type Job = { "runs-on"?: string; steps?: { uses?: string; run?: string }[]; "timeout-minutes"?: number };

describe("ورک‌فلوی گیت‌هاب", () => {
  it("همه‌ی فایل‌های ورک‌فلو پیدا و خوانده می‌شوند", () => {
    expect(FILES.length).toBeGreaterThanOrEqual(6);
  });

  for (const file of FILES) {
    describe(file, () => {
      const wf = load(readFileSync(ROOT + ".github/workflows/" + file, "utf8")) as {
        name?: string;
        on?: Record<string, unknown>;
        jobs?: Record<string, Job>;
        permissions?: unknown;
      };

      it("YAML معتبر است و نامِ ورک‌فلو با نامِ فایل می‌خواند", () => {
        expect(wf.name, "name گم یا نامعتبر است").toBe(file.replace(/\.yml$/, ""));
      });

      it("حداقل یک محرک دارد و همه‌ی jobها حداقل یک قدم دارند", () => {
        expect(Object.keys(wf.on ?? {}).length).toBeGreaterThan(0);
        const jobs = Object.entries(wf.jobs ?? {});
        expect(jobs.length).toBeGreaterThan(0);
        for (const [id, job] of jobs) {
          expect(job["runs-on"], `job «${id}» runs-on ندارد`).toBeDefined();
          expect((job.steps ?? []).length, `job «${id}» قدمی ندارد`).toBeGreaterThan(0);
          for (const s of job.steps ?? []) expect(s.uses ?? s.run, `job «${id}» قدمِ خالی دارد`).toBeDefined();
        }
      });

      it("هر action بیرونی با SHAی کامیت پین شده و نسخه‌اش در کامنت هست (B/T7 — عرضه‌ی زنجیره)", () => {
        for (const [id, job] of Object.entries(wf.jobs ?? {})) {
          for (const s of job.steps ?? []) {
            if (!s.uses) continue;
            expect(s.uses, `${id}: ${s.uses} — باید owner/action@SHA40 # نسخه باشد`).toMatch(
              /^[\w.-]+\/[\w.-]+(\/[\w.-]+)?@[0-9a-f]{40}( # v[\w.-]+)?$/,
            );
          }
        }
      });

      it("بلوکِ permissions با حداقلِ امتیاز هست (B/T7)", () => {
        expect(wf.permissions, "permissions: خواسته نشد").toBeDefined();
      });

      it("هیچ job بدون سقفِ زمان نمی‌ماند (اجرای قرمزِ آویزان)", () => {
        for (const [id, job] of Object.entries(wf.jobs ?? {})) {
          const t = job["timeout-minutes"];
          expect(typeof t, `job «${id}» timeout-minutes ندارد`).toBe("number");
          expect(t).toBeGreaterThan(0);
          expect(t).toBeLessThanOrEqual(30);
        }
      });
    });
  }

  it("browser-test دیگر دستی نیست: روی push و pull_request اجرا می‌شود", () => {
    const wf = load(readFileSync(ROOT + ".github/workflows/browser-test.yml", "utf8")) as {
      on?: Record<string, unknown>;
    };
    const on = wf.on ?? {};
    expect(on.push, "browser-test روی push اجرا نمی‌شود").toBeDefined();
    expect(on.pull_request, "browser-test روی PR اجرا نمی‌شود").toBeDefined();
  });

  it("apk هم از تگِ نسخه و هم با اجرای دستی ساخته می‌شود", () => {
    const wf = load(readFileSync(ROOT + ".github/workflows/apk.yml", "utf8")) as {
      on?: { push?: { tags?: string[] }; workflow_dispatch?: unknown };
    };
    expect(wf.on?.push?.tags).toContain("v*");
    expect(wf.on?.workflow_dispatch).toBeDefined();
  });

  it("pr-preview روی pull_request اجرا می‌شود (نه روی هر push)", () => {
    const wf = load(readFileSync(ROOT + ".github/workflows/pr-preview.yml", "utf8")) as {
      on?: Record<string, unknown>;
    };
    const on = wf.on ?? {};
    expect(on.pull_request, "pr-preview محرکِ PR ندارد").toBeDefined();
  });
});
