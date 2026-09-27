/**
 * src/server/log/server.ts — لاگِ ساختاریافته‌ی سرور (نقشه‌ی راه، مورد ۴)
 *
 * هر خطا یک خطِ JSON روی stderr: هر میزبانی (Vercel، Docker، systemd) آن را جمع می‌کند و قابلِ جست‌وجوست.
 * قبلاً خطای پایگاه‌داده بی‌صدا به «آفلاین» تبدیل می‌شد و هیچ ردی نمی‌ماند.
 */
export type Sink = (line: string) => void;

const defaultSink: Sink = (line) => console.error(line);

export function logServerError(where: string, err: unknown, sink: Sink = defaultSink): void {
  const e = err instanceof Error ? err : new Error(String(err));
  sink(
    JSON.stringify({
      level: "error",
      src: "server",
      at: new Date().toISOString(),
      where,
      message: e.message.slice(0, 300),
      stack: (e.stack || "").split("\n").slice(0, 6).join("\n").slice(0, 1200),
    }),
  );
}
