# منابع و مجوزها

کدِ این پروژه با مجوزِ [MIT](LICENSE) منتشر می‌شود. دارایی‌های بیرونی مجوزِ خودشان را دارند و همه در این فایل ثبت می‌شوند. قاعده‌ی پروژه: هیچ دارایی‌ای بدونِ مجوزِ آزاد (CC0، CC-BY، CC-BY-SA یا OFL؛ هرگز NC یا ND) و بدونِ ثبت در این فهرست وارد مخزن نمی‌شود (نگهبان: `tests/licenses.test.ts`).

## فونت

| دارایی | منبع | مجوز | تغییر |
|---|---|---|---|
| وزیرمتن (Regular، Medium، Bold، Black) در `public/fonts/` | [rastikerdar/vazirmatn](https://github.com/rastikerdar/vazirmatn) — Copyright 2015 The Vazirmatn Project Authors | [SIL Open Font License 1.1](public/fonts/OFL.txt) | زیرمجموعه‌ی نویسه‌های فارسی و لاتین با `tools/subset-fonts.py` (جدولِ نام و حقِ نشر دست‌نخورده می‌ماند). نسخه‌ی کامل در `tools/fonts-src/` با همان مجوز |

وزیرمتن «نامِ رزروشده» (Reserved Font Name) اعلام نکرده است؛ پس نسخه‌ی زیرمجموعه با همان نام توزیع می‌شود و متنِ کاملِ مجوز کنارِ فایل‌هاست.

## تصاویر و نمادها

| دارایی | منبع | مجوز |
|---|---|---|
| تصاویرِ داستان (`public/images/story_*.webp`)، لوگو و آسمانِ پس‌زمینه | ساخته‌شده برای همین پروژه با تولیدِ تصویر | همراهِ پروژه (MIT) |
| نمادهای SVGِ بازی و اسناد (`src/game/art/`، `docs/icons/`) | دست‌ساز برای همین پروژه | همراهِ پروژه (MIT) |
| اسپرایت‌اطلسِ دنیای بازی (`public/art/atlas/*.png`) | تولیدِ AI (مدلِ تصویرِ Arena.ai) از ۲۰۲۶/۰۹/۲۷، پرامپت‌های سبک در `docs/prompts/`، پردازش با `tools/align-assets.py` (chroma-key/trim/snap) و بسته‌بندی با `tools/pack-atlas.py` — محصولِ همین پروژه، بدون هیچ منبعِ بیرونی | همراهِ پروژه (MIT) |

## صدا

همه با `tools/build-audio.py` پردازش شده‌اند: تک‌کاناله، برشِ سکوت، هم‌ترازیِ بلندی، حلقه‌ی بی‌درز برای بسترها و MP3. نسخه‌های تغییرداده‌ی آثارِ CC-BY-SA با همان مجوز منتشر می‌شوند. اعتبارِ صداها در راهنمای خودِ بازی هم آمده است.

| دارایی | منبع | مجوز | تغییر |
|---|---|---|---|
| `public/audio/sfx/` (همه‌ی جلوه‌ها جز water.mp3) | Kenney — Interface Sounds، RPG Audio، Impact Sounds، Casino Audio و Music Jingles ([kenney.nl](https://kenney.nl/assets)) | CC0 | انتخاب برای هر رویداد، برش و هم‌ترازی |
| `public/audio/sfx/water.mp3` | Ylmir — [Rain (loopable)](https://opengameart.org/content/rain-loopable) | CC0 | تکه‌ی ۰٫۹ ثانیه‌ای بی‌بم برای آبیاری |
| `public/audio/amb/birds.mp3` | TinyWorlds — [Forest Ambience](https://opengameart.org/content/forest-ambience) | CC0 | حلقه‌ی بی‌درزِ ۲۴ ثانیه‌ای |
| `public/audio/amb/crickets.mp3` | dklon — [Crickets](https://opengameart.org/content/crickets) | CC-BY 3.0 | حلقه‌ی بی‌درزِ ۱۴ ثانیه‌ای |
| `public/audio/amb/rain.mp3` | Ylmir — [Rain (loopable)](https://opengameart.org/content/rain-loopable) | CC0 | حلقه‌ی بی‌درزِ ۲۰ ثانیه‌ای |
| `public/audio/amb/wind.mp3` | Luke.RUSTLTD — [wind1](https://opengameart.org/content/wind1) | CC0 | حلقه‌ی بی‌درزِ ۲۴ ثانیه‌ای |
| `public/audio/setar/` (n00 تا n25) | Jacqke — «Setar 1st string tuned to C»، ۲۶ پرده با کُرُن و سُریِ واقعی ([Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Setar)) | CC-BY-SA 4.0 | ۳٫۴ ثانیه‌ی اولِ هر نت با محوِ پایان؛ موسیقیِ زاینده‌ی بازی با این نت‌ها می‌نوازد |
| `public/audio/music/segah-setar.mp3` | Leyth (fawiki) — [Segah-Setar](https://commons.wikimedia.org/wiki/File:Segah-Setar.ogg)، بداهه در دستگاهِ سه‌گاه | CC-BY-SA 3.0 | حذفِ کلیک، هم‌ترازیِ بلندی و محوِ دو سر |
