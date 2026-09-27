#!/usr/bin/env python3
"""
tools/prepare-assets.py
خط تولید دارایی‌های بازی: بهینه‌سازی برای موبایل و ساخت آیکون‌های PWA.

  منابع خام  →  خروجی بهینه
  public/images/*.jpg (1672px)  →  *.webp (1280px, q82)  +  حذف jpgهای سنگین
  logo_badge.png (1254px/3.3MB) →  logo 512 + splash webp 256 + icons 192/512/180 + favicon.ico + maskable

اجرا:  python3 tools/prepare-assets.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

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

def badge_cutout(im: Image.Image) -> Image.Image:
    """
    پس‌زمینه‌ی سفیدِ بیرونِ گوشه‌های گردِ نشان را شفاف می‌کند (P6.5، فقط نسخه‌ی اسپلش؛ آیکون‌های
    نصب تمام‌رنگ می‌مانند چون سیستم‌عامل خودش قابشان می‌کند). سفیدِ متصل به چهار گوشه با flood fill
    پیدا می‌شود؛ لبه‌ی ضدِپله‌ی ≤۲ پیکسلی با کلیدِ کانالِ آبی (قابِ طلایی ≈ ۲۰، سفید ۲۵۵) آلفای
    جزئی می‌گیرد و رنگش از سفید جدا می‌شود تا روی کارتِ کرم هاله‌ی روشن نماند.
    """
    rgb = im.convert("RGB")
    w, h = rgb.size
    key = (255, 0, 255)
    ff = rgb.copy()
    for xy in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        if ff.getpixel(xy) != key:
            ImageDraw.floodfill(ff, xy, key, thresh=40)
    bg = Image.new("L", (w, h), 0)
    bg.putdata([255 if px == key else 0 for px in ff.getdata()])
    band = bg.filter(ImageFilter.MaxFilter(5))
    rim_b = 20
    res = []
    for (r, g, b, a), is_bg, near in zip(im.convert("RGBA").getdata(), bg.getdata(), band.getdata()):
        if is_bg:
            res.append((r, g, b, 0))
        elif near:
            al = max(0.0, min(1.0, (255 - b) / (255 - rim_b)))
            un = lambda c: max(0, min(255, round((c - (1 - al) * 255) / al))) if al > 0 else c  # noqa: E731
            res.append((un(r), un(g), un(b), round(al * a)))
        else:
            res.append((r, g, b, a))
    out = Image.new("RGBA", (w, h))
    out.putdata(res)
    return out


def splash_webp(base512: Image.Image, dst: Path) -> None:
    """نشانِ اسپلش: WebP ۲۵۶ با آلفا (۲۵۶ = ۸۰px×۳ و ۱۱۲px×۲ بدون تاری)"""
    cut = badge_cutout(base512).convert("RGBa").resize((256, 256), Image.LANCZOS).convert("RGBA")
    cut.save(dst, "WEBP", quality=85, method=6, alpha_quality=90)


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

    # لوگوی مرجع (منبعِ آیکون‌ها) + نسخه‌ی اسپلش: WebP ۲۵۶ (≈۲۰KB به‌جای ۴۷۹KB)؛ عنصرِ LCPِ صفحه‌ی
    # اول است و در HTMLِ ایستا پیش‌بارگذاری می‌شود (P6.5). ۲۵۶ = ۸۰px×۳ و ۱۱۲px×۲ بدون تاری
    sq(512).save(IMG / "logo_badge.png", "PNG", optimize=True)
    splash_webp(sq(512), IMG / "logo_badge.webp")

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
    report.append(f"  logo_badge.png → logo 512 + webp 256 + icon 192/512/180 + maskable + favicon.ico")

print("دارایی‌ها آماده شد:")
print("\n".join(report))
print(f"\nحجم کل public/: {sum(f.stat().st_size for f in (ROOT/'public').rglob('*') if f.is_file())//1024} KB")
