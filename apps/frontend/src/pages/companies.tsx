import { useState } from "react";
import { useListCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany } from "@timetraker/api-client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Building2, Pencil, Trash2, Loader2, Users, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type CompanyForm = {
  name: string;
  email: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
};

type EditForm = {
  name: string;
  email: string;
};

const emptyForm: CompanyForm = {
  name: "",
  email: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

export default function Companies() {
  const { data: companies, isLoading } = useListCompanies({ query: { refetchInterval: 30000 } });
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CompanyForm>(emptyForm);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", email: "" });
  const [isDeleteConfirm, setIsDeleteConfirm] = useState<number | null>(null);

  const handleCreate = async () => {
    if (!form.name || !form.email) {
      toast({ title: "Error", description: "Nombre y correo de la empresa son requeridos", variant: "destructive" });
      return;
    }
    try {
      await createCompany.mutateAsync({ data: form });
      toast({ title: "Empresa creada correctamente" });
      setIsCreateOpen(false);
      setForm(emptyForm);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const openEdit = (company: NonNullable<typeof companies>[number]) => {
    setEditingId(company.id);
    setEditForm({ name: company.name, email: company.email });
  };

  const handleEdit = async () => {
    if (!editingId) return;
    try {
      await updateCompany.mutateAsync({ id: editingId, data: editForm });
      toast({ title: "Empresa actualizada correctamente" });
      setEditingId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCompany.mutateAsync({ id });
      toast({ title: "Empresa eliminada" });
      setIsDeleteConfirm(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Empresas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{companies?.length ?? 0} empresas registradas</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva Empresa
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : companies && companies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {companies.map((company) => (
              <div key={company.id} className="bg-card border border-border rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold leading-none">{company.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{company.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(company)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setIsDeleteConfirm(company.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    <span>{company.employeeCount} empleados</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <UserCog className="w-3.5 h-3.5" />
                    <span>{company.adminCount} admins</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Creada {format(new Date(company.createdAt), "d 'de' MMMM yyyy", { locale: es })}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Sin empresas registradas</p>
            <p className="text-sm text-muted-foreground mt-1">Crea la primera empresa para comenzar</p>
            <Button onClick={() => setIsCreateOpen(true)} size="sm" className="gap-2 mt-4">
              <Plus className="w-4 h-4" />
              Nueva Empresa
            </Button>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Datos de la empresa</h3>
              <div className="space-y-2">
                <Label>Nombre de la empresa</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Empresa S.A." />
              </div>
              <div className="space-y-2">
                <Label>Correo corporativo</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contacto@empresa.com" />
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Administrador inicial (opcional)</h3>
              <div className="space-y-2">
                <Label>Nombre del administrador</Label>
                <Input value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} placeholder="Juan Pérez" />
              </div>
              <div className="space-y-2">
                <Label>Correo del administrador</Label>
                <Input type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} placeholder="admin@empresa.com" />
              </div>
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} placeholder="••••••••" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); setForm(emptyForm); }}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createCompany.isPending}>
              {createCompany.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Crear Empresa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editingId !== null} onOpenChange={() => setEditingId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre de la empresa</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Correo corporativo</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={updateCompany.isPending}>
              {updateCompany.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={isDeleteConfirm !== null} onOpenChange={() => setIsDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar Empresa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta acción eliminará permanentemente la empresa, todos sus empleados y registros de asistencia. ¿Estás seguro?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => isDeleteConfirm && handleDelete(isDeleteConfirm)} disabled={deleteCompany.isPending}>
              {deleteCompany.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
