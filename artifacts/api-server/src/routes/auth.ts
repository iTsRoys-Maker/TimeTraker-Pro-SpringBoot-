import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";
import { LoginBody } from "@workspace/api-zod";
import { audit } from "../lib/audit";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    await audit(req, {
      action: "login_failed",
      resource: "user",
      userEmail: email,
      details: `Intento fallido de inicio de sesión`,
    });
    res.status(401).json({ error: "Correo o contraseña incorrectos" });
    return;
  }

  await audit(req, {
    action: "login",
    resource: "user",
    resourceId: user.id,
    userId: user.id,
    userEmail: user.email,
    companyId: user.companyId ?? null,
  });

  const token = signToken({
    userId: user.id,
    role: user.role,
    email: user.email,
    companyId: user.companyId ?? null,
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId ?? null,
      createdAt: user.createdAt,
    },
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(401).json({ error: "Usuario no encontrado" });
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId ?? null,
    createdAt: user.createdAt,
  });
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  await audit(req, { action: "logout", resource: "user", resourceId: req.user!.userId });
  res.json({ message: "Sesión cerrada correctamente" });
});

export default router;
