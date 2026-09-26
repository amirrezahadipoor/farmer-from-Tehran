import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { saves } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ data: null });
  try {
    const rows = await db.select().from(saves).where(eq(saves.id, id)).limit(1);
    return NextResponse.json({ data: rows[0]?.data ?? null });
  } catch {
    return NextResponse.json({ data: null });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { id?: string; data?: unknown };
    if (!body.id || typeof body.id !== "string" || body.id.length > 64 || !body.data)
      return NextResponse.json({ ok: false }, { status: 400 });
    await db
      .insert(saves)
      .values({ id: body.id, data: body.data, updatedAt: new Date() })
      .onConflictDoUpdate({ target: saves.id, set: { data: body.data, updatedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
