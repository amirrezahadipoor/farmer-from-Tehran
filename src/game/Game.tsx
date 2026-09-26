"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  BUILDINGS,
  BMAP,
  CROPS,
  CMAP,
  ITEMS,
  NPCS,
  WORKERS,
  WorkerKind,
  N,
  DAY_LEN,
  xpFor,
  fmt,
  FERT_COST,
  HOE_COST,
  TECH_TREE,
  ACHIEVEMENTS,
  CONTRACTS,
  SEASONS,
  TechItem,
  SKILLS,
  SkillItem,
  BuildingDef,
} from "./data";
import {
  State,
  Fx,
  Events,
  newState,
  addXp,
  tick,
  toolAction,
  capacity,
  invCount,
  price,
  sell,
  fulfill,
  queueRecipe,
  collect,
  hire,
  has,
  buildCost,
  countB,
  migrate,
  idx,
  locked,
  expandCost,
  unlockTech,
  claimContract,
  canPrestige,
  doPrestige,
  learnSkill,
  decorCost,
  canBuildDecor,
} from "./logic";
import { render, screenToTile, tileCenter, lightInfo, View, Walker } from "./render";
import StoryModal from "./Story";
import { Icon, ItemIcon, Portrait, npcSvg, workerSvg, techIcon, skillIcon, achIcon, stripEmoji, EMOJI_RE } from "./icons";
import { drawBuildingThumb } from "./render";
import { CHAPTERS, currentChapter, goalProgress, updateStory, advanceStory, isStoryFinished } from "./story";
import {
  haptic,
  isFullscreen,
  setHaptics,
  hapticsEnabled,
  useAppViewportVar,
  useFullscreenState,
  useNativeGestureGuards,
  useWakeLock,
  lockOrientation,
  unlockOrientation,
} from "./mobile";
/** ثبت اشاره‌گر با گارد: در بعضی مرورگرها/رویدادهای مصنوعی خطای NotFoundError می‌دهد. */
function capturePointer(el: Element | null, pointerId: number) {
  try {
    (el as HTMLElement | null)?.setPointerCapture?.(pointerId);
  } catch {
    /* اشاره‌گر دیگر فعال نیست؛ کنترل کشیدن را با رویدادهای بعدی از دست نمی‌دهیم */
  }
}

import {
  saveGame,
  flushOutbox,
  useOnline,
  registerServiceWorker,
  prefetchStoryArt,
  STORY_ART_URLS,
  hasPendingSave,
  type SaveState,
} from "./net";

type Panel =
  | null
  | "market"
  | "orders"
  | "build"
  | "decor"
  | "skills"
  | "story"
  | "biz"
  | "tech"
  | "contracts"
  | "achievements"
  | "help"
  | "settings"
  | { bx: number; by: number };

interface Toast {
  id: number;
  m: string;
  t: string;
}

const UI = {
  market: "بازار",
  orders: "سفارش",
  biz: "مدیریت",
  skills: "مهارت",
  tech: "تحقیق",
  decor: "دکور",
  contracts: "قرارداد",
  achievements: "جوایز",
  help: "راهنما",
  story: "داستان",
  hand: "دست",
  seed: "کاشت",
  water: "آب",
  fert: "کود",
  hoe: "شخم",
  build: "ساخت",
  clear: "پاکسازی",
} as const;

let audioCtx: AudioContext | null = null;
let soundOn = true;
export function setSoundOn(v: boolean) {
  soundOn = v;
  try { localStorage.setItem("farm_sound", v ? "1" : "0"); } catch { /* ignore */ }
}
function sound(k: string) {
  if (!soundOn) return;
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const ac = audioCtx;
    const notes: Record<string, number[]> = {
      harvest: [660, 880],
      plant: [440],
      coin: [988, 1319],
      dig: [180, 140],
      water: [520, 600, 700],
      lvl: [523, 659, 784, 1047],
      build: [262, 330, 392],
      err: [200, 150],
      click: [800],
    };
    (notes[k] || [600]).forEach((f, i) => {
      const o = ac.createOscillator(),
        g = ac.createGain();
      o.type = k === "dig" || k === "err" ? "triangle" : "sine";
      o.frequency.value = f;
      const t0 = ac.currentTime + i * 0.07;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      o.connect(g).connect(ac.destination);
      o.start(t0);
      o.stop(t0 + 0.2);
    });
  } catch {
    /* audio unavailable */
  }
}

function Spark({ data }: { data: number[] }) {
  if (!data || data.length < 2) return null;
  const mn = Math.min(...data),
    mx = Math.max(...data),
    r = mx - mn || 1;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * 80},${22 - ((d - mn) / r) * 20}`).join(" ");
  const up = data[data.length - 1] >= data[data.length - 2];
  return (
    <svg width="80" height="24" className="shrink-0">
      <polyline points={pts} fill="none" stroke={up ? "#22c55e" : "#ef4444"} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

function BuildingThumb({ id, dim, size = 84 }: { id: string; dim?: boolean; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = size * dpr; cv.height = size * dpr;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBuildingThumb(ctx, id, size, size);
    const t = setTimeout(() => { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); drawBuildingThumb(ctx, id, size, size); }, 250);
    return () => clearTimeout(t);
  }, [id, size]);
  return <canvas ref={ref} style={{ width: size, height: size }} className={`mx-auto block ${dim ? "opacity-40 grayscale" : ""}`} />;
}

function LevelRing({ level, pct }: { level: number; pct: number }) {
  const r = 17, cc = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex h-10 w-10 items-center justify-center md:h-11 md:w-11">
      <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="20" cy="20" r={r} fill="#14532d" />
        <circle cx="20" cy="20" r={r} fill="none" stroke="#ffffff33" strokeWidth="4" />
        <circle cx="20" cy="20" r={r} fill="none" stroke="#a3e635" strokeWidth="4" strokeLinecap="round" strokeDasharray={cc} strokeDashoffset={cc * (1 - Math.min(1, pct))} />
      </svg>
      <span className="relative text-sm font-black text-white">{level.toLocaleString("fa-IR")}</span>
    </span>
  );
}

function Pill({ icon, children, onClick, title, className = "" }: { icon: string; children?: React.ReactNode; onClick?: () => void; title?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 items-center gap-1.5 rounded-full bg-white/95 pl-3 pr-1.5 text-[12px] font-black text-amber-950 shadow-lg ring-1 ring-amber-900/10 transition active:scale-95 md:h-11 md:text-sm ${className}`}
    >
      <Icon name={icon} size={26} />
      {children}
    </button>
  );
}

const PANEL_META: Record<string, { icon: string; title: string }> = {
  market: { icon: "market", title: "بازار و انبار" },
  orders: { icon: "orders", title: "سفارش‌ها" },
  build: { icon: "build", title: "ساختمان‌ها و ماشین‌ها" },
  decor: { icon: "decor", title: "دکوراسیون" },
  skills: { icon: "skills", title: "مهارت‌ها" },
  story: { icon: "film", title: "دفتر داستان" },
  biz: { icon: "biz", title: "مدیریت کسب‌وکار" },
  tech: { icon: "tech", title: "تحقیقات" },
  contracts: { icon: "contracts", title: "قراردادها" },
  achievements: { icon: "trophy", title: "دستاوردها" },
  help: { icon: "help", title: "راهنما" },
  settings: { icon: "settings", title: "تنظیمات" },
};

const TOAST_ICON: Record<string, string> = { err: "alert", ok: "check", lvl: "star", prestige: "crown", info: "sparkle" };

const Coin = ({ v, size = 15 }: { v: number | string; size?: number }) => (
  <span className="inline-flex items-center gap-1"><Icon name="coin" size={size} />{typeof v === "number" ? v.toLocaleString("fa-IR") : v}</span>
);

const btn =
  "inline-flex items-center justify-center gap-1 rounded-xl px-3 py-1.5 font-bold shadow-[0_3px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-none transition disabled:opacity-40 disabled:cursor-not-allowed";

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sRef = useRef<State | null>(null);
  const fxRef = useRef<Fx[]>([]);
  const walkersRef = useRef<Map<number, Walker>>(new Map());
  const viewRef = useRef<View>({
    w: 800,
    h: 600,
    dpr: 1,
    cam: { x: 0, y: -14, z: 0.62 },
    hover: null,
    tool: "hand",
    arg: "",
  });

  const [, setTick] = useState(0);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [tool, setTool] = useState("hand");
  const [seed, setSeed] = useState("wheat");
  const [bsel, setBsel] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("");
  const [onboard, setOnboard] = useState(0); // ۰ = بسته، ۱..۳ = گام آموزش اولین‌بار
  const [away, setAway] = useState<null | {
    minutes: number; coins: number; xp: number; levels: number; ready: number; days: number;
  }>(null);
  const [sfx, setSfx] = useState(true);
  const [hapticsState, setHapticsState] = useState(true);
  useWakeLock(started);
  const online = useOnline();
  const pid = useRef("");
  const toastMemo = useRef<{ text: string; at: number }>({ text: "", at: 0 });
  const saveRef = useRef<(() => Promise<void>) | null>(null); // قلاب تست/ذخیره‌ی فوری
  const perf = useRef({ acc: 0, n: 0 }); // سنجش فریم برای سازگارسازی رزولوشن

  // ── لایه‌ی موبایل: تمام‌صفحه، بیداری صفحه، بستن ژست‌های مرورگر، ارتفاع درست
  useNativeGestureGuards();
  useAppViewportVar();
  const fs = useFullscreenState();
  const [vsync, setVsync] = useState(true);

  const toast = useCallback((raw: string, t = "info") => {
    const m = stripEmoji(raw);
    if (!m) return;
    if (t === "err") haptic("error");
    else if (t === "lvl" || t === "prestige") haptic("level");
    else if (t === "ok") haptic("success");
    const now = Date.now();
    if (toastMemo.current.text === m && now - toastMemo.current.at < 1400) return;
    toastMemo.current = { text: m, at: now };
    const id = Math.random();
    setToasts((a) => [...a.filter((x) => x.t !== "err").slice(-1), { id, m, t }]);
    if (t === "err") sound("err");
    setTimeout(() => setToasts((a) => a.filter((x) => x.id !== id)), t === "lvl" || t === "prestige" ? 3600 : 2200);
  }, []);

  const ev: Events = {
    toast,
    sound,
    fx: (gx, gy, text, color = "#fff", burst) => {
      const { x, y } = tileCenter(gx, gy);
      if (text) {
        const emo = text.match(EMOJI_RE);
        const itemId = emo ? Object.keys(ITEMS).find((k) => ITEMS[k].icon === emo[0]) : undefined;
        const clean = stripEmoji(text);
        const icon = itemId ? "item:" + itemId : emo && emo[0] === "💧" ? "ui:water" : emo && emo[0].startsWith("✨") ? "ui:sparkle" : emo && emo[0] === "🪙" ? "ui:coin" : undefined;
        if (clean || icon) fxRef.current.push({ kind: "text", x, y: y - 36, vx: 0, vy: -30, life: 1.4, max: 1.4, text: clean, icon, color });
      }
      if (burst)
        for (let i = 0; i < 14; i++)
          fxRef.current.push({
            kind: i % 3 ? "leaf" : "spark",
            x,
            y: y - 8,
            vx: (Math.random() - 0.5) * 130,
            vy: -70 - Math.random() * 90,
            life: 0.95,
            max: 0.95,
            color: i % 3 ? burst : "#fffde7",
          });
    },
  };
  const evRef = useRef(ev);
  evRef.current = ev;

  // ── قلاب تست خودکار (E2E): وضعیت بازی را برای Playwright قابل‌خواندن می‌کند
  useEffect(() => {
    (window as unknown as { __game?: unknown }).__game = {
      version: 1,
      getState: () => sRef.current,
      setState: (next: State) => {
        sRef.current = next;
        setTick((n) => n + 1);
      },
      give: (coins: number, xp = 0) => {
        const st = sRef.current;
        if (!st) return null;
        st.coins += coins;
        if (xp) addXp(st, xp, evRef.current);
        setTick((n) => n + 1);
        return { coins: st.coins, level: st.level, xp: st.xp };
      },
      toast,
      view: () => viewRef.current,
      save: () => saveRef.current?.(),
    };
  }, [toast]);

  // بازگشت به بازی: اگر قبلاً شروع کرده‌ای، اسپلش را رد کن (رفتار یک اپ نصب‌شده)
  useEffect(() => {
    try {
      if (localStorage.getItem("farm_started") === "1") setStarted(true);
    } catch {
      /* حافظه در دسترس نیست */
    }
  }, []);

  // بازیابی تنظیم لرزش لمسی
  useEffect(() => {
    const h = localStorage.getItem("farm_haptics");
    const on = h !== "0";
    setHaptics(on);
    setHapticsState(on);
  }, []);

  // ── لایه‌ی آفلاین: ثبت Service Worker + پیش‌کش آرت داستان + تخلیه‌ی صف ذخیره
  useEffect(() => {
    const off = registerServiceWorker((e) => {
      if (e === "update") toast("🔄 نسخه‌ی تازه آماده است؛ با بستن و باز کردن اپ فعال می‌شود", "info");
    });
    return off;
  }, [toast]);

  useEffect(() => {
    if (ready) prefetchStoryArt(STORY_ART_URLS); // برای اجرای کامل آفلاین
  }, [ready]);

  useEffect(() => {
    if (!ready || !online || !hasPendingSave()) return;
    void flushOutbox().then((ok) => {
      if (ok) setSaveState("cloud"); // صف خالی شد
    });
  }, [ready, online]);

  // Load game state
  useEffect(() => {
    const pref = localStorage.getItem("farm_sound");
    if (pref === "0") { setSoundOn(false); setSfx(false); }
    let id = localStorage.getItem("farm_pid");
    if (!id) {
      id = "p_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("farm_pid", id);
    }
    pid.current = id;
    const local = localStorage.getItem("farm_save");
    (async () => {
      let data: unknown = null;
      try {
        const r = await fetch(`/api/save?id=${id}`);
        data = (await r.json()).data;
      } catch {
        /* offline */
      }
      let s = migrate(data);
      const ls = local ? migrate(JSON.parse(local)) : null;
      if (ls && (!s || ls.savedAt > s.savedAt)) s = ls;
      if (s) {
        const elapsed = Math.min(7200, (Date.now() - s.savedAt) / 1000);
        const silent: Events = { toast: () => {}, fx: () => {}, sound: () => {} };
        // عکسِ لحظه‌ی قبل از جبران آفلاین‌تایم تا گزارش صادقانه ساخته شود
        const snap = (st: State) => ({
          coins: st.coins,
          xp: st.xp,
          level: st.level,
          day: st.day,
          ready: st.tiles.reduce((a, t) => a + (t.crop && (t.g || 0) >= 1 ? 1 : 0), 0),
        });
        const before = snap(s);
        for (let t = 0; t < elapsed; t += 5) tick(s, Math.min(5, elapsed - t), silent);
        const after = snap(s);
        if (elapsed > 60) {
          const rep = {
            minutes: Math.round(elapsed / 60),
            coins: after.coins - before.coins,
            xp: after.xp - before.xp,
            levels: after.level - before.level,
            ready: after.ready - before.ready,
            days: after.day - before.day,
          };
          // فقط اگر اتفاق معناداری افتاده باشد گزارش نشان بده
          if (rep.coins || rep.xp || rep.ready || rep.levels || rep.days > 0) setAway(rep);
          setTimeout(
            () => toast(`👋 خوش آمدید! ${rep.minutes} دقیقه مزرعه‌ات بی‌تو کار کرد`, "ok"),
            800
          );
        }
      }
      sRef.current = s || newState();
      setReady(true);
    })();
  }, [toast]);

  // Save game state — آفلاین‌فرست: اول محلی، سپس ابری؛ شکستِ شبکه به «صف» می‌رود
  const save = useCallback(async () => {
    const s = sRef.current;
    if (!s) return;
    s.savedAt = Date.now();
    setSaveState("saving");
    const st = await saveGame(pid.current, s);
    setSaveState(st);
  }, []);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  // آموزش تعاملی اولین‌بار (۳ گام، ~۲۰ ثانیه) — جایگزین متن‌های دسکتاپیِ حذف‌شده
  useEffect(() => {
    if (!ready || !started) return;
    try {
      if (localStorage.getItem("farm_onboard") !== "1") setOnboard(1);
    } catch {
      /* حافظه در دسترس نیست */
    }
  }, [ready, started]);

  useEffect(() => {
    if (!ready) return;
    const iv = setInterval(save, 12000);
    const onHide = () => save();
    window.addEventListener("beforeunload", onHide);
    return () => {
      clearInterval(iv);
      window.removeEventListener("beforeunload", onHide);
    };
  }, [ready, save]);

  // Game loop
  useEffect(() => {
    if (!ready) return;
    const cv = canvasRef.current!;
    const ctx = cv.getContext("2d")!;
    let raf = 0,
      last = performance.now(),
      uiAcc = 0,
      lastFrame = performance.now();

    const resize = () => {
      const v = viewRef.current;
      v.dpr = Math.min(2, window.devicePixelRatio || 1);
      v.w = window.innerWidth;
      v.h = window.innerHeight;
      cv.width = v.w * v.dpr;
      cv.height = v.h * v.dpr;
      cv.style.width = v.w + "px";
      cv.style.height = v.h + "px";
      if (v.w < 700) v.cam.z = Math.min(v.cam.z, 0.6);
      v.reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = (t: number) => {
      // ── سازگارسازی خودکار رزولوشن: تا نرمی روی دستگاه ضعیف قربانی نشود
      perf.current.acc += t - lastFrame;
      perf.current.n += 1;
      lastFrame = t;
      if (perf.current.n >= 40) {
        const avg = perf.current.acc / perf.current.n;
        perf.current = { acc: 0, n: 0 };
        const maxDpr = Math.min(2, window.devicePixelRatio || 1);
        const v = viewRef.current;
        let d = v.dpr;
        if (avg > 20 && d > 0.6) d = Math.max(0.6, d - 0.15); // کند است → رزولوشن را کم کن
        else if (avg < 13.5 && d < maxDpr) d = Math.min(maxDpr, d + 0.1); // جا هست → کیفیت را برگردان
        if (Math.abs(d - v.dpr) > 0.01) {
          v.dpr = d;
          cv.width = Math.round(v.w * d);
          cv.height = Math.round(v.h * d);
        }
      }
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      const s = sRef.current!;
      tick(s, dt, evRef.current);

      fxRef.current = fxRef.current.filter((f) => {
        f.life -= dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.kind !== "text") f.vy += 260 * dt;
        else f.vy *= 0.97;
        return f.life > 0;
      });

      // Walkers AI
      const wm = walkersRef.current;
      const ids = new Set(s.workers.map((w) => w.id));
      for (const k of wm.keys()) if (!ids.has(k)) wm.delete(k);

      for (const w of s.workers) {
        let wk = wm.get(w.id);
        if (!wk) {
          wk = { x: 10, y: 10, tx: 10, ty: 10, kind: w.kind, face: 1, wait: 0 };
          wm.set(w.id, wk);
        }
        const dx = wk.tx - wk.x,
          dy = wk.ty - wk.y,
          d = Math.hypot(dx, dy);
        if (d < 0.05) {
          wk.wait -= dt;
          if (wk.wait <= -2) {
            const opts: number[] = [];
            s.tiles.forEach((tt, i) => {
              const x = i % N,
                y = Math.floor(i / N);
              if (!locked(s, x, y) && (tt.k === "grass" || tt.k === "soil")) opts.push(i);
            });
            const pick = opts[Math.floor(Math.random() * opts.length)] ?? idx(10, 10);
            wk.tx = (pick % N) + 0.5;
            wk.ty = Math.floor(pick / N) + 0.5;
            wk.wait = 0;
          }
        } else {
          const sp = 1.35 * dt;
          wk.x += (dx / d) * Math.min(sp, d);
          wk.y += (dy / d) * Math.min(sp, d);
          wk.wait = 0;
          wk.face = dx - dy > 0 ? 1 : -1;
          if (d < 0.06) wk.wait = 0.001;
        }
      }

      render(ctx, s, viewRef.current, t / 1000, fxRef.current, [...wm.values()]);

      // Story chapter goal checking
      updateStory(s, evRef.current);

      uiAcc += dt;
      if (uiAcc > 0.25) {
        uiAcc = 0;
        setTick((n) => n + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [ready]);

  useEffect(() => {
    viewRef.current.tool = tool;
    viewRef.current.arg = tool === "seed" ? seed : tool === "build" ? bsel : "";
  }, [tool, seed, bsel]);

  // Input interactions: STRICT click-based execution
  const drag = useRef<{
    x: number;
    y: number;
    cx: number;
    cy: number;
    moved: boolean;
    painted: Set<number>;
  } | null>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef<number>(0);

  /**
   * عمل دسته‌ای: نگه‌داشتن انگشت روی یک زمین، همان ابزار را روی ۹ زمین (۳×۳) اجرا می‌کند.
   * چرا؟ بازیکن موبایل نباید برای کاشت یک ردیف ۹ بار ضربه بزند.
   */
  const groupAct = (tx: number, ty: number) => {
    const s = sRef.current!;
    if (tool === "build") { setPanel("build"); return; }
    haptic("big");
    let done = 0;
    let opened = false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = tx + dx, y = ty + dy;
        if (x < 0 || y < 0 || x >= N || y >= N) continue;
        if (locked(s, x, y)) continue;
        const before = JSON.stringify(s.tiles[idx(x, y)]);
        const r = toolAction(s, x, y, tool, tool === "seed" ? seed : "", ev);
        if (r === "open") { opened = true; continue; }
        if (JSON.stringify(s.tiles[idx(x, y)]) !== before) done++;
      }
    }
    if (opened && !done) setPanel({ bx: tx, by: ty });
    sound(done ? "click" : "err");
    toast(done ? `⚡ عملیات دسته‌ای روی ${done} زمین اجرا شد` : "برای عمل دسته‌ای زمین آزادِ بیشتری لازم است", done ? "ok" : "err");
    setTick((n) => n + 1);
  };

  const act = (tx: number, ty: number) => {
    const s = sRef.current!;
    const arg = tool === "seed" ? seed : tool === "build" ? bsel : "";
    if (tool === "build" && !bsel) {
      setPanel("build");
      return;
    }
    haptic("tap");
    const r = toolAction(s, tx, ty, tool, arg, ev);
    if (r === "open") {
      setPanel({ bx: tx, by: ty });
      sound("click");
    }
    if (tool === "build" && r !== "open" && s.tiles[idx(tx, ty)].k === "bld") {
      setTool("hand");
      setBsel("");
    }
    setTick((n) => n + 1);
  };

  // ── کشیدنِ پنل به پایین برای بستن (الگوی شیتِ موبایل)
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetDrag = useRef({ y: 0, dy: 0, active: false });
  const onSheetDown = (e: React.PointerEvent) => {
    sheetDrag.current = { y: e.clientY, dy: 0, active: true };
    capturePointer(e.currentTarget, e.pointerId);
  };
  const onSheetMove = (e: React.PointerEvent) => {
    const d = sheetDrag.current;
    if (!d.active) return;
    d.dy = Math.max(0, e.clientY - d.y);
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${d.dy}px)`;
  };
  const onSheetUp = () => {
    const d = sheetDrag.current;
    if (!d.active) return;
    d.active = false;
    if (sheetRef.current) sheetRef.current.style.transform = "";
    if (d.dy > 90) {
      haptic("tap");
      setPanel(null);
    }
  };

  const hoverClear = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdFired = useRef(false);
  const cancelHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };
  const keepHover = (t: { x: number; y: number } | null) => {
    viewRef.current.hover = t;
    if (hoverClear.current) clearTimeout(hoverClear.current);
    if (t) hoverClear.current = setTimeout(() => { viewRef.current.hover = null; }, 1100);
  };

  const onDown = (e: React.PointerEvent) => {
    capturePointer(e.target as Element, e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const v = viewRef.current;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = Math.hypot(a.x - b.x, a.y - b.y);
      drag.current = null;
      cancelHold();
      keepHover(null);
      return;
    }
    drag.current = { x: e.clientX, y: e.clientY, cx: v.cam.x, cy: v.cam.y, moved: false, painted: new Set() };
    const t0 = screenToTile(v, e.clientX, e.clientY);
    keepHover(t0);
    // نگه‌داشتن انگشت = عمل دسته‌ای روی ۳×۳
    holdFired.current = false;
    cancelHold();
    if (t0) holdTimer.current = setTimeout(() => { holdFired.current = true; groupAct(t0.x, t0.y); }, 480);
  };

  const onMove = (e: React.PointerEvent) => {
    const v = viewRef.current;
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current) v.cam.z = Math.max(0.3, Math.min(2.4, v.cam.z * (d / pinch.current)));
      pinch.current = d;
      return;
    }
    const dr = drag.current;
    if (!dr) return;
    const dx = e.clientX - dr.x, dy = e.clientY - dr.y;
    if (Math.abs(dx) + Math.abs(dy) > 7) {
      dr.moved = true;
      cancelHold();
      v.cam.x = dr.cx + dx;
      v.cam.y = dr.cy + dy;
      keepHover(null);
    } else {
      keepHover(screenToTile(v, e.clientX, e.clientY));
    }
  };

  const endPointer = (e: React.PointerEvent, cancelled = false) => {
    cancelHold();
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = 0;
    const dr = drag.current;
    drag.current = null;
    if (cancelled || !dr || dr.moved) { keepHover(null); return; }
    if (holdFired.current) { holdFired.current = false; keepHover(null); return; } // دسته‌ای اجرا شد؛ ضربه‌ی دوم لازم نیست
    const t = screenToTile(viewRef.current, e.clientX, e.clientY);
    if (t) { keepHover(t); act(t.x, t.y); } else keepHover(null);
  };

  // On-screen camera controls (no wheel, no keyboard)
  const zoomBy = (f: number) => {
    const v = viewRef.current;
    v.cam.z = Math.max(0.3, Math.min(2.4, v.cam.z * f));
    setTick((n) => n + 1);
  };
  const recenter = () => {
    const v = viewRef.current;
    const st = sRef.current;
    let cx = N / 2, cy = N / 2;
    if (st) {
      const own = st.tiles.map((t, i) => ({ t, i })).filter(({ i }) => !locked(st, i % N, Math.floor(i / N)));
      if (own.length) {
        cx = own.reduce((a, o) => a + (o.i % N), 0) / own.length;
        cy = own.reduce((a, o) => a + Math.floor(o.i / N), 0) / own.length;
      }
    }
    const p = tileCenter(cx, cy);
    v.cam.z = 0.62;
    v.cam.x = -p.x * v.cam.z;
    v.cam.y = -p.y * v.cam.z;
    setTick((n) => n + 1);
  };

  const s = sRef.current;
  if (!ready || !s) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-sky-500 via-emerald-600 to-amber-700 text-white">
        <div className="text-center">
          <div className="flex justify-center animate-bounce"><ItemIcon id="sunflower" size={88} /></div>
          <p className="mt-4 text-2xl font-black">در حال بارگذاری دنیای مزرعه طلایی...</p>
        </div>
      </div>
    );
  }

  const L = lightInfo(s);
  const hh = Math.floor(L.hour),
    mm = Math.floor((L.hour - hh) * 60);
  const cap = capacity(s),
    used = invCount(s);
  const need = xpFor(s.level);
  const readyOrders = s.orders.filter((o) => o.items.every((it) => (s.inv[it.id] || 0) >= it.n)).length;
  const curSeason = SEASONS[s.seasonIndex];
  const storyCh = currentChapter(s);
  const storyP = goalProgress(s, storyCh);
  const claimableContracts = s.contracts.filter((cs) => {
    const def = CONTRACTS.find((c) => c.id === cs.id);
    return def && !cs.claimed && cs.progress >= def.target;
  }).length;

  const tools = [
    { id: "hand", icon: "D", name: UI.hand, tip: "برداشت محصول رسیده یا بررسی سازه‌ها" },
    { id: "seed", icon: "K", name: UI.seed, tip: `کاشت ${CMAP[seed]?.name || "بذر"} فقط روی خاک شخم‌خورده` },
    { id: "water", icon: "A", name: UI.water, tip: "آبیاری دستی خاک خشک (+۸۰٪ سرعت رشد)" },
    { id: "fert", icon: "C", name: UI.fert, tip: `کود تقویتی خاک (+۲ محصول) (${FERT_COST}🪙)` },
    { id: "hoe", icon: "S", name: UI.hoe, tip: `شخم زدن چمن به خاک آماده (${HOE_COST}🪙)` },
    { id: "build", icon: "B", name: UI.build, tip: "احداث ساختمان‌ها، کارخانه‌ها و ماشین‌آلات" },
    { id: "clear", icon: "P", name: UI.clear, tip: "قطع درخت، استخراج سنگ، یا برچیدن سازه" },
  ];

  /** شروع بازی: اول تجربه‌ی تمام‌صفحه، بعد داستان */
  const enterFsAndLock = async () => {
    if (!isFullscreen()) await fs.toggle();
  };

  const MENU_ITEMS = ["story", "market", "orders", "biz", "skills", "tech", "decor", "contracts", "achievements", "help", "settings"] as const;

  const bp = panel && typeof panel === "object" ? panel : null;
  const bt = bp ? s.tiles[idx(bp.bx, bp.by)] : null;

  return (
    <div className="relative select-none overflow-hidden" dir="rtl" style={{ height: "var(--app-h, 100dvh)", width: "100vw" }}>
      {/* 2.5D Canvas Viewport */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none select-none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={(e) => endPointer(e)}
        onPointerCancel={(e) => endPointer(e, true)}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Camera controls — touch only */}
      <div className="absolute top-1/2 z-30 flex -translate-y-1/2 flex-col gap-1.5 md:gap-2" style={{ right: "max(8px, env(safe-area-inset-right))" }}>
        {([["zoomIn", () => zoomBy(1.25)], ["zoomOut", () => zoomBy(0.8)], ["center", recenter]] as const).map(([ic, fn]) => (
          <button
            key={ic}
            type="button"
            aria-label={ic}
            onClick={() => { fn(); sound("click"); }}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 shadow-lg ring-1 ring-amber-900/10 transition active:scale-90 md:h-[52px] md:w-[52px]"
          >
            <Icon name={ic} size={26} />
          </button>
        ))}
      </div>

      {/* Top HUD — icon first, compact on phones */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-1.5" style={{ padding: "max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right)) 8px max(8px, env(safe-area-inset-left))" }}>
        <div className="pointer-events-auto flex min-w-0 flex-wrap items-center gap-1.5 md:gap-2">
          <button
            type="button"
            onClick={() => setPanel("skills")}
            className="flex h-10 items-center gap-2 rounded-full bg-white/95 py-0.5 pl-3 pr-0.5 shadow-lg ring-1 ring-amber-900/10 active:scale-95 md:h-11"
          >
            <LevelRing level={s.level} pct={s.xp / need} />
            <span className="hidden text-right leading-tight sm:block">
              <span className="block text-[11px] font-black text-amber-950">سطح {fmt(s.level)}</span>
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700"><Icon name="star" size={11} />{fmt(s.rep)}</span>
            </span>
          </button>

          <Pill icon="coin">{fmt(s.coins)}</Pill>

          <Pill icon="box" onClick={() => setPanel("market")} className={used >= cap ? "animate-pulse !bg-red-100 !text-red-800 ring-red-400" : ""}>
            <span className="flex flex-col items-start leading-none">
              <span>{fmt(used)}<span className="text-[10px] opacity-60">/{fmt(cap)}</span></span>
              <span className="mt-1 h-1 w-12 overflow-hidden rounded-full bg-amber-900/15">
                <span className={`block h-full rounded-full ${used / cap > 0.85 ? "bg-red-500" : "bg-sky-500"}`} style={{ width: `${Math.min(100, (used / cap) * 100)}%` }} />
              </span>
            </span>
          </Pill>

          {s.stats.skillPoints > 0 && (
            <Pill icon="skills" onClick={() => setPanel("skills")} className="!bg-purple-100 !text-purple-900 ring-purple-300">
              {fmt(s.stats.skillPoints)}
            </Pill>
          )}

          <button
            type="button"
            aria-label="منو"
            onClick={() => { setMenuOpen(true); sound("click"); }}
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/95 shadow-lg ring-1 ring-amber-900/10 active:scale-95"
          >
            <Icon name="menu" size={26} />
            {(readyOrders > 0 || s.stats.skillPoints > 0 || claimableContracts > 0) && (
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-red-600 ring-2 ring-white" />
            )}
          </button>

          <button
            type="button"
            onClick={() => (s.story.shown ? setTick((n) => n + 1) : setPanel(panel === "story" ? null : "story"))}
            className={`flex h-10 max-w-[56vw] items-center gap-2 rounded-full py-0.5 pl-3 pr-1 shadow-lg ring-1 active:scale-95 md:h-11 md:max-w-[300px] ${s.story.shown ? "animate-pulse bg-purple-600 text-white ring-purple-300" : "bg-white/95 text-amber-950 ring-amber-900/10"}`}
          >
            <span className="relative inline-flex h-8 w-8 items-center justify-center md:h-9 md:w-9">
              <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#00000014" strokeWidth="3.5" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={94.2} strokeDashoffset={94.2 * (1 - (storyCh.goal && !s.story.done ? Math.min(1, storyP.cur / storyP.target) : 1))} />
              </svg>
              <Icon name="film" size={18} />
            </span>
            <span className="min-w-0 text-right leading-tight">
              <span className="block truncate text-[11px] font-black">{s.story.shown ? "ادامه‌ی داستان" : `فصل ${fmt(storyCh.num)} · ${storyCh.title}`}</span>
              {storyCh.goal && !s.story.done && !s.story.shown && (
                <span className="block truncate text-[9px] font-bold opacity-70">{fmt(Math.min(storyP.cur, storyP.target))} از {fmt(storyP.target)}</span>
              )}
            </span>
          </button>

          {s.currentEvent && (
            <span className="flex h-10 items-center gap-1.5 rounded-full bg-purple-100 pl-3 pr-1.5 text-[11px] font-black text-purple-900 shadow-lg ring-1 ring-purple-300 md:h-11">
              <Icon name="sparkle" size={24} />
              <span className="hidden max-w-[220px] truncate md:inline">{stripEmoji(s.currentEvent.text)}</span>
            </span>
          )}
        </div>

        <div className="pointer-events-auto flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-slate-900/75 pl-3 pr-1 text-white shadow-lg backdrop-blur-md md:h-11">
          <Icon
            name={s.weather === "rain" ? "rain" : s.weather === "snow" ? "snow" : s.weather === "fog" ? "fog" : s.weather === "heatwave" ? "heat" : L.dark > 0.3 ? "moon" : L.dusk > 0.3 ? "sunset" : "sun"}
            size={30}
          />
          <span className="text-right leading-tight">
            <span className="block text-[12px] font-black min-[430px]:text-[13px]">روز {fmt(s.day)}</span>
            <span className="block font-mono text-[11px] opacity-85 min-[430px]:text-[12px]">{String(hh).padStart(2, "0")}:{String(mm).padStart(2, "0")}</span>
          </span>
          <Icon name={curSeason.id} size={22} />
          {saveState && <Icon name={saveState === "cloud" ? "cloud" : "save"} size={16} className={saveState === "saving" ? "animate-pulse opacity-60" : "opacity-80"} />}
          {!online && <span className="rounded-full bg-amber-400/95 px-1.5 py-0.5 text-[9px] font-black text-amber-950">آفلاین</span>}
        </div>
      </div>

      {/* Seed tray */}
      {tool === "seed" && (
        <div className="absolute bottom-[86px] left-1/2 z-30 flex max-w-[96vw] -translate-x-1/2 gap-1.5 overflow-x-auto overscroll-contain rounded-2xl bg-amber-50/95 p-1.5 shadow-2xl ring-1 ring-amber-900/15 backdrop-blur-md">
          {CROPS.map((c) => {
            const lock = c.lvl > s.level;
            return (
              <button
                key={c.id}
                type="button"
                disabled={lock}
                aria-label={c.name}
                onClick={() => setSeed(c.id)}
                className={`relative flex w-14 shrink-0 flex-col items-center gap-0.5 rounded-xl p-1 transition md:w-16 ${
                  seed === c.id ? "bg-emerald-500 text-white ring-2 ring-emerald-700" : "bg-white text-amber-950"
                } ${lock ? "opacity-45" : ""}`}
              >
                <span className="relative">
                  <ItemIcon id={c.id} size={34} className={lock ? "grayscale" : ""} />
                  {lock && <Icon name="lock" size={16} className="absolute -bottom-1 -left-1" />}
                </span>
                <span className="flex items-center gap-0.5 text-[10px] font-black">
                  {lock ? fmt(c.lvl) : <><Icon name="coin" size={11} />{fmt(c.seed)}</>}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Toolbar */}
      <div
        className="absolute left-1/2 z-30 flex w-[calc(100vw-8px)] max-w-[520px] -translate-x-1/2 gap-1 overflow-x-auto overscroll-contain rounded-[22px] bg-gradient-to-b from-amber-100 to-amber-200 p-1.5 shadow-2xl ring-1 ring-amber-900/20"
        style={{ bottom: "max(8px, env(safe-area-inset-bottom))", paddingLeft: "max(6px, env(safe-area-inset-left))", paddingRight: "max(6px, env(safe-area-inset-right))" }}
      >
        {tools.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-label={t.name}
            onClick={() => { setTool(t.id); if (t.id === "build") setPanel("build"); sound("click"); }}
            className={`relative flex h-[56px] min-w-[44px] flex-1 shrink-0 flex-col items-center justify-center rounded-2xl transition ${
              tool === t.id ? "-translate-y-1.5 bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-xl ring-2 ring-white" : "bg-white/90 shadow active:scale-90"
            }`}
          >
            {t.id === "seed" ? <ItemIcon id={seed} size={26} /> : <Icon name={t.id} size={26} />}
            <span className={`mt-0.5 text-[11px] font-black leading-none min-[430px]:text-[12px] min-[768px]:text-[13px] ${tool === t.id ? "text-white" : "text-amber-950"}`}>{t.name}</span>
          </button>
        ))}
      </div>

      {/* Notifications — at most two, icon + one line */}
      <div className="pointer-events-none absolute left-1/2 top-[58px] z-40 flex w-[min(92vw,420px)] -translate-x-1/2 flex-col items-center gap-1.5 md:top-[68px]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex w-full animate-[fadein_.2s] items-center gap-2 rounded-2xl py-1.5 pl-3 pr-1.5 text-[12px] font-bold shadow-xl backdrop-blur-md md:text-[13px] ${
              t.t === "err" ? "bg-red-600/95 text-white" : t.t === "lvl" || t.t === "prestige" ? "bg-slate-900/90 text-amber-100 ring-1 ring-amber-400/60" : "bg-white/95 text-slate-900"
            }`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${t.t === "err" ? "bg-white/20" : "bg-amber-100"}`}>
              <Icon name={TOAST_ICON[t.t] || "sparkle"} size={20} />
            </span>
            <span className="line-clamp-2">{t.m}</span>
          </div>
        ))}
      </div>

      {/* آموزش اولین‌بار — سه گام لمسی، یک‌بار برای همیشه */}
      {onboard > 0 && started && !s.story.shown && !!s.story.name && (
        <div className="absolute inset-0 z-[60] flex items-end justify-center bg-slate-950/70 p-3 backdrop-blur-sm">
          <div className="mb-[max(84px,env(safe-area-inset-bottom))] w-full max-w-[440px] rounded-3xl bg-white p-4 shadow-2xl">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-black text-emerald-700">آموزش سریع · گام {fmt(onboard)} از ۳</span>
              <button
                type="button"
                aria-label="رد کردن آموزش"
                className="rounded-xl bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600"
                onClick={() => {
                  try { localStorage.setItem("farm_onboard", "1"); } catch { /* ignore */ }
                  setOnboard(0);
                  haptic("tap");
                }}
              >
                رد کردن
              </button>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
                <Icon name={onboard === 1 ? "hand" : onboard === 2 ? "sparkle" : "menu"} size={34} />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900">
                  {onboard === 1 ? "ضربه = یک زمین" : onboard === 2 ? "نگه‌داشتن انگشت = ۳×۳" : "ابزارها و منو"}
                </h3>
                <p className="mt-0.5 text-[12px] font-bold leading-6 text-slate-600">
                  {onboard === 1
                    ? "با ابزارِ انتخاب‌شده در نوار پایین، روی هر زمین ضربه بزن: شخم، کاشت، آبیاری یا برداشت."
                    : onboard === 2
                      ? "انگشتت را نیم‌ثانیه روی زمین نگه دار تا همان کار روی ۹ زمین اطراف انجام شود — برای کاشتِ ردیفی، عالی است."
                      : "کاشت/آب/کود/شخم/ساخت در نوار پایینِ شست‌رس است؛ منو و وضعیت بازی در بالای صفحه، و بزرگ/کوچک‌نمایی کنارِ نقشه."}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              {onboard > 1 && (
                <button
                  type="button"
                  className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-slate-100 text-sm font-black text-slate-700 active:scale-95"
                  onClick={() => { setOnboard(onboard - 1); haptic("tap"); }}
                >
                  قبلی
                </button>
              )}
              <button
                type="button"
                className="flex h-12 flex-[1.6] items-center justify-center rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-lg active:scale-95"
                onClick={() => {
                  haptic("tap");
                  if (onboard < 3) setOnboard(onboard + 1);
                  else {
                    try { localStorage.setItem("farm_onboard", "1"); } catch { /* ignore */ }
                    setOnboard(0);
                    toast("🌱 حالا خودت زمین را بساز؛ من همین‌جا تماشا می‌کنم", "ok");
                  }
                }}
              >
                {onboard < 3 ? "بعدی" : "بزن بریم!"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* گزارش «در غیاب شما» — آفلاین‌تایم باید دیده شود، نه اینکه در سکوت بگذرد */}
      {away && started && (
        <div className="pointer-events-auto absolute inset-x-3 bottom-[96px] z-40 rounded-3xl bg-white/97 p-3 shadow-2xl ring-1 ring-emerald-900/10 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm font-black text-emerald-900">
              <Icon name="moon" size={22} /> در غیاب شما
            </span>
            <button
              type="button"
              aria-label="بستن گزارش غیاب"
              onClick={() => { haptic("tap"); setAway(null); }}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-lg font-black text-slate-600"
            >
              ✕
            </button>
          </div>
          <p className="mt-0.5 text-[11px] font-bold text-slate-500">
            {fmt(away.minutes)} دقیقه بیرون بودی؛ مزرعه خواب نماند:
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[11px] font-black text-slate-700">
            <span className="rounded-xl bg-amber-50 px-2 py-1">🌾 {fmt(away.ready)} محصول رسیده</span>
            <span className="rounded-xl bg-emerald-50 px-2 py-1">💰 {away.coins >= 0 ? "+" : "−"}{fmt(Math.abs(away.coins))} سکه</span>
            <span className="rounded-xl bg-sky-50 px-2 py-1">⭐ {away.xp >= 0 ? "+" : "−"}{fmt(Math.abs(away.xp))} تجربه</span>
            <span className="rounded-xl bg-purple-50 px-2 py-1">📅 {fmt(away.days)} روز گذشته{away.levels > 0 ? ` · ${fmt(away.levels)} سطح` : ""}</span>
          </div>
        </div>
      )}

      {/* منوی اصلی موبایل — گرید لمسی با برچسب، به‌جای ستون آیکون‌های دسکتاپی */}
      {menuOpen && (
        <div className="absolute inset-0 z-50 flex items-end bg-slate-950/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)}>
          <div
            className="mx-auto w-full max-w-[560px] rounded-t-3xl bg-gradient-to-b from-amber-50 to-orange-100 p-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgba(0,0,0,0.4)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-amber-900/30" />
            <div className="grid grid-cols-4 gap-2">
              {MENU_ITEMS.map((p) => {
                const badge = p === "orders" ? readyOrders : p === "skills" ? s.stats.skillPoints : p === "contracts" ? claimableContracts : 0;
                return (
                  <button
                    key={p}
                    type="button"
                    aria-label={PANEL_META[p].title}
                    onClick={() => {
                      haptic("tap");
                      setMenuOpen(false);
                      setPanel(p);
                    }}
                    className="relative flex flex-col items-center justify-center gap-1 rounded-2xl bg-white/95 px-1 py-2.5 shadow-md ring-1 ring-amber-900/10 active:scale-95"
                  >
                    <Icon name={PANEL_META[p].icon} size={30} />
                    <span className="text-[11px] font-black leading-none text-amber-950">{PANEL_META[p].title}</span>
                    {badge > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white ring-2 ring-white">
                        {fmt(badge)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => { haptic("tap"); setMenuOpen(false); }}
              className="mt-3 w-full rounded-2xl bg-amber-800 py-3 text-base font-black text-white shadow-lg active:scale-[.98]"
            >
              بستن
            </button>
          </div>
        </div>
      )}

      {/* Flyout Panel Windows */}
      {panel && (
        <div
          ref={sheetRef}
          className="landscape-compact absolute inset-x-0 bottom-0 top-[10%] z-40 mx-auto flex flex-col overflow-hidden rounded-t-3xl bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 shadow-[0_-10px_40px_rgba(0,0,0,0.35)] sm:bottom-[max(12px,env(safe-area-inset-bottom))] sm:max-w-[620px] sm:rounded-3xl sm:ring-2 sm:ring-amber-800/40"
        >
          {/* منطقه‌ی کشیدن: کشیدن به پایین پنل را می‌بندد */}
          <div
            className="shrink-0 touch-none select-none"
            onPointerDown={onSheetDown}
            onPointerMove={onSheetMove}
            onPointerUp={onSheetUp}
            onPointerCancel={onSheetUp}
          >
            <div className="mx-auto mt-1.5 mb-1 h-1.5 w-14 rounded-full bg-amber-900/30" />
          </div>
          {/* Panel Header */}
          <div className="flex items-center justify-between bg-gradient-to-l from-amber-700 to-orange-600 px-3 py-2.5 text-white shadow md:px-4 md:py-3">
            <h2 className="flex min-w-0 items-center gap-2 text-base font-black min-[430px]:text-lg min-[768px]:text-xl">
              {typeof panel === "string" && PANEL_META[panel] && (<><Icon name={PANEL_META[panel].icon} size={28} /><span className="truncate">{PANEL_META[panel].title}</span></>)}
              {bt && bt.b && (<><Icon name="home" size={26} /><span className="truncate">{BMAP[bt.b]?.name || "ساختمان"}</span></>)}
            </h2>
            <button
              onClick={() => setPanel(null)}
              aria-label="بستن"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition active:scale-90"
            >
              <Icon name="close" size={20} />
            </button>
          </div>

          {/* Panel Body Content */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 md:p-3.5 md:space-y-3">
            {/* Market Panel */}
            {panel === "market" && (
              <div className="space-y-2.5">
                <div className="rounded-2xl bg-sky-100 p-2.5 text-xs text-sky-950 leading-5">
                  قیمت‌ها بر اساس معادلات عرضه و تقاضا نوسان می‌کنند. فروش انبوه قیمت را موقتاً کاهش می‌دهد. با باز کردن
                  مجوز صادرات و دلال بورس، سود بیشتری عایدتان می‌شود.
                </div>
                {Object.keys(ITEMS).filter((k) => (s.inv[k] || 0) > 0).length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-10 text-center font-bold text-amber-900"><Icon name="sprout" size={64} />انبار خالی است؛ محصول برداشت کن.</div>
                )}
                {Object.keys(ITEMS)
                  .filter((k) => (s.inv[k] || 0) > 0)
                  .map((k) => {
                    const it = ITEMS[k],
                      p = price(s, k),
                      pct = Math.round((p / it.base - 1) * 100);
                    return (
                      <div key={k} className="flex items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-md">
                        <ItemIcon id={k} size={42} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-black text-slate-800">
                            {it.name} <span className="text-xs text-slate-500">×{fmt(s.inv[k])}</span>
                          </div>
                          <div className="text-xs font-bold">
                            <Coin v={p} size={14} />{" "}
                            <span className={pct >= 0 ? "text-emerald-600" : "text-red-600"}>
                              {pct >= 0 ? "▲" : "▼"}
                              {fmt(Math.abs(pct))}٪
                            </span>
                          </div>
                        </div>
                        <Spark data={s.market[k]?.hist || []} />
                        <div className="flex flex-col gap-1">
                          <button
                            className={`${btn} bg-emerald-600 text-xs text-white`}
                            onClick={() => {
                              sell(s, k, 1, ev);
                              setTick((n) => n + 1);
                            }}
                          >
                            ۱
                          </button>
                          <button
                            className={`${btn} bg-amber-600 text-xs text-white`}
                            onClick={() => {
                              sell(s, k, s.inv[k], ev);
                              setTick((n) => n + 1);
                            }}
                          >
                            همه
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Orders Panel */}
            {panel === "orders" && (
              <div className="space-y-3">
                <div className="rounded-2xl bg-emerald-100 p-2.5 text-xs text-emerald-950 leading-5">
                  سفارش‌ها بهترین راه برای درآمد انبوه و افزایش اعتبار هستند. هر امتیاز اعتبار، سود سفارش‌های بعدی را بیشتر
                  می‌کند!
                </div>
                {s.orders.map((o, i) => {
                  const ok = o.items.every((it) => (s.inv[it.id] || 0) >= it.n);
                  const left = Math.max(0, o.exp - s.time);
                  return (
                    <div
                      key={o.id}
                      className={`rounded-2xl border-2 bg-white p-3 shadow-md ${
                        ok ? "border-emerald-400 ring-2 ring-emerald-200" : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Portrait html={npcSvg(o.npc)} size={42} />
                          <span className="font-black text-slate-800">{NPCS[o.npc]?.n || "مشتری"}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-500">
                          <Icon name="clock" size={14} /> {fmt(left / 60)}:{String(Math.floor(left % 60)).padStart(2, "0")}
                        </span>
                      </div>
                      <div className="my-2.5 flex flex-wrap gap-1.5">
                        {o.items.map((it) => {
                          const have = s.inv[it.id] || 0;
                          return (
                            <div
                              key={it.id}
                              className={`flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-bold ${
                                have >= it.n ? "bg-emerald-100 text-emerald-900" : "bg-red-50 text-red-900"
                              }`}
                            >
                              <ItemIcon id={it.id} size={22} /> {fmt(Math.min(have, it.n))}/{fmt(it.n)}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-amber-700">
                          <span className="inline-flex items-center gap-2"><Coin v={o.coins} size={16} /><span className="inline-flex items-center gap-1"><Icon name="star" size={15} />{fmt(o.xp)}</span></span>
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            className={`${btn} bg-slate-200 text-xs text-slate-700`}
                            onClick={() => {
                              s.orders[i] = { ...s.orders[i], exp: 0 };
                              setTick((n) => n + 1);
                            }}
                          >
                            رد
                          </button>
                          <button
                            disabled={!ok}
                            className={`${btn} bg-emerald-600 text-sm text-white`}
                            onClick={() => {
                              fulfill(s, i, ev);
                              setTick((n) => n + 1);
                            }}
                          >
                            <Icon name="orders" size={18} /> ارسال
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Build Panel (Production Buildings Only) */}
            {panel === "build" && (
              <div className="grid grid-cols-2 gap-2.5">
                {BUILDINGS.filter((b) => !b.isDecor).map((b) => {
                  const lock = b.lvl > s.level,
                    cost = buildCost(s, b.id);
                  return (
                    <button
                      key={b.id}
                      disabled={lock}
                      onClick={() => {
                        setBsel(b.id);
                        setTool("build");
                        setPanel(null);
                        toast(`روی یک خانه چمن یا خاک خالی کلیک کنید تا ${b.name} احداث شود`);
                      }}
                      className={`rounded-2xl bg-white p-3 text-right shadow-md transition active:scale-95 ${
                        bsel === b.id ? "ring-3 ring-emerald-500" : ""
                      } ${lock ? "opacity-50" : ""}`}
                    >
                      <div className="relative"><BuildingThumb id={b.id} dim={lock} />{lock && <Icon name="lock" size={26} className="absolute left-0 top-0" />}</div>
                      <div className="font-black text-slate-800 text-sm mt-1">
                        {b.name}{" "}
                        {countB(s, b.id) > 0 && <span className="text-xs text-slate-500">({fmt(countB(s, b.id))})</span>}
                      </div>
                      <div className="text-[11px] text-slate-600 line-clamp-2 my-1">{b.desc}</div>
                      <div className={`text-xs font-black ${s.coins >= cost ? "text-amber-700" : "text-red-500"}`}>
                        {lock ? `سطح ${fmt(b.lvl)}` : <Coin v={cost} size={14} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Decoration Panel (Decorations Only) */}
            {panel === "decor" && (
              <div className="space-y-3">
                <div className="rounded-2xl bg-pink-100 p-2.5 text-xs text-pink-950 leading-5">
                  {!canBuildDecor(s) && "برای باز شدن دکورها، فناوری «طراحی منظر» را در بخش تحقیقات بخرید یا مهارت «طراح باغ» را یاد بگیرید. "}مزرعه خود را مانند یک بهشت طراحی کنید! فواره‌ها، پناهگاه چوبی، مجسمه مرمرین، پرچین‌های سنگی و باغچه بامبو برای تزئین آزادانه فضای زمین در دسترس هستند.
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {BUILDINGS.filter((b) => b.isDecor).map((b) => {
                    const lock = b.lvl > s.level || !canBuildDecor(s);
                    const cost = decorCost(s, b.id);
                    return (
                      <button
                        key={b.id}
                        disabled={lock}
                        onClick={() => {
                          setBsel(b.id);
                          setTool("build");
                          setPanel(null);
                          toast(`روی یک زمین خالی کلیک کنید تا دکور ${b.name} ساخته شود`);
                        }}
                        className={`rounded-2xl bg-white p-3 text-right shadow-md transition active:scale-95 ${
                          bsel === b.id ? "ring-3 ring-pink-500" : ""
                        } ${lock ? "opacity-50" : ""}`}
                      >
                        <div className="relative"><BuildingThumb id={b.id} dim={lock} />{lock && <Icon name="lock" size={26} className="absolute left-0 top-0" />}</div>
                        <div className="font-black text-slate-800 text-sm mt-1">{b.name}</div>
                        <div className="text-[11px] text-slate-600 line-clamp-2 my-1">{b.desc}</div>
                        <div className={`text-xs font-black ${s.coins >= cost ? "text-pink-700" : "text-red-500"}`}>
                          {b.lvl > s.level ? `سطح ${fmt(b.lvl)}` : !canBuildDecor(s) ? "نیازمند دانش طراحی منظر" : <Coin v={cost} size={14} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Skills Tree Panel */}
            {panel === "skills" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-purple-100 p-3 text-purple-950">
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-black"><Icon name="skills" size={22} />درخت مهارت‌های کشاورز</div>
                    <div className="text-xs text-purple-800 mt-0.5">با افزایش هر سطح، ۱ امتیاز مهارت کسب می‌کنید.</div>
                  </div>
                  <div className="rounded-xl bg-purple-700 px-3 py-1.5 text-xs font-black text-white shadow">
                    موجودی: {fmt(s.stats.skillPoints)} امتیاز
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {SKILLS.map((sk: SkillItem) => {
                    const learned = s.skills.includes(sk.id);
                    const canLearn = !learned && (!sk.req || s.skills.includes(sk.req)) && s.stats.skillPoints >= sk.cost;
                    return (
                      <div
                        key={sk.id}
                        className={`rounded-2xl border-2 p-3 bg-white shadow-md flex items-center gap-3 ${
                          learned ? "border-purple-500 bg-purple-50/60 ring-1 ring-purple-300" : "border-slate-200"
                        }`}
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-100"><Icon name={skillIcon(sk.id)} size={30} /></span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-800 text-sm">{sk.name}</span>
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                              {sk.effect}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">{sk.desc}</div>
                          {sk.req && !s.skills.includes(sk.req) && (
                            <div className="text-[10px] text-amber-700 mt-0.5">پیش‌نیاز: {SKILLS.find((x) => x.id === sk.req)?.name}</div>
                          )}
                        </div>
                        {learned ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-purple-700"><Icon name="check" size={18} />فعال</span>
                        ) : (
                          <button
                            disabled={!canLearn}
                            onClick={() => {
                              learnSkill(s, sk.id, ev);
                              setTick((n) => n + 1);
                            }}
                            className={`${btn} bg-purple-600 text-white text-xs`}
                          >
                            {fmt(sk.cost)} امتیاز
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Business & Workers Panel */}
            {panel === "biz" && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {([
                    ["bag", "کل درآمد", s.stats.earned],
                    ["trendDown", "کل مخارج", s.stats.spent],
                    ["sprout", "برداشت", s.stats.harvested],
                    ["factory", "تولید کارگاهی", s.stats.produced],
                    ["cow", "محصولات دامی", s.stats.animals],
                    ["decor", "دکورها", s.stats.decorations],
                    ["orders", "سفارش تحویلی", s.stats.orders],
                    ["trendUp", "سود خالص", s.stats.earned - s.stats.spent],
                  ] as [string, string, number][]).map(([ic, n, v]) => (
                    <div key={n} className="flex items-center gap-2 rounded-2xl bg-white p-2.5 shadow">
                      <Icon name={ic} size={30} />
                      <div className="min-w-0">
                      <div className="truncate text-[11px] font-bold text-slate-500">{n}</div>
                      <div
                        className={`text-base font-black ${
                          (v as number) < 0 ? "text-red-600" : "text-emerald-700"
                        }`}
                      >
                        {fmt(v as number)}
                      </div>
                      </div>
                    </div>
                  ))}
                </div>

                <h3 className="flex items-center gap-2 text-base font-black text-amber-950"><Icon name="workers" size={24} />نیروی انسانی</h3>
                {(Object.keys(WORKERS) as WorkerKind[]).map((k) => {
                  const w = WORKERS[k],
                    n = s.workers.filter((x) => x.kind === k).length,
                    lock = w.lvl > s.level;
                  return (
                    <div key={k} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-md">
                      <Portrait html={workerSvg(k)} size={48} />
                      <div className="flex-1">
                        <div className="font-black text-slate-800 text-sm">
                          {w.name} <span className="text-xs text-slate-500 font-bold">×{fmt(n)}</span>
                        </div>
                        <div className="text-[11px] text-slate-600">{w.desc}</div>
                        <div className="text-xs font-bold text-red-600">حقوق روزانه: <Coin v={w.wage} size={12} /></div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          disabled={lock}
                          className={`${btn} bg-emerald-600 text-xs text-white`}
                          onClick={() => {
                            hire(s, k, ev);
                            setTick((x) => x + 1);
                          }}
                        >
                          {lock ? `سطح ${fmt(w.lvl)}` : <>استخدام <Coin v={w.hire} size={13} /></>}
                        </button>
                        {n > 0 && (
                          <button
                            className={`${btn} bg-red-100 text-xs text-red-700`}
                            onClick={() => {
                              const j = s.workers.findIndex((x) => x.kind === k);
                              s.workers.splice(j, 1);
                              setTick((x) => x + 1);
                            }}
                          >
                            تعدیل
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Prestige Tier Rebirth */}
                <div className="rounded-2xl border-2 border-yellow-400 bg-gradient-to-br from-amber-100 to-yellow-200 p-3.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="flex items-center gap-1.5 text-sm font-black text-amber-950"><Icon name="crown" size={22} />تناسخ مزرعه — نسل {fmt(s.prestige)}</h4>
                      <p className="text-xs text-amber-900 mt-1">
                        با ریست مزرعه در سطح ۲۰+، ضریب دائمی سود، سرعت، ظرفیت و ۳ امتیاز مهارت دائمی دریافت کنید.
                      </p>
                    </div>
                    <button
                      disabled={!canPrestige(s)}
                      onClick={() => {
                        if (confirm("آیا برای تناسخ به سطح بالاتر آماده‌اید؟")) doPrestige(s, ev);
                      }}
                      className={`${btn} bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-xs`}
                    >
                      {canPrestige(s) ? "آغاز تناسخ" : "نیاز: سطح ۲۰ و ۱۰٬۰۰۰ سکه"}
                    </button>
                  </div>
                </div>

                <button
                  className={`${btn} w-full bg-sky-600 text-white`}
                  onClick={() => {
                    save();
                    toast("اطلاعات در سرور ابری ذخیره شد ☁️", "ok");
                  }}
                >
                  <Icon name="save" size={18} /> ذخیره دستی
                </button>
              </div>
            )}

            {/* Tech Tree Panel */}
            {panel === "tech" && (
              <div className="space-y-3">
                <div className="rounded-2xl bg-indigo-100 p-2.5 text-xs text-indigo-950 leading-5">
                  تحقیقات علمی ارزش تولیدات شما را برای بیش از ۳۰۰ ساعت ارتقا می‌دهند و قفل تجهیزات پیشرفته را باز
                  می‌کنند.
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {TECH_TREE.map((tech: TechItem) => {
                    const unlocked = s.techs.includes(tech.id);
                    const canUnlock = !unlocked && (!tech.req || s.techs.includes(tech.req));
                    return (
                      <div
                        key={tech.id}
                        className={`rounded-2xl border-2 p-3 bg-white shadow-md flex items-center gap-3 ${
                          unlocked ? "border-emerald-400 bg-emerald-50/50" : "border-slate-200"
                        }`}
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100"><Icon name={techIcon(tech.id)} size={30} /></span>
                        <div className="flex-1">
                          <div className="font-black text-slate-800 text-sm">{tech.name}</div>
                          <div className="text-xs text-slate-600">{tech.desc}</div>
                          {tech.req && !s.techs.includes(tech.req) && (
                            <div className="text-[10px] text-amber-700">پیش‌نیاز: {tech.req}</div>
                          )}
                        </div>
                        {unlocked ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600"><Icon name="check" size={18} />انجام شد</span>
                        ) : (
                          <button
                            disabled={!canUnlock || s.coins < tech.cost}
                            onClick={() => {
                              unlockTech(s, tech.id, ev);
                              setTick((n) => n + 1);
                            }}
                            className={`${btn} bg-indigo-600 text-white text-xs`}
                          >
                            <Coin v={tech.cost} size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Contracts Panel */}
            {panel === "contracts" && (
              <div className="space-y-3">
                <div className="rounded-2xl bg-amber-100 p-2.5 text-xs text-amber-950 leading-5">
                  قراردادهای کلان دولتی برای آبادانی دره زرین. با تکمیل این اهداف، پاداش‌های نجومی سکه و اعتبار بگیرید!
                </div>
                {CONTRACTS.map((c) => {
                  const cs = s.contracts.find((x) => x.id === c.id) || { progress: 0, claimed: false };
                  const isDone = cs.progress >= c.target;
                  return (
                    <div key={c.id} className="rounded-2xl bg-white p-3 shadow-md border-2 border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-slate-800 text-sm">{c.title}</span>
                        <span className="text-xs font-bold text-amber-700"><Coin v={c.rewardCoins} size={14} /></span>
                      </div>
                      <div className="text-xs text-slate-600 my-1">{c.desc}</div>
                      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full bg-gradient-to-l from-emerald-400 to-emerald-600"
                          style={{ width: `${Math.min(100, (cs.progress / c.target) * 100)}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">
                          {fmt(cs.progress)} / {fmt(c.target)}
                        </span>
                        {cs.claimed ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-slate-400"><Icon name="check" size={16} />وصول شد</span>
                        ) : (
                          <button
                            disabled={!isDone}
                            onClick={() => {
                              claimContract(s, c.id, ev);
                              setTick((n) => n + 1);
                            }}
                            className={`${btn} bg-emerald-600 text-white text-xs`}
                          >
                            دریافت پاداش
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Achievements Panel */}
            {panel === "achievements" && (
              <div className="space-y-2.5">
                {ACHIEVEMENTS.map((ach) => {
                  const done = !!s.achievements[ach.id];
                  return (
                    <div
                      key={ach.id}
                      className={`flex items-center gap-3 rounded-2xl p-3 border-2 ${
                        done ? "bg-emerald-50 border-emerald-400" : "bg-white border-slate-200 opacity-60"
                      }`}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100"><Icon name={achIcon(ach.id)} size={30} /></span>
                      <div className="flex-1">
                        <div className="font-black text-slate-800 text-sm">{ach.title}</div>
                        <div className="text-xs text-slate-600">{ach.desc}</div>
                      </div>
                      <span className="text-xs font-black text-amber-700"><Coin v={ach.reward} size={14} /></span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Story Journal Panel */}
            {panel === "story" && (
              <div className="space-y-3">
                <div className="rounded-2xl bg-gradient-to-l from-amber-100 to-orange-100 p-3 text-xs font-bold leading-6 text-amber-950">
                  داستانِ تو: از یک کارمندِ اخراج‌شده تا کشاورزی که سندِ «دره زرین» به نامِ اوست. هر فصل یک هدفِ واقعی در بازی دارد؛ با کامل شدنش، صحنه‌ی پایانیِ آن فصل پخش می‌شود.
                </div>
                <div className="flex items-center justify-between rounded-2xl border-2 border-purple-300 bg-purple-50 p-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-black text-purple-950"><Icon name="film" size={20} />فصل جاری: {storyCh.title}</div>
                    <div className="text-xs font-bold text-purple-800">{storyCh.subtitle}</div>
                    {storyCh.goal && (
                      <div className="mt-1 text-[11px] font-black text-emerald-700">
                        <span className="inline-flex items-center gap-1"><Icon name="target" size={14} />{storyCh.goal.label}: {fmt(Math.min(storyP.cur, storyP.target))}/{fmt(storyP.target)}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { s.story.shown = true; setPanel(null); setTick((n) => n + 1); }}
                    className={`${btn} bg-purple-600 text-xs text-white`}
                  >
                    {storyP.cur >= storyP.target && storyCh.goal ? "دیدن صحنه‌ی پایانی" : "مرور صحنه‌ها"}
                  </button>
                </div>
                {CHAPTERS.map((c) => {
                  const done = s.story.completed.includes(c.id);
                  const active = c.id === storyCh.id;
                  const lockedCh = !done && !active;
                  const gp = goalProgress(s, c);
                  return (
                    <div
                      key={c.id}
                      className={`rounded-2xl border-2 p-3 ${
                        done ? "border-emerald-400 bg-emerald-50" : active ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Icon name={done ? "check" : active ? "story" : "lock"} size={28} />
                          <div>
                            <div className="text-sm font-black text-slate-800">فصل {fmt(c.num)}: {lockedCh ? "؟؟؟" : c.title}</div>
                            <div className="text-[11px] text-slate-500">{lockedCh ? "با پیشرفت در داستان باز می‌شود" : c.subtitle}</div>
                          </div>
                        </div>
                        {c.reward.coins > 0 && (
                          <span className="shrink-0 rounded-lg bg-amber-200 px-2 py-1 text-[10px] font-black text-amber-900"><Coin v={c.reward.coins} size={12} /></span>
                        )}
                      </div>
                      {!lockedCh && c.goal && (
                        <div className="mt-2">
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-emerald-600" style={{ width: `${Math.min(100, (gp.cur / gp.target) * 100)}%` }} />
                          </div>
                          <div className="mt-1 flex justify-between text-[10px] font-bold text-slate-600">
                            <span className="inline-flex items-center gap-1"><Icon name="target" size={12} />{c.goal.label}</span>
                            <span>{fmt(Math.min(gp.cur, gp.target))}/{fmt(gp.target)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Settings Panel */}
            {panel === "settings" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-white p-3 shadow">
                  <span className="flex items-center gap-2 text-sm font-black text-slate-800">
                    <Icon name={sfx ? "sound" : "mute"} size={26} />
                    جلوه‌های صوتی
                  </span>
                  <button
                    type="button"
                    onClick={() => { const v = !sfx; setSfx(v); setSoundOn(v); if (v) sound("click"); }}
                    className={`relative h-8 w-16 rounded-full transition ${sfx ? "bg-emerald-500" : "bg-slate-300"}`}
                    aria-label="روشن/خاموش کردن صدا"
                  >
                    <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${sfx ? "right-1" : "right-9"}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-white p-3 shadow">
                  <span className="flex items-center gap-2 text-sm font-black text-slate-800">
                    <Icon name="target" size={26} />
                    لرزش لمسی (هپتیک)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const v = !hapticsState;
                      setHapticsState(v);
                      setHaptics(v);
                      if (v) haptic("success");
                    }}
                    className={`relative h-8 w-16 rounded-full transition ${hapticsState ? "bg-emerald-500" : "bg-slate-300"}`}
                    aria-label="روشن/خاموش کردن لرزش لمسی"
                  >
                    <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${hapticsState ? "right-1" : "right-9"}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-white p-3 shadow">
                  <span className="flex flex-col text-sm font-black text-slate-800">
                    <span className="flex items-center gap-2"><Icon name="center" size={26} /> تمام‌صفحه‌ی موبایل</span>
                    <span className="mt-0.5 text-[11px] font-bold text-slate-500">
                      {fs.supported ? (fs.isFullscreen ? "روشن — صفحه بدون نوار مرورگر" : "خاموش — نوار مرورگر دیده می‌شود") : "مرورگر شما پشتیبانی نمی‌کند (iOS: از دکمه‌ی اشتراک‌گذاری → افزودن به صفحه‌ی خانه)"}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={!fs.supported}
                    onClick={() => { void fs.toggle(); haptic("tap"); }}
                    className={`relative h-8 w-16 shrink-0 rounded-full transition ${fs.isFullscreen ? "bg-emerald-500" : "bg-slate-300"} ${fs.supported ? "" : "opacity-40"}`}
                    aria-label="روشن/خاموش کردن تمام‌صفحه"
                  >
                    <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${fs.isFullscreen ? "right-1" : "right-9"}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-white p-3 shadow">
                  <span className="flex flex-col text-sm font-black text-slate-800">
                    <span className="flex items-center gap-2"><Icon name="sun" size={26} /> قفل جهت عمودی</span>
                    <span className="mt-0.5 text-[11px] font-bold text-slate-500">برای بازی با یک دست، صفحه را عمودی نگه می‌دارد</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const v = !vsync;
                      setVsync(v);
                      if (v) void lockOrientation("portrait");
                      else unlockOrientation();
                      haptic("tap");
                    }}
                    className={`relative h-8 w-16 shrink-0 rounded-full transition ${vsync ? "bg-emerald-500" : "bg-slate-300"}`}
                    aria-label="قفل جهت صفحه"
                  >
                    <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${vsync ? "right-1" : "right-9"}`} />
                  </button>
                </div>

                <button className={`${btn} w-full bg-sky-600 text-white`} onClick={() => { save(); toast("بازی ذخیره شد", "ok"); }}>
                  <Icon name="save" size={18} /> ذخیره دستی
                </button>

                <button className={`${btn} w-full bg-amber-600 text-white`} onClick={() => { recenter(); setPanel(null); }}>
                  <Icon name="center" size={18} /> بازگشت دوربین به مزرعه
                </button>

                <div className="rounded-2xl bg-white p-3 text-xs font-bold leading-6 text-slate-700 shadow">
                  <div className="mb-1 flex items-center gap-1.5 text-sm font-black text-slate-800"><Icon name="info" size={20} />وضعیت بازی</div>
                  روز {fmt(s.day)} · نسل {fmt(s.prestige)} · {fmt(s.bought)} قطعه زمین خریداری‌شده
                  <br />ذخیره‌سازی: {saveState === "cloud" ? "ابری و محلی" : saveState === "saving" ? "در حال ذخیره" : saveState === "queued" ? "محلی — در صف ارسال ابری" : "محلی"} — هر ۱۲ ثانیه خودکار
                  <br />اتصال: {online ? "آنلاین" : "آفلاین — بازی کامل ادامه دارد و سیو در صف می‌ماند"}
                  <br />نصب‌شدنی: {typeof navigator !== "undefined" && "serviceWorker" in navigator ? "آفلاین آماده (PWA)" : "بدون پشتیبانی مرورگر"}
                  <br />اندازه‌ی صفحه: {typeof window !== "undefined" ? `${fmt(window.innerWidth)}×${fmt(window.innerHeight)}` : "—"}
                </div>

                <button
                  className={`${btn} w-full bg-red-600 text-white`}
                  onClick={() => {
                    if (!confirm("همه‌ی پیشرفت پاک شود و بازی از ابتدا شروع شود؟")) return;
                    const fresh = newState();
                    try { localStorage.removeItem("farm_save"); } catch { /* ignore */ }
                    sRef.current = fresh;
                    fxRef.current = [];
                    walkersRef.current.clear();
                    setPanel(null);
                    setTool("hand");
                    setBsel("");
                    setStarted(false);
                    save();
                    setTick((n) => n + 1);
                  }}
                >
                  <Icon name="trash" size={18} /> شروع دوباره از ابتدا
                </button>
              </div>
            )}

            {/* Help Panel */}
            {panel === "help" && (
              <div className="space-y-2.5 text-sm leading-7 text-amber-950 font-medium">
                <p>
                  <Icon name="target" size={18} /> <b>کنترل کاملاً لمسی:</b> یک ضربه روی زمین = اجرای ابزار فعال · کشیدن انگشت = جابه‌جایی نقشه · دو انگشت یا دکمه‌های کنار صفحه = بزرگ‌نمایی.
                </p>
                <ul className="mr-2 list-inside list-disc space-y-1 text-xs text-slate-700">
                  <li><b>دست:</b> برداشت محصول رسیده، جمع‌آوری تولیدات و باز کردن کارگاه‌ها.</li>
                  <li><b>کاشت:</b> فقط روی خاک شخم‌خورده‌ی خالی.</li>
                  <li><b>آب:</b> فقط روی خاک خشک؛ رشد را ۸۰٪ سریع‌تر می‌کند.</li>
                  <li><b>کود:</b> دو محصول اضافه هنگام برداشت.</li>
                  <li><b>شخم:</b> تبدیل چمن به خاک زراعی.</li>
                  <li><b>ساخت:</b> کارخانه‌ها، دامداری‌ها و ماشین‌های خودکار.</li>
                  <li><b>پاکسازی:</b> قطع درخت، شکستن سنگ و برچیدن سازه.</li>
                </ul>
                <p>
                  <Icon name="skills" size={18} /> <b>مهارت‌ها:</b> هر سطح یک امتیاز می‌دهد؛ با آن سرعت رشد، سود فروش و ظرفیت انبار را دائمی بالا ببرید.
                </p>
                <p>
                  <Icon name="decor" size={18} /> <b>دکوراسیون:</b> پس از دانش «طراحی منظر» می‌توانید فواره، آلاچیق، مجسمه و باغچه بسازید.
                </p>
                <p>
                  <Icon name="rain" size={18} /> <b>فصل‌ها و آب‌وهوا:</b> هر ۵ روز فصل عوض می‌شود؛ باران آبیاری رایگان و زمستان رشد کندتری دارد.
                </p>
                <p>
                  <Icon name="cloud" size={18} /> <b>ذخیره:</b> خودکار هر ۱۲ ثانیه روی سرور و دستگاه؛ مزرعه تا ۲ ساعت در غیاب شما رشد می‌کند.
                </p>
              </div>
            )}

            {/* Building Specific Workshop Details */}
            {bt &&
              bt.b &&
              (() => {
                const def = BMAP[bt.b];
                if (!def || !def.recipes.length) {
                  return <p className="p-4 text-center text-amber-900 font-bold">{def?.desc}</p>;
                }
                const maxQ = 3 + Math.floor(s.level / 4) + (s.techs.includes("auto_feed") ? 2 : 0);
                return (
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-white p-3 shadow-md">
                      <div className="mb-2 flex items-center justify-between text-sm font-black">
                        <span>
                          صف تولید ({fmt(bt.q?.length || 0)} / {fmt(maxQ)})
                        </span>
                        {bt.out && bt.out.length > 0 && (
                          <button
                            className={`${btn} bg-emerald-600 text-xs text-white`}
                            onClick={() => {
                              collect(s, bt, bp!.bx, bp!.by, ev);
                              setTick((n) => n + 1);
                            }}
                          >
                            جمع‌آوری {bt.out.slice(0, 4).map((o, oi) => <ItemIcon key={oi} id={o} size={16} />)}
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {Array.from({ length: maxQ }).map((_, i) => {
                          const r = bt.q && bt.q[i] !== undefined ? def.recipes[bt.q[i]] : null;
                          return (
                            <div
                              key={i}
                              className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-amber-100 text-2xl shadow-inner"
                            >
                              {r && i === 0 && (
                                <div
                                  className="absolute bottom-0 left-0 right-0 bg-lime-400/70 transition-all"
                                  style={{ height: `${(bt.p || 0) * 100}%` }}
                                />
                              )}
                              <span className="relative">{r ? <ItemIcon id={r.out} size={34} /> : null}</span>
                            </div>
                          );
                        })}
                      </div>
                      {bt.q && bt.q.length > 0 && (
                        <div className="mt-2 text-xs font-bold text-slate-500">
                          <span className="inline-flex items-center gap-1"><Icon name="clock" size={14} />{fmt((1 - (bt.p || 0)) * def.recipes[bt.q[0]].time)} ثانیه تا کالای بعدی</span>
                        </div>
                      )}
                    </div>

                    {/* Auto-repeat production toggle */}
                    <div className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-md">
                      <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-700"><Icon name="repeat" size={20} />تولید خودکار پیوسته</span>
                      <button
                        onClick={() => {
                          bt.autoMode = !bt.autoMode;
                          setTick((n) => n + 1);
                        }}
                        className={`px-3 py-1 text-xs rounded-xl font-bold ${
                          bt.autoMode ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {bt.autoMode ? "فعال" : "غیرفعال"}
                      </button>
                    </div>

                    {def.recipes.map((r, ri) => {
                      const ok = has(s, r.inp);
                      const cost = Object.entries(r.inp).reduce((a, [k, n]) => a + (ITEMS[k]?.base || 0) * n, 0);
                      return (
                        <div key={ri} className="flex items-center gap-2.5 rounded-2xl bg-white p-3 shadow-md">
                          <ItemIcon id={r.out} size={46} />
                          <div className="flex-1">
                            <div className="font-black text-slate-800 text-sm">
                              {ITEMS[r.out]?.name}{" "}
                              <span className="inline-flex items-center gap-0.5 text-xs font-bold text-slate-500"><Icon name="clock" size={12} />{fmt(r.time)}ث</span>
                            </div>
                            <div className="flex flex-wrap gap-1 text-xs mt-1">
                              {Object.entries(r.inp).map(([k, n]) => (
                                <span
                                  key={k}
                                  className={`inline-flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 font-bold ${
                                    (s.inv[k] || 0) >= n ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"
                                  }`}
                                >
                                  <ItemIcon id={k} size={16} /> {fmt(s.inv[k] || 0)}/{fmt(n)}
                                </span>
                              ))}
                            </div>
                            <div className="text-[11px] font-bold text-emerald-700 mt-1">
                              ارزش افزوده: +{fmt(ITEMS[r.out]?.base - cost)}
                            </div>
                          </div>
                          <button
                            disabled={!ok}
                            className={`${btn} bg-orange-600 text-sm text-white`}
                            onClick={() => {
                              queueRecipe(s, bt, ri, ev);
                              setTick((n) => n + 1);
                            }}
                          >
                            تولید
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
          </div>
        </div>
      )}

      {/* Intro Splash Welcome Screen */}
      {!started && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
          <div className="mx-3 max-w-lg rounded-[2rem] border-2 border-amber-400 bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 p-5 text-center shadow-2xl md:mx-4 md:rounded-[2.5rem] md:border-4 md:p-8">
            <div className="mb-2 flex justify-center">
              <Image src="/images/logo_badge.png" alt="Logo" width={112} height={112} className="h-20 w-20 drop-shadow-2xl animate-pulse md:h-28 md:w-28" />
            </div>
            <h1 className="bg-gradient-to-l from-emerald-700 via-amber-600 to-yellow-600 bg-clip-text text-3xl font-black text-transparent md:text-4xl">
              مزرعه طلایی: نسخه نهایی
            </h1>
            <p className="mt-2 text-amber-950 font-bold text-sm">
              تجربه عمیق ۲.۵ بعدی با تفکیک ابزارهای حرفه‌ای، سیستم مهارت‌های پیشرفته و دکوراسیون کامل
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-black text-amber-950">
              <div className="flex flex-col items-center gap-1 rounded-xl bg-white/80 p-2 shadow-sm"><Icon name="target" size={28} />ابزارهای دقیق</div>
              <div className="flex flex-col items-center gap-1 rounded-xl bg-white/80 p-2 shadow-sm"><Icon name="skills" size={28} />۱۳ مهارت</div>
              <div className="flex flex-col items-center gap-1 rounded-xl bg-white/80 p-2 shadow-sm"><Icon name="decor" size={28} />۱۰ دکور</div>
              <div className="flex flex-col items-center gap-1 rounded-xl bg-white/80 p-2 shadow-sm"><Icon name="spring" size={28} />چهار فصل</div>
              <div className="flex flex-col items-center gap-1 rounded-xl bg-white/80 p-2 shadow-sm"><Icon name="crown" size={28} />نسل‌های بی‌پایان</div>
              <div className="flex flex-col items-center gap-1 rounded-xl bg-white/80 p-2 shadow-sm"><Icon name="cloud" size={28} />ذخیره ابری</div>
            </div>

            <button
              onClick={() => {
                haptic("big");
                void enterFsAndLock();
                if (vsync) void lockOrientation("portrait");
                try { localStorage.setItem("farm_started", "1"); } catch { /* حافظه در دسترس نیست */ }
                setStarted(true);
                s.story.shown = true;
                setTick((x) => x + 1);
                sound("lvl");
              }}
              className="mt-6 w-full rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 py-4 text-2xl font-black text-white shadow-[0_6px_0_#1b5e20] transition-all active:translate-y-1 active:shadow-none"
            >
              <span className="inline-flex items-center justify-center gap-2"><Icon name="play" size={30} />آغاز داستان</span>
            </button>
            <p className="mt-3 text-[11px] font-bold text-amber-900/70">
              <span className="inline-flex items-center gap-2">سطح {fmt(s.level)} · <Coin v={s.coins} size={13} /></span>
            </p>
          </div>
        </div>
      )}

      {/* Cinematic Story / Dialogue System */}
      {started && s.story.shown && (
        <StoryModal
          s={s}
          onAdvance={() => advanceStory(s, ev)}
          onName={(n) => { s.story.name = n; }}
          onClose={() => { s.story.shown = false; setTick((x) => x + 1); }}
          refresh={() => setTick((x) => x + 1)}
        />
      )}
    </div>
  );
}
