import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const saves = pgTable("farm_saves", {
  id: text("id").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  /** P5.13: sha256 توکنِ دستگاهِ مالک (خودِ توکن هیچ‌جا ذخیره نمی‌شود)؛ null = ردیفِ قدیمی */
  tokenHash: text("token_hash"),
});
