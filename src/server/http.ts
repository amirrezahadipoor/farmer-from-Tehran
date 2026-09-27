/**
 * src/server/http.ts — ابزارِ مشترکِ مسیرهای API (خواندنِ بدنه با سقف)
 */
export class TooLarge extends Error {}

/** بدنه را تا سقفِ max بایت می‌خواند؛ بیشتر → TooLarge (content-length می‌تواند دروغ بگوید یا نباشد) */
export async function readCapped(req: Request, max: number): Promise<string> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      throw new TooLarge();
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c.buffer, c.byteOffset, c.byteLength))).toString("utf8");
}
