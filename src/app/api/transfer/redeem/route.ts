import { getDb } from "@/db";
import { PgSaveStore, asSqlRunner } from "@/server/save/store";
import { PgTransferStore } from "@/server/transfer/store";
import { defaultTransferLimit, handleRedeem } from "@/server/transfer/handler";

export const dynamic = "force-dynamic";

/** /api/transfer/redeem — دریافتِ مزرعه با کدِ انتقال (یک‌بارمصرف، مورد ۳) */
const limit = defaultTransferLimit();

export async function POST(req: Request) {
  const db = getDb();
  return handleRedeem(req, { saves: db ? new PgSaveStore(asSqlRunner(db)) : null, transfers: db ? new PgTransferStore(asSqlRunner(db)) : null, limit });
}
