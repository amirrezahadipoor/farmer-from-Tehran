"use client";

/**
 * src/game/LineageStory.tsx — پرده‌ی فصل‌های نسل (P6.4)
 * پیش از فصل نامِ وارث پرسیده می‌شود (پیشنهادِ پیش‌فرض دارد)؛ بعد همان صحنه‌ی سینماییِ داستانِ اصلی.
 */

import { currentHeir, lineageChain, joinFa, prevName, suggestHeirName, type State } from "./logic";
import { lineageChapter, lineageProgress, ordinalFa } from "./lineageStory";
import { NameGate, StoryStage } from "./StoryStage";
import type { Gender } from "./gender";

interface Props {
  s: State;
  onAdvance: () => void;
  onName: (n: string, g: Gender) => void;
  onClose: () => void;
  refresh: () => void;
}

export default function LineageStory({ s, onAdvance, onName, onClose, refresh }: Props) {
  const L = s.lineage;
  const h = currentHeir(s);
  const ch = lineageChapter(s);
  if (!L || !h || !ch) return null;

  if (L.phase === "name") {
    return (
      <NameGate
        key={h.gen}
        portrait="notary"
        title={`وارثِ نسلِ ${ordinalFa(h.gen + 1)}`}
        text={`${prevName(s)} کلید را روی میزِ ایوان گذاشت. نامِ وارث را بنویس؛ این نام کنارِ ${joinFa(lineageChain(s))} روی تنه‌ی گردوی پیر کنده می‌شود.`}
        initial={h.name || suggestHeirName(h.gen)}
        placeholder={`مثلاً: ${suggestHeirName(h.gen)}`}
        label="نامِ وارث"
        button="سپردنِ کلید"
        withGender
        initialGender="n"
        onSubmit={(n, g) => { onName(n, g); refresh(); }}
      />
    );
  }

  const isEnd = L.phase === "end";
  return (
    <StoryStage
      ch={ch}
      isEnd={isEnd}
      sceneIdx={L.sceneIdx}
      progress={lineageProgress(s)}
      banner={isEnd ? undefined : `نسلِ ${ordinalFa(h.gen + 1)} دره زرین`}
      onAdvance={() => { onAdvance(); refresh(); }}
      onClose={onClose}
      gender={s.story.gender}
    />
  );
}
