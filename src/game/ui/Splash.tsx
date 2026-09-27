/**
 * src/game/ui/Splash.tsx — صفحه‌ی آغاز (فقط بار اول؛ بازگشت به اپ مستقیم وارد بازی می‌شود)
 *
 * P6.5: اسپلش در HTMLِ ایستا رندر می‌شود (s = null، دکمه تا آماده‌شدنِ بازی غیرفعال) تا بزرگ‌ترین
 * عنصرِ صفحه — نشان — بی‌انتظارِ جاوااسکریپت نقاشی شود. نشان WebPِ ۲۵۶ و پیش‌بارگذاری‌شده است.
 * بی‌هوک و بی‌وابستگی به ماژول‌های کلاینت (Coin درجا ساخته می‌شود) تا روی سرور هم بی‌دردسر رندر شود.
 */

import { preload } from "react-dom";
import { BUILDINGS, SKILLS, fmt } from "../data";
import type { State } from "../logic";
import { Icon } from "../icons";

const DECOR_COUNT = BUILDINGS.filter((b) => b.isDecor).length;
/** WebPِ آماده‌ی ۲۵۶ (tools/prepare-assets.py) — بهینه‌سازِ next/image اینجا فقط جاوااسکریپت اضافه می‌کرد */
const LOGO = "/images/logo_badge.webp";

export default function Splash({ s, onStart, className = "" }: { s: State | null; onStart?: () => void; className?: string }) {
  // عنصرِ LCP: در HTMLِ ایستا پیش‌بارگذاری با اولویتِ بالا (React آن را به <head> می‌برد)
  preload(LOGO, { as: "image", fetchPriority: "high" });
  const features: [string, string][] = [
    ["target", "ابزارهای دقیق"],
    ["skills", `${fmt(SKILLS.length)} مهارت`],
    ["decor", `${fmt(DECOR_COUNT)} دکور`],
    ["spring", "چهار فصل"],
    ["crown", "نسل‌های بی‌پایان"],
    ["cloud", "بازی آفلاین"],
  ];
  return (
    // بدونِ backdrop-blur و سایه‌ی بزرگِ کارت: پشتِ اسپلش فقط آسمانِ نرم است، سایه روی پوششِ تیره دیده
    // نمی‌شد و هر دو در رسترِ اولین فریم ده‌ها میلی‌ثانیه خرج داشتند (P6.5).
    // کارت از بالا جا می‌گیرد (۵۰dvh منهای نیمِ ارتفاعِ معمولش: ≈۴۹۷px موبایل، ≈۶۲۲px از md که ریشه ۱۸px است)، نه با وسط‌چینِ flex: اگر HTML تکه‌تکه برسد یا
    // تجزیه‌گر وسطِ کارت نوبت بدهد، کارتِ نیمه‌کاره فقط رو به پایین بلند می‌شود و هیچ‌چیزِ نقاشی‌شده جابه‌جا
    // نمی‌شود (پیش‌تر CLS ≈ ۰٫۰۷–۰٫۱۷). در صفحه‌ی کوتاه (افقی) اسپلش اسکرول می‌خورد، نه اینکه دکمه بریده شود.
    <div data-zoom-ok className={`absolute inset-0 z-50 flex justify-center overflow-y-auto bg-slate-950/85 ${className}`}>
      <div className="mx-3 mb-4 mt-[max(1rem,calc(50dvh-15.5rem))] h-fit max-w-lg rounded-[2rem] border-2 border-amber-400 bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 p-5 text-center md:mx-4 md:mt-[max(1.5rem,calc(50dvh-17.25rem))] md:rounded-[2.5rem] md:border-4 md:p-8">
        <div className="mb-2 flex justify-center">
          {/* decoding=sync: نشانِ ۲۰KBی از پیش رسیده در همان اولین فریم کشیده می‌شود، نه یک فریم بعد (LCP زودتر) */}
          {/* eslint-disable-next-line @next/next/no-img-element -- تصویرِ ثابت و از پیش بهینه؛ بدونِ جاوااسکریپتِ next/image */}
          <img src={LOGO} alt="نشان مزرعه طلایی" width={112} height={112} fetchPriority="high" decoding="sync" className="h-20 w-20 animate-pulse drop-shadow-2xl md:h-28 md:w-28" />
        </div>
        <h1 className="bg-gradient-to-l from-emerald-700 via-amber-600 to-yellow-600 bg-clip-text text-3xl font-black text-transparent md:text-4xl">مزرعه طلایی</h1>
        <p className="mt-2 text-sm font-bold text-amber-950">داستانِ یک کارمندِ اخراج‌شده که مزرعه‌ی بابابزرگ را در «دره زرین» دوباره زنده می‌کند.</p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-black text-amber-950">
          {features.map(([ic, label]) => (
            <div key={label} className="flex flex-col items-center gap-1 rounded-xl bg-white/80 p-2 shadow-sm">
              <Icon name={ic} size={28} />
              {label}
            </div>
          ))}
        </div>

        {/* block (نه inline-block پیش‌فرض): دکمه‌ی درون‌خطی روی خطی با فونتِ وزنِ ۴۰۰ِ والد می‌نشست و فقط برای
            اندازه‌ی همان خط، Vazirmatn-Regular را در بارگذاریِ اول دانلود می‌کرد (P6.5، ۲۷KB) */}
        <button
          type="button"
          onClick={onStart}
          disabled={!onStart}
          aria-busy={!onStart}
          className="mt-6 block w-full rounded-2xl disabled:cursor-wait disabled:opacity-70 bg-gradient-to-b from-emerald-500 to-emerald-700 py-4 text-2xl font-black text-white shadow-[0_6px_0_#1b5e20] transition-all active:translate-y-1 active:shadow-none"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Icon name="play" size={30} />
            آغاز داستان
          </span>
        </button>
        {/* جای خط رزرو است تا با رسیدنِ وضعیتِ بازی چیزی جابه‌جا نشود (CLS) */}
        <p className={`mt-3 h-5 text-[11px] font-bold text-amber-900/70 ${s ? "" : "invisible"}`}>
          <span className="inline-flex items-center gap-2">
            {/* جداکننده‌ی خطی، نه «·»: نقطه‌ی میانی کنارِ ارقامِ فارسی با صفرِ «۰» اشتباه خوانده می‌شد */}
            <span>سطح {fmt(s?.level ?? 1)}</span>
            <span aria-hidden className="h-3 w-px bg-amber-900/30" />
            <span className="inline-flex items-center gap-1">
              <Icon name="coin" size={13} />
              {fmt(s?.coins ?? 0)}
            </span>
          </span>
        </p>
      </div>
    </div>
  );
}
