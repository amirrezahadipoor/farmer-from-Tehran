import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "مزرعه طلایی | Golden Valley Farm",
  description:
    "بازی مزرعه‌داری ایزومتریک ۲.۵ بعدی با اقتصاد عمیق، داستان ۱۱ فصلی، ۳۰ ساختمان و بازار زنده — آفلاین و تمام‌لمسی",
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
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#14532d",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="overflow-hidden bg-sky-900 text-slate-900 antialiased" style={{ fontFamily: "Vazirmatn, Tahoma, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
