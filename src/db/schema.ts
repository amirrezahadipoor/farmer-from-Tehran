import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const saves = pgTable("farm_saves", {
  id: text("id").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  /** P5.13: sha256 توکنِ دستگاهِ مالک (خودِ توکن هیچ‌جا ذخیره نمی‌شود)؛ null = ردیفِ قدیمی */
  tokenHash: text("token_hash"),
});

/** مورد ۳: کدِ انتقالِ کوتاه — یک‌بارمصرف، ۲۴ ساعت؛ به ردیفِ سیو اشاره می‌کند (داده هنگامِ دریافت تازه خوانده می‌شود) */
export const transfers = pgTable("farm_transfers", {
  code: text("code").primaryKey(),
  saveId: text("save_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
