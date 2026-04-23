import { useState, useEffect } from "react";
import { useGetWorkSchedule, useUpdateWorkSchedule } from "@timetraker/api-client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Calendar, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DAYS = [
  { key: "mon", label: "Lunes" },
  { key: "tue", label: "Martes" },
  { key: "wed", label: "Miércoles" },
  { key: "thu", label: "Jueves" },
  { key: "fri", label: "Viernes" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
];

export default function WorkScheduleSettings() {
  const { data: schedule, isLoading } = useGetWorkSchedule();
  const updateSchedule = useUpdateWorkSchedule();
  const { toast } = useToast();

  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [workDays, setWorkDays] = useState<string[]>(["mon", "tue", "wed", "thu", "fri"]);
  const [lateTolerance, setLateTolerance] = useState(15);

  useEffect(() => {
    if (schedule) {
      setStartTime(schedule.startTime ?? "09:00");
      setEndTime(schedule.endTime ?? "18:00");
      setWorkDays(schedule.workDays ?? ["mon", "tue", "wed", "thu", "fri"]);
      setLateTolerance(schedule.lateToleranceMinutes ?? 15);
    }
  }, [schedule]);

  const toggleDay = (day: string) => {
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    try {
      await updateSchedule.mutateAsync({
        data: {
          startTime,
          endTime,
          workDays,
          lateToleranceMinutes: lateTolerance,
        },
      });
      toast({ title: "Jornada laboral actualizada correctamente" });
    } catch (err: any) {
      toast({ title: "Error al guardar", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-2xl">
        <div>
          <h1 className="text-xl font-semibold">Jornada Laboral</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure el horario y los días de trabajo de su empresa
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Horario de Trabajo</h2>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm">Hora de entrada</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-10 font-mono"
              />
              <p className="text-xs text-muted-foreground">Hora oficial de inicio de jornada</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Hora de salida</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-10 font-mono"
              />
              <p className="text-xs text-muted-foreground">Hora oficial de fin de jornada</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Tolerancia de llegada tardía (minutos)</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                max={120}
                value={lateTolerance}
                onChange={(e) => setLateTolerance(parseInt(e.target.value) || 0)}
                className="h-10 w-28 font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Minutos de margen antes de considerar una llegada tardía
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Días Laborales</h2>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {DAYS.map(({ key, label }) => {
              const isSelected = workDays.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleDay(key)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary text-muted-foreground border-border hover:bg-secondary/70"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            {workDays.length} {workDays.length === 1 ? "día seleccionado" : "días seleccionados"}
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateSchedule.isPending} className="gap-2">
            {updateSchedule.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar Configuración
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
