import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { saves } from "@/db/schema";

export const dynamic = "force-dynamic";

/** گرفتن سیو از ابر. اگر دیتابیس نباشد، بازی آفلاین ادامه می‌دهد. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id || id.length > 64) return NextResponse.json({ data: null, mode: "offline" });

  const db = getDb();
  if (!db) return NextResponse.json({ data: null, mode: "offline" });

  try {
    const rows = await db.select().from(saves).where(eq(saves.id, id)).limit(1);
    return NextResponse.json({ data: rows[0]?.data ?? null, mode: "cloud" });
  } catch {
    return NextResponse.json({ data: null, mode: "offline" });
  }
}

/** ذخیره در ابر. بدون دیتابیس، موفق برمی‌گردد ولی حالت را offline اعلام می‌کند. */
export async function POST(req: Request) {
  const db = getDb();
  if (!db) return NextResponse.json({ ok: false, mode: "offline" });

  try {
    const body = (await req.json()) as { id?: string; data?: unknown };
    if (!body.id || typeof body.id !== "string" || body.id.length > 64 || !body.data)
      return NextResponse.json({ ok: false, mode: "cloud" }, { status: 400 });

    await db
      .insert(saves)
      .values({ id: body.id, data: body.data, updatedAt: new Date() })
      .onConflictDoUpdate({ target: saves.id, set: { data: body.data, updatedAt: new Date() } });

    return NextResponse.json({ ok: true, mode: "cloud" });
  } catch {
    return NextResponse.json({ ok: false, mode: "offline" }, { status: 200 });
  }
}
