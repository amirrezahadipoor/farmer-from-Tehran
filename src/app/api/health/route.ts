import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb, hasDatabase } from "@/db";
import { logServerError } from "@/server/log/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  if (!db) return NextResponse.json({ ok: true, database: "offline", configured: hasDatabase() });
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, database: "connected" });
  } catch (e) {
    logServerError("health.db", e);
    return NextResponse.json({ ok: true, database: "unreachable" });
  }
}
