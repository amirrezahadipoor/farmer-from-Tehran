import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { preload } from "react-dom";
import "./globals.css";

export const metadata: Metadata = {
  title: "مزرعه طلایی | Golden Valley Farm",
  description:
    "بازی مزرعه‌داری ایزومتریک ۲.۵ بعدی با اقتصاد عمیق، داستان ۱۱ فصلی، ۴۶ ساختمان و بازار زنده — آفلاین و تمام‌لمسی",
  applicationName: "مزرعه طلایی",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "مزرعه طلایی",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // بزرگ‌نماییِ مرورگر آزاد است (دسترس‌پذیری، P6.5)؛ روی نقشه touch-action:none ژستِ دو انگشتی را
  // به دوربینِ بازی می‌دهد و useNativeGestureGuards زومِ ناخواسته‌ی صفحه را در حینِ بازی می‌گیرد
  viewportFit: "cover",
  themeColor: "#14532d",
};

/**
 * پیش از اولین نقاشی: بازیکنِ برگشتی (farm_started) صفحه‌ی بارگذاری را می‌بیند و تازه‌وارد اسپلش را.
 * هر دو در HTMLِ ایستا هستند (LCP بی‌انتظارِ جاوااسکریپت، P6.5) و این خط فقط یکی را نشان می‌دهد.
 */
const BOOT_SCRIPT = `try{if(localStorage.getItem("farm_started")==="1")document.documentElement.dataset.boot="back"}catch(e){}`;

/**
 * وزن‌های متنِ اسپلش (۹۰۰ و ۷۰۰) از همان ابتدا دانلود می‌شوند: بی‌آن‌ها اولین چیدمانِ متنِ فارسی با
 * فونتِ جایگزینِ سیستم انجام و بعد دوباره تکرار می‌شد (P6.5). زیرمجموعه‌اند و هرکدام ≈ ۲۷KB.
 */
const BOOT_FONTS = ["/fonts/Vazirmatn-Black.woff2", "/fonts/Vazirmatn-Bold.woff2"];

export default function RootLayout({ children }: { children: ReactNode }) {
  for (const href of BOOT_FONTS) preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body className="overflow-hidden bg-sky-900 text-slate-900 antialiased" style={{ fontFamily: "Vazirmatn, Tahoma, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
