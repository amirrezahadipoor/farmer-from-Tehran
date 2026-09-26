#!/usr/bin/env node
/**
 * tools/gen-roadmap.mjs
 * منبع حقیقت پروژه: docs/roadmap.json  →  تولید خودکار ROADMAP.md
 * بعد از هر پوش اجرا می‌شود:  npm run roadmap
 * - تیک‌ها را از روی status می‌زند
 * - جدول «لاگ پوش‌ها» را از تاریخچه‌ی گیت می‌سازد
 * - درصد پیشرفت هر فاز و کل پروژه را حساب می‌کند
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;
const data = JSON.parse(readFileSync(ROOT + "docs/roadmap.json", "utf8"));
const pkg = JSON.parse(readFileSync(ROOT + "package.json", "utf8"));

const fa = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
const bar = (pct, len = 20) => {
  const f = Math.round((pct / 100) * len);
  return "█".repeat(f) + "░".repeat(len - f) + `  ${fa(pct)}٪`;
};

let gitLog = [];
try {
  gitLog = execSync("git log --pretty=format:%h|%ad|%s --date=short -n 100", { cwd: ROOT })
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

const all = data.phases.flatMap((p) => p.items);
const doneCount = all.filter((i) => i.status === "done").length;
const pct = Math.round((doneCount / all.length) * 100);
const phasePct = (p) => Math.round((p.items.filter((i) => i.status === "done").length / p.items.length) * 100);

const STATUS = { done: "[x]", doing: "[~]", todo: "[ ]", blocked: "[!]" };

let md = `# 🗺️ ROADMAP — ${data.meta.project}

> **کدنام:** \`${data.meta.codename}\` · **مالک:** @${data.meta.owner} · **مخزن:** ${data.meta.repo}
> **هدف:** ${data.meta.target} · **مبنا:** ${data.meta.baseline}
> این فایل **خودکار** ساخته می‌شود. منبع حقیقت: [\`docs/roadmap.json\`](docs/roadmap.json) — برای تغییر، همان فایل را ویرایش کن و \`npm run roadmap\` بزن.

## 📊 وضعیت کلی

\`\`\`
${bar(pct)}
\`\`\`

**${fa(doneCount)} از ${fa(all.length)} آیتم انجام شده (${fa(pct)}٪)** — آخرین به‌روزرسانی: ${new Date().toISOString().slice(0, 10)} · نسخه: \`${pkg.version}\`

| فاز | عنوان | پیشرفت | انجام/کل |
|:--:|---|---|:--:|
${data.phases
  .map((p) => {
    const d = p.items.filter((i) => i.status === "done").length;
    return `| ${p.id} | ${p.title} | \`${bar(phasePct(p), 12)}\` | ${fa(d)}/${fa(p.items.length)} |`;
  })
  .join("\n")}

## 📈 شاخص‌های کلیدی (KPI)

| شاخص | از | به | وضعیت |
|---|---|---|:--:|
${data.meta.kpis.map((k) => `| ${k.key} | ${k.from} | **${k.to}** | ${k.from === k.to ? "✅" : "⏳"} |`).join("\n")}

## 📜 قواعد پروژه

${data.meta.rules.map((r) => `- ${r}`).join("\n")}

---

`;

for (const p of data.phases) {
  const d = p.items.filter((i) => i.status === "done").length;
  md += `## ${p.id} — ${p.title}\n\n`;
  md += `**هدف فاز:** ${p.goal}\n\n`;
  md += `**پیشرفت:** \`${bar(phasePct(p), 14)}\` (${fa(d)}/${fa(p.items.length)})\n\n`;
  md += `| ✓ | # | کار | معیار پذیرش (DoD) | پوش |\n|:--:|:--:|---|---|:--:|\n`;
  for (const it of p.items) {
    md += `| ${STATUS[it.status] || "[ ]"} | ${fa(it.id)} | ${it.title} | ${it.dod} | ${it.push ? "#" + fa(it.push) : "—"} |\n`;
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

1. \`npm run typecheck\` → صفر خطا
2. \`npm run lint\` → صفر خطا و صفر هشدار
3. \`npm run test\` → همه سبز
4. \`npm run build\` → موفق **بدون هیچ متغیر محیطی الزامی**
5. \`node tools/check-assets.mjs\` → صفر دارایی گم‌شده
6. تست واقعی روی viewport موبایل (۳۲۰px و ۳۹۰px) + اسکرین‌شات در \`docs/shots/\`
7. \`npm run roadmap\` و کامیت خودکار این فایل
`;

writeFileSync(ROOT + "ROADMAP.md", md);
console.log(`✅ ROADMAP.md ساخته شد — ${doneCount}/${all.length} (${pct}%) · ${gitLog.length} کامیت در لاگ`);
