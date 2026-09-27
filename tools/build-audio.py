#!/usr/bin/env python3
"""
tools/build-audio.py — ساختِ صداهای واقعیِ بازی از منابعِ آزاد (نقشه‌ی راه، مورد ۱۰)

منابع (همه CC0، CC-BY، CC-BY-SA یا مالکیتِ عمومی؛ فهرستِ کامل با نشانی در SOURCES پایین و CREDITS.md):
  • جلوه‌ها: بسته‌های Kenney (CC0)
  • صدای محیط: OpenGameArt (پرنده، باران و باد CC0؛ جیرجیرک CC-BY 3.0)
  • موسیقی: ۲۶ نتِ تکیِ سه‌تار (Jacqke، CC-BY-SA 4.0) برای موسیقیِ زاینده، و بداهه‌ی سه‌تار در سه‌گاه
    (Leyth، CC-BY-SA 3.0) برای میان‌پرده

پردازش (ffmpeg): تک‌کاناله، برشِ سکوتِ آغاز، محوِ پایان، هم‌ترازیِ بلندی، حلقه‌ی بی‌درز برای صدای محیط
(هم‌آمیزیِ دُم با سر + حاشیه‌ی تکراری تا تأخیرِ رمزگذارِ MP3 مرزِ حلقه را نشکند)، و MP3 که همه‌ی
مرورگرها (از جمله iOS) رمزگشایی می‌کنند. خروجی: public/audio/** و src/game/sound/samples.gen.ts

اجرا: python3 tools/build-audio.py /path/to/sources   (پوشه‌ی منابعِ دانلودشده؛ نشانی‌ها در SOURCES)
نیاز: ffmpeg با libmp3lame، numpy
"""
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "audio"
GEN = ROOT / "src" / "game" / "sound" / "samples.gen.ts"
SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/audio-src")

SOURCES = {
    "kenney": ("Kenney — Interface Sounds، RPG Audio، Impact Sounds، Casino Audio، Music Jingles", "https://kenney.nl/assets", "CC0"),
    "forest": ("TinyWorlds — Forest Ambience", "https://opengameart.org/content/forest-ambience", "CC0"),
    "crickets": ("dklon — Crickets", "https://opengameart.org/content/crickets", "CC-BY 3.0"),
    "rain": ("Ylmir — Rain (loopable)", "https://opengameart.org/content/rain-loopable", "CC0"),
    "wind": ("Luke.RUSTLTD — wind1", "https://opengameart.org/content/wind1", "CC0"),
    "setar": ("Jacqke — Setar 1st string tuned to C (۲۶ پرده)", "https://commons.wikimedia.org/wiki/Category:Setar", "CC-BY-SA 4.0"),
    "segah": ("Leyth (fawiki) — Segah-Setar", "https://commons.wikimedia.org/wiki/File:Segah-Setar.ogg", "CC-BY-SA 3.0"),
}

K = {
    "ui": "kenney_interface-sounds/Audio",
    "rpg": "kenney_rpg-audio/Audio",
    "imp": "kenney_impact-sounds/Audio",
    "cas": "kenney_casino-audio/Audio",
    "jin": "kenney_music-jingles/Audio/Pizzicato jingles",
}

# کلیدِ جلوه → (فایل‌های منبع به‌عنوانِ گونه‌ها، بهره در بازی). جلوه‌های پرتکرار نرم و کوتاه‌اند؛ پیشرفت‌ها
# جینگلِ پیتزیکاتو (زهی، آرام) و نه برنج یا ۸-بیت
SFX = {
    "click": (["ui/click_002"], 0.55),
    "tap": (["ui/tick_002"], 0.45),
    "err": (["ui/error_004"], 0.5),
    "swoosh": (["ui/minimize_005"], 0.45),
    "page": (["rpg/bookFlip1", "rpg/bookFlip2", "rpg/bookFlip3"], 0.6),
    "start": (["jin/jingles_PIZZI00"], 0.7),
    "harvest": (["ui/pluck_001", "ui/pluck_002"], 0.65),
    "plant": (["imp/footstep_grass_000", "imp/footstep_grass_001", "imp/footstep_grass_002"], 0.7),
    "water": (["@water"], 0.55),
    "fert": (["rpg/cloth1", "rpg/cloth2", "rpg/cloth3"], 0.6),
    "dig": (["imp/impactSoft_medium_000", "imp/impactSoft_medium_001", "imp/impactSoft_medium_002"], 0.65),
    "chop": (["rpg/chop"], 0.6),
    "rock": (["imp/impactMining_000", "imp/impactMining_001", "imp/impactMining_002"], 0.55),
    "build": (["imp/impactPlank_medium_000", "imp/impactPlank_medium_001", "imp/impactPlank_medium_002"], 0.6),
    "demolish": (["imp/impactWood_heavy_000", "imp/impactWood_heavy_001"], 0.6),
    "collect": (["rpg/handleCoins", "rpg/handleCoins2"], 0.6),
    "coin": (["cas/chip-lay-1", "cas/chip-lay-2", "cas/chip-lay-3"], 0.55),
    "sell": (["cas/chips-stack-1", "cas/chips-stack-2", "cas/chips-stack-3"], 0.6),
    "order": (["ui/confirmation_001"], 0.6),
    "contract": (["rpg/bookPlace1"], 0.65),
    "expand": (["ui/confirmation_003"], 0.6),
    "hire": (["ui/open_002"], 0.6),
    "unlock": (["ui/confirmation_004"], 0.6),
    "skill": (["jin/jingles_PIZZI04"], 0.65),
    "lvl": (["jin/jingles_PIZZI10"], 0.7),
    "achievement": (["jin/jingles_PIZZI12"], 0.7),
    "prestige": (["jin/jingles_PIZZI07"], 0.75),
    "chapter": (["jin/jingles_PIZZI03"], 0.7),
    "goal": (["jin/jingles_PIZZI05"], 0.65),
}

# بسترهای محیط: منبع، آغاز، طولِ حلقه، طولِ هم‌آمیزی (ثانیه)، بهره
BEDS = {
    "birds": ("forest", "forest-ambience.mp3", 2.0, 24.0, 3.0, 0.9),
    "crickets": ("crickets", "crickets-dklon.mp3", 1.0, 14.0, 2.0, 0.8),
    "rain": ("rain", "rain-ylmir/1.ogg", 1.0, 20.0, 3.0, 0.85),
    "wind": ("wind", "wind1.wav", 4.0, 24.0, 4.0, 0.8),
}
PAD = 0.12  # حاشیه‌ی تکراری در دو سرِ هر حلقه

# پرده‌های سیمِ اولِ سه‌تار (نام از عنوانِ فایل‌های کامنز) → سنت نسبت به دهانه‌ی باز؛ کرن ≈ −۵۰، سری ≈ +۵۰
FRETS = ["C", "D koron", "D", "E flat", "E koron", "E", "F", "F sori", "F sharp", "G", "A flat", "A koron", "A",
         "B flat", "B koron", "B", "C", "D koron", "D", "E flat", "E koron", "E", "F", "F sharp", "G", "A flat"]
OPEN_HZ = 233.08  # دهانه‌ی باز (میانه‌ی اندازه‌گیری روی پرده‌های سالم ≈ ۲۳۲٫۵)


def ff(*args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)


def duration(f) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)], capture_output=True, text=True)
    return float(r.stdout.strip())


def peak_db(f) -> float:
    r = subprocess.run(["ffmpeg", "-v", "info", "-i", str(f), "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True)
    return float(re.search(r"max_volume: (-?[\d.]+) dB", r.stderr).group(1))


def mp3(wav, dst, rate="96k", target_peak=-3.0):
    """wav → MP3 با اوجِ هم‌تراز"""
    g = target_peak - peak_db(wav)
    dst.parent.mkdir(parents=True, exist_ok=True)
    ff("-i", str(wav), "-af", f"volume={g:.2f}dB", "-c:a", "libmp3lame", "-b:a", rate, str(dst))


def src_path(spec: str) -> Path:
    group, name = spec.split("/", 1)
    return SRC / K[group] / f"{name}.ogg"


def fret_cents(i: int) -> float:
    parts = FRETS[i].split()
    c = {"C": 0, "D": 200, "E": 400, "F": 500, "G": 700, "A": 900, "B": 1100}[parts[0]] + (1200 if i >= 16 else 0)
    if len(parts) > 1:
        c += {"flat": -100, "koron": -50, "sharp": 100, "sori": 50}[parts[1]]
    return c


def hps_pitch(f, sr=22050) -> float:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", "0.35", "-t", "1.2", "-i", str(f), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    x = x * np.hanning(len(x))
    n = 1 << 17
    spec = np.abs(np.fft.rfft(x, n))
    freqs = np.fft.rfftfreq(n, 1 / sr)
    h = spec.copy()
    for k in (2, 3, 4):
        d = spec[::k]
        h[: len(d)] *= d
    band = (freqs > 70) & (freqs < 1000)
    return float(freqs[band][np.argmax(h[band])])


def build_sfx():
    tmp = Path("/tmp/gvf-sfx")
    tmp.mkdir(exist_ok=True)
    out = {}
    for key, (specs, gain) in SFX.items():
        files = []
        for i, spec in enumerate(specs):
            name = f"{key}-{i + 1}.mp3" if len(specs) > 1 else f"{key}.mp3"
            wav = tmp / f"{key}-{i}.wav"
            if spec == "@water":
                # آبیاری: تکه‌ای از ضبطِ باران (قطره‌های ریز روی خاک)، بی‌بم و کوتاه
                ff("-ss", "6.0", "-t", "0.9", "-i", str(SRC / "rain-ylmir/3.ogg"), "-ac", "1", "-ar", "44100",
                   "-af", "highpass=f=350,afade=t=in:d=0.08,afade=t=out:st=0.55:d=0.35", str(wav))
            else:
                ff("-i", str(src_path(spec)), "-ac", "1", "-ar", "44100",
                   "-af", "silenceremove=start_periods=1:start_threshold=-50dB,areverse,afade=t=in:d=0.02,areverse", str(wav))
            mp3(wav, OUT / "sfx" / name, "96k", -3.0)
            files.append(f"/audio/sfx/{name}")
        out[key] = {"files": files, "gain": gain}
    return out


def build_beds():
    tmp = Path("/tmp/gvf-beds")
    tmp.mkdir(exist_ok=True)
    out = {}
    for bed, (credit, file, start, length, xf, gain) in BEDS.items():
        # حلقه‌ی بی‌درز: پایانِ بدنه با سرِ خودش هم‌آمیخته می‌شود، پس انتهای فایل دقیقاً به آغازش می‌رسد.
        # سر و بدنه جدا بریده می‌شوند (دو شاخه‌ی یک asplit در acrossfade قفل می‌کند)
        head, body, xfd, loop = (tmp / f"{bed}-{n}.wav" for n in ("head", "body", "xf", "loop"))
        ff("-ss", str(start), "-t", str(xf), "-i", str(SRC / file), "-ac", "1", "-ar", "44100", str(head))
        ff("-ss", str(start + xf), "-t", str(length), "-i", str(SRC / file), "-ac", "1", "-ar", "44100", str(body))
        ff("-i", str(body), "-i", str(head), "-filter_complex", f"[0:a][1:a]acrossfade=d={xf}:c1=qsin:c2=qsin[o]", "-map", "[o]", str(xfd))
        ff("-i", str(xfd), "-af", "loudnorm=I=-24:TP=-3:LRA=7,aresample=44100", "-ar", "44100", str(loop))
        L = duration(loop)
        # حاشیه: PAD ثانیه‌ی آخرِ حلقه پیش از آن و PAD ثانیه‌ی اولش بعد از آن (مرزها تناوبی می‌مانند)
        pre, post, padded = (tmp / f"{bed}-{n}.wav" for n in ("pre", "post", "padded"))
        ff("-ss", str(L - PAD), "-i", str(loop), str(pre))
        ff("-t", str(PAD), "-i", str(loop), str(post))
        ff("-i", str(pre), "-i", str(loop), "-i", str(post), "-filter_complex", "[0:a][1:a][2:a]concat=n=3:v=0:a=1[o]", "-map", "[o]", str(padded))
        dst = OUT / "amb" / f"{bed}.mp3"
        dst.parent.mkdir(parents=True, exist_ok=True)
        ff("-i", str(padded), "-c:a", "libmp3lame", "-b:a", "80k", str(dst))
        out[bed] = {"file": f"/audio/amb/{bed}.mp3", "loopStart": round(PAD, 4), "loopEnd": round(PAD + L, 4), "gain": gain}
    return out


def build_setar():
    tmp = Path("/tmp/gvf-setar")
    tmp.mkdir(exist_ok=True)
    notes = []
    for i in range(len(FRETS)):
        src = SRC / "setar" / f"fret{i:02d}.ogg"
        nominal = OPEN_HZ * 2 ** (fret_cents(i) / 1200)
        measured = hps_pitch(src)
        # اندازه‌گیریِ قابلِ اعتماد (±۴۰ سنت از اسمی، با تا کردنِ اکتاو) کوکِ واقعیِ نوازنده را نگه می‌دارد
        folded = measured * 2 ** round(np.log2(nominal / measured))
        freq = folded if abs(1200 * np.log2(folded / nominal)) < 40 else nominal
        wav = tmp / f"n{i:02d}.wav"
        ff("-i", str(src), "-ac", "1", "-ar", "32000",
           "-af", "silenceremove=start_periods=1:start_threshold=-45dB,atrim=0:3.4,afade=t=out:st=2.0:d=1.4", str(wav))
        name = f"n{i:02d}.mp3"
        mp3(wav, OUT / "setar" / name, "64k", -3.0)
        notes.append({"file": f"/audio/setar/{name}", "freq": round(float(freq), 2), "fret": i})
    return notes


def build_interludes():
    tmp = Path("/tmp/gvf-int")
    tmp.mkdir(exist_ok=True)
    wav = tmp / "segah.wav"
    ff("-i", str(SRC / "segah-setar.ogg"), "-ac", "1", "-ar", "44100",
       "-af", "adeclick,loudnorm=I=-21:TP=-2:LRA=11,afade=t=in:d=2,areverse,afade=t=in:d=4,areverse", str(wav))
    dst = OUT / "music" / "segah-setar.mp3"
    dst.parent.mkdir(parents=True, exist_ok=True)
    ff("-i", str(wav), "-c:a", "libmp3lame", "-b:a", "96k", str(dst))
    return [{"file": "/audio/music/segah-setar.mp3", "title": "بداهه در سه‌گاه، سه‌تار", "duration": round(duration(dst), 2)}]


def main():
    if not (SRC / K["ui"]).exists():
        sys.exit(f"منابع در {SRC} نیستند؛ نشانی‌ها در SOURCES")
    sfx, beds, setar, inter = build_sfx(), build_beds(), build_setar(), build_interludes()
    total = sum(p.stat().st_size for p in OUT.rglob("*.mp3"))
    GEN.write_text(
        "/**\n * src/game/sound/samples.gen.ts — ساخته‌شده با tools/build-audio.py؛ دستی ویرایش نشود (مورد ۱۰)\n"
        f" * {len(list(OUT.rglob('*.mp3')))} فایل، {total // 1024} کیلوبایت\n */\n"
        "import type { SfxKey } from \"../logic\";\n\n"
        f"export const SFX_SAMPLES: Record<SfxKey, {{ files: string[]; gain: number }}> = {json.dumps(sfx, ensure_ascii=False, indent=2)};\n\n"
        f"export const BED_SAMPLES = {json.dumps(beds, ensure_ascii=False, indent=2)} as const;\n\n"
        f"export const SETAR_NOTES: {{ file: string; freq: number; fret: number }}[] = {json.dumps(setar, ensure_ascii=False)};\n\n"
        f"export const INTERLUDES = {json.dumps(inter, ensure_ascii=False, indent=2)};\n",
        encoding="utf-8",
    )
    print(f"ok: {len(sfx)} جلوه، {len(beds)} بستر، {len(setar)} نت، {len(inter)} میان‌پرده — {total / 1024:.0f} کیلوبایت")


if __name__ == "__main__":
    main()
