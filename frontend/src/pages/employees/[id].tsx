import { useState } from "react";
import {
  useGetEmployee,
  useGetEmployeeAttendance,
  useSetEmployeePin,
} from "@timetraker/api-client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useParams } from "wouter";
import { ArrowLeft, UserCircle, Loader2, KeyRound, ShieldCheck, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function EmployeeDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");

  const { data: employee, isLoading: empLoading, refetch } = useGetEmployee(id);
  const { data: logs, isLoading: logsLoading } = useGetEmployeeAttendance(id);
  const setPinMutation = useSetEmployeePin();

  const [pin, setPin] = useState("");
  const [pinMsg, setPinMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const handleSetPin = async () => {
    if (!/^\d{4}$/.test(pin)) {
      setPinMsg({ kind: "err", text: "El PIN debe tener exactamente 4 dígitos numéricos." });
      return;
    }
    try {
      await setPinMutation.mutateAsync({ id, data: { pin } });
      setPinMsg({ kind: "ok", text: "PIN actualizado correctamente." });
      setPin("");
      refetch();
    } catch (e: any) {
      setPinMsg({ kind: "err", text: e?.response?.data?.error ?? "No se pudo actualizar el PIN." });
    }
  };

  if (empLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!employee) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p className="text-muted-foreground">Empleado no encontrado.</p>
          <Link href="/app/employees">
            <Button variant="outline" className="mt-4">Volver a Empleados</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const hasPin = !!(employee as any).pinHash;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/app/employees">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">{employee.name}</h1>
            <p className="text-sm text-muted-foreground">Detalle del Empleado</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-xl p-5 flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCircle className="w-10 h-10 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-lg">{employee.name}</p>
              <p className="text-sm text-muted-foreground">{employee.position}</p>
              <p className="text-sm text-muted-foreground">{employee.department}</p>
            </div>
            <Badge variant={employee.status === "active" ? "default" : "secondary"}>
              {employee.status === "active" ? "Activo" : "Inactivo"}
            </Badge>
            {hasPin ? (
              <Badge variant="default" className="gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> PIN configurado
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Sin PIN
              </Badge>
            )}
          </div>

          <div className="md:col-span-2 bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold">Información de Contacto e Identificación</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">N° de Documento</p>
                <p className="font-mono">{employee.documentNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Correo electrónico</p>
                <p>{employee.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Teléfono</p>
                <p className="font-mono">{employee.phone ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Cargo</p>
                <p>{employee.position}</p>
              </div>
            </div>
          </div>
        </div>

        {/* PIN Management */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold">PIN de marcación segura</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            El PIN es un código de 4 dígitos que el empleado debe ingresar en el terminal después de su número
            de documento. Esto evita que terceros marquen asistencia en su nombre.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="pin" className="text-xs">Nuevo PIN (4 dígitos)</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="font-mono text-lg tracking-[0.4em]"
              />
            </div>
            <Button onClick={handleSetPin} disabled={setPinMutation.isPending || pin.length !== 4}>
              {setPinMutation.isPending ? "Guardando…" : hasPin ? "Actualizar PIN" : "Establecer PIN"}
            </Button>
          </div>
          {pinMsg && (
            <div
              className={`text-sm rounded-lg px-3 py-2 ${
                pinMsg.kind === "ok"
                  ? "bg-chart-2/10 text-chart-2 border border-chart-2/30"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
            >
              {pinMsg.text}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold">Asistencia Reciente</h2>
          </div>
          {logsLoading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Hora</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground hidden md:table-cell">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(!logs || logs.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">Sin registros de asistencia</td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-5 py-3 capitalize">{format(new Date(log.timestamp), "d MMM yyyy", { locale: es })}</td>
                        <td className="px-5 py-3 font-mono">{format(new Date(log.timestamp), "HH:mm:ss")}</td>
                        <td className="px-5 py-3">
                          <Badge variant={log.type === "check_in" ? "default" : "secondary"} className="text-xs">
                            {log.type === "check_in" ? "Entrada" : "Salida"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{log.notes ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
