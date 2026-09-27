#!/usr/bin/env python3
"""
tools/align-assets.py — تصویرِ خامِ AI → اسپرایتِ شفافِ هم‌تراز با شبکه‌ی بازی
--------------------------------------------------------------------------
پایپ‌لاین (بدون هیچ تنظیم دستیِ پیکسلی):
  1. chroma-key: پس‌زمینه‌ی مجانتا (یا رنگ دلخواه) با لبه‌ی نرم حذف می‌شود
  2. despill: رنگِ درزِ مجانتا از لبه‌ها می‌رود
  3. trim: کادرِ محتوا با حاشیه‌ی ۲px
  4. fit: مقیاس به جعبه‌ی هدف (W×H) — contain (پایه) یا fill (لوزیِ کاشی)
  5. report: JSON برای اعتبارسنجی (حجمِ پوشش، برشِ لبه، ابعاد)

استفاده:
  python3 tools/align-assets.py --src خام.png --out نهایی.png \
      --w 88 --h 44 --fit fill --anchor bottom
"""
import argparse
import json
import math
import sys

from PIL import Image


def chroma_key(im, key=(255, 0, 255), tol_low=60, tol_high=150):
    """آلفای نرم: دورِ کلید → ۰، دورتر → ۲۵۵؛ despill هم‌زمان."""
    im = im.convert("RGB")
    px = im.load()
    w, h = im.size
    kr, kg, kb = key
    out = Image.new("RGBA", (w, h))
    opx = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            d = math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2)
            if d <= tol_low:
                a = 0
            elif d >= tol_high:
                a = 255
            else:
                a = int(255 * (d - tol_low) / (tol_high - tol_low))
            if a > 0:
                if a < 255:
                    # despillِ مجانتا: R و B را به سمت G بکش (درزِ بنفش حذف شود)
                    t = (255 - a) / 255
                    r = int(g + (r - g) * (1 - 0.6 * t))
                    b = int(g + (b - g) * (1 - 0.6 * t))
                opx[x, y] = (r, g, b, a)
    return out


def trim(im, margin=2, thresh=8):
    a = im.getchannel("A")
    bbox = a.point(lambda v: 255 if v > thresh else 0).getbbox()
    if not bbox:
        return None
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - margin)
    y0 = max(0, y0 - margin)
    x1 = min(im.width, x1 + margin)
    y1 = min(im.height, y1 + margin)
    return im.crop((x0, y0, x1, y1))


def fit(im, w, h, mode, anchor):
    if mode == "fill":
        return im.resize((w, h), Image.LANCZOS)
    # contain: تناسب را حفظ کن
    sc = min(w / im.width, h / im.height)
    nw, nh = max(1, round(im.width * sc)), max(1, round(im.height * sc))
    im = im.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", (w, h))
    ox = (w - nw) // 2
    oy = (h - nh) // 2
    if anchor == "bottom":
        oy = h - nh
    elif anchor == "top":
        oy = 0
    canvas.alpha_composite(im, (ox, oy))
    return canvas


def clipped_warning(im, thresh=120):
    """محتوا چسبیده به لبه‌ی فریم = احتمالِ برشِ بد توسطِ مدل."""
    a = im.getchannel("A")
    w, h = a.size
    rows, cols = a.getextrema()[0], 0
    edge = 0
    for x in range(w):
        if a.getpixel((x, 0)) > thresh or a.getpixel((x, h - 1)) > thresh:
            edge += 1
    for y in range(h):
        if a.getpixel((0, y)) > thresh or a.getpixel((w - 1, y)) > thresh:
            edge += 1
    return edge > max(w, h) * 0.15


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--w", type=int, required=True)
    ap.add_argument("--h", type=int, required=True)
    ap.add_argument("--fit", choices=["contain", "fill"], default="contain")
    ap.add_argument("--anchor", choices=["center", "bottom", "top"], default="center")
    # پیش‌فرض: کلیدِ سبز (پس‌زمینه‌ی #00FF00) — پالتِ گرمِ آرت با سبزِ خالص فاصله‌ی زیادی دارد
    ap.add_argument("--key", default="0,255,0")
    ap.add_argument("--tol-low", type=int, default=50)
    ap.add_argument("--tol-high", type=int, default=130)
    ap.add_argument("--report", action="store_true")
    args = ap.parse_args()

    key = tuple(int(v) for v in args.key.split(","))
    im = Image.open(args.src)
    raw_w, raw_h = im.size
    keyed = chroma_key(im, key, args.tol_low, args.tol_high)
    trimmed = trim(keyed)
    if trimmed is None:
        print(json.dumps({"ok": False, "error": "empty (no subject found)"}))
        sys.exit(1)
    final = fit(trimmed, args.w, args.h, args.fit, args.anchor)
    import os
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    final.save(args.out)
    a = final.getchannel("A")
    coverage = sum(1 for v in a.getdata() if v > 8) / (args.w * args.h)
    report = {
        "ok": True,
        "src": args.src,
        "out": args.out,
        "raw": [raw_w, raw_h],
        "trimmed": [trimmed.width, trimmed.height],
        "final": [args.w, args.h],
        "coverage": round(coverage, 3),
        "clipped": clipped_warning(keyed),
    }
    if args.report or True:
        print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
