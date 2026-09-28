import type { CapacitorConfig } from "@capacitor/cli";

/**
 * capacitor.config.ts — پیکربندیِ بسته‌ی اندروید (فاز Pِ نقشه‌ی راه)
 *
 * webDir روی «out» است: همان خروجیِ بیلدِ ایستای Next (output: "export") که برای
 * GitHub Pages هم ساخته می‌شود. بیلد با `npm run build:static` انجام می‌شود:
 * NEXT_PUBLIC_STATIC=1، بدونِ مسیرِ پایه (basePath) و با کنارگذاشتنِ موقتِ
 * src/app/api — چون در نسخه‌ی ایستا route handlerِ پویا وجود ندارد.
 *
 * پروژه‌ی اندروید (android/) در CI ساخته می‌شود و در .gitignore می‌ماند.
 */
const config: CapacitorConfig = {
  appId: "com.goldenvalley.farm",
  appName: "مزرعه طلایی",
  webDir: "out",
  // بازی آفلاین‌فِرست است: همه‌چیز از داخلِ بسته خوانده می‌شود، پس cleartext لازم نیست
  server: { androidScheme: "https" },
  android: { allowMixedContent: false, webContentsDebuggingEnabled: false },
};

export default config;
