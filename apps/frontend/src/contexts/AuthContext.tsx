import React, { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, UserProfile, setAuthTokenGetter } from "@timetraker/api-client";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

// Register synchronously at module load so the bearer token is attached
// to the very first request fired by React Query (e.g. useGetMe).
if (typeof window !== "undefined") {
  setAuthTokenGetter(() => window.localStorage.getItem("timetrack_token"));
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
    localStorage.getItem("timetrack_token")
  );
  const [, setLocation] = useLocation();

  const { data: user, isLoading: isUserLoading, isError } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    },
  });

  useEffect(() => {
    if (isError) {
      logout();
    }
  }, [isError]);

  const login = (newToken: string) => {
    localStorage.setItem("timetrack_token", newToken);
    setTokenState(newToken);
  };

  const logout = () => {
    localStorage.removeItem("timetrack_token");
    setTokenState(null);
    setLocation("/login");
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
