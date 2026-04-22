import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const workScheduleTable = pgTable("work_schedule", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companiesTable.id, { onDelete: "cascade" }),
  startTime: text("start_time").notNull().default("08:00"),
  endTime: text("end_time").notNull().default("17:00"),
  workDays: text("work_days").array().notNull().default(["mon", "tue", "wed", "thu", "fri"]),
  lateToleranceMinutes: integer("late_tolerance_minutes").notNull().default(15),
});

export const insertWorkScheduleSchema = createInsertSchema(workScheduleTable).omit({ id: true });
export type InsertWorkSchedule = z.infer<typeof insertWorkScheduleSchema>;
export type WorkSchedule = typeof workScheduleTable.$inferSelect;
