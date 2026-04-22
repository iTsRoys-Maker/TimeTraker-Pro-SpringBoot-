import { useState } from "react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Clock, ArrowLeft } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const result = await loginMutation.mutateAsync({ data: { email, password } });
      login(result.token);
      const role = result.user.role;
      if (role === "employee") {
        setLocation("/terminal");
      } else if (role === "super_admin") {
        setLocation("/app/dashboard");
      } else {
        setLocation("/app/dashboard");
      }
    } catch {
      setError("Correo o contraseña incorrectos. Por favor intente de nuevo.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold font-mono tracking-tight">
              TimeTrack<span className="text-primary">Pro</span>
            </span>
          </div>
          <p className="text-muted-foreground text-sm">Panel de Administración</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-md">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Número de cédula o correo institucional</Label>
              <Input
                id="email"
                type="text"
                placeholder="Número de cédula o correo institucional"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-10"
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-10" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar sesión"
              )}
            </Button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground text-sm">
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver al Terminal
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
