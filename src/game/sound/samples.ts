/**
 * src/game/sound/samples.ts — بانکِ صداهای واقعی (نقشه‌ی راه، مورد ۱۰)
 *
 * بعد از اولین لمس (وقتی AudioContext ساخته شد) فایل‌ها کم‌کم دانلود و رمزگشایی می‌شوند؛ تا آماده شوند
 * همان سنتزِ قبلی جایگزین است و در مرورگرِ بی‌decodeAudioData یا بی‌شبکه‌ی بارِ اول هم بازی بی‌صدا نمی‌ماند.
 * سرویس‌ورکر هر فایل را بعد از اولین دریافت نگه می‌دارد، پس از بارِ دوم آفلاین هم کامل است.
 */
import { asset } from "../base";
import { SETAR_NOTES } from "./samples.gen";

type Decoder = Pick<BaseAudioContext, "decodeAudioData">;
export type Fetcher = (url: string) => Promise<ArrayBuffer>;

const defaultFetch: Fetcher = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.arrayBuffer();
};

export class SampleBank {
  private readonly bufs = new Map<string, AudioBuffer>();
  private readonly pending = new Set<string>();
  failed = 0;

  constructor(
    private readonly ac: Decoder,
    private readonly fetcher: Fetcher = defaultFetch,
  ) {}

  get(path: string): AudioBuffer | null {
    return this.bufs.get(path) ?? null;
  }
  has(path: string) {
    return this.bufs.has(path);
  }
  get size() {
    return this.bufs.size;
  }

  /** دانلود به ترتیبِ اولویت با هم‌زمانیِ محدود (پهنای باندِ موبایل را قبضه نمی‌کند) */
  async load(paths: string[], concurrency = 4): Promise<void> {
    const queue = paths.filter((p) => !this.bufs.has(p) && !this.pending.has(p));
    queue.forEach((p) => this.pending.add(p));
    const worker = async () => {
      for (let p = queue.shift(); p; p = queue.shift()) {
        try {
          this.bufs.set(p, await this.ac.decodeAudioData(await this.fetcher(asset(p))));
        } catch {
          this.failed++; // همان جلوه با سنتز پخش می‌شود
        } finally {
          this.pending.delete(p);
        }
      }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));
  }
}

/** نزدیک‌ترین نتِ ضبط‌شده‌ی سه‌تار به بسامدِ خواسته (فاصله‌ی لگاریتمی)؛ کوکِ دقیق با نرخِ پخش */
export function nearestSetar(freq: number, has: (file: string) => boolean): { file: string; freq: number } | null {
  let best: { file: string; freq: number } | null = null;
  let bestD = Infinity;
  for (const n of SETAR_NOTES) {
    if (!has(n.file)) continue;
    const d = Math.abs(Math.log2(freq / n.freq));
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}
