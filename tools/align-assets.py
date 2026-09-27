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


def auto_key(im):
    """رنگِ پس‌زمینه از حاشیه‌ی فریم (مدیانِ حلقه‌ی لبه) — مدل همیشه سبزِ خالص نمی‌دهد"""
    im = im.convert("RGB")
    w, h = im.size
    px = im.load()
    ring = []
    step = max(1, w // 64)
    for x in range(0, w, step):
        ring.append(px[x, 1]); ring.append(px[x, h - 2])
    for y in range(0, h, step):
        ring.append(px[1, y]); ring.append(px[w - 2, y])
    rs = sorted(p[0] for p in ring); gs = sorted(p[1] for p in ring); bs = sorted(p[2] for p in ring)
    m = len(ring) // 2
    return (rs[m], gs[m], bs[m])


def chroma_key(im, key=None, tol_low=35, tol_high=110):
    """آلفای نرم: دورِ کلید → ۰، دورتر → ۲۵۵؛ despillِ عمومی هم‌زمان."""
    im = im.convert("RGB")
    if key is None:
        key = auto_key(im)
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
                    # despillِ عمومی: بیشازحدِ هر کانال نسبت به کلید را به سمت خنثی بکش
                    t = (255 - a) / 255 * 0.7
                    r = int(r - (r - kr) * t) if r > kr else r
                    g = int(g - (g - kg) * t) if g > kg else g
                    b = int(b - (b - kb) * t) if b > kb else b
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
    # پیش‌فرض: auto — کلید از حاشیه‌ی فریم تشخیص داده می‌شود (مدل سبزِ یکدست نمی‌دهد)
    ap.add_argument("--key", default="auto")
    ap.add_argument("--tol-low", type=int, default=35)
    ap.add_argument("--tol-high", type=int, default=110)
    ap.add_argument("--report", action="store_true")
    args = ap.parse_args()

    key = None if args.key == "auto" else tuple(int(v) for v in args.key.split(","))
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
