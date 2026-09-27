/**
 * src/game/ui/Loading.tsx — صفحه‌ی بارگذاری (بازیکنِ برگشتی تا رسیدنِ وضعیتِ بازی)
 *
 * در HTMLِ ایستا هم هست (برای بازیکنِ برگشتی پیش از هیدریت، با کلاسِ boot-back) — P6.5.
 */

import { ItemIcon } from "../icons";

export default function Loading({ className = "" }: { className?: string }) {
  return (
    // محتوا از بالا (۵۰dvh منهای نیمِ ارتفاعش)، نه وسط‌چینِ flex: تجزیه‌ی تکه‌تکه جابه‌جایش نمی‌کند (P6.5، CLS)
    <div className={`absolute inset-0 z-50 flex justify-center bg-gradient-to-b from-sky-500 via-emerald-600 to-amber-700 text-white ${className}`}>
      <div className="mt-[max(1rem,calc(50dvh-4.75rem))] h-fit px-4 text-center">
        <div className="flex animate-bounce justify-center">
          <ItemIcon id="sunflower" size={88} />
        </div>
        <p className="mt-4 text-2xl font-black">در حال بارگذاری دنیای مزرعه طلایی...</p>
      </div>
    </div>
  );
}
