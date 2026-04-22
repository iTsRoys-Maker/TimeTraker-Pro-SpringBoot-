import { useState } from "react";
import { useListAuditLogs } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  login: "Inicio de sesión",
  login_failed: "Inicio fallido",
  logout: "Cierre de sesión",
  create_employee: "Crear empleado",
  update_employee: "Editar empleado",
  delete_employee: "Eliminar empleado",
  set_employee_pin: "Actualizar PIN",
  create_user: "Crear usuario",
  update_user: "Editar usuario",
  delete_user: "Eliminar usuario",
  create_company: "Crear empresa",
  update_company: "Editar empresa",
  attendance_punch: "Marcación",
  attendance_failed: "Marcación fallida",
  attendance_locked: "Bloqueo terminal",
};

const DESTRUCTIVE_ACTIONS = new Set([
  "login_failed",
  "delete_employee",
  "delete_user",
  "attendance_failed",
  "attendance_locked",
]);

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const limit = 25;

  const { data, isLoading } = useListAuditLogs({ page, limit, action: actionFilter || undefined });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <ScrollText className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Registro de Auditoría</h1>
            <p className="text-sm text-muted-foreground">Acciones del sistema y eventos de seguridad</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Filtrar por acción (ej: login, attendance_punch)"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="max-w-md"
          />
          <span className="text-sm text-muted-foreground self-center">
            {total} registro{total === 1 ? "" : "s"}
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando…</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Sin registros</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-muted-foreground text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Fecha</th>
                    <th className="text-left px-4 py-3 font-medium">Acción</th>
                    <th className="text-left px-4 py-3 font-medium">Usuario</th>
                    <th className="text-left px-4 py-3 font-medium">Detalle</th>
                    <th className="text-left px-4 py-3 font-medium">IP</th>
                    <th className="text-left px-4 py-3 font-medium">Dispositivo</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-t border-border">
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                        {format(new Date(log.timestamp), "dd MMM yyyy HH:mm:ss", { locale: es })}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={DESTRUCTIVE_ACTIONS.has(log.action) ? "destructive" : "secondary"}>
                          {ACTION_LABELS[log.action] ?? log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{log.userEmail ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-md break-words">
                        {log.details ?? <span className="opacity-50">—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.ipAddress ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground" title={log.userAgent ?? ""}>
                        {log.device ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
