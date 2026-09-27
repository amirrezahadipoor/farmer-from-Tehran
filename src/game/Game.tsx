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
 *   StoryOverlays.tsx ... پرده‌های داستان و فصل‌های نسل (P6.4)
 *   ui/* ................ HUD، نوار ابزار، لایه‌ها، شیت پنل‌ها و ۱۲ پنل
 *
 * بارگذاریِ اول (P6.5، Lighthouse ≥ ۹۵): اسپلش و صفحه‌ی بارگذاری در HTMLِ ایستا هستند و
 * اسکریپتِ سرِ صفحه (layout.tsx) پیش از نقاشی یکی را نشان می‌دهد. حلقه‌ی رندر، رندررها، شیتِ
 * پنل‌ها و پرده‌های داستان تکه‌های جدا هستند و تا «آغاز» (یا بازگشتِ بازیکن) بار و اجرا نمی‌شوند؛
 * پشتِ اسپلش هیچ فریمی کشیده نمی‌شود.
 */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { addXp, setStoryShown, type State } from "./logic";
import { lineageVisible } from "./lineageStory";
import { readLS, writeLS, dropLS } from "./persist";
import { registerServiceWorker, prefetchStoryArt, STORY_ART_URLS } from "./net";
import { haptic, isFullscreen, useAppViewportVar, useFullscreenState, useNativeGestureGuards, useWakeLock, lockOrientation } from "./mobile";
import { armAudio, audioDebug, sound } from "./audio";
import { makeEvents } from "./events";
import { game, rt, useGameVersion } from "./store";
import { usePersistence } from "./usePersistence";
import { useCanvasInput } from "./useCanvasInput";
import type { Panel, UiApi } from "./ui/common";
import Hud, { CameraControls } from "./ui/Hud";
import Toolbar, { SeedTray } from "./ui/Toolbar";
import { Toasts, useToasts, SaveIssueBanner, AwayCard, MainMenu } from "./ui/Overlays";
import { Tour } from "./ui/Tour";
import Splash from "./ui/Splash";
import Loading from "./ui/Loading";
import { SkyLayers, TintLayers } from "./ui/ScreenLayers";
import { portraitLockPref } from "./ui/panels/Settings";
import { fatalStore, installGlobalErrorHandlers, raiseFatal } from "./errors";
import { requestPersistence } from "./persist";

// تکه‌های جدا: فقط وقتی لازم شوند بار می‌شوند (و پس از آماده‌شدن در زمانِ بیکاری پیش‌بار)
const loadSheet = () => import("./ui/Sheet");
const loadStory = () => import("./StoryOverlays");
const Sheet = dynamic(loadSheet, { ssr: false });
const StoryOverlays = dynamic(loadStory, { ssr: false });

/**
 * «بازی را شروع کرده؟» — در HTMLِ ایستا و هنگامِ هیدریت نامعلوم (null) است تا خروجیِ سرور و
 * اولین رندرِ کاربر یکی باشد؛ بلافاصله بعد از آن از localStorage خوانده می‌شود. نسخه‌ی حافظه
 * نگه داشته می‌شود تا اگر localStorage در دسترس نبود (حالتِ خصوصی) «آغاز» باز هم کار کند.
 */
let startedMem: boolean | null = null;
const startedSubs = new Set<() => void>();
const startedStore = {
  subscribe(cb: () => void) {
    startedSubs.add(cb);
    return () => void startedSubs.delete(cb);
  },
  get: (): boolean | null => startedMem ?? readLS("farm_started") === "1",
  server: (): boolean | null => null,
  set(v: boolean) {
    startedMem = v;
    if (v) writeLS("farm_started", "1");
    else dropLS("farm_started");
    startedSubs.forEach((f) => f());
  },
};

/** زمانِ بیکاریِ مرورگر (با جایگزین برای سافاری) */
function whenIdle(fn: () => void, timeout = 3000) {
  const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (h: number) => void };
  if (w.requestIdleCallback) {
    const h = w.requestIdleCallback(fn, { timeout });
    return () => w.cancelIdleCallback?.(h);
  }
  const h = window.setTimeout(fn, 600);
  return () => window.clearTimeout(h);
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // بازگشت به بازی: اگر قبلاً شروع کرده‌ای، اسپلش رد می‌شود (رفتار یک اپ نصب‌شده)
  const started = useSyncExternalStore(startedStore.subscribe, startedStore.get, startedStore.server);
  const [tool, setTool] = useState("hand");
  const [seed, setSeed] = useState("wheat");
  const [bsel, setBsel] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { toasts, toast } = useToasts();
  // مورد ۴: خطای ماندگارِ حلقه‌ی رندر به ErrorBoundary می‌رسد (صفحه‌ی بازیابی به‌جای بازیِ یخ‌زده)
  const fatal = useSyncExternalStore(fatalStore.subscribe, fatalStore.get, fatalStore.server);
  if (fatal) throw fatal;
  useEffect(() => installGlobalErrorHandlers(), []);
  // مورد ۳: بعد از «آغاز»، حافظه‌ی ماندگار درخواست می‌شود تا مرورگر سیو را خودکار پاک نکند
  useEffect(() => {
    if (started === true) void requestPersistence();
  }, [started]);

  // ── لایه‌ی موبایل: بستن ژست‌های مرورگر، ارتفاع درست، تمام‌صفحه، بیداری صفحه
  useNativeGestureGuards();
  useAppViewportVar();
  const fs = useFullscreenState();
  useWakeLock(started === true);

  const ev = useMemo(() => makeEvents(toast), [toast]);
  const { ready, online, saveState, save, saveIssue, dismissIssue, canRestore, recoverFromBackup, away, dismissAway } = usePersistence(toast);
  useGameVersion(); // هر تغییر وضعیت (حداکثر ۴ بار در ثانیه) UI را تازه می‌کند

  // ── قلاب تست خودکار (E2E): وضعیت بازی برای Playwright قابل‌خواندن است؛ فقط در توسعه و بیلدِ تست (مورد ۶)
  useEffect(() => {
    if (process.env.GVF_TEST_HOOKS !== "1") return;
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
      // رندررها تکه‌ی جدا هستند؛ page.evaluate قولِ برگشتی را صبر می‌کند
      perf: async () => ({ ...rt.stats, ...(await import("./render/scene")).renderStats(), dpr: rt.view.dpr }),
      lockDpr: (d: number | null) => {
        rt.dprLock = d;
      },
      save: () => save(),
      openPanel: (p: Panel) => setPanel(p),
      audio: audioDebug,
      crash: () => raiseFatal(new Error("آزمونِ مرزِ خطا (تستِ خودکار)")),
    };
  }, [toast, ev, save]);

  // ── لایه‌ی آفلاین: Service Worker + پیش‌کش آرت داستان
  useEffect(
    () =>
      registerServiceWorker((e) => {
        if (e === "update") toast("نسخه‌ی تازه آماده است؛ با بستن و باز کردن اپ فعال می‌شود", "info");
      }),
    [toast]
  );
  useEffect(() => {
    if (ready) prefetchStoryArt(STORY_ART_URLS);
  }, [ready]);
  // تکه‌های بعدی را در بیکاری پیش‌بار کن: پشتِ اسپلش فقط داستان (بلافاصله بعد از «آغاز» لازم است)،
  // در بازی شیتِ پنل‌ها (با اولین پنل لازم می‌شود)
  useEffect(() => {
    if (!ready) return;
    return whenIdle(() => void (started === true ? loadSheet() : loadStory()));
  }, [ready, started]);
  // صدا با اولین لمس بیدار می‌شود و در تبِ پنهان می‌خوابد (P5.12)
  useEffect(() => armAudio(), []);

  // ── حلقه‌ی بازی: فقط بعد از «آغاز» — پشتِ اسپلش نه نقشه ساخته می‌شود نه فریمی کشیده (P6.5)
  useEffect(() => {
    const cv = canvasRef.current;
    if (!ready || started !== true || !cv) return;
    let stop: (() => void) | undefined;
    let alive = true;
    void import("./loop").then(({ startGameLoop }) => {
      if (alive) stop = startGameLoop(cv, () => ev);
    });
    return () => {
      alive = false;
      stop?.();
    };
  }, [ready, started, ev]);

  useEffect(() => {
    rt.view.tool = tool;
    rt.view.arg = tool === "seed" ? seed : tool === "build" ? bsel : "";
  }, [tool, seed, bsel]);

  const { canvasHandlers } = useCanvasInput({ tool, seed, bsel, ev, setPanel, setTool, setBsel });

  const s = ready ? game.get() : null;
  // پرده‌ی تمام‌صفحه‌ی داستان روی نقشه است: رندر لازم نیست (P6.6)
  const covered = !!s && started === true && (s.story.shown || lineageVisible(s));
  useEffect(() => {
    rt.view.covered = covered;
  }, [covered]);

  const ui: UiApi = { ev, toast, setPanel, setTool, setBsel, bsel, save };

  const onStart = () => {
    if (!s) return;
    haptic("big");
    if (!isFullscreen()) void fs.toggle(); // اول تجربه‌ی تمام‌صفحه، بعد داستان
    if (portraitLockPref()) void lockOrientation("portrait");
    startedStore.set(true);
    setStoryShown(s, true);
    game.bump();
    sound("start");
  };

  const onReset = () => {
    setPanel(null);
    setTool("hand");
    setBsel("");
    startedStore.set(false);
  };

  const showLineage = !!s && started === true && lineageVisible(s);
  const inGame = !!s && started === true && !s.story.shown && !showLineage;


  // SSR و هیدریت (started = null): هر دو پوسته در HTML هستند و CSSِ html[data-boot] یکی را نشان می‌دهد
  const boot = started === null;
  return (
    <div className="relative select-none overflow-hidden" dir="rtl" style={{ height: "var(--app-h, 100dvh)", width: "100vw" }}>
      {/* نقشه‌ی ۲.۵بعدی: آسمان زیرِ بوم و رنگ‌های صفحه‌ای رویش لایه‌ی CSS هستند (P6.6) */}
      <SkyLayers withImage={!!s && started === true} />
      <canvas ref={canvasRef} className="absolute inset-0 touch-none select-none" aria-label="نقشه‌ی مزرعه" role="img" {...canvasHandlers} />
      <TintLayers />

      {/* رابطِ بازی فقط بعد از «آغاز»: پشتِ اسپلش دیده نمی‌شود و ساختنش بارگذاریِ اول را کند می‌کرد */}
      {s && started === true && (
        <>
          <CameraControls />
          <Hud s={s} panel={panel} setPanel={setPanel} openMenu={() => setMenuOpen(true)} saveState={saveState} online={online} />
          {tool === "seed" && <SeedTray s={s} seed={seed} setSeed={setSeed} />}
          <Toolbar tool={tool} seed={seed} setTool={setTool} setPanel={setPanel} />

          {saveIssue && inGame && <SaveIssueBanner issue={saveIssue} canRestore={canRestore} onRestore={recoverFromBackup} onDismiss={dismissIssue} />}
          {inGame && !!s.story.name && (
            <Tour s={s} tool={tool} panelOpen={!!panel} marketOpen={panel === "market"} onDone={() => toast("حالا خودت زمین را بساز؛ من همین‌جا تماشا می‌کنم", "ok")} />
          )}
          {away && <AwayCard away={away} onClose={dismissAway} />}

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
        </>
      )}
      <Toasts toasts={toasts} />

      {/* تازه‌وارد: اسپلش (دکمه تا آماده‌شدنِ وضعیت غیرفعال) · بازیکنِ برگشتی: صفحه‌ی بارگذاری */}
      {started !== true && <Splash s={s} onStart={s ? onStart : undefined} className={boot ? "boot-new" : ""} />}
      {started !== false && !s && <Loading className={boot ? "boot-back" : ""} />}

      {/* پرده‌های داستان: داستانِ اصلی، و پس از هر تناسخ فصلِ نسل (P6.4) */}
      {s && started === true && <StoryOverlays s={s} ev={ev} />}
    </div>
  );
}
