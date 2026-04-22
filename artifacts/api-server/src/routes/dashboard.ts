import { Router, type IRouter } from "express";
import { db, employeesTable, attendanceLogsTable, companiesTable, usersTable } from "@workspace/db";
import { eq, gte, and, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const companyId = req.user!.companyId;
  if (!companyId) {
    res.status(403).json({ error: "Se requiere contexto de empresa" });
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(employeesTable)
    .where(and(eq(employeesTable.companyId, companyId), eq(employeesTable.status, "active")));

  const todayLogs = await db
    .select()
    .from(attendanceLogsTable)
    .where(and(eq(attendanceLogsTable.companyId, companyId), gte(attendanceLogsTable.timestamp, today)));

  const checkInsToday = todayLogs.filter((l) => l.type === "check_in").length;
  const checkOutsToday = todayLogs.filter((l) => l.type === "check_out").length;

  const activeTodayEmployees = new Set<number>();
  for (const log of todayLogs) {
    activeTodayEmployees.add(log.employeeId);
  }

  const totalEmployees = totalResult?.count ?? 0;
  const absentToday = Math.max(0, totalEmployees - activeTodayEmployees.size);

  res.json({
    totalEmployees,
    activeToday: activeTodayEmployees.size,
    checkInsToday,
    checkOutsToday,
    absentToday,
  });
});

router.get("/dashboard/attendance-trends", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const companyId = req.user!.companyId;
  if (!companyId) {
    res.status(403).json({ error: "Se requiere contexto de empresa" });
    return;
  }

  const trends = [];

  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    day.setHours(0, 0, 0, 0);

    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const logs = await db
      .select()
      .from(attendanceLogsTable)
      .where(
        and(
          eq(attendanceLogsTable.companyId, companyId),
          gte(attendanceLogsTable.timestamp, day),
          sql`${attendanceLogsTable.timestamp} < ${nextDay}`
        )
      );

    trends.push({
      date: day.toISOString().split("T")[0],
      checkIns: logs.filter((l) => l.type === "check_in").length,
      checkOuts: logs.filter((l) => l.type === "check_out").length,
    });
  }

  res.json(trends);
});

// ---------- Super admin global dashboard ----------

router.get("/dashboard/global-summary", requireAuth, requireRole("super_admin"), async (_req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [companiesCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(companiesTable);

  const [employeesCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(employeesTable)
    .where(eq(employeesTable.status, "active"));

  const todayLogs = await db
    .select()
    .from(attendanceLogsTable)
    .where(gte(attendanceLogsTable.timestamp, today));

  const checkInsToday = todayLogs.filter((l) => l.type === "check_in").length;
  const checkOutsToday = todayLogs.filter((l) => l.type === "check_out").length;
  const activeCompaniesToday = new Set(todayLogs.map((l) => l.companyId)).size;

  res.json({
    totalCompanies: companiesCount?.count ?? 0,
    totalEmployees: employeesCount?.count ?? 0,
    checkInsToday,
    checkOutsToday,
    activeCompaniesToday,
  });
});

router.get("/dashboard/global-trends", requireAuth, requireRole("super_admin"), async (_req, res): Promise<void> => {
  const trends = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    day.setHours(0, 0, 0, 0);

    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const logs = await db
      .select()
      .from(attendanceLogsTable)
      .where(
        and(
          gte(attendanceLogsTable.timestamp, day),
          sql`${attendanceLogsTable.timestamp} < ${nextDay}`
        )
      );

    trends.push({
      date: day.toISOString().split("T")[0],
      checkIns: logs.filter((l) => l.type === "check_in").length,
      checkOuts: logs.filter((l) => l.type === "check_out").length,
    });
  }

  res.json(trends);
});

router.get("/dashboard/companies-breakdown", requireAuth, requireRole("super_admin"), async (_req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const companies = await db.select().from(companiesTable).orderBy(companiesTable.name);

  const breakdown = await Promise.all(
    companies.map(async (c) => {
      const [emp] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(employeesTable)
        .where(and(eq(employeesTable.companyId, c.id), eq(employeesTable.status, "active")));

      const todayLogs = await db
        .select()
        .from(attendanceLogsTable)
        .where(and(eq(attendanceLogsTable.companyId, c.id), gte(attendanceLogsTable.timestamp, today)));

      return {
        companyId: c.id,
        companyName: c.name,
        employees: emp?.count ?? 0,
        checkInsToday: todayLogs.filter((l) => l.type === "check_in").length,
        checkOutsToday: todayLogs.filter((l) => l.type === "check_out").length,
      };
    })
  );

  res.json(breakdown);
});

export default router;
