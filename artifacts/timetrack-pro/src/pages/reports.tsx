import { useState } from "react";
import { useListAttendanceLogs, useListEmployees } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Reports() {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const [startDate, setStartDate] = useState(format(sevenDaysAgo, "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(today, "yyyy-MM-dd"));
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: employees } = useListEmployees();
  const { data: logsData, isLoading } = useListAttendanceLogs({
    startDate,
    endDate,
    employeeId: selectedEmployee !== "all" ? parseInt(selectedEmployee) : undefined,
  });
  const logs = logsData?.logs;

  const filtered = logs?.filter((l) => typeFilter === "all" || l.type === typeFilter);

  const exportCsv = () => {
    if (!filtered) return;
    const rows = [
      ["Fecha", "Hora", "Empleado", "ID Nacional", "Departamento", "Tipo", "Notas"],
      ...filtered.map((l) => [
        format(new Date(l.timestamp), "yyyy-MM-dd"),
        format(new Date(l.timestamp), "HH:mm:ss"),
        l.employee?.name ?? "",
        l.employee?.nationalId ?? "",
        l.employee?.department ?? "",
        l.type === "check_in" ? "Entrada" : "Salida",
        l.notes ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asistencia_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">Reportes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Consultar y exportar registros de asistencia</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered?.length} className="gap-2">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Empleado</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos los empleados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los empleados</SelectItem>
                {employees?.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="check_in">Entrada</SelectItem>
                <SelectItem value="check_out">Salida</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{filtered?.length ?? 0} registros</span>
          </div>
          {isLoading ? (
            <div className="p-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
            {/* Mobile card layout */}
            <div className="sm:hidden p-3 space-y-2">
              {(!filtered || filtered.length === 0) ? (
                <div className="px-4 py-10 text-center text-muted-foreground text-sm">
                  No se encontraron registros
                </div>
              ) : (
                filtered.map((log) => (
                  <div key={log.id} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{log.employee?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{log.employee?.department}</p>
                      </div>
                      <Badge variant={log.type === "check_in" ? "default" : "secondary"} className="text-xs flex-shrink-0">
                        {log.type === "check_in" ? "Entrada" : "Salida"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="capitalize text-muted-foreground">
                        {format(new Date(log.timestamp), "d MMM yyyy", { locale: es })}
                      </span>
                      <span className="font-mono">{format(new Date(log.timestamp), "HH:mm:ss")}</span>
                    </div>
                    {log.employee?.nationalId && (
                      <p className="text-xs font-mono text-muted-foreground">ID: {log.employee.nationalId}</p>
                    )}
                    {log.notes && <p className="text-xs text-muted-foreground">Notas: {log.notes}</p>}
                  </div>
                ))
              )}
            </div>

            {/* Desktop/tablet table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha y Hora</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Empleado</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Departamento</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">ID Nacional</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(!filtered || filtered.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                        No se encontraron registros para los filtros seleccionados
                      </td>
                    </tr>
                  ) : (
                    filtered.map((log) => (
                      <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="capitalize">{format(new Date(log.timestamp), "d MMM yyyy", { locale: es })}</p>
                            <p className="text-xs font-mono text-muted-foreground">
                              {format(new Date(log.timestamp), "HH:mm:ss")}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">{log.employee?.name}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{log.employee?.department}</td>
                        <td className="px-4 py-3 font-mono text-xs hidden lg:table-cell">{log.employee?.nationalId}</td>
                        <td className="px-4 py-3">
                          <Badge variant={log.type === "check_in" ? "default" : "secondary"} className="text-xs">
                            {log.type === "check_in" ? "Entrada" : "Salida"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell">{log.notes ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
