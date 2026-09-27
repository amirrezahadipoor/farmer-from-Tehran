"use client";

/**
 * src/game/StoryOverlays.tsx — پرده‌های داستان روی بازی
 * داستانِ اصلی اولویت دارد؛ فصلِ نسل (P6.4) پشتِ آن صبر می‌کند تا همان ثانیه‌ای که تناسخ
 * هدفِ فصلِ ۱۰ را کامل می‌کند، اول صحنه‌ی پایانیِ داستانِ اصلی دیده شود (lineageVisible).
 */

import { setPlayerName, setStoryShown, type Events, type State } from "./logic";
import { advanceStory } from "./story";
import { advanceLineage, lineageVisible, nameHeir, setLineageShown } from "./lineageStory";
import { game } from "./store";
import StoryModal from "./Story";
import LineageModal from "./LineageStory";
import Festival from "./Festival";

export default function StoryOverlays({ s, ev }: { s: State; ev: Events }) {
  const refresh = () => game.bump();
  if (s.story.shown) {
    return (
      <StoryModal
        s={s}
        onAdvance={() => advanceStory(s, ev)}
        onName={(n, g) => setPlayerName(s, n, g)}
        onClose={() => {
          setStoryShown(s, false);
          refresh();
        }}
        refresh={refresh}
      />
    );
  }
  // V.5: پرده‌ی فستیوال فصلی — داستان و نسل اولویت دارند، فستیوال منتظر می‌ماند
  if (s.fest && s.fest.choice === null && !s.story.shown && !lineageVisible(s)) {
    return <Festival s={s} ev={ev} />;
  }
  if (lineageVisible(s)) {
    return (
      <LineageModal
        s={s}
        onAdvance={() => advanceLineage(s, ev)}
        onName={(n, g) => nameHeir(s, n, g)}
        onClose={() => {
          setLineageShown(s, false);
          refresh();
        }}
        refresh={refresh}
      />
    );
  }
  return null;
}
