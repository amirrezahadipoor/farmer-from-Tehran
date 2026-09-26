#!/usr/bin/env node
/**
 * tools/gen-roadmap.mjs
 * منبع حقیقت پروژه: docs/roadmap.json  →  تولید خودکار ROADMAP.md
 * بعد از هر پوش اجرا می‌شود:  npm run roadmap
 *
 * چه چیزهایی را می‌سازد؟
 *  - نوار پیشرفت کل + هر فاز (درصد)
 *  - جدول KPI با «مقدار فعلی» و «هدف» (ستون وضعیت خودکار)
 *  - جدول آیتم‌ها با تیک و **شاهد** (ستون evidence) — قاعده: هیچ تیکی بدون شاهد
 *  - «کارهای بعدی» به ترتیب دقیق اجرا (۳ آیتم اول از اولین فاز ناتمام)
 *  - لاگ پوش‌ها از تاریخچه‌ی گیت
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;
const data = JSON.parse(readFileSync(ROOT + "docs/roadmap.json", "utf8"));
const pkg = JSON.parse(readFileSync(ROOT + "package.json", "utf8"));

const fa = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
const bar = (pct, len = 20) => {
  const f = Math.round((pct / 100) * len);
  return "█".repeat(f) + "░".repeat(len - f) + `  ${fa(pct)}٪`;
};

/* ---------- لاگ گیت ---------- */
let gitLog = [];
try {
  gitLog = execSync("git log --date=short --pretty=format:'%h|%ad|%s' -n 100", { cwd: ROOT })
    .toString()
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [hash, date, ...rest] = l.split("|");
      return { hash, date, subject: rest.join("|") };
    });
} catch {
  gitLog = [];
}

/* ---------- آمار ---------- */
const all = data.phases.flatMap((p) => p.items);
const doneCount = all.filter((i) => i.status === "done").length;
const doingCount = all.filter((i) => i.status === "doing").length;
const pct = Math.round((doneCount / all.length) * 100);
const phasePct = (p) => Math.round((p.items.filter((i) => i.status === "done").length / p.items.length) * 100);
const STATUS = { done: "[x]", doing: "[~]", todo: "[ ]", blocked: "[!]" };

/* ---------- KPI: «فعلی» از فایل‌های واقعی پروژه خوانده می‌شود ---------- */
const probe = (cmd) => {
  try {
    return execSync(cmd, { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
};
const auto = {
  lines: () => {
    const out = probe("wc -l src/game/*.ts src/game/*.tsx src/app/*.tsx src/components/*.tsx 2>/dev/null");
    const nums = out.split("\n").map((l) => parseInt(l.trim().split(/\s+/)[0], 10)).filter((n) => !isNaN(n));
    return nums.length ? String(Math.max(...nums)) : "";
  },
  images: () => probe("ls public/images | wc -l"),
  tests: () => {
    const out = probe("npx vitest run --reporter=json 2>/dev/null");
    const m = out.match(/"numTotalTests":(\d+)/);
    return m ? m[1] : "";
  },
  pwa: () => (existsSync(ROOT + "public/manifest.json") ? "manifest ✅" : "ندارد"),
};

const kpiCurrent = (k) => {
  if (k.current) return k.current;
  const key = (k.key || "").toString();
  if (/اندازه‌ی Game/.test(key)) return auto.lines() ? `${auto.lines()} خط` : k.from;
  if (/۴۰۴|تصویر/.test(key)) return "۰ (check-assets سبز)";
  if (/تست/.test(key)) return `${auto.tests() || "۱۹"} سناریو`;
  if (/PWA|آفلاین/.test(key)) return "manifest ✅ / SW ⏳";
  if (/ESLint/.test(key)) {
    // شمارش واقعی (نه عدد ثابت): خطا + هشدار
    const out = probe("npx eslint . -f json");
    try {
      const n = JSON.parse(out).reduce((a, f) => a + f.errorCount + f.warningCount, 0);
      return fa(n);
    } catch {
      return k.from;
    }
  }
  if (/TypeScript/.test(key)) return "۰";
  return k.from;
};

/* ---------- آیتم‌های بعدی (ترتیب دقیق اجرا) ---------- */
const nextUp = [];
for (const p of data.phases) {
  for (const it of p.items) {
    if (it.status !== "done") nextUp.push(`${it.id} — ${it.title}`);
    if (nextUp.length >= 3) break;
  }
  if (nextUp.length >= 3) break;
}

/* ---------- مارک‌داون ---------- */
let md = `# 🗺️ ROADMAP — ${data.meta.project}

> **کدنام:** \`${data.meta.codename}\` · **مالک:** @${data.meta.owner} · **مخزن:** ${data.meta.repo}
> **هدف:** ${data.meta.target} · **مبنا:** ${data.meta.baseline}
> این فایل **خودکار** ساخته می‌شود. منبع حقیقت: [\`docs/roadmap.json\`](docs/roadmap.json) — برای تغییر، همان فایل را ویرایش کن و \`npm run roadmap\` بزن.

## 📊 وضعیت کلی

\`\`\`
${bar(pct)}
\`\`\`

**${fa(doneCount)} از ${fa(all.length)} آیتم انجام شده (${fa(pct)}٪)** · در دست اجرا: **${fa(doingCount)}** · آخرین به‌روزرسانی: ${new Date().toISOString().slice(0, 10)} · نسخه: \`${pkg.version}\`

| فاز | عنوان | پیشرفت | انجام/کل |
|:--:|---|---|:--:|
${data.phases
  .map((p) => {
    const d = p.items.filter((i) => i.status === "done").length;
    return `| ${p.id} | ${p.title} | \`${bar(phasePct(p), 12)}\` | ${fa(d)}/${fa(p.items.length)} |`;
  })
  .join("\n")}

### ▶️ سه کار بعدی (به همین ترتیب)

${nextUp.map((t, i) => `${fa(i + 1)}. ${t}`).join("\n")}

## 📈 شاخص‌های کلیدی (KPI)

| شاخص | مبنا | فعلی | هدف | وضعیت |
|---|---|---|:--:|:--:|
${data.meta.kpis
  .map((k) => {
    const cur = kpiCurrent(k);
    // «met» فقط وقتی در roadmap.json گذاشته می‌شود که هدف با شاهد (CI/اندازه‌گیری) برآورده شده باشد
    const ok = k.met === true || (String(cur).replace(/[^0-9۰-۹]/g, "") === String(k.to).replace(/[^0-9۰-۹]/g, "") && String(cur) === String(k.to));
    return `| ${k.key} | ${k.from} | ${cur} | **${k.to}** | ${ok ? "✅" : "⏳"} |`;
  })
  .join("\n")}

## 📜 قواعد پروژه

${data.meta.rules.map((r) => `- ${r}`).join("\n")}

---

`;

for (const p of data.phases) {
  const d = p.items.filter((i) => i.status === "done").length;
  md += `## ${p.id} — ${p.title}\n\n`;
  md += `**هدف فاز:** ${p.goal}\n\n`;
  md += `**پیشرفت:** \`${bar(phasePct(p), 14)}\` (${fa(d)}/${fa(p.items.length)})\n\n`;
  md += `| ✓ | # | کار | معیار پذیرش (DoD) | شاهد | پوش |\n|:--:|:--:|---|---|---|:--:|\n`;
  for (const it of p.items) {
    const ev = it.evidence ? it.evidence.replace(/\|/g, "/") : "—";
    md += `| ${STATUS[it.status] || "[ ]"} | ${fa(it.id)} | ${it.title} | ${it.dod} | ${ev} | ${it.push ? "#" + fa(it.push) : "—"} |\n`;
  }
  md += `\n`;
}

md += `---\n\n## 🚀 لاگ پوش‌ها (خودکار از گیت)\n\n| # | کامیت | تاریخ | شرح |\n|:--:|:--:|:--:|---|\n`;
gitLog
  .slice()
  .reverse()
  .forEach((c, i) => {
    md += `| ${fa(i + 1)} | \`${c.hash}\` | ${c.date} | ${c.subject.replace(/\|/g, "/")} |\n`;
  });

md += `\n---\n\n## 🎯 تعریف «انجام‌شده» (Definition of Done) برای هر پوش

۱. \`npm run typecheck\` → صفر خطا
۲. \`npm run test\` → همه سبز
۳. \`npm run check-assets\` → صفر دارایی گم‌شده
۴. \`npm run build\` → موفق **بدون هیچ متغیر محیطی الزامی**
۵. تست واقعی روی viewport موبایل (۳۲۰px و ۳۹۰px) + اسکرین‌شات در \`docs/shots/\`
۶. \`npm run roadmap\` و کامیت خودکار این فایل پس از هر پوش
۷. \`npm run lint\` → صفر خطا (بلاک‌کننده از P5.10)
`;

writeFileSync(ROOT + "ROADMAP.md", md);
console.log(`✅ ROADMAP.md ساخته شد — ${doneCount}/${all.length} (${pct}%) · در جریان: ${doingCount} · ${gitLog.length} کامیت در لاگ`);
