"use client";

/**
 * src/game/Game.tsx — ریشه‌ی بازی (P5.10: از ۲۱۸۰ خط به یک ترکیب‌کننده‌ی کوچک)
 *
 * نقشه‌ی ماژول‌ها:
 *   store.ts ............ وضعیت بیرون از React + useGame (useSyncExternalStore)
 *   loop.ts ............. حلقه‌ی ۶۰ فریم، سازگارسازی رزولوشن، راه‌روندگان
 *   usePersistence.ts ... بارگذاری/ذخیره‌ی آفلاین‌فِرست، پشتیبان، گزارش غیاب
 *   useCanvasInput.ts ... ضربه/کشیدن/زوم/نگه‌داشتن روی نقشه
 *   events.ts, audio.ts . پیام/افکت/صدا
 *   ui/* ................ HUD، نوار ابزار، لایه‌ها، شیت پنل‌ها و ۱۲ پنل
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { addXp, setPlayerName, setStoryShown, type State } from "./logic";
import StoryModal from "./Story";
import { ItemIcon } from "./icons";
import { advanceStory } from "./story";
import { readLS, writeLS, dropLS } from "./persist";
import { registerServiceWorker, prefetchStoryArt, STORY_ART_URLS } from "./net";
import { haptic, isFullscreen, useAppViewportVar, useFullscreenState, useNativeGestureGuards, useWakeLock, lockOrientation } from "./mobile";
import { sound } from "./audio";
import { makeEvents } from "./events";
import { startGameLoop } from "./loop";
import { game, rt, useGameVersion } from "./store";
import { usePersistence } from "./usePersistence";
import { useCanvasInput } from "./useCanvasInput";
import type { Panel, UiApi } from "./ui/common";
import Hud, { CameraControls } from "./ui/Hud";
import Toolbar, { SeedTray } from "./ui/Toolbar";
import { Toasts, useToasts, SaveIssueBanner, Onboarding, AwayCard, MainMenu } from "./ui/Overlays";
import Sheet from "./ui/Sheet";
import Splash from "./ui/Splash";
import { portraitLockPref } from "./ui/panels/Settings";

function Loading() {
  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-b from-sky-500 via-emerald-600 to-amber-700 text-white">
      <div className="text-center">
        <div className="flex animate-bounce justify-center">
          <ItemIcon id="sunflower" size={88} />
        </div>
        <p className="mt-4 text-2xl font-black">در حال بارگذاری دنیای مزرعه طلایی...</p>
      </div>
    </div>
  );
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // بازگشت به بازی: اگر قبلاً شروع کرده‌ای، اسپلش رد می‌شود (رفتار یک اپ نصب‌شده)
  const [started, setStarted] = useState(() => readLS("farm_started") === "1");
  const [tool, setTool] = useState("hand");
  const [seed, setSeed] = useState("wheat");
  const [bsel, setBsel] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { toasts, toast } = useToasts();

  // ── لایه‌ی موبایل: بستن ژست‌های مرورگر، ارتفاع درست، تمام‌صفحه، بیداری صفحه
  useNativeGestureGuards();
  useAppViewportVar();
  const fs = useFullscreenState();
  useWakeLock(started);

  const ev = useMemo(() => makeEvents(toast), [toast]);
  const { ready, online, saveState, save, saveIssue, dismissIssue, canRestore, recoverFromBackup, away, dismissAway } = usePersistence(toast);
  useGameVersion(); // هر تغییر وضعیت (حداکثر ۴ بار در ثانیه) UI را تازه می‌کند

  // ── قلاب تست خودکار (E2E): وضعیت بازی برای Playwright قابل‌خواندن است
  useEffect(() => {
    (window as unknown as { __game?: unknown }).__game = {
      version: 2,
      getState: () => game.get(),
      setState: (next: State) => game.set(next),
      give: (coins: number, xp = 0) => {
        const st = game.get();
        if (!st) return null;
        st.coins += coins;
        if (xp) addXp(st, xp, ev);
        game.bump();
        return { coins: st.coins, level: st.level, xp: st.xp };
      },
      toast,
      view: () => rt.view,
      save: () => save(),
    };
  }, [toast, ev, save]);

  // ── لایه‌ی آفلاین: Service Worker + پیش‌کش آرت داستان
  useEffect(
    () =>
      registerServiceWorker((e) => {
        if (e === "update") toast("🔄 نسخه‌ی تازه آماده است؛ با بستن و باز کردن اپ فعال می‌شود", "info");
      }),
    [toast]
  );
  useEffect(() => {
    if (ready) prefetchStoryArt(STORY_ART_URLS);
  }, [ready]);

  // ── حلقه‌ی بازی
  useEffect(() => {
    const cv = canvasRef.current;
    if (!ready || !cv) return;
    return startGameLoop(cv, () => ev);
  }, [ready, ev]);

  useEffect(() => {
    rt.view.tool = tool;
    rt.view.arg = tool === "seed" ? seed : tool === "build" ? bsel : "";
  }, [tool, seed, bsel]);

  const { canvasHandlers } = useCanvasInput({ tool, seed, bsel, ev, setPanel, setTool, setBsel });

  const s = game.get();
  if (!ready || !s) return <Loading />;

  const ui: UiApi = { ev, toast, setPanel, setTool, setBsel, bsel, save };

  const onStart = () => {
    haptic("big");
    if (!isFullscreen()) void fs.toggle(); // اول تجربه‌ی تمام‌صفحه، بعد داستان
    if (portraitLockPref()) void lockOrientation("portrait");
    writeLS("farm_started", "1");
    setStarted(true);
    setStoryShown(s, true);
    game.bump();
    sound("lvl");
  };

  const onReset = () => {
    setPanel(null);
    setTool("hand");
    setBsel("");
    dropLS("farm_started");
    setStarted(false);
  };

  const inGame = started && !s.story.shown;

  return (
    <div className="relative select-none overflow-hidden" dir="rtl" style={{ height: "var(--app-h, 100dvh)", width: "100vw" }}>
      {/* نقشه‌ی ۲.۵بعدی */}
      <canvas ref={canvasRef} className="absolute inset-0 touch-none select-none" aria-label="نقشه‌ی مزرعه" role="img" {...canvasHandlers} />

      <CameraControls />
      <Hud s={s} panel={panel} setPanel={setPanel} openMenu={() => setMenuOpen(true)} saveState={saveState} online={online} />
      {tool === "seed" && <SeedTray s={s} seed={seed} setSeed={setSeed} />}
      <Toolbar tool={tool} seed={seed} setTool={setTool} setPanel={setPanel} />
      <Toasts toasts={toasts} />

      {saveIssue && inGame && <SaveIssueBanner issue={saveIssue} canRestore={canRestore} onRestore={recoverFromBackup} onDismiss={dismissIssue} />}
      {inGame && !!s.story.name && <Onboarding onDone={() => toast("🌱 حالا خودت زمین را بساز؛ من همین‌جا تماشا می‌کنم", "ok")} />}
      {away && started && <AwayCard away={away} onClose={dismissAway} />}

      {menuOpen && (
        <MainMenu
          s={s}
          onClose={() => setMenuOpen(false)}
          onPick={(p) => {
            setMenuOpen(false);
            setPanel(p);
          }}
        />
      )}

      {panel && <Sheet s={s} panel={panel} ui={ui} settings={{ saveState, online, fs, onReset }} />}

      {!started && <Splash s={s} onStart={onStart} />}

      {/* پرده‌ی سینمایی داستان */}
      {started && s.story.shown && (
        <StoryModal
          s={s}
          onAdvance={() => advanceStory(s, ev)}
          onName={(n) => setPlayerName(s, n)}
          onClose={() => {
            setStoryShown(s, false);
            game.bump();
          }}
          refresh={() => game.bump()}
        />
      )}
    </div>
  );
}
