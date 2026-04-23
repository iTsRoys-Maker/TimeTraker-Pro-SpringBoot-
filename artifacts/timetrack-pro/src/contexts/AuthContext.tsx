import React, { createContext, useContext, useEffect, useState } from "react";
import {
  useGetMe,
  UserProfile,
  setAuthTokenGetter,
  setBaseUrl,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import {
  TOKEN_STORAGE_KEY,
  setStoredToken,
  setUnauthorizedHandler,
} from "@/services/apiClient";

// Register synchronously at module load so the bearer token is attached
// to the very first request fired by React Query (e.g. useGetMe).
if (typeof window !== "undefined") {
  setAuthTokenGetter(() => window.localStorage.getItem(TOKEN_STORAGE_KEY));

  // Apuntar el cliente generado al backend Spring Boot.
  // - VITE_API_URL viene como http://localhost:8080/api
  // - Las rutas generadas ya incluyen /api/..., así que usamos solo el origen.
  // - Si no hay variable, las llamadas relativas usan el proxy de Vite.
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (envUrl) {
    const origin = envUrl.replace(/\/+$/, "").replace(/\/api$/, "");
    setBaseUrl(origin || null);
  }
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(
    localStorage.getItem(TOKEN_STORAGE_KEY)
  );
  const [, setLocation] = useLocation();

  const { data: user, isLoading: isUserLoading, isError } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    },
  });

  const logout = () => {
    setStoredToken(null);
    setTokenState(null);
    setLocation("/login");
  };

  useEffect(() => {
    if (isError) {
      logout();
    }
  }, [isError]);

  // Manejo global de 401: cualquier llamada axios que reciba 401
  // dispara logout automáticamente.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setTokenState(null);
      setLocation("/login");
    });
    return () => setUnauthorizedHandler(null);
  }, [setLocation]);

  const login = (newToken: string) => {
    setStoredToken(newToken);
    setTokenState(newToken);
  };

  const isLoading = isUserLoading && !!token;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
