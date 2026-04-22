import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetEmployeeProfile } from "@timetraker/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  User, Mail, Shield, Building2, Phone, Briefcase, IdCard,
  LogIn, LogOut, Clock, Hourglass, Search, Loader2, UserCircle,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Administrador",
  admin: "Administrador de empresa",
  employee: "Empleado",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  inside: { label: "Dentro", color: "bg-chart-2/10 text-chart-2 border-chart-2/30" },
  outside: { label: "Fuera", color: "bg-muted text-foreground border-border" },
  absent: { label: "Ausente", color: "bg-destructive/10 text-destructive border-destructive/30" },
  day_off: { label: "Día libre", color: "bg-chart-4/10 text-chart-4 border-chart-4/30" },
};

function Field({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value ?? "—"}</p>
      </div>
    </div>
  );
}

function EmployeeProfileView({ document }: { document: string }) {
  const { data, isLoading, error } = useGetEmployeeProfile(document);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
        No se pudo cargar el perfil del empleado.
      </div>
    );
  }

  const status = STATUS_LABELS[data.attendanceStatus] ?? { label: data.attendanceStatus, color: "" };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col items-center text-center gap-3">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCircle className="w-12 h-12 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-lg">{data.name}</p>
            <p className="text-sm text-muted-foreground">{data.position}</p>
          </div>
          <Badge className={`border ${status.color}`} variant="outline">
            {status.label}
          </Badge>
        </div>

        <div className="md:col-span-2 bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-2">Datos personales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Field icon={User} label="Nombre completo" value={data.name} />
            <Field icon={IdCard} label="Número de documento" value={<span className="font-mono">{data.documentNumber}</span>} />
            <Field icon={Mail} label="Email" value={data.email} />
            <Field icon={Phone} label="Teléfono" value={<span className="font-mono">{data.phone}</span>} />
            <Field icon={Briefcase} label="Cargo" value={data.position} />
            <Field icon={Building2} label="Departamento" value={data.department} />
            <Field icon={Building2} label="Empresa" value={data.companyName} />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3">Estado laboral — Hoy</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <LogIn className="w-3.5 h-3.5" /> Entrada
            </div>
            <p className="text-xl font-mono font-bold mt-1">
              {data.checkInTime ? format(new Date(data.checkInTime), "HH:mm") : "—"}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <LogOut className="w-3.5 h-3.5" /> Salida
            </div>
            <p className="text-xl font-mono font-bold mt-1">
              {data.checkOutTime ? format(new Date(data.checkOutTime), "HH:mm") : "—"}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Clock className="w-3.5 h-3.5" /> Horas trabajadas
            </div>
            <p className="text-xl font-mono font-bold mt-1">{data.workedHoursToday.toFixed(2)} h</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Hourglass className="w-3.5 h-3.5" /> Horas extra
            </div>
            <p className="text-xl font-mono font-bold mt-1">{data.extraHoursToday.toFixed(2)} h</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Historial — Últimos 7 días</h2>
        </div>
        {data.recentLogs.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">Sin registros recientes</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-xs uppercase text-muted-foreground">
                  <th className="text-left px-5 py-2.5 font-medium">Fecha</th>
                  <th className="text-left px-5 py-2.5 font-medium">Hora</th>
                  <th className="text-left px-5 py-2.5 font-medium">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-secondary/20">
                    <td className="px-5 py-2.5 capitalize">
                      {format(new Date(log.timestamp), "EEE d MMM", { locale: es })}
                    </td>
                    <td className="px-5 py-2.5 font-mono">{format(new Date(log.timestamp), "HH:mm:ss")}</td>
                    <td className="px-5 py-2.5">
                      <Badge variant={log.type === "check_in" ? "default" : "secondary"}>
                        {log.type === "check_in" ? "Entrada" : "Salida"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminLookup() {
  const [doc, setDoc] = useState("");
  const [active, setActive] = useState("");

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-xl p-5">
        <Label className="text-sm font-semibold">Consultar perfil de empleado</Label>
        <p className="text-xs text-muted-foreground mt-1 mb-3">Ingrese el número de documento (cédula) del empleado.</p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setActive(doc.trim());
          }}
        >
          <Input
            placeholder="Número de cédula"
            value={doc}
            onChange={(e) => setDoc(e.target.value)}
            className="font-mono"
          />
          <Button type="submit" disabled={!doc.trim()} className="gap-2">
            <Search className="w-4 h-4" /> Buscar
          </Button>
        </form>
      </div>
      {active && <EmployeeProfileView document={active} />}
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const isEmployee = user?.role === "employee";

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-5xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Mi Perfil</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEmployee ? "Información de tu cuenta y asistencia" : "Información de tu cuenta"}
          </p>
        </div>

        {/* Account card — for everyone */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-2">Cuenta</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Field icon={User} label="Nombre" value={user?.name} />
            <Field icon={Mail} label="Correo electrónico" value={user?.email} />
            <Field icon={Shield} label="Rol" value={ROLE_LABELS[user?.role ?? ""] ?? user?.role} />
            <Field icon={Building2} label="Empresa" value={user?.companyId ? `#${user.companyId}` : "Plataforma"} />
          </div>
        </div>

        {/* Employee detail */}
        {isEmployee && user?.email ? (
          <EmployeeProfileByEmail email={user.email} />
        ) : (
          <AdminLookup />
        )}
      </div>
    </DashboardLayout>
  );
}

function EmployeeProfileByEmail({ email: _email }: { email: string }) {
  // Employees authorize by their own email; backend matches user.email == employee.email.
  // We need the document number to call the endpoint, so we ask the user.
  // But for employees, a simpler UX: a small input prompting their cédula (they know it).
  const [doc, setDoc] = useState("");
  const [active, setActive] = useState("");

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-xl p-5">
        <Label className="text-sm font-semibold">Ver mi perfil de asistencia</Label>
        <p className="text-xs text-muted-foreground mt-1 mb-3">Ingresa tu número de cédula para ver tu información de asistencia.</p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setActive(doc.trim());
          }}
        >
          <Input
            placeholder="Tu cédula"
            value={doc}
            onChange={(e) => setDoc(e.target.value)}
            className="font-mono"
          />
          <Button type="submit" disabled={!doc.trim()} className="gap-2">
            <Search className="w-4 h-4" /> Ver perfil
          </Button>
        </form>
      </div>
      {active && <EmployeeProfileView document={active} />}
    </div>
  );
}
