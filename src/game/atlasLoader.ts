/**
 * src/game/atlasLoader.ts — بارگذاریِ اطلسِ آرت (نقشه‌ی راه، فاز A)
 *
 *  • فقط در مرورگر؛ یک بار در سراسرِ اپ.
 *  • fetch با force-cache: Service Worker کشِ IMAGES (cache-first) پاسخ می‌دهد.
 *  • decode هر اطلس جدا: استالِ main-thread به طولِ decodeِ یک تصویر محدود می‌شود.
 *  • هر خطا (آفلاین، نبودِ manifest، تصویرِ ناقص) → سکوت و ماندن روی رسمِ رویه‌ای.
 */
import { asset } from "./base";
import { setAtlas, type AtlasManifest } from "./render/atlas";

let started = false;

/** شروعِ لود؛ onReady بعد از آماده‌شدنِ همه‌ی اطلس‌ها فراخوانی می‌شود */
export function startAtlasLoader(onReady?: () => void): void {
  if (started || typeof window === "undefined" || typeof Image === "undefined") return;
  started = true;
  void (async () => {
    try {
      const res = await fetch(asset("/art/manifest.json"), { cache: "force-cache" });
      if (!res.ok) return;
      const mf = (await res.json()) as AtlasManifest;
      if (!mf.atlases || !mf.entries) return;
      const imgs: Record<string, HTMLImageElement> = {};
      for (const [name, url] of Object.entries(mf.atlases)) {
        const im = new Image();
        im.src = asset(url);
        try {
          await im.decode();
        } catch {
          return; // تصویرِ معیوب ← همه‌چیز رویه‌ای
        }
        if (!im.naturalWidth) return;
        imgs[name] = im;
      }
      setAtlas(mf, imgs);
      onReady?.();
    } catch {
      /* آفلاین یا خطا ← رسمِ رویه‌ای می‌ماند */
    }
  })();
}
