import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Check, X } from "lucide-react";

type Permission = {
  key: string;
  label: string;
  description: string;
};

const PERMISSIONS: Permission[] = [
  { key: "view_dashboard", label: "Ver panel", description: "Acceso al panel de control" },
  { key: "manage_employees", label: "Gestionar empleados", description: "Crear, editar y eliminar empleados" },
  { key: "manage_users", label: "Gestionar usuarios", description: "Crear, editar y eliminar usuarios del sistema" },
  { key: "manage_roles", label: "Gestionar roles", description: "Asignar roles y permisos" },
  { key: "view_reports", label: "Ver reportes", description: "Visualizar reportes de asistencia" },
  { key: "export_reports", label: "Exportar reportes", description: "Descargar reportes en CSV/Excel" },
  { key: "manage_workshift", label: "Gestionar jornada", description: "Configurar jornada laboral" },
  { key: "open_terminal", label: "Abrir terminal", description: "Acceder al terminal de asistencia" },
  { key: "manage_company_settings", label: "Configuración empresa", description: "Editar datos de la empresa" },
  { key: "manage_companies", label: "Gestionar empresas", description: "Crear y administrar empresas (multi-tenant)" },
  { key: "view_audit_logs", label: "Ver auditoría", description: "Acceder al registro de auditoría" },
];

type RoleDef = {
  key: string;
  label: string;
  description: string;
  permissions: Set<string>;
  color: "default" | "secondary" | "destructive";
};

const ALL = new Set(PERMISSIONS.map((p) => p.key));

const ROLES: RoleDef[] = [
  {
    key: "super_admin",
    label: "Super Administrador",
    description: "Control total del sistema y todas las empresas",
    permissions: ALL,
    color: "destructive",
  },
  {
    key: "admin",
    label: "Administrador de Empresa",
    description: "Gestiona los datos de su empresa asignada",
    permissions: new Set([
      "view_dashboard",
      "manage_employees",
      "manage_users",
      "view_reports",
      "export_reports",
      "manage_workshift",
      "open_terminal",
      "manage_company_settings",
      "view_audit_logs",
    ]),
    color: "default",
  },
  {
    key: "supervisor",
    label: "Supervisor",
    description: "Visualiza datos y reportes sin permisos de edición",
    permissions: new Set(["view_dashboard", "view_reports", "export_reports", "open_terminal"]),
    color: "secondary",
  },
  {
    key: "employee",
    label: "Empleado",
    description: "Solo acceso al terminal de marcación",
    permissions: new Set(["open_terminal"]),
    color: "secondary",
  },
];

export default function RolesSettings() {
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Roles y Permisos</h1>
            <p className="text-sm text-muted-foreground">Matriz de acceso por rol del sistema</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3 font-medium min-w-[220px]">Permiso</th>
                  {ROLES.map((r) => (
                    <th key={r.key} className="px-4 py-3 font-medium text-center">
                      <Badge variant={r.color}>{r.label}</Badge>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map((p) => (
                  <tr key={p.key} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.label}</div>
                      <div className="text-xs text-muted-foreground">{p.description}</div>
                    </td>
                    {ROLES.map((r) => (
                      <td key={r.key} className="px-4 py-3 text-center">
                        {r.permissions.has(p.key) ? (
                          <Check className="w-4 h-4 mx-auto text-chart-2" />
                        ) : (
                          <X className="w-4 h-4 mx-auto text-muted-foreground/40" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ROLES.map((r) => (
            <div key={r.key} className="bg-card border border-border rounded-xl p-4 space-y-2">
              <Badge variant={r.color}>{r.label}</Badge>
              <p className="text-sm text-muted-foreground">{r.description}</p>
              <p className="text-xs text-muted-foreground pt-1">
                {r.permissions.size} de {PERMISSIONS.length} permisos
              </p>
            </div>
          ))}
        </div>

        <div className="bg-secondary/30 border border-border rounded-xl p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Nota:</strong> Los roles definidos arriba son los roles base del
          sistema. La asignación de roles a usuarios se realiza desde{" "}
          <a className="text-primary underline-offset-2 hover:underline" href="/app/users">
            Usuarios
          </a>
          . El soporte para roles personalizados editables está disponible bajo solicitud.
        </div>
      </div>
    </DashboardLayout>
  );
}
