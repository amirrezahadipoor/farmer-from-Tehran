"use client";
/**
 * src/game/ui/panels/Transfer.tsx — انتقال و پشتیبان (نقشه‌ی راه، مورد ۳)
 * ماندگاریِ حافظه، کدِ کوتاهِ انتقال (با سرور)، و متن یا فایلِ انتقال (همه‌جا، حتی دموی بی‌سرور)
 */
import { useEffect, useRef, useState } from "react";
import { fmt } from "../../data";
import { Icon } from "../../icons";
import type { State } from "../../logic";
import { STATIC_BUILD } from "../../base";
import { requestPersistence, type PersistState } from "../../persist";
import { TRANSFER_ERRORS, adoptSave, createTransferCode, decodeSave, encodeSave, redeemTransferCode } from "../../transfer";
import { formatCode } from "../../transferCode";
import { game, resetRuntime } from "../../store";
import { btn, type PanelProps } from "../common";

const card = "rounded-2xl bg-white p-3 shadow";
const head = "mb-2 flex items-center gap-1.5 text-sm font-black text-slate-800";
const PERSIST_TEXT: Record<PersistState, string> = {
  granted: "ماندگار است: مرورگر سیو را خودکار پاک نمی‌کند.",
  denied: "هنوز ماندگار نیست؛ مرورگر ممکن است در کمبودِ فضا یا بعد از مدتی بی‌استفادگی آن را پاک کند.",
  unsupported: "این مرورگر درخواستِ ماندگاری را پشتیبانی نمی‌کند.",
};

export function TransferPanel({ ui }: PanelProps) {
  const [persist, setPersist] = useState<PersistState | null>(null);
  const [code, setCode] = useState<{ code: string; expiresAt: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [redeem, setRedeem] = useState("");
  const [exported, setExported] = useState("");
  const [paste, setPaste] = useState("");
  const [pending, setPending] = useState<State | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void requestPersistence(false).then(setPersist);
  }, []);

  const offer = (st: State | null, bad = "متن یا فایلِ انتقال معتبر نیست") => {
    if (!st) return ui.toast(bad, "err");
    setPending(st);
  };

  const makeCode = async () => {
    setBusy(true);
    await ui.save(); // تازه‌ترین نسخه اول به ابر برود
    const r = await createTransferCode();
    setBusy(false);
    if ("error" in r) return ui.toast(TRANSFER_ERRORS[r.error], "err");
    setCode(r);
  };

  const takeCode = async () => {
    setBusy(true);
    const r = await redeemTransferCode(redeem);
    setBusy(false);
    if ("error" in r) return ui.toast(TRANSFER_ERRORS[r.error], "err");
    offer(r.state);
  };

  const makeText = async () => {
    const st = game.get();
    if (!st) return;
    setExported(await encodeSave(st));
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([exported], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `golden-valley-farm-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "مزرعه طلایی", text: exported });
      else await navigator.clipboard.writeText(exported);
      ui.toast("متنِ انتقال آماده‌ی فرستادن است", "ok");
    } catch {
      /* کاربر لغو کرد */
    }
  };

  const confirmImport = async () => {
    if (!pending) return;
    // حافظه‌ی بازی هم همین مزرعه می‌شود: ذخیره‌ی خودکارِ لحظه‌ی خروج (reload) باید مزرعه‌ی تازه را بنویسد،
    // نه وضعیتِ قبلی را با زمانِ جدیدتر روی آن
    resetRuntime();
    game.set(pending);
    await adoptSave(pending);
    location.reload();
  };

  return (
    <div className="space-y-2.5">
      <div className={card}>
        <div className={head}>
          <Icon name="lock" size={20} /> نگه‌داری روی همین دستگاه
        </div>
        <p className="text-xs font-bold leading-6 text-slate-600">
          هر سیو دو جا نوشته می‌شود (پایگاه‌داده‌ی مرورگر و حافظه‌ی محلی) و یک پشتیبانِ خودکار هم دارد. {persist ? PERSIST_TEXT[persist] : ""}
        </p>
        {persist === "denied" && (
          <button type="button" className={`${btn} mt-2 w-full bg-emerald-600 text-white`} onClick={() => void requestPersistence(true).then(setPersist)}>
            <Icon name="check" size={18} /> درخواستِ ماندگاری
          </button>
        )}
        <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">«افزودن به صفحه‌ی اصلی» هم سیو را از پاک‌شدنِ خودکار در امان نگه می‌دارد.</p>
      </div>

      <div className={card}>
        <div className={head}>
          <Icon name="cloud" size={20} /> کدِ کوتاهِ انتقال
        </div>
        {STATIC_BUILD ? (
          <p className="text-xs font-bold leading-6 text-slate-600">در نسخه‌ی دمو سرورِ ذخیره‌ی ابری نیست؛ از متن یا فایلِ انتقالِ پایین استفاده کن.</p>
        ) : (
          <>
            {code ? (
              <div className="rounded-xl bg-emerald-50 p-3 text-center">
                <div dir="ltr" className="font-mono text-2xl font-black tracking-widest text-emerald-800" aria-label="کدِ انتقال">
                  {formatCode(code.code)}
                </div>
                <div className="mt-1 text-[11px] font-bold text-emerald-700">
                  تا {new Date(code.expiresAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })} فردا، فقط یک بار
                </div>
              </div>
            ) : (
              <button type="button" disabled={busy} className={`${btn} w-full bg-sky-600 text-white`} onClick={() => void makeCode()}>
                <Icon name="cloud" size={18} /> ساختِ کدِ انتقال
              </button>
            )}
            <div className="mt-2 flex gap-2">
              <input
                dir="ltr"
                value={redeem}
                onChange={(e) => setRedeem(e.target.value.toUpperCase())}
                maxLength={9}
                placeholder="ABCD-EFGH"
                aria-label="کدِ انتقالِ دستگاهِ دیگر"
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-center font-mono text-lg font-black tracking-widest"
              />
              <button type="button" disabled={busy || redeem.length < 8} className={`${btn} shrink-0 bg-emerald-600 text-white`} onClick={() => void takeCode()}>
                دریافت
              </button>
            </div>
          </>
        )}
      </div>

      <div className={card}>
        <div className={head}>
          <Icon name="save" size={20} /> متن یا فایلِ انتقال
        </div>
        {exported ? (
          <>
            <textarea readOnly dir="ltr" value={exported} aria-label="متنِ انتقالِ این مزرعه" className="h-20 w-full rounded-xl bg-slate-50 p-2 font-mono text-[10px] text-slate-600" onFocus={(e) => e.currentTarget.select()} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" className={`${btn} bg-sky-600 text-white`} onClick={() => void share()}>
                فرستادن
              </button>
              <button type="button" className={`${btn} bg-white text-sky-800 ring-1 ring-sky-300`} onClick={download}>
                ذخیره در فایل
              </button>
            </div>
          </>
        ) : (
          <button type="button" className={`${btn} w-full bg-sky-600 text-white`} onClick={() => void makeText()}>
            <Icon name="save" size={18} /> ساختِ متنِ انتقال
          </button>
        )}
        <textarea
          dir="ltr"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder="GVF1..."
          aria-label="متنِ انتقال از دستگاهِ دیگر"
          className="mt-3 h-16 w-full rounded-xl border border-slate-300 p-2 font-mono text-[10px]"
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" disabled={!paste.trim()} className={`${btn} bg-emerald-600 text-white`} onClick={() => void decodeSave(paste).then((st) => offer(st))}>
            واردکردنِ متن
          </button>
          <button type="button" className={`${btn} bg-white text-emerald-800 ring-1 ring-emerald-300`} onClick={() => fileRef.current?.click()}>
            انتخابِ فایل
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.gvf,text/plain"
          className="hidden"
          aria-label="فایلِ انتقال"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void f.text().then(decodeSave).then((st) => offer(st));
            e.target.value = "";
          }}
        />
      </div>

      {pending && (
        <div role="alertdialog" aria-label="تأییدِ جایگزینیِ مزرعه" className="rounded-2xl bg-amber-50 p-3 ring-2 ring-amber-400">
          <p className="text-sm font-black leading-7 text-amber-900">
            مزرعه‌ی دریافتی: سطح {fmt(pending.level)}، {fmt(pending.coins)} سکه، روز {fmt(pending.day)}. جایگزینِ مزرعه‌ی فعلیِ این دستگاه شود؟
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" className={`${btn} bg-amber-600 text-white`} onClick={() => void confirmImport()}>
              بله، جایگزین کن
            </button>
            <button type="button" className={`${btn} bg-white text-slate-700 ring-1 ring-slate-300`} onClick={() => setPending(null)}>
              انصراف
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
