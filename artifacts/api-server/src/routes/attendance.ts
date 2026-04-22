import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, employeesTable, attendanceLogsTable } from "@workspace/db";
import { eq, desc, and, gte, lte, sql, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { audit } from "../lib/audit";

const router: IRouter = Router();

// In-memory failed-attempt tracker for terminal lockout
type AttemptRecord = { count: number; lockedUntil: number | null };
const attemptStore = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 3;
const LOCK_MS = 60 * 1000; // 60 seconds

function getIp(req: any): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string") return xff.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

function attemptKey(documentNumber: string, ip: string): string {
  return `${documentNumber}@${ip}`;
}

function getAttempt(key: string): AttemptRecord {
  return attemptStore.get(key) ?? { count: 0, lockedUntil: null };
}

function isLocked(rec: AttemptRecord): boolean {
  return rec.lockedUntil !== null && rec.lockedUntil > Date.now();
}

function recordFailure(key: string): AttemptRecord {
  const rec = getAttempt(key);
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockedUntil = Date.now() + LOCK_MS;
  }
  attemptStore.set(key, rec);
  return rec;
}

function clearAttempts(key: string): void {
  attemptStore.delete(key);
}

// Step 1 — verify identity, return what factor is required
router.post("/attendance/verify-identity", async (req, res): Promise<void> => {
  const { documentNumber } = req.body ?? {};
  if (!documentNumber || typeof documentNumber !== "string") {
    res.status(400).json({ error: "Número de documento requerido" });
    return;
  }

  const ip = getIp(req);
  const key = attemptKey(documentNumber, ip);
  const rec = getAttempt(key);

  if (isLocked(rec)) {
    res.status(423).json({
      error: `Demasiados intentos fallidos. Intente nuevamente en ${Math.ceil((rec.lockedUntil! - Date.now()) / 1000)}s.`,
    });
    return;
  }

  const [employee] = await db
    .select()
    .from(employeesTable)
    .where(and(eq(employeesTable.documentNumber, documentNumber), eq(employeesTable.status, "active")));

  if (!employee) {
    res.status(404).json({ error: "Empleado no encontrado o inactivo" });
    return;
  }

  const requiresPin = !!employee.pinHash;
  const requiresPhoneLast4 = !requiresPin && !!employee.phone && employee.phone.length >= 4;

  res.json({
    employeeId: employee.id,
    employeeName: employee.name,
    department: employee.department,
    requiresPin,
    requiresPhoneLast4,
  });
});

// Step 2 — punch with second factor
router.post("/attendance/punch", async (req, res): Promise<void> => {
  const { documentNumber, pin, phoneLast4 } = req.body ?? {};

  if (!documentNumber) {
    res.status(400).json({ error: "Número de documento requerido" });
    return;
  }

  const ip = getIp(req);
  const key = attemptKey(documentNumber, ip);
  const rec = getAttempt(key);

  if (isLocked(rec)) {
    res.status(423).json({
      error: `Bloqueado. Intente nuevamente en ${Math.ceil((rec.lockedUntil! - Date.now()) / 1000)}s.`,
      lockedUntil: new Date(rec.lockedUntil!).toISOString(),
    });
    return;
  }

  const [employee] = await db
    .select()
    .from(employeesTable)
    .where(and(eq(employeesTable.documentNumber, documentNumber), eq(employeesTable.status, "active")));

  if (!employee) {
    res.status(404).json({ error: "Empleado no encontrado o inactivo" });
    return;
  }

  // Verify second factor — REQUIRED if employee has a PIN configured
  let factorOk = false;
  if (employee.pinHash) {
    if (typeof pin === "string" && pin.length > 0) {
      factorOk = await bcrypt.compare(pin, employee.pinHash);
    }
  } else if (employee.phone && employee.phone.length >= 4) {
    // Fallback: last 4 digits of phone if no PIN set
    if (typeof phoneLast4 === "string" && phoneLast4.length === 4) {
      factorOk = employee.phone.slice(-4) === phoneLast4;
    }
  } else {
    // No second factor configured — allow but flag
    factorOk = true;
  }

  if (!factorOk) {
    const updated = recordFailure(key);
    const remaining = Math.max(0, MAX_ATTEMPTS - updated.count);
    await audit(req, {
      action: isLocked(updated) ? "attendance_locked" : "attendance_failed",
      resource: "attendance",
      resourceId: employee.id,
      companyId: employee.companyId,
      details: `Documento ${documentNumber} — intentos: ${updated.count}`,
      ipAddress: ip,
    });
    res.status(isLocked(updated) ? 423 : 401).json({
      error: isLocked(updated)
        ? `Demasiados intentos fallidos. Bloqueado por 60 segundos.`
        : `Verificación fallida. Intentos restantes: ${remaining}.`,
      attemptsRemaining: remaining,
      lockedUntil: updated.lockedUntil ? new Date(updated.lockedUntil).toISOString() : null,
    });
    return;
  }

  clearAttempts(key);

  // Determine check_in / check_out based on today's logs
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayLogs = await db
    .select()
    .from(attendanceLogsTable)
    .where(and(eq(attendanceLogsTable.employeeId, employee.id), gte(attendanceLogsTable.timestamp, today)))
    .orderBy(desc(attendanceLogsTable.timestamp));

  const lastLog = todayLogs[0];
  const type = !lastLog || lastLog.type === "check_out" ? "check_in" : "check_out";

  const now = new Date();
  const [log] = await db
    .insert(attendanceLogsTable)
    .values({ companyId: employee.companyId, employeeId: employee.id, type, timestamp: now })
    .returning();

  const checkInLog = [...todayLogs, log]
    .filter((l) => l.type === "check_in")
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];

  const checkOutLogs = [...todayLogs, log]
    .filter((l) => l.type === "check_out")
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const firstCheckIn = checkInLog?.timestamp ? new Date(checkInLog.timestamp) : null;
  const lastCheckOut =
    type === "check_out" ? now : checkOutLogs[0]?.timestamp ? new Date(checkOutLogs[0].timestamp) : null;

  let workedHours = 0;
  let extraHours = 0;
  if (firstCheckIn && lastCheckOut) {
    workedHours = (lastCheckOut.getTime() - firstCheckIn.getTime()) / (1000 * 60 * 60);
    extraHours = Math.max(0, workedHours - 8);
  }

  const message =
    type === "check_in"
      ? `¡Bienvenido, ${employee.name}! Entrada registrada.`
      : `¡Hasta luego, ${employee.name}! Salida registrada.`;

  await audit(req, {
    action: "attendance_punch",
    resource: "attendance",
    resourceId: log.id,
    companyId: employee.companyId,
    details: `${type} — ${employee.name} (${documentNumber})`,
    ipAddress: ip,
  });

  res.json({
    type,
    employee,
    log,
    message,
    todaySummary: {
      checkInTime: firstCheckIn?.toISOString() ?? null,
      checkOutTime: type === "check_out" ? now.toISOString() : null,
      workedHours: Math.round(workedHours * 100) / 100,
      extraHours: Math.round(extraHours * 100) / 100,
    },
  });
});

// Get today summary for a document number (public)
router.get("/attendance/today-summary/:document", async (req, res): Promise<void> => {
  const { document } = req.params;

  const [employee] = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.documentNumber, document));

  if (!employee) {
    res.status(404).json({ error: "Empleado no encontrado" });
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayLogs = await db
    .select()
    .from(attendanceLogsTable)
    .where(and(eq(attendanceLogsTable.employeeId, employee.id), gte(attendanceLogsTable.timestamp, today)))
    .orderBy(attendanceLogsTable.timestamp);

  const checkIns = todayLogs.filter((l) => l.type === "check_in");
  const checkOuts = todayLogs.filter((l) => l.type === "check_out");

  const firstCheckIn = checkIns[0]?.timestamp ? new Date(checkIns[0].timestamp) : null;
  const lastCheckOut = checkOuts[checkOuts.length - 1]?.timestamp
    ? new Date(checkOuts[checkOuts.length - 1].timestamp)
    : null;

  let workedHours = 0;
  let extraHours = 0;

  if (firstCheckIn && lastCheckOut) {
    workedHours = (lastCheckOut.getTime() - firstCheckIn.getTime()) / (1000 * 60 * 60);
    extraHours = Math.max(0, workedHours - 8);
  }

  res.json({
    employee: {
      id: employee.id,
      name: employee.name,
      department: employee.department,
      documentNumber: employee.documentNumber,
    },
    checkInTime: firstCheckIn?.toISOString() ?? null,
    checkOutTime: lastCheckOut?.toISOString() ?? null,
    workedHours: Math.round(workedHours * 100) / 100,
    extraHours: Math.round(extraHours * 100) / 100,
  });
});

// Attendance logs (auth required, filtered by company)
router.get("/attendance/logs", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const companyId = req.user!.companyId;
  if (!companyId) {
    res.status(403).json({ error: "Se requiere contexto de empresa" });
    return;
  }

  const { employeeId, startDate, endDate, page: pageStr, limit: limitStr } = req.query as Record<string, string>;
  const page = parseInt(pageStr ?? "1");
  const limit = parseInt(limitStr ?? "50");
  const offset = (page - 1) * limit;

  const conditions: any[] = [eq(attendanceLogsTable.companyId, companyId)];
  if (employeeId) conditions.push(eq(attendanceLogsTable.employeeId, parseInt(employeeId)));
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    conditions.push(gte(attendanceLogsTable.timestamp, start));
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(attendanceLogsTable.timestamp, end));
  }

  const whereClause = and(...conditions);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(attendanceLogsTable)
    .where(whereClause);

  const rawLogs = await db
    .select()
    .from(attendanceLogsTable)
    .where(whereClause)
    .orderBy(desc(attendanceLogsTable.timestamp))
    .limit(limit)
    .offset(offset);

  const empIds = [...new Set(rawLogs.map((l) => l.employeeId))];
  const employees = empIds.length > 0
    ? await db.select().from(employeesTable).where(inArray(employeesTable.id, empIds))
    : [];
  const empMap = Object.fromEntries(employees.map((e) => [e.id, e]));

  const logs = rawLogs.map((l) => ({ ...l, employee: empMap[l.employeeId] }));

  res.json({ logs, total: countResult?.count ?? 0, page, limit });
});

// Today's activity (auth required, filtered by company)
router.get("/attendance/today", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const companyId = req.user!.companyId;
  if (!companyId) {
    res.status(403).json({ error: "Se requiere contexto de empresa" });
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rawLogs = await db
    .select()
    .from(attendanceLogsTable)
    .where(and(eq(attendanceLogsTable.companyId, companyId), gte(attendanceLogsTable.timestamp, today)))
    .orderBy(desc(attendanceLogsTable.timestamp))
    .limit(100);

  const empIds = [...new Set(rawLogs.map((l) => l.employeeId))];
  const employees = empIds.length > 0
    ? await db.select().from(employeesTable).where(inArray(employeesTable.id, empIds))
    : [];
  const empMap = Object.fromEntries(employees.map((e) => [e.id, e]));

  const logs = rawLogs.map((l) => ({ ...l, employee: empMap[l.employeeId] }));
  res.json(logs);
});

// Employee attendance history (auth required)
router.get("/attendance/employee/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const companyId = req.user!.companyId;
  const empId = parseInt(req.params.id);
  if (isNaN(empId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const { startDate, endDate } = req.query as Record<string, string>;
  const conditions: any[] = [eq(attendanceLogsTable.employeeId, empId)];
  if (companyId) conditions.push(eq(attendanceLogsTable.companyId, companyId));
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    conditions.push(gte(attendanceLogsTable.timestamp, start));
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(attendanceLogsTable.timestamp, end));
  }

  const logs = await db
    .select()
    .from(attendanceLogsTable)
    .where(and(...conditions))
    .orderBy(desc(attendanceLogsTable.timestamp));

  res.json(logs);
});

export default router;
