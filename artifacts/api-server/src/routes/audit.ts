import { Router, type IRouter } from "express";
import { db, auditLogsTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/audit/logs", requireAuth, requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const { page: pageStr, limit: limitStr, action } = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(pageStr ?? "1"));
  const limit = Math.min(200, Math.max(1, parseInt(limitStr ?? "50")));
  const offset = (page - 1) * limit;

  const conditions: any[] = [];
  // Company admins only see their company's logs; super_admin sees all
  if (req.user!.role !== "super_admin" && req.user!.companyId) {
    conditions.push(eq(auditLogsTable.companyId, req.user!.companyId));
  }
  if (action) conditions.push(eq(auditLogsTable.action, action));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogsTable)
    .where(whereClause);

  const logs = await db
    .select()
    .from(auditLogsTable)
    .where(whereClause)
    .orderBy(desc(auditLogsTable.timestamp))
    .limit(limit)
    .offset(offset);

  res.json({ logs, total: countResult?.count ?? 0, page, limit });
});

export default router;
