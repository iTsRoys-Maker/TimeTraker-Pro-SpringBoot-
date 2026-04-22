import { Request } from "express";
import { db, auditLogsTable } from "@workspace/db";

export type AuditAction =
  | "login"
  | "login_failed"
  | "logout"
  | "create_employee"
  | "update_employee"
  | "delete_employee"
  | "set_employee_pin"
  | "create_user"
  | "update_user"
  | "delete_user"
  | "create_company"
  | "update_company"
  | "delete_company"
  | "attendance_punch"
  | "attendance_failed"
  | "attendance_locked";

interface AuditEntry {
  action: AuditAction;
  resource?: string;
  resourceId?: string | number;
  details?: string;
  userId?: number | null;
  userEmail?: string | null;
  companyId?: number | null;
  ipAddress?: string;
}

function getIp(req: Request): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string") return xff.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}

export function parseDevice(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua)) return "Tablet";
  if (/mobi|iphone|android.*mobile|blackberry|opera mini|iemobile/.test(ua)) return "Mobile";
  if (/android/.test(ua)) return "Tablet";
  if (ua) return "Desktop";
  return "Unknown";
}

export async function audit(req: Request, entry: AuditEntry): Promise<void> {
  try {
    const userAgent = (req.headers["user-agent"] as string | undefined) ?? null;
    await db.insert(auditLogsTable).values({
      action: entry.action,
      resource: entry.resource ?? null,
      resourceId: entry.resourceId !== undefined ? String(entry.resourceId) : null,
      details: entry.details ?? null,
      userId: entry.userId ?? req.user?.userId ?? null,
      userEmail: entry.userEmail ?? req.user?.email ?? null,
      companyId: entry.companyId ?? req.user?.companyId ?? null,
      ipAddress: entry.ipAddress ?? getIp(req),
      userAgent,
      device: userAgent ? parseDevice(userAgent) : null,
    });
  } catch (e) {
    console.error("Failed to write audit log", e);
  }
}
