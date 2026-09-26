"use client";

import { useEffect, useState } from "react";
import { CHAPTERS, currentChapter, sceneText, goalProgress, isStoryFinished } from "./story";
import { State } from "./logic";
import { fmt } from "./data";
import { Icon, Portrait, speakerSvg, dropEmoji } from "./icons";
import { sound } from "./audio";

const MOOD_GRADE: Record<string, string> = {
  sad: "from-slate-900/85 via-slate-800/70 to-blue-950/85",
  warm: "from-amber-950/70 via-orange-900/55 to-amber-900/75",
  tense: "from-red-950/80 via-slate-900/70 to-zinc-950/85",
  hope: "from-emerald-950/70 via-teal-900/55 to-amber-900/60",
  epic: "from-indigo-950/75 via-purple-900/55 to-amber-800/60",
  night: "from-slate-950/88 via-indigo-950/75 to-slate-900/85",
};

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
  const [name, setName] = useState(st.name || "");
  const full = scene ? sceneText(scene.text, st.name) : "";
  // ماشین‌تحریر: پیشرفت به «متن» گره خورده است؛ متن تازه = شروع از صفر، بدون setState همگام در effect
  const [tw, setTw] = useState({ text: "", n: 0 });
  const shown = tw.text === full ? tw.n : 0;
  const typed = full.slice(0, shown);
  const done = shown >= full.length;

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      // اگر بازیکن با لمس متن را کامل کرده، تیکِ بعدی آن را عقب نمی‌برد
      setTw((prev) => (prev.text === full && prev.n >= i ? prev : { text: full, n: i }));
      if (i >= full.length) clearInterval(iv);
    }, 22);
    return () => clearInterval(iv);
  }, [full]);

  // پیش‌بارگذاری تصویر صحنه‌ی بعدی تا هیچ‌وقت تأخیرِ سیاه‌شدن نبینی (P2.5)
  useEffect(() => {
    const next = scenes[Math.min(st.sceneIdx + 1, scenes.length - 1)];
    if (next?.bg && next.bg !== scene?.bg) {
      const img = new window.Image();
      img.decoding = "async";
      img.src = next.bg;
    }
  }, [scenes, st.sceneIdx, scene?.bg]);

  // Name entry gate at the very start
  if (!st.name) {
    return (
      <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-950/95 p-6 backdrop-blur-md" dir="rtl">
        <div className="w-full max-w-md rounded-3xl border-4 border-amber-400/70 bg-gradient-to-b from-amber-50 to-orange-100 p-7 text-center shadow-2xl">
          <div className="flex justify-center"><Portrait html={speakerSvg("grandpa")} size={84} className="ring-4 ring-amber-300" /></div>
          <h2 className="mt-2 text-2xl font-black text-amber-950">پیش از آغاز داستان</h2>
          <p className="mt-2 text-sm font-bold leading-7 text-amber-900">
            نامت را بنویس. این نام در وصیت‌نامه‌ی بابابزرگ، روی سندِ دره زرین و در خاطره‌ی اهالی دهکده می‌ماند.
          </p>
          <input
            value={name}
            maxLength={16}
            onChange={(e) => setName(dropEmoji(e.target.value))}
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) { onName(name.trim()); refresh(); } }}
            placeholder="مثلاً: امید"
            className="mt-4 w-full rounded-2xl border-2 border-amber-300 bg-white px-4 py-3 text-center text-lg font-black text-amber-950 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200"
          />
          <button
            disabled={!name.trim()}
            onClick={() => { onName(name.trim()); refresh(); }}
            className="mt-4 w-full rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 py-3.5 text-xl font-black text-white shadow-[0_5px_0_#14532d] transition active:translate-y-1 active:shadow-none disabled:opacity-40"
          >
            <span className="inline-flex items-center gap-2"><Icon name="play" size={26} />آغاز داستان</span>
          </button>
        </div>
      </div>
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

  const click = () => {
    if (!done) {
      setTw({ text: full, n: full.length }); // لمس = نمایش کامل متن
      return;
    }
    sound("page");
    onAdvance();
    refresh();
  };

  const p = goalProgress(s, ch);
  const titleCard = st.sceneIdx === 0 && !isEnd;

  return (
    <div className="absolute inset-0 z-[60] overflow-hidden bg-black" dir="rtl" onClick={click}>
      {/* Cinematic background with Ken Burns motion */}
      <div className="absolute inset-0 animate-[kenburns_26s_ease-in-out_infinite_alternate] bg-cover bg-center" style={{ backgroundImage: `url(${scene.bg})` }} />
      <div className={`absolute inset-0 bg-gradient-to-b ${MOOD_GRADE[scene.mood] || MOOD_GRADE.warm}`} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(0,0,0,0.65)_100%)]" />
      {/* Film grain / vignette stripes */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/80 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/90 to-transparent" />

      {/* Chapter title card */}
      {titleCard && (
        <div className="pointer-events-none absolute inset-x-0 top-[16%] text-center">
          <div className="text-sm font-black tracking-widest text-amber-300/90">فصل {fmt(ch.num)}</div>
          <h1 className="mt-1 text-4xl font-black text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] md:text-5xl">{ch.title}</h1>
          <p className="mt-2 text-sm font-bold text-amber-100/85">{ch.subtitle}</p>
        </div>
      )}

      {/* Close */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute left-4 top-[max(16px,env(safe-area-inset-top))] z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur transition"
        aria-label="بستن"
      >
        <Icon name="close" size={20} />
      </button>

      {/* Dialogue box */}
      <div className="absolute inset-x-0 bottom-0 p-3 md:p-6">
        <div className="mx-auto max-w-3xl rounded-3xl border-2 border-amber-300/40 bg-slate-950/75 p-4 shadow-2xl backdrop-blur-md md:p-5">
          <div className="flex items-start gap-3">
            <Portrait html={speakerSvg(scene.av)} size={60} className="shadow-lg ring-2 ring-amber-300/70 md:!h-[72px] md:!w-[72px]" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-black text-amber-200 md:text-lg">{sceneText(scene.sp, st.name)}</span>
                {scene.role && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/75">{scene.role}</span>}
              </div>
              <p className="mt-1.5 min-h-[64px] text-sm font-bold leading-8 text-white/95 md:text-base md:leading-9">
                {typed}
                {!done && <span className="animate-pulse text-amber-300">▌</span>}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
            <div className="flex items-center gap-1.5">
              {scenes.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i === st.sceneIdx ? "w-6 bg-amber-300" : i < st.sceneIdx ? "w-1.5 bg-amber-300/50" : "w-1.5 bg-white/25"}`} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {ch.goal && !isEnd && (
                <span className="hidden rounded-xl bg-emerald-500/20 px-2.5 py-1 text-[10px] font-black text-emerald-200 sm:block">
                  <span className="inline-flex items-center gap-1"><Icon name="target" size={14} />{fmt(Math.min(p.cur, p.target))}/{fmt(p.target)}</span>
                </span>
              )}
              <span className="animate-pulse rounded-xl bg-amber-400/90 px-3 py-1.5 text-xs font-black text-amber-950">
                {done ? <span className="inline-flex items-center gap-1">ادامه<Icon name="arrow" size={14} /></span> : "لمس = نمایش کامل متن"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reward hint on end scenes */}
      {isEnd && ch.reward.coins > 0 && (
        <div className="pointer-events-none absolute right-4 top-4 rounded-2xl border-2 border-amber-300/50 bg-slate-950/70 px-3 py-2 text-xs font-black text-amber-200 backdrop-blur">
          <span className="inline-flex items-center gap-2"><Icon name="gift" size={18} /><Icon name="coin" size={14} />{fmt(ch.reward.coins)}<Icon name="star" size={14} />{fmt(ch.reward.xp)}<Icon name="skills" size={14} />{fmt(ch.reward.sp)}</span>
        </div>
      )}
      {isStoryFinished(s) && (
        <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-amber-400 px-4 py-1 text-xs font-black text-amber-950">پایانِ باز — داستان با هر تناسخ ادامه دارد</div>
      )}
    </div>
  );
}
