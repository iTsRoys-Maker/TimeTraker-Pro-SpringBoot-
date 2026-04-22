import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { employeesTable } from "./employees";
import { companiesTable } from "./companies";

export const attendanceLogsTable = pgTable("attendance_logs", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["check_in", "check_out"] }).notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  notes: text("notes"),
});

export const insertAttendanceLogSchema = createInsertSchema(attendanceLogsTable).omit({ id: true });
export type InsertAttendanceLog = z.infer<typeof insertAttendanceLogSchema>;
export type AttendanceLog = typeof attendanceLogsTable.$inferSelect;
