import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "مزرعه طلایی | Golden Valley Farm",
  description: "بازی مزرعه‌داری ایزومتریک با اقتصاد عمیق",
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
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" />
      </head>
      <body className="overflow-hidden bg-sky-900 text-slate-900 antialiased" style={{ fontFamily: "Vazirmatn, Tahoma, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
