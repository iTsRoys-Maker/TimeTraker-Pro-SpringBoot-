import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/users", requireAuth, requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const companyId = req.user!.companyId;

  const query = db.select({
    id: usersTable.id,
    email: usersTable.email,
    name: usersTable.name,
    role: usersTable.role,
    companyId: usersTable.companyId,
    createdAt: usersTable.createdAt,
  }).from(usersTable);

  const users = companyId
    ? await query.where(eq(usersTable.companyId, companyId)).orderBy(usersTable.name)
    : await query.orderBy(usersTable.name);

  res.json(users);
});

router.post("/users", requireAuth, requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const companyId = req.user!.companyId;
  const { email, password, name, role } = req.body;

  if (!email || !password || !name || !role) {
    res.status(400).json({ error: "Campos requeridos: email, password, name, role" });
    return;
  }

  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "Ya existe un usuario con este correo" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({ email, passwordHash, name, role, companyId: companyId ?? null })
    .returning({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      companyId: usersTable.companyId,
      createdAt: usersTable.createdAt,
    });

  res.status(201).json(user);
});

router.delete("/users/:id", requireAuth, requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const companyId = req.user!.companyId;
  const condition = companyId
    ? and(eq(usersTable.id, id), eq(usersTable.companyId, companyId))
    : eq(usersTable.id, id);

  const [user] = await db.delete(usersTable).where(condition).returning({ id: usersTable.id });

  if (!user) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }

  res.sendStatus(204);
});

export default router;
