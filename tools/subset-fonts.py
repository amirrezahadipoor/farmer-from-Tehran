#!/usr/bin/env python3
"""
tools/subset-fonts.py — زیرمجموعه‌ی فونتِ وزیرمتن برای بارگذاریِ اول (P6.5)

فونت‌های کامل (tools/fonts-src/، هر وزن ≈ ۵۰KB) لاتینِ گسترده و حروفِ عربی/اردوی بی‌کاربرد را هم
دارند. این ابزار برای هر وزن فقط این‌ها را نگه می‌دارد:
  • اسکی و لاتینِ ۱ (« » · × و …)
  • حروف، اعراب، ارقام و نشانه‌های فارسی از بلوکِ عربی
  • نشانه‌گذاریِ تایپوگرافیک، ZWNJ/ZWJ و کنترل‌های جهتِ متن
  • و هر نویسه‌ای که واقعاً در src/ یا manifest.json آمده (تا چیزی از قلم نیفتد)
همه‌ی ویژگی‌های OpenType (شکل‌های آغازی/میانی/پایانی، لیگاتورها) حفظ می‌شود تا اتصالِ حروف
دست نخورد. نویسه‌ی بیرون از زیرمجموعه (مثلاً حرفِ اردو در نامِ بازیکن) با فونتِ سیستم کشیده می‌شود.

خروجی با همان نام در public/fonts/ نوشته می‌شود؛ globals.css تغییری لازم ندارد.
اجرا:  pip install fonttools brotli && python3 tools/subset-fonts.py
"""
import glob
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "tools" / "fonts-src"
OUT = ROOT / "public" / "fonts"

PERSIAN = (
    set(range(0x0621, 0x063B))  # ء تا غ
    | set(range(0x0641, 0x0656))  # ف تا ی عربی + اعراب
    | set(range(0x0660, 0x066E))  # ارقامِ عربی، ٪ ٫ ٬
    | {0x060C, 0x061B, 0x061F, 0x0640, 0x0670, 0x067E, 0x0686, 0x0698, 0x06A9, 0x06AF, 0x06C0, 0x06CC, 0x06D5}
    | set(range(0x06F0, 0x06FA))  # ارقامِ فارسی
)
BASE = (
    set(range(0x20, 0x7F))
    | set(range(0xA0, 0x100))
    | set(range(0x200C, 0x2028))  # ZWNJ/ZWJ/LRM/RLM + خط‌تیره‌ها، گیومه‌ها، … و •
    | set(range(0x2030, 0x203B))
    | set(range(0x2066, 0x206A))  # جداسازهای جهت
    | {0x2212}
)


def used_chars() -> set[int]:
    files = glob.glob(str(ROOT / "src/**/*.ts*"), recursive=True) + glob.glob(str(ROOT / "src/**/*.css"), recursive=True)
    files.append(str(ROOT / "public" / "manifest.json"))
    out: set[int] = set()
    for f in files:
        out |= {ord(c) for c in Path(f).read_text(encoding="utf8") if ord(c) > 0x7E}
    return out


def main() -> None:
    unicodes = BASE | PERSIAN | used_chars()
    for src in sorted(SRC.glob("Vazirmatn-*.woff2")):
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        opts.notdef_outline = True
        font = TTFont(src)
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=unicodes)
        sub.subset(font)
        dst = OUT / src.name
        font.flavor = "woff2"
        font.save(dst)
        print(f"  {src.name:26} {src.stat().st_size // 1024:>3}KB → {dst.stat().st_size // 1024:>3}KB  ({len(font.getGlyphOrder())} گلیف)")


if __name__ == "__main__":
    main()
