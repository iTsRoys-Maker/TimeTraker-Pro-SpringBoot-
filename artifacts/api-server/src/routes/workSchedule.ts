import { Router, type IRouter } from "express";
import { db, workScheduleTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/work-schedule", requireAuth, async (req, res): Promise<void> => {
  const companyId = req.user!.companyId;
  if (!companyId) {
    res.status(403).json({ error: "Se requiere contexto de empresa" });
    return;
  }

  const schedules = await db
    .select()
    .from(workScheduleTable)
    .where(eq(workScheduleTable.companyId, companyId));

  if (schedules.length === 0) {
    res.json({ id: 0, companyId, startTime: "08:00", endTime: "17:00", workDays: ["mon", "tue", "wed", "thu", "fri"], lateToleranceMinutes: 15 });
    return;
  }

  res.json(schedules[0]);
});

router.put("/work-schedule", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const companyId = req.user!.companyId;
  if (!companyId) {
    res.status(403).json({ error: "Se requiere contexto de empresa" });
    return;
  }

  const { startTime, endTime, workDays, lateToleranceMinutes } = req.body;

  if (!startTime || !endTime || !Array.isArray(workDays)) {
    res.status(400).json({ error: "Campos requeridos: startTime, endTime, workDays" });
    return;
  }

  const existing = await db
    .select()
    .from(workScheduleTable)
    .where(eq(workScheduleTable.companyId, companyId));

  let schedule;
  if (existing.length === 0) {
    [schedule] = await db
      .insert(workScheduleTable)
      .values({ companyId, startTime, endTime, workDays, lateToleranceMinutes: lateToleranceMinutes ?? 15 })
      .returning();
  } else {
    [schedule] = await db
      .update(workScheduleTable)
      .set({ startTime, endTime, workDays, lateToleranceMinutes: lateToleranceMinutes ?? 15 })
      .where(eq(workScheduleTable.companyId, companyId))
      .returning();
  }

  res.json(schedule);
});

export default router;
