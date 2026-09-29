"use client";

/**
 * src/game/ui/panels/Help.tsx — راهنمای کوتاه و لمسی
 */

import { Icon } from "../../icons";

/** اعتبارِ صداها (مورد ۱۰؛ CC-BY می‌خواهد نامِ سازنده دیده شود). جزئیات و نشانی‌ها در CREDITS.md */
const AUDIO_CREDITS =
  "Sound effects: Kenney (CC0). Setar notes: Jacqke, Wikimedia Commons (CC BY-SA 4.0). Segah improvisation on setar: Leyth, Wikimedia Commons (CC BY-SA 3.0). Crickets: dklon, OpenGameArt (CC BY 3.0). Forest: TinyWorlds; rain: Ylmir; wind: Luke.RUSTLTD, OpenGameArt (CC0).";

export function HelpPanel() {
  return (
    <div className="space-y-2.5 text-sm font-medium leading-7 text-amber-950">
      <ul className="mr-2 list-inside list-disc space-y-1 text-xs text-slate-700">
        <li>
          <b>زنجیره:</b> برداشت‌های پشت‌سرهم (۴ ثانیه فاصله) تجربه‌ی بیشتری می‌دهد و زنگش بالاتر می‌رود؛ هر ده حلقه سکه دارد.
        </li>
        <li>
          <b>محصول طلایی:</b> سه درصد کاشت‌ها طلایی می‌شود (هشت درصد روی خاکِ کودده) و پنج برابر ارزش بازار سکه می‌دهد.
        </li>
        <li>
          <b>فصل‌کشت:</b> نقطه‌ی سبز روی بذر یعنی فصلِ مطلوبش است؛ برداشت در فصلِ مطلوب یک محصولِ اضافه دارد.
        </li>
        <li>
          <b>رازها:</b> شب‌ها گاهی ستاره‌ای می‌گذرد؛ پیش از محوشدن به آن ضربه بزن تا آرزو کند (۱۵ دقیقه محصولِ بیشتر). آسیاب را هم هفت بار با دست ضربه بزن.
        </li>
        <li>
          <b>صندوق روزانه:</b> هر روزِ پیاپی که بیایی صندوقِ بزرگ‌تری می‌گیری (تا هفت روز).
        </li>
      </ul>
      <p>
        <Icon name="target" size={18} /> <b>کنترل کاملاً لمسی:</b> یک ضربه روی زمین = اجرای ابزار فعال · کشیدن انگشت = جابه‌جایی نقشه · دو انگشت یا دکمه‌های
        کنار صفحه = بزرگ‌نمایی · نگه‌داشتن انگشت = همان کار روی ۳×۳ زمین.
      </p>
      <ul className="mr-2 list-inside list-disc space-y-1 text-xs text-slate-700">
        <li>
          <b>دست:</b> برداشت محصول رسیده، جمع‌آوری تولیدات و باز کردن کارگاه‌ها.
        </li>
        <li>
          <b>کاشت:</b> فقط روی خاک شخم‌خورده‌ی خالی.
        </li>
        <li>
          <b>آب:</b> فقط روی خاک خشک؛ رشد را ۸۰٪ سریع‌تر می‌کند و ۹۰ ثانیه خیس می‌ماند.
        </li>
        <li>
          <b>کود:</b> دو محصول اضافه هنگام برداشت.
        </li>
        <li>
          <b>شخم:</b> تبدیل چمن به خاک زراعی.
        </li>
        <li>
          <b>ساخت:</b> کارخانه‌ها، دامداری‌ها و ماشین‌های خودکار.
        </li>
        <li>
          <b>پاکسازی:</b> قطع درخت، شکستن سنگ و برچیدن سازه.
        </li>
      </ul>
      <p>
        <Icon name="skills" size={18} /> <b>مهارت‌ها:</b> هر سطح یک امتیاز می‌دهد؛ با آن سرعت رشد، سود فروش و ظرفیت انبار را برای همیشه بالا ببر.
      </p>
      <p>
        <Icon name="decor" size={18} /> <b>دکوراسیون:</b> پس از دانشِ «طراحی منظر» می‌توانی فواره، آلاچیق، مجسمه و باغچه بسازی.
      </p>
      <p>
        <Icon name="rain" size={18} /> <b>فصل‌ها و آب‌وهوا:</b> هر ۵ روز فصل عوض می‌شود؛ باران آبیاری رایگان است و زمستان رشد را کند می‌کند.
      </p>
      <p>
        <Icon name="cloud" size={18} /> <b>ذخیره:</b> خودکار هر ۱۲ ثانیه روی دستگاه (و اگر اینترنت باشد، روی سرور)؛ مزرعه تا ۲ ساعت در غیاب تو کار می‌کند. برای بردنِ مزرعه به گوشیِ دیگر: منو، «انتقال و پشتیبان».
      </p>
      <div className="rounded-xl bg-white/70 p-2 text-[11px] leading-5 text-slate-600">
        <b className="text-slate-700">منابعِ صدا (مجوزِ آزاد):</b>
        <p dir="ltr" className="text-left">{AUDIO_CREDITS}</p>
      </div>
    </div>
  );
}
