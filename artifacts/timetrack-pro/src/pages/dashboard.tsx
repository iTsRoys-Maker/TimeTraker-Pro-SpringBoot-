import {
  useGetDashboardSummary,
  useGetAttendanceTrends,
  useGetTodayActivity,
  useGetGlobalSummary,
  useGetGlobalTrends,
  useGetCompaniesBreakdown,
} from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Users, UserCheck, UserX, LogIn, LogOut, Building2, Activity } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AcademicTools } from "@/components/AcademicTools";

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number | string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-3xl font-bold mt-1 font-mono">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function SuperAdminDashboard() {
  const { data: summary, isLoading } = useGetGlobalSummary({ query: { refetchInterval: 30000 } });
  const { data: trends } = useGetGlobalTrends({ query: { refetchInterval: 30000 } });
  const { data: breakdown, isLoading: breakdownLoading } = useGetCompaniesBreakdown({ query: { refetchInterval: 30000 } });

  const chartData = trends?.map((t) => ({
    fecha: format(new Date(t.date + "T12:00:00"), "EEE", { locale: es }),
    "Entradas": t.checkIns,
    "Salidas": t.checkOuts,
  }));

  const breakdownChart = breakdown?.map((b) => ({
    empresa: b.companyName,
    "Empleados": b.employees,
    "Entradas hoy": b.checkInsToday,
  }));

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Panel Global</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse h-24" />
            ))
          ) : (
            <>
              <StatCard icon={Building2} label="Empresas" value={summary?.totalCompanies ?? 0} color="bg-primary/10 text-primary" />
              <StatCard icon={Users} label="Empleados (global)" value={summary?.totalEmployees ?? 0} color="bg-chart-2/10 text-chart-2" />
              <StatCard icon={LogIn} label="Entradas hoy" value={summary?.checkInsToday ?? 0} color="bg-primary/10 text-primary" />
              <StatCard icon={LogOut} label="Salidas hoy" value={summary?.checkOutsToday ?? 0} color="bg-chart-3/10 text-chart-3" />
              <StatCard icon={Activity} label="Empresas activas hoy" value={summary?.activeCompaniesToday ?? 0} color="bg-chart-4/10 text-chart-4" />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-4">Asistencia Global — Últimos 7 días</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="fecha" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="Entradas" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Salidas" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-4">Empleados y entradas por empresa</h2>
            {breakdownLoading ? (
              <div className="h-[260px] bg-secondary/40 rounded animate-pulse" />
            ) : breakdown && breakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={breakdownChart} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="empresa" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="Empleados" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Entradas hoy" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[260px]">
                <p className="text-sm text-muted-foreground">Sin empresas registradas</p>
              </div>
            )}
          </div>
        </div>

        <AcademicTools />
      </div>
    </DashboardLayout>
  );
}

function AdminDashboard() {
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary({
    query: { refetchInterval: 30000 },
  });
  const { data: trends } = useGetAttendanceTrends({
    query: { refetchInterval: 30000 },
  });
  const { data: todayActivity, isLoading: activityLoading } = useGetTodayActivity({
    query: { refetchInterval: 30000 },
  });

  const chartData = trends?.map((t) => ({
    fecha: format(new Date(t.date + "T12:00:00"), "EEE", { locale: es }),
    "Entradas": t.checkIns,
    "Salidas": t.checkOuts,
  }));

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Panel de Control</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {summaryLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse h-24" />
            ))
          ) : (
            <>
              <StatCard icon={Users} label="Total Empleados" value={summary?.totalEmployees ?? 0} color="bg-primary/10 text-primary" />
              <StatCard icon={UserCheck} label="Activos Hoy" value={summary?.activeToday ?? 0} color="bg-chart-2/10 text-chart-2" />
              <StatCard icon={LogIn} label="Entradas Hoy" value={summary?.checkInsToday ?? 0} color="bg-primary/10 text-primary" />
              <StatCard icon={LogOut} label="Salidas Hoy" value={summary?.checkOutsToday ?? 0} color="bg-chart-3/10 text-chart-3" />
              <StatCard icon={UserX} label="Ausentes Hoy" value={summary?.absentToday ?? 0} color="bg-destructive/10 text-destructive" />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3 bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-4">Asistencia — Últimos 7 Días</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="fecha"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="Entradas" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Salidas" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-4">Actividad de Hoy</h2>
            {activityLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 bg-secondary rounded-lg animate-pulse" />
                ))}
              </div>
            ) : todayActivity && todayActivity.length > 0 ? (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {todayActivity.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.type === "check_in" ? "bg-chart-2" : "bg-chart-3"}`} />
                      <div>
                        <p className="text-sm font-medium leading-none">{log.employee?.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{log.employee?.department}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-medium ${log.type === "check_in" ? "text-chart-2" : "text-muted-foreground"}`}>
                        {log.type === "check_in" ? "Entrada" : "Salida"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.timestamp), "HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[220px]">
                <p className="text-sm text-muted-foreground">Sin actividad registrada hoy</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  if (user?.role === "super_admin") {
    return <SuperAdminDashboard />;
  }
  return <AdminDashboard />;
}
