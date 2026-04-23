import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LogOut,
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  Terminal as TerminalIcon,
  Sun,
  Moon,
  Calendar,
  Building2,
  Menu,
  ShieldCheck,
  ScrollText,
  ExternalLink,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  employee: "Empleado",
};

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();

  const navigation = [
    { name: "Panel Global", href: "/app/dashboard", icon: LayoutDashboard, roles: ["super_admin"] },
    { name: "Empresas", href: "/app/companies", icon: Building2, roles: ["super_admin"] },
    { name: "Panel", href: "/app/dashboard", icon: LayoutDashboard, roles: ["admin"] },
    { name: "Empleados", href: "/app/employees", icon: Users, roles: ["admin"] },
    { name: "Reportes", href: "/app/reports", icon: FileText, roles: ["admin"] },
    { name: "Usuarios", href: "/app/users", icon: Settings, roles: ["admin"] },
    { name: "Jornada Laboral", href: "/app/workshift", icon: Calendar, roles: ["admin"] },
    { name: "Roles y Permisos", href: "/app/settings/roles", icon: ShieldCheck, roles: ["admin", "super_admin"] },
    { name: "Registro de Auditoría", href: "/app/settings/audit", icon: ScrollText, roles: ["admin", "super_admin"] },
    { name: "Mi Perfil", href: "/app/profile", icon: UserCircle, roles: ["super_admin", "admin", "employee"] },
  ];

  const filteredNav = navigation.filter((item) => user && item.roles.includes(user.role));

  const terminalUrl = `${import.meta.env.BASE_URL}terminal`;

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <h1 className="text-lg font-bold font-mono tracking-tight text-primary">
          TimeTrack<span className="text-foreground">Pro</span>
        </h1>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.name}
            </Link>
          );
        })}

        {user && (
          <a
            href={terminalUrl}
            target={user.role === "employee" ? "_self" : "_blank"}
            rel="noopener noreferrer"
            onClick={onNavigate}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <TerminalIcon className="w-4 h-4" />
            <span className="flex-1">Terminal</span>
            {user.role !== "employee" && <ExternalLink className="w-3.5 h-3.5 opacity-60" />}
          </a>
        )}
      </nav>

      <div className="p-4 border-t border-border space-y-3">
        <div className="flex items-center justify-between gap-2 px-2">
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium leading-none truncate">{user?.name}</span>
            <span className="text-xs text-muted-foreground truncate mt-1">{user?.email}</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider font-bold bg-secondary px-2 py-1 rounded-full text-muted-foreground flex-shrink-0">
            {ROLE_LABELS[user?.role ?? ""] ?? user?.role}
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 flex-shrink-0"
            onClick={toggleTheme}
            title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            className="flex-1 justify-start text-muted-foreground hover:text-foreground text-sm"
            onClick={() => {
              onNavigate?.();
              logout();
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen max-w-full overflow-hidden bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-border flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile/Tablet drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-72 max-w-[85vw]">
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile/Tablet top bar */}
        <header className="lg:hidden h-14 border-b border-border bg-card flex items-center px-3 gap-2 flex-shrink-0">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Abrir menú">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
          </Sheet>
          <h1 className="text-base font-bold font-mono tracking-tight text-primary">
            TimeTrack<span className="text-foreground">Pro</span>
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
