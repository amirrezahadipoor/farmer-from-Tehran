import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const saves = pgTable("farm_saves", {
  id: text("id").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
