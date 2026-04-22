import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, employeesTable, attendanceLogsTable, workScheduleTable } from "@workspace/db";
import { eq, ilike, and, or, gte, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { audit } from "../lib/audit";

const DAY_MAP: Record<number, string> = {
  0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat",
};

const router: IRouter = Router();

router.get("/employees", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const companyId = req.user!.companyId;
  if (!companyId) {
    res.status(403).json({ error: "Se requiere contexto de empresa" });
    return;
  }

  const { search, status } = req.query as Record<string, string>;
  const conditions: ReturnType<typeof eq>[] = [eq(employeesTable.companyId, companyId) as any];

  if (search) {
    const s = `%${search}%`;
    conditions.push(
      or(
        ilike(employeesTable.name, s),
        ilike(employeesTable.documentNumber, s),
        ilike(employeesTable.department, s),
        ilike(employeesTable.position, s)
      ) as any
    );
  }
  if (status) conditions.push(eq(employeesTable.status, status as any) as any);

  const employees = await db
    .select()
    .from(employeesTable)
    .where(and(...conditions))
    .orderBy(employeesTable.name);

  res.json(employees);
});

router.post("/employees", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const companyId = req.user!.companyId;
  if (!companyId) {
    res.status(403).json({ error: "Se requiere contexto de empresa" });
    return;
  }

  const { documentNumber, name, position, department, email, phone, status } = req.body;

  if (!documentNumber || !name || !position || !department) {
    res.status(400).json({ error: "Campos requeridos: documentNumber, name, position, department" });
    return;
  }

  const existing = await db
    .select({ id: employeesTable.id })
    .from(employeesTable)
    .where(eq(employeesTable.documentNumber, documentNumber));

  if (existing.length > 0) {
    res.status(409).json({ error: "Ya existe un empleado con este número de documento" });
    return;
  }

  const [employee] = await db
    .insert(employeesTable)
    .values({ companyId, documentNumber, name, position, department, email, phone, status: status ?? "active" })
    .returning();

  await audit(req, {
    action: "create_employee",
    resource: "employee",
    resourceId: employee.id,
    details: `${employee.name} (${employee.documentNumber})`,
  });

  res.status(201).json(employee);
});

router.put("/employees/:id/pin", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const companyId = req.user!.companyId;
  if (!companyId) {
    res.status(403).json({ error: "Se requiere contexto de empresa" });
    return;
  }
  const id = parseInt(req.params.id);
  const { pin } = req.body ?? {};
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  if (!pin || typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
    res.status(400).json({ error: "El PIN debe tener exactamente 4 dígitos numéricos" });
    return;
  }

  const pinHash = await bcrypt.hash(pin, 10);
  const [employee] = await db
    .update(employeesTable)
    .set({ pinHash, updatedAt: new Date() })
    .where(and(eq(employeesTable.id, id), eq(employeesTable.companyId, companyId)))
    .returning();

  if (!employee) {
    res.status(404).json({ error: "Empleado no encontrado" });
    return;
  }

  await audit(req, {
    action: "set_employee_pin",
    resource: "employee",
    resourceId: employee.id,
    details: `PIN actualizado para ${employee.name}`,
  });

  res.json(employee);
});

router.get("/employees/profile/:document", requireAuth, async (req, res): Promise<void> => {
  const documentNumber = String(req.params.document);
  const user = req.user!;

  const [employee] = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.documentNumber, documentNumber));

  if (!employee) {
    res.status(404).json({ error: "Empleado no encontrado" });
    return;
  }

  // Authorization
  if (user.role === "admin") {
    if (employee.companyId !== user.companyId) {
      res.status(403).json({ error: "Sin acceso a este empleado" });
      return;
    }
  } else if (user.role === "employee") {
    if (!user.email || !employee.email || employee.email.toLowerCase() !== user.email.toLowerCase()) {
      res.status(403).json({ error: "Solo puede ver su propio perfil" });
      return;
    }
  }
  // super_admin: allowed

  // Get company name
  const { companiesTable } = await import("@workspace/db");
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, employee.companyId));

  // Work schedule
  const [schedule] = await db.select().from(workScheduleTable).where(eq(workScheduleTable.companyId, employee.companyId));
  const workDays: string[] = schedule?.workDays ?? ["mon", "tue", "wed", "thu", "fri"];
  const todayDayStr = DAY_MAP[new Date().getDay()];
  const isWorkDay = workDays.includes(todayDayStr);

  // Today range
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOf7DaysAgo = new Date(startOfToday);
  startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 6);

  const recentLogs = await db
    .select()
    .from(attendanceLogsTable)
    .where(and(eq(attendanceLogsTable.employeeId, employee.id), gte(attendanceLogsTable.timestamp, startOf7DaysAgo)));

  const todayLogs = recentLogs
    .filter((l) => new Date(l.timestamp) >= startOfToday)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const checkInLog = todayLogs.find((l) => l.type === "check_in");
  const checkOutLog = [...todayLogs].reverse().find((l) => l.type === "check_out");
  const lastLog = todayLogs[todayLogs.length - 1];

  let attendanceStatus: "inside" | "outside" | "absent" | "day_off";
  if (!isWorkDay) attendanceStatus = "day_off";
  else if (!lastLog) attendanceStatus = "absent";
  else if (lastLog.type === "check_in") attendanceStatus = "inside";
  else attendanceStatus = "outside";

  // Worked hours today
  let workedHoursToday = 0;
  if (checkInLog) {
    const end = checkOutLog ? new Date(checkOutLog.timestamp).getTime() : Date.now();
    workedHoursToday = Math.max(0, (end - new Date(checkInLog.timestamp).getTime()) / 3600000);
  }

  // Extra hours: anything beyond schedule duration
  let extraHoursToday = 0;
  if (schedule?.startTime && schedule?.endTime) {
    const [sh, sm] = schedule.startTime.split(":").map(Number);
    const [eh, em] = schedule.endTime.split(":").map(Number);
    const scheduledHours = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    if (workedHoursToday > scheduledHours) extraHoursToday = workedHoursToday - scheduledHours;
  }

  const sortedRecent = [...recentLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  res.json({
    id: employee.id,
    companyId: employee.companyId,
    companyName: company?.name ?? null,
    documentNumber: employee.documentNumber,
    name: employee.name,
    position: employee.position,
    department: employee.department,
    status: employee.status,
    email: employee.email,
    phone: employee.phone,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
    attendanceStatus,
    checkInTime: checkInLog?.timestamp ?? null,
    checkOutTime: checkOutLog?.timestamp ?? null,
    workedHoursToday: Number(workedHoursToday.toFixed(2)),
    extraHoursToday: Number(extraHoursToday.toFixed(2)),
    recentLogs: sortedRecent.map((l) => ({
      id: l.id,
      type: l.type,
      timestamp: l.timestamp,
      notes: l.notes,
    })),
  });
});

router.get("/employees/status", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const companyId = req.user!.companyId;
  if (!companyId) {
    res.status(403).json({ error: "Se requiere contexto de empresa" });
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDayStr = DAY_MAP[new Date().getDay()];

  const schedules = await db
    .select()
    .from(workScheduleTable)
    .where(eq(workScheduleTable.companyId, companyId));

  const schedule = schedules[0];
  const workDays: string[] = schedule?.workDays ?? ["mon", "tue", "wed", "thu", "fri"];
  const isWorkDay = workDays.includes(todayDayStr);

  const employees = await db
    .select()
    .from(employeesTable)
    .where(and(eq(employeesTable.companyId, companyId), eq(employeesTable.status, "active")))
    .orderBy(employeesTable.name);

  if (employees.length === 0) {
    res.json([]);
    return;
  }

  const employeeIds = employees.map((e) => e.id);
  const todayLogs = await db
    .select()
    .from(attendanceLogsTable)
    .where(and(gte(attendanceLogsTable.timestamp, today), inArray(attendanceLogsTable.employeeId, employeeIds)));

  const result = employees.map((emp) => {
    const empLogs = todayLogs
      .filter((l) => l.employeeId === emp.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const lastLog = empLogs[0];
    const checkInLog = empLogs.find((l) => l.type === "check_in");

    if (!isWorkDay) {
      return { ...emp, attendanceStatus: "day_off" as const, lastCheckIn: null as string | null, lastLogTime: null as string | null };
    }

    if (!lastLog) {
      return { ...emp, attendanceStatus: "absent" as const, lastCheckIn: null as string | null, lastLogTime: null as string | null };
    }

    if (lastLog.type === "check_in") {
      return {
        ...emp,
        attendanceStatus: "inside" as const,
        lastCheckIn: checkInLog?.timestamp?.toISOString() ?? null,
        lastLogTime: lastLog.timestamp.toISOString(),
      };
    }

    return {
      ...emp,
      attendanceStatus: "outside" as const,
      lastCheckIn: checkInLog?.timestamp?.toISOString() ?? null,
      lastLogTime: lastLog.timestamp.toISOString(),
    };
  });

  res.json(result);
});

router.get("/employees/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const companyId = req.user!.companyId;
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const conditions: any[] = [eq(employeesTable.id, id)];
  if (companyId) conditions.push(eq(employeesTable.companyId, companyId));

  const [employee] = await db.select().from(employeesTable).where(and(...conditions));

  if (!employee) {
    res.status(404).json({ error: "Empleado no encontrado" });
    return;
  }

  res.json(employee);
});

router.patch("/employees/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const companyId = req.user!.companyId;
  if (!companyId) {
    res.status(403).json({ error: "Se requiere contexto de empresa" });
    return;
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const { documentNumber, name, position, department, email, phone, status } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (documentNumber !== undefined) updates.documentNumber = documentNumber;
  if (name !== undefined) updates.name = name;
  if (position !== undefined) updates.position = position;
  if (department !== undefined) updates.department = department;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (status !== undefined) updates.status = status;

  const [employee] = await db
    .update(employeesTable)
    .set(updates)
    .where(and(eq(employeesTable.id, id), eq(employeesTable.companyId, companyId)))
    .returning();

  if (!employee) {
    res.status(404).json({ error: "Empleado no encontrado" });
    return;
  }

  res.json(employee);
});

router.delete("/employees/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const companyId = req.user!.companyId;
  if (!companyId) {
    res.status(403).json({ error: "Se requiere contexto de empresa" });
    return;
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [employee] = await db
    .delete(employeesTable)
    .where(and(eq(employeesTable.id, id), eq(employeesTable.companyId, companyId)))
    .returning();

  if (!employee) {
    res.status(404).json({ error: "Empleado no encontrado" });
    return;
  }

  res.sendStatus(204);
});

export default router;
