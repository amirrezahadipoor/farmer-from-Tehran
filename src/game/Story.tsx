"use client";

/**
 * src/game/Story.tsx — داستانِ اصلی: دروازه‌ی نام، پرده‌ی پایان و صحنه‌ها
 * نمایشِ صحنه در StoryStage.tsx است (مشترک با فصل‌های نسل، P6.4).
 */

import { currentChapter, sceneText, goalProgress, isStoryFinished } from "./story";
import type { State } from "./logic";
import { Icon } from "./icons";
import { NameGate, StoryStage } from "./StoryStage";

interface Props {
  s: State;
  onAdvance: () => void;
  onName: (n: string) => void;
  onClose: () => void;
  refresh: () => void;
}

export default function Story({ s, onAdvance, onName, onClose, refresh }: Props) {
  const ch = currentChapter(s);
  const st = s.story;
  const isEnd = st.phase === "end";
  const scenes = isEnd ? ch.endScenes : ch.scenes;
  const scene = scenes[Math.min(st.sceneIdx, scenes.length - 1)];

  // Name entry gate at the very start
  if (!st.name) {
    return (
      <NameGate
        portrait="grandpa"
        title="پیش از آغاز داستان"
        text="نامت را بنویس. این نام در وصیت‌نامه‌ی بابابزرگ، روی سندِ دره زرین و در خاطره‌ی اهالی دهکده می‌ماند."
        placeholder="مثلاً: امید"
        label="نامِ تو"
        button="آغاز داستان"
        onSubmit={(n) => { onName(n); refresh(); }}
      />
    );
  }

  if (!scene) {
    return (
      <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-950/90 p-6" dir="rtl">
        <div className="max-w-lg rounded-3xl border-4 border-amber-400/60 bg-amber-50 p-7 text-center shadow-2xl">
          <div className="flex justify-center"><Icon name="trophy" size={72} /></div>
          <h2 className="mt-2 text-2xl font-black text-amber-950">داستانِ دره زرین کامل شد</h2>
          <p className="mt-3 text-sm font-bold leading-7 text-amber-900">
            تو از یک کارمندِ اخراج‌شده به کشاورزی تبدیل شدی که اسمش روی سندِ یک دره است. حالا می‌توانی با «تناسخ مزرعه» زمین را به نسلِ بعد بسپاری و داستان را از نو، ولی قدرتمندتر، آغاز کنی.
          </p>
          <button onClick={onClose} className="mt-5 w-full rounded-2xl bg-emerald-600 py-3 text-lg font-black text-white shadow-lg">بازگشت به مزرعه</button>
        </div>
      </div>
    );
  }

  return (
    <StoryStage
      ch={ch}
      isEnd={isEnd}
      sceneIdx={st.sceneIdx}
      render={(t) => sceneText(t, st.name)}
      progress={ch.goal ? goalProgress(s, ch) : null}
      banner={isStoryFinished(s) ? "پایانِ باز — داستان با هر تناسخ ادامه دارد" : undefined}
      onAdvance={() => { onAdvance(); refresh(); }}
      onClose={onClose}
    />
  );
}
