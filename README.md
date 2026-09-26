# <img src="docs/icons/wheat.svg" width="30" height="30" alt=""> مزرعه طلایی — Golden Valley Farm

> بازی مزرعه‌داری ایزومتریک ۲.۵ بعدی · **آفلاین‌فِرست، فول‌تاچ، مخصوص موبایل**
> ساخته‌شده با Next.js 16 + React 19 + TypeScript · موتور گرافیکی دست‌نویس روی Canvas 2D

<p align="center">
  <img src="public/images/story_farm.webp" alt="دره زرین — مزرعه طلایی" width="100%">
</p>

## چه چیزی این بازی را متفاوت می‌کند

| ویژگی | توضیح |
|---|---|
| <img src="docs/icons/engine.svg" width="20" height="20" alt=""> **موتور ایزومتریک دست‌نویس** | بدون هیچ کتابخانه‌ی گرافیکی؛ چرخه‌ی شب و روز، چهار فصل، باران/برف/مه، هاله‌ی نور پنجره‌ها در شب |
| <img src="docs/icons/story.svg" width="20" height="20" alt=""> **داستان ۱۱ فصلی** | از اخراج کارمند بازاریابی در تهران تا سندِ «دره زرین» — با تصاویر سینمایی اختصاصی هر فصل |
| <img src="docs/icons/systems.svg" width="20" height="20" alt=""> **۱۱ سیستم درهم‌تنیده** | ۲۵ محصول، ۴۶ ساختمان، ۲۱ تحقیق، ۱۳ مهارت، ۷ قرارداد، ۵ نوع کارگر، بازار عرضه/تقاضا، رویداد فصلی، نسخه‌گردانی |
| <img src="docs/icons/touch.svg" width="20" height="20" alt=""> **آفلاین و فول‌تاچ** | PWA نصب‌شدنی؛ بدون اینترنت کامل کار می‌کند؛ ۱۰۰٪ تعامل با لمس (tap / long-press / drag / pinch) |
| <img src="docs/icons/save.svg" width="20" height="20" alt=""> **ذخیره‌ی دوگانه** | همیشه روی دستگاه (IndexedDB/LocalStorage) و در صورت وجود دیتابیس، همگام‌سازی ابری |
| <img src="docs/icons/persian.svg" width="20" height="20" alt=""> **فارسیِ درست** | RTL کامل، فونت وزیرمتن به‌صورت self-host، اعداد فارسی |
| <img src="docs/icons/done.svg" width="20" height="20" alt=""> **بدون ایموجی** | همه‌ی نمادهای بازی و اسناد SVG دست‌سازند؛ تستِ `tests/no-emoji.test.ts` هر فایلِ مخزن را بررسی می‌کند |

## اجرا

```bash
npm install
npm run dev          # http://localhost:3000
```

**بدون هیچ متغیر محیطی اجرا می‌شود.** پایگاه‌داده اختیاری است:

```bash
cp .env.example .env    # اگر همگام‌سازی ابری می‌خواهی
npm run db:push         # ساخت جدول farm_saves
```

### پایگاه‌داده اختیاری است (lazy DB)

اتصال به Postgres **تنبل** ساخته می‌شود: `getDb()` تا وقتی `DATABASE_URL` نباشد
هیچ استخری باز نمی‌کند و `null` برمی‌گرداند. نتیجه‌ی عملی:

| بدون `DATABASE_URL` | رفتار |
|---|---|
| `npm run build` | موفق — هیچ متغیری لازم نیست (در CI هم همین تست می‌شود) |
| `GET /api/save` | `{ data: null, mode: "offline" }` — بازی از سیوِ روی دستگاه ادامه می‌دهد |
| `POST /api/save` | `{ ok: false, mode: "offline" }` — کلاینت ذخیره را در «صندوق خروجی» می‌گذارد |
| `GET /api/health` | `{ ok: true, database: "offline", configured: false }` |

با داشتن دیتابیس: `cp .env.example .env` → `npm run db:push` (ساخت جدول `farm_saves`)
→ سرور خودکار ابری می‌شود و سیوهای در صف، هنگام برگشت اینترنت ارسال می‌شوند.
شاهد خودکار: `tests/api.test.ts` همین رفتار را بدون دیتابیس تست می‌کند.

## کیفیت

```bash
npm run typecheck      # TypeScript — باید صفر خطا باشد
npm run lint           # ESLint
npm run test           # تست‌های منطق بازی (Vitest)
npm run check-assets   # بررسی وجود همه‌ی تصاویر/فونت‌های ارجاع‌شده
npm run verify         # همه‌ی موارد بالا + build
npm run roadmap        # بازتولید ROADMAP.md از docs/roadmap.json
```

## ساختار

```
src/
  app/            مسیرهای Next.js و API (health, save)
  game/           موتور بازی
    data.ts       تعریف محصولات، ساختمان‌ها، تحقیق‌ها، مهارت‌ها، دستاوردها
    logic.ts      شبیه‌سازی اقتصاد و قواعد (headless و تست‌پذیر)
    render.ts     موتور رندر ایزومتریک روی Canvas 2D
    story.ts      متن ۱۱ فصل داستان
    Story.tsx     سیستم نمایش سینمایی
    Game.tsx      ریشه‌ی بازی (فقط ترکیب ماژول‌ها، < ۲۰۰ خط)
    store.ts      وضعیت بیرون از React + useGame (useSyncExternalStore)
    loop.ts       حلقه‌ی ۶۰ فریم + سازگارسازی خودکار رزولوشن
    usePersistence.ts  بارگذاری/ذخیره‌ی آفلاین‌فِرست، پشتیبان چرخشی، گزارش غیاب
    useCanvasInput.ts  ضربه، کشیدن، زوم دوانگشتی، نگه‌داشتن = ۳×۳
    persist.ts, net.ts سیو محلی/ابری، صف آفلاین، Service Worker
    ui/           HUD، نوار ابزار، لایه‌ها، شیت پنل‌ها و ۱۲ پنل (هر فایل < ۳۰۰ خط)
  db/             لایه‌ی پایگاه‌داده (lazy، اختیاری)
public/images/    تصاویر داستان، لوگو، آسمان
docs/             مستندات پروژه و نقشه‌ی راه
tools/            اسکریپت‌های کیفیت و تولید مستندات
tests/            تست‌های خودکار
```

## نقشه‌ی راه

پروژه با یک رودمپ زنده مدیریت می‌شود که بعد از هر پوش خودکار بازتولید و کامیت می‌شود:
[`ROADMAP.md`](ROADMAP.md) · منبع حقیقت: [`docs/roadmap.json`](docs/roadmap.json)

## مشارکت

۱. برنچ بساز → ۲. `npm run verify` را سبز کن (typecheck + lint بدون هیچ هشدار + تست + build) → ۳. PR بزن (قالب PR خودکار پر می‌شود).
ورک‌فلوهای گیت‌هاب اکشن: `quality`, `browser-test`, `security`.

## مجوز

MIT — amirrezahadipoor
