"use client";

/**
 * src/game/usePersistence.ts — بارگذاری/ذخیره‌ی آفلاین‌فِرست به‌صورت یک هوک (P5.10)
 *  • بارگذاری با «درمان»: سیوِ خراب قفل ابدی نمی‌سازد؛ پشتیبانِ چرخشی خودکار جایگزین می‌شود
 *  • جبرانِ زمانِ غیاب (حداکثر ۲ ساعت) + گزارش صادقانه‌ی «در غیاب شما»
 *  • ذخیره‌ی خودکار هر ۱۲ ثانیه و هنگام خروج؛ صفِ آفلاین با برگشت اینترنت خالی می‌شود
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { newState, tick, type State } from "./logic";
import { fmt } from "./data";
import { readLocalWithBackup, readIdbSave, fetchCloudSave, ensurePlayerId, pickNewer, restoreQuarantined } from "./persist";
import { saveGame, flushOutbox, useOnline, hasPendingSave, type SaveState } from "./net";
import { SILENT, type ToastFn } from "./events";
import { game } from "./store";

export interface AwayReport {
  minutes: number;
  coins: number;
  xp: number;
  levels: number;
  ready: number;
  days: number;
}

const MAX_AWAY_SECONDS = 7200;

const snap = (st: State) => ({
  coins: st.coins,
  xp: st.xp,
  level: st.level,
  day: st.day,
  ready: st.tiles.reduce((a, t) => a + (t.crop && (t.g || 0) >= 1 ? 1 : 0), 0),
});

/** جبران زمانِ غیاب؛ اگر اتفاق معناداری افتاده باشد، گزارش برمی‌گرداند. */
export function catchUp(s: State, now = Date.now()): AwayReport | null {
  const elapsed = Math.min(MAX_AWAY_SECONDS, Math.max(0, (now - s.savedAt) / 1000));
  const before = snap(s);
  for (let t = 0; t < elapsed; t += 5) tick(s, Math.min(5, elapsed - t), SILENT);
  if (elapsed <= 60) return null;
  const after = snap(s);
  const rep: AwayReport = {
    minutes: Math.round(elapsed / 60),
    coins: after.coins - before.coins,
    xp: after.xp - before.xp,
    levels: after.level - before.level,
    ready: after.ready - before.ready,
    days: after.day - before.day,
  };
  return rep.coins || rep.xp || rep.ready || rep.levels || rep.days > 0 ? rep : null;
}

export function usePersistence(toast: ToastFn) {
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("");
  const [saveIssue, setSaveIssue] = useState("");
  const [canRestore, setCanRestore] = useState(false);
  const [away, setAway] = useState<AwayReport | null>(null);
  const online = useOnline();
  const pid = useRef("");

  // بارگذاری — هیچ خطایی در این مسیر نباید بازی را قفل کند (P5.1)
  useEffect(() => {
    const id = ensurePlayerId();
    pid.current = id;
    let alive = true;
    (async () => {
      let s: State | null = null;
      let issue = "";
      let restorable = false;
      try {
        // مورد ۳: localStorage، IndexedDB و ابر؛ تازه‌ترینِ سالم برنده است
        const [durable, cloud] = await Promise.all([readIdbSave(), fetchCloudSave(id)]);
        const picked = pickNewer(pickNewer(readLocalWithBackup(), durable), cloud);
        s = picked.state;
        issue = picked.corrupt ? picked.note : "";
        // دکمه‌ی «بازیابی» فقط وقتی نشان داده می‌شود که واقعاً کار کند
        restorable = picked.corrupt && !picked.state && !!restoreQuarantined().state;
      } catch {
        s = null; // حتی اگر چیزی غیرمنتظره ترکید، بازی تازه بالا می‌آید
        issue = "سیو خوانده نشد؛ بازی تازه شروع شد";
      }
      let rep: AwayReport | null = null;
      try {
        if (s) rep = catchUp(s);
      } catch {
        s = null;
      }
      if (!alive) return;
      game.set(s || newState());
      setSaveIssue(issue);
      setCanRestore(restorable);
      setReady(true);
      if (rep) {
        setAway(rep);
        const minutes = rep.minutes;
        setTimeout(() => toast(`خوش آمدی! ${fmt(minutes)} دقیقه مزرعه‌ات بی‌تو کار کرد`, "ok"), 800);
      }
    })();
    return () => {
      alive = false;
    };
  }, [toast]);

  // ذخیره — اول محلی، سپس ابری؛ شکستِ شبکه به «صف» می‌رود
  const save = useCallback(async () => {
    const s = game.get();
    if (!s) return;
    s.savedAt = Date.now();
    setSaveState("saving");
    setSaveState(await saveGame(pid.current, s));
  }, []);

  useEffect(() => {
    if (!ready) return;
    const iv = setInterval(save, 12000);
    const onHide = () => void save();
    window.addEventListener("beforeunload", onHide);
    return () => {
      clearInterval(iv);
      window.removeEventListener("beforeunload", onHide);
    };
  }, [ready, save]);

  // اینترنت برگشت → صفِ ذخیره خالی شود (حالت واقعی: ابری یا فقط محلی)
  useEffect(() => {
    if (!ready || !online || !hasPendingSave()) return;
    void flushOutbox().then((mode) => {
      if (mode) setSaveState(mode);
    });
  }, [ready, online]);

  /** بازیابی سیوِ قرنطینه‌شده (فقط وقتی داده‌اش واقعاً سالم باشد). */
  const recoverFromBackup = useCallback(() => {
    const out = restoreQuarantined();
    if (out.state) {
      game.set(out.state);
      setSaveIssue("");
      setCanRestore(false);
      toast("مزرعه‌ات از نسخه‌ی پشتیبان بازیابی شد", "ok");
      void save();
    } else {
      toast("پشتیبان قابل بازیابی نبود؛ همین بازی ادامه می‌یابد", "err");
    }
  }, [toast, save]);

  return {
    ready,
    online,
    saveState,
    save,
    saveIssue,
    dismissIssue: () => setSaveIssue(""),
    canRestore,
    recoverFromBackup,
    away,
    dismissAway: () => setAway(null),
  };
}

export type Persistence = ReturnType<typeof usePersistence>;
