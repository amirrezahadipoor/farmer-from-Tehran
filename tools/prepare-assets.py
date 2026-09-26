#!/usr/bin/env python3
"""
tools/prepare-assets.py
خط تولید دارایی‌های بازی: بهینه‌سازی برای موبایل و ساخت آیکون‌های PWA.

  منابع خام  →  خروجی بهینه
  public/images/*.jpg (1672px)  →  *.webp (1280px, q82)  +  حذف jpgهای سنگین
  logo_badge.png (1254px/3.3MB) →  logo 512/192/180 + favicon.ico + maskable

اجرا:  python3 tools/prepare-assets.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "public" / "images"
ICONS = ROOT / "public" / "icons"
ICONS.mkdir(parents=True, exist_ok=True)

QUALITY = 82
TARGET_W = 1280

report = []

# ---------- ۱) تصاویر داستان → WebP ----------
for p in sorted(IMG.glob("*.jpg")):
    im = Image.open(p).convert("RGB")
    if im.width > TARGET_W:
        im = im.resize((TARGET_W, round(im.height * TARGET_W / im.width)), Image.LANCZOS)
    out = p.with_suffix(".webp")
    im.save(out, "WEBP", quality=QUALITY, method=6)
    report.append(f"  {p.name:24} {p.stat().st_size//1024:>4}KB  →  {out.name:24} {out.stat().st_size//1024:>4}KB")
    p.unlink()  # نسخه‌ی خام دیگر لازم نیست (پرامپت‌ها در docs/STORY-ART.md مستند است)

# ---------- ۲) لوگو → آیکون‌های PWA ----------
logo_src = IMG / "logo_badge.png"
if logo_src.exists():
    base = Image.open(logo_src).convert("RGBA")
    side = min(base.size)
    base = base.crop(
        ((base.width - side) // 2, (base.height - side) // 2, (base.width + side) // 2, (base.height + side) // 2)
    )

    def sq(size: int) -> Image.Image:
        return base.resize((size, size), Image.LANCZOS)

    # لوگوی داخل بازی (به‌جای PNG سنگین)
    sq(512).save(IMG / "logo_badge.png", "PNG", optimize=True)

    # آیکون‌های نصب PWA
    sq(192).save(ICONS / "icon-192.png", "PNG", optimize=True)
    sq(512).save(ICONS / "icon-512.png", "PNG", optimize=True)
    sq(180).save(ICONS / "apple-touch-icon.png", "PNG", optimize=True)

    # ماسک‌بل (اندروید آیکون را در قالب خودش می‌برد: ۲۰٪ حاشیه‌ی امن)
    mask = Image.new("RGBA", (512, 512), (20, 83, 45, 255))
    inner = sq(360)
    mask.paste(inner, (76, 76), inner if inner.mode == "RGBA" else None)
    mask.convert("RGB").save(ICONS / "maskable-512.png", "PNG", optimize=True)

    # فاوآیکون چنداندازه
    sq(64).save(ROOT / "public" / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    report.append(f"  logo_badge.png → logo 512 + icon 192/512/180 + maskable + favicon.ico")

print("دارایی‌ها آماده شد:")
print("\n".join(report))
print(f"\nحجم کل public/: {sum(f.stat().st_size for f in (ROOT/'public').rglob('*') if f.is_file())//1024} KB")
