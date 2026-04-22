import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  useListEmployees,
  useGetEmployeesStatus,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from "@timetraker/api-client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, Loader2, UserCircle, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type EmployeeForm = {
  name: string;
  documentNumber: string;
  email: string;
  department: string;
  position: string;
  status: "active" | "inactive";
};

const emptyForm: EmployeeForm = {
  name: "",
  documentNumber: "",
  email: "",
  department: "",
  position: "",
  status: "active",
};

const STATUS_LABEL: Record<string, string> = {
  inside: "Dentro",
  outside: "Fuera",
  absent: "Ausente",
  day_off: "Día libre",
};

const STATUS_COLOR: Record<string, string> = {
  inside: "bg-chart-2/15 text-chart-2",
  outside: "bg-secondary text-muted-foreground",
  absent: "bg-destructive/15 text-destructive",
  day_off: "bg-primary/15 text-primary",
};

function LiveTimer({ checkInTime }: { checkInTime: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(checkInTime).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [checkInTime]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return (
    <span className="font-mono text-xs text-chart-2 tabular-nums">
      {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

export default function EmployeesList() {
  const { user } = useAuth();
  const { data: employees, isLoading } = useListEmployees();
  const { data: statusList } = useGetEmployeesStatus({
    query: { refetchInterval: 30000 },
  });
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState<number | null>(null);

  const statusMap = new Map(statusList?.map((s) => [s.id, s]) ?? []);

  const filtered = employees?.filter((e) =>
    [e.name, e.department, e.position, e.documentNumber].some((f) =>
      f?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsDialogOpen(true);
  };

  const openEdit = (emp: NonNullable<typeof employees>[number]) => {
    setEditingId(emp.id);
    setForm({
      name: emp.name,
      documentNumber: emp.documentNumber,
      email: emp.email ?? "",
      department: emp.department,
      position: emp.position,
      status: emp.status as "active" | "inactive",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await updateEmployee.mutateAsync({ id: editingId, data: form });
        toast({ title: "Empleado actualizado correctamente" });
      } else {
        await createEmployee.mutateAsync({ data: form });
        toast({ title: "Empleado creado correctamente" });
      }
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteEmployee.mutateAsync({ id });
      toast({ title: "Empleado eliminado" });
      setIsDeleteConfirm(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const isSaving = createEmployee.isPending || updateEmployee.isPending;
  const isAdmin = user?.role === "admin";

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">Empleados</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{employees?.length ?? 0} empleados en total</p>
          </div>
          {isAdmin && (
            <Button onClick={openCreate} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Agregar Empleado</span>
              <span className="sm:hidden">Agregar</span>
            </Button>
          )}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empleados..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {isLoading ? (
          <div className="bg-card border border-border rounded-xl p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Mobile card layout */}
            <div className="sm:hidden space-y-3">
              {filtered?.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
                  No se encontraron empleados
                </div>
              ) : (
                filtered?.map((emp) => {
                  const empStatus = statusMap.get(emp.id);
                  const attendanceStatus = empStatus?.attendanceStatus ?? "outside";
                  const checkInTime = empStatus?.lastCheckIn;
                  const isInside = attendanceStatus === "inside";

                  return (
                    <div key={emp.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <UserCircle className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{emp.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium flex-shrink-0 ${STATUS_COLOR[attendanceStatus] ?? ""}`}>
                          {isInside && <span className="w-1.5 h-1.5 rounded-full bg-chart-2 animate-pulse" />}
                          {STATUS_LABEL[attendanceStatus] ?? attendanceStatus}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Departamento</p>
                          <p className="font-medium">{emp.department}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Cargo</p>
                          <p className="font-medium">{emp.position}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">N° Documento</p>
                          <p className="font-mono">{emp.documentNumber}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">En oficina</p>
                          {isInside && checkInTime ? (
                            <LiveTimer checkInTime={checkInTime} />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="flex flex-col gap-2 pt-2 border-t border-border">
                          <Link href={`/employees/${emp.id}`}>
                            <Button variant="outline" size="sm" className="w-full gap-2">
                              <ExternalLink className="w-3.5 h-3.5" />
                              Ver detalle
                            </Button>
                          </Link>
                          <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => openEdit(emp)}>
                              <Pencil className="w-3.5 h-3.5" />
                              Editar
                            </Button>
                            <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" onClick={() => setIsDeleteConfirm(emp.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop/tablet table */}
            <div className="hidden sm:block bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Empleado</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Departamento</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Cargo</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">N° Documento</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tiempo en oficina</th>
                    {isAdmin && <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                        No se encontraron empleados
                      </td>
                    </tr>
                  ) : (
                    filtered?.map((emp) => {
                      const empStatus = statusMap.get(emp.id);
                      const attendanceStatus = empStatus?.attendanceStatus ?? "outside";
                      const checkInTime = empStatus?.lastCheckIn;
                      const isInside = attendanceStatus === "inside";

                      return (
                        <tr key={emp.id} className="hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <UserCircle className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{emp.name}</p>
                                <p className="text-xs text-muted-foreground">{emp.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{emp.department}</td>
                          <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{emp.position}</td>
                          <td className="px-4 py-3 font-mono text-xs hidden xl:table-cell">{emp.documentNumber}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[attendanceStatus] ?? ""}`}>
                              {isInside && (
                                <span className="w-1.5 h-1.5 rounded-full bg-chart-2 animate-pulse" />
                              )}
                              {STATUS_LABEL[attendanceStatus] ?? attendanceStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isInside && checkInTime ? (
                              <LiveTimer checkInTime={checkInTime} />
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Link href={`/employees/${emp.id}`}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </Button>
                                </Link>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(emp)}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setIsDeleteConfirm(emp.id)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Empleado" : "Agregar Empleado"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre completo</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="María García" />
              </div>
              <div className="space-y-2">
                <Label>N° de Documento</Label>
                <Input value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} placeholder="12345678" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Correo electrónico</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="maria@empresa.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Ingeniería" />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Desarrollador" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "active" | "inactive" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? "Guardar Cambios" : "Agregar Empleado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirm !== null} onOpenChange={() => setIsDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar Empleado</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Esto eliminará permanentemente al empleado y todos sus registros de asistencia.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => isDeleteConfirm && handleDelete(isDeleteConfirm)} disabled={deleteEmployee.isPending}>
              {deleteEmployee.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
