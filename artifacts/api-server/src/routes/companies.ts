import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, companiesTable, usersTable, employeesTable, attendanceLogsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

// List all companies (super_admin only)
router.get("/companies", requireAuth, requireRole("super_admin"), async (_req, res): Promise<void> => {
  const companies = await db.select().from(companiesTable).orderBy(companiesTable.name);

  // Enrich with counts
  const enriched = await Promise.all(
    companies.map(async (company) => {
      const [empCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(employeesTable)
        .where(eq(employeesTable.companyId, company.id));

      const [adminCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(eq(usersTable.companyId, company.id));

      return {
        ...company,
        employeeCount: empCount?.count ?? 0,
        adminCount: adminCount?.count ?? 0,
      };
    })
  );

  res.json(enriched);
});

// Create company (super_admin only)
router.post("/companies", requireAuth, requireRole("super_admin"), async (req, res): Promise<void> => {
  const { name, email, adminName, adminEmail, adminPassword } = req.body;

  if (!name || !email) {
    res.status(400).json({ error: "Nombre y correo de la empresa son requeridos" });
    return;
  }

  const [company] = await db
    .insert(companiesTable)
    .values({ name, email })
    .returning();

  // Optionally create admin user for the company
  if (adminName && adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await db.insert(usersTable).values({
      companyId: company.id,
      email: adminEmail,
      passwordHash,
      name: adminName,
      role: "admin",
    });
  }

  // Create default work schedule for the company
  const { workScheduleTable } = await import("@workspace/db");
  await db.insert(workScheduleTable).values({
    companyId: company.id,
    startTime: "08:00",
    endTime: "17:00",
    workDays: ["mon", "tue", "wed", "thu", "fri"],
    lateToleranceMinutes: 15,
  });

  res.status(201).json(company);
});

// Update company (super_admin only)
router.patch("/companies/:id", requireAuth, requireRole("super_admin"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const { name, email } = req.body;
  const updates: Record<string, unknown> = {};
  if (name) updates.name = name;
  if (email) updates.email = email;

  const [company] = await db
    .update(companiesTable)
    .set(updates)
    .where(eq(companiesTable.id, id))
    .returning();

  if (!company) {
    res.status(404).json({ error: "Empresa no encontrada" });
    return;
  }

  res.json(company);
});

// Delete company (super_admin only)
router.delete("/companies/:id", requireAuth, requireRole("super_admin"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [company] = await db
    .delete(companiesTable)
    .where(eq(companiesTable.id, id))
    .returning();

  if (!company) {
    res.status(404).json({ error: "Empresa no encontrada" });
    return;
  }

  res.sendStatus(204);
});

export default router;
