#!/usr/bin/env python3
"""
tools/pack-atlas.py — اسپرایت‌های هم‌ترازشده → یک یا چند اسپرایت‌اطلس + manifest
------------------------------------------------------------------------------
ورودی (فایل plan JSON):
  "atlases": {"world": ["art-src/out/grass_spring.png", ...]}   # هر اطلس: فهرست فایل‌ها
  "entries": {"g|grass|spring": "grass_spring.png"}             # کلیدِ کشِ بازی ← نام فایل
  "crops":   {"wheat": ["wheat_kf0.png", ..., "wheat_kf4.png"]} # ۵ فریمِ کلیدی
  "crop-keys": {"wheat": ["c|wheat|spring|0", "c|wheat|winter|1"]}
برای هر محصول و هر فصل/تغییر، ورودی‌های q=۰..۲۰ با مقیاسِ cropFrame(q) به همان ناحیه‌ی
فریمِ کلیدیِ نزدیک نگاشت می‌شوند (۲۰ پله‌ی رشد از ۵ تصویر — آینه‌ی render/atlas.ts).

خروجی:
  <atlas-dir>/<name>.png
  <manifest>  { "atlases": {name: url}, "entries": {key: {a,x,y,w,h,s?}} }

استفاده:
  python3 tools/pack-atlas.py --plan art-src/plan-slice.json \
      --atlas-dir public/art/atlas --manifest public/art/manifest.json --max-w 1024 --max-h 1024
"""
import argparse
import json
import os

from PIL import Image

CROP_KF = [0, 5, 10, 15, 20]
CROP_SCALE_MIN = 0.62


def crop_frame(q: float, kf=CROP_KF):
    """آینه‌ی دقیقِ src/game/render/atlas.ts (tests/atlas.test.ts نگهبانِ تطابق)"""
    n = len(kf) - 1
    i = max(0, min(n, int(q // (20 / n))))
    if i == n:
        return n, 1.0
    a, b = kf[i], kf[i + 1]
    t = (q - a) / (b - a) if b > a else 0
    s_a = CROP_SCALE_MIN + (1 - CROP_SCALE_MIN) * (i / n)
    s_b = CROP_SCALE_MIN + (1 - CROP_SCALE_MIN) * ((i + 1) / n)
    return i, s_a + (s_b - s_a) * t


def pack(files, max_w, max_h, pad):
    """shelf packing ساده و قطعی؛ برگشت: {filename: (x, y, w, h)} و بُعدِ موردِ نیاز"""
    items = []
    for f in files:
        im = Image.open(f)
        items.append((os.path.basename(f), im.width, im.height))
    items.sort(key=lambda t: (t[2], t[1]), reverse=True)
    pos = {}
    x, y, shelf_h = pad, pad, 0
    for name, iw, ih in items:
        if x + iw > max_w:
            x = pad
            y += shelf_h + pad
            shelf_h = 0
        if y + ih > max_h:
            raise SystemExit(f"فیت نشد: {name} ({iw}x{ih}) در {max_w}x{max_h} جا نمی‌شود")
        pos[name] = (x, y, iw, ih)
        x += iw + pad
        shelf_h = max(shelf_h, ih)
    used_w = max(v[0] + v[2] for v in pos.values()) + pad
    used_h = max(v[1] + v[3] for v in pos.values()) + pad
    return pos, used_w, used_h


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", required=True)
    ap.add_argument("--atlas-dir", default="public/art/atlas")
    ap.add_argument("--manifest", default="public/art/manifest.json")
    ap.add_argument("--max-w", type=int, default=1024)
    ap.add_argument("--max-h", type=int, default=1024)
    ap.add_argument("--pad", type=int, default=2)
    args = ap.parse_args()

    plan = json.load(open(args.plan, encoding="utf-8"))
    os.makedirs(args.atlas_dir, exist_ok=True)
    atlases = {}
    pos_all = {}

    for name, files in plan.get("atlases", {}).items():
        pos, aw, ah = pack(files, args.max_w, args.max_h, args.pad)
        pos_all.update(pos)
        atlas = Image.new("RGBA", (aw, ah), (0, 0, 0, 0))
        for f in files:
            b = os.path.basename(f)
            x, y, w, h = pos[b]
            atlas.alpha_composite(Image.open(f).convert("RGBA"), (x, y))
        out = os.path.join(args.atlas_dir, f"{name}.png")
        atlas.save(out)
        atlases[name] = f"/art/atlas/{name}.png"
        print(f"atlas {name}: {aw}x{ah}, {len(files)} sprite")

    entries = {}

    def add(key, fname, atlas_name, scale=None):
        x, y, w, h = pos_all[fname]
        e = {"a": atlas_name, "x": x, "y": y, "w": w, "h": h}
        if scale is not None:
            e["s"] = round(scale, 4)
        if key in entries:
            raise SystemExit(f"کلیدِ تکراری: {key}")
        entries[key] = e

    def atlas_of(fname):
        for n, fs in plan["atlases"].items():
            if fname in fs:
                return n
        raise SystemExit(f"فایل در هیچ اطلسی نیست: {fname}")

    for key, fname in plan.get("entries", {}).items():
        add(key, fname, atlas_of(fname))

    for crop, kf_files in plan.get("crops", {}).items():
        for base_key in plan.get("crop-keys", {}).get(crop, []):
            # فقط ۵ فریمِ کلیدی می‌رود به manifest؛ مقیاسِ ۲۰ پله در runtime (cropFrame) محاسبه می‌شود
            for i, q in enumerate(CROP_KF):
                add(f"{base_key}|{q}", kf_files[i], atlas_of(kf_files[i]))

    manifest = {"atlases": atlases, "entries": entries}
    os.makedirs(os.path.dirname(args.manifest) or ".", exist_ok=True)
    json.dump(manifest, open(args.manifest, "w", encoding="utf-8"), ensure_ascii=False, sort_keys=True)
    print(f"manifest: {len(entries)} entry → {args.manifest}")


if __name__ == "__main__":
    main()
