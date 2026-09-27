/**
 * src/game/sound/samples.gen.ts — ساخته‌شده با tools/build-audio.py؛ دستی ویرایش نشود (مورد ۱۰)
 * 79 فایل، 2361 کیلوبایت
 */
import type { SfxKey } from "../logic";

export const SFX_SAMPLES: Record<SfxKey, { files: string[]; gain: number }> = {
  "click": {
    "files": [
      "/audio/sfx/click.mp3"
    ],
    "gain": 0.55
  },
  "tap": {
    "files": [
      "/audio/sfx/tap.mp3"
    ],
    "gain": 0.45
  },
  "err": {
    "files": [
      "/audio/sfx/err.mp3"
    ],
    "gain": 0.5
  },
  "swoosh": {
    "files": [
      "/audio/sfx/swoosh.mp3"
    ],
    "gain": 0.45
  },
  "page": {
    "files": [
      "/audio/sfx/page-1.mp3",
      "/audio/sfx/page-2.mp3",
      "/audio/sfx/page-3.mp3"
    ],
    "gain": 0.6
  },
  "start": {
    "files": [
      "/audio/sfx/start.mp3"
    ],
    "gain": 0.7
  },
  "harvest": {
    "files": [
      "/audio/sfx/harvest-1.mp3",
      "/audio/sfx/harvest-2.mp3"
    ],
    "gain": 0.65
  },
  "plant": {
    "files": [
      "/audio/sfx/plant-1.mp3",
      "/audio/sfx/plant-2.mp3",
      "/audio/sfx/plant-3.mp3"
    ],
    "gain": 0.7
  },
  "water": {
    "files": [
      "/audio/sfx/water.mp3"
    ],
    "gain": 0.55
  },
  "fert": {
    "files": [
      "/audio/sfx/fert-1.mp3",
      "/audio/sfx/fert-2.mp3",
      "/audio/sfx/fert-3.mp3"
    ],
    "gain": 0.6
  },
  "dig": {
    "files": [
      "/audio/sfx/dig-1.mp3",
      "/audio/sfx/dig-2.mp3",
      "/audio/sfx/dig-3.mp3"
    ],
    "gain": 0.65
  },
  "chop": {
    "files": [
      "/audio/sfx/chop.mp3"
    ],
    "gain": 0.6
  },
  "rock": {
    "files": [
      "/audio/sfx/rock-1.mp3",
      "/audio/sfx/rock-2.mp3",
      "/audio/sfx/rock-3.mp3"
    ],
    "gain": 0.55
  },
  "build": {
    "files": [
      "/audio/sfx/build-1.mp3",
      "/audio/sfx/build-2.mp3",
      "/audio/sfx/build-3.mp3"
    ],
    "gain": 0.6
  },
  "demolish": {
    "files": [
      "/audio/sfx/demolish-1.mp3",
      "/audio/sfx/demolish-2.mp3"
    ],
    "gain": 0.6
  },
  "collect": {
    "files": [
      "/audio/sfx/collect-1.mp3",
      "/audio/sfx/collect-2.mp3"
    ],
    "gain": 0.6
  },
  "coin": {
    "files": [
      "/audio/sfx/coin-1.mp3",
      "/audio/sfx/coin-2.mp3",
      "/audio/sfx/coin-3.mp3"
    ],
    "gain": 0.55
  },
  "sell": {
    "files": [
      "/audio/sfx/sell-1.mp3",
      "/audio/sfx/sell-2.mp3",
      "/audio/sfx/sell-3.mp3"
    ],
    "gain": 0.6
  },
  "order": {
    "files": [
      "/audio/sfx/order.mp3"
    ],
    "gain": 0.6
  },
  "contract": {
    "files": [
      "/audio/sfx/contract.mp3"
    ],
    "gain": 0.65
  },
  "expand": {
    "files": [
      "/audio/sfx/expand.mp3"
    ],
    "gain": 0.6
  },
  "hire": {
    "files": [
      "/audio/sfx/hire.mp3"
    ],
    "gain": 0.6
  },
  "unlock": {
    "files": [
      "/audio/sfx/unlock.mp3"
    ],
    "gain": 0.6
  },
  "skill": {
    "files": [
      "/audio/sfx/skill.mp3"
    ],
    "gain": 0.65
  },
  "lvl": {
    "files": [
      "/audio/sfx/lvl.mp3"
    ],
    "gain": 0.7
  },
  "achievement": {
    "files": [
      "/audio/sfx/achievement.mp3"
    ],
    "gain": 0.7
  },
  "prestige": {
    "files": [
      "/audio/sfx/prestige.mp3"
    ],
    "gain": 0.75
  },
  "chapter": {
    "files": [
      "/audio/sfx/chapter.mp3"
    ],
    "gain": 0.7
  },
  "goal": {
    "files": [
      "/audio/sfx/goal.mp3"
    ],
    "gain": 0.65
  }
};

export const BED_SAMPLES = {
  "birds": {
    "file": "/audio/amb/birds.mp3",
    "loopStart": 0.12,
    "loopEnd": 24.12,
    "gain": 0.9
  },
  "crickets": {
    "file": "/audio/amb/crickets.mp3",
    "loopStart": 0.12,
    "loopEnd": 14.12,
    "gain": 0.8
  },
  "rain": {
    "file": "/audio/amb/rain.mp3",
    "loopStart": 0.12,
    "loopEnd": 20.1073,
    "gain": 0.85
  },
  "wind": {
    "file": "/audio/amb/wind.mp3",
    "loopStart": 0.12,
    "loopEnd": 24.12,
    "gain": 0.8
  }
} as const;

export const SETAR_NOTES: { file: string; freq: number; fret: number }[] = [{"file": "/audio/setar/n00.mp3", "freq": 231.65, "fret": 0}, {"file": "/audio/setar/n01.mp3", "freq": 254.18, "fret": 1}, {"file": "/audio/setar/n02.mp3", "freq": 261.17, "fret": 2}, {"file": "/audio/setar/n03.mp3", "freq": 274.55, "fret": 3}, {"file": "/audio/setar/n04.mp3", "freq": 284.98, "fret": 4}, {"file": "/audio/setar/n05.mp3", "freq": 291.37, "fret": 5}, {"file": "/audio/setar/n06.mp3", "freq": 311.12, "fret": 6}, {"file": "/audio/setar/n07.mp3", "freq": 320.24, "fret": 7}, {"file": "/audio/setar/n08.mp3", "freq": 336.62, "fret": 8}, {"file": "/audio/setar/n09.mp3", "freq": 349.07, "fret": 9}, {"file": "/audio/setar/n10.mp3", "freq": 366.4, "fret": 10}, {"file": "/audio/setar/n11.mp3", "freq": 379.35, "fret": 11}, {"file": "/audio/setar/n12.mp3", "freq": 393.15, "fret": 12}, {"file": "/audio/setar/n13.mp3", "freq": 414.18, "fret": 13}, {"file": "/audio/setar/n14.mp3", "freq": 427.47, "fret": 14}, {"file": "/audio/setar/n15.mp3", "freq": 441.77, "fret": 15}, {"file": "/audio/setar/n16.mp3", "freq": 466.5, "fret": 16}, {"file": "/audio/setar/n17.mp3", "freq": 501.15, "fret": 17}, {"file": "/audio/setar/n18.mp3", "freq": 526.22, "fret": 18}, {"file": "/audio/setar/n19.mp3", "freq": 548.26, "fret": 19}, {"file": "/audio/setar/n20.mp3", "freq": 569.12, "fret": 20}, {"file": "/audio/setar/n21.mp3", "freq": 587.96, "fret": 21}, {"file": "/audio/setar/n22.mp3", "freq": 624.13, "fret": 22}, {"file": "/audio/setar/n23.mp3", "freq": 659.25, "fret": 23}, {"file": "/audio/setar/n24.mp3", "freq": 700.5, "fret": 24}, {"file": "/audio/setar/n25.mp3", "freq": 730.45, "fret": 25}];

export const INTERLUDES = [
  {
    "file": "/audio/music/segah-setar.mp3",
    "title": "بداهه در سه‌گاه، سه‌تار",
    "duration": 45.45
  }
];
