import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch, setAccessToken } from "@/lib/api";
import type { AuthUser } from "@/types/api";

export interface RegisterInput {
  organizationName: string;
  name: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updateLocalUser: (patch: Partial<AuthUser>) => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
        if (res.ok) {
          const body = await res.json();
          setAccessToken(body.data.accessToken);
          setUser(body.data.user);
        }
      } catch {
        // no existing session
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = React.useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<{ accessToken: string; user: AuthUser }>("/auth/login", {
        method: "POST",
        body: { email, password },
        skipAuthRetry: true,
      });
      // Every cached query (program lists, registrations, stats...) is scoped by an
      // identical key regardless of who's logged in, so a stale cache from a
      // previously logged-in account must never leak into this session.
      queryClient.clear();
      setAccessToken(data.accessToken);
      setUser(data.user);
    },
    [queryClient],
  );

  const register = React.useCallback(
    async (input: RegisterInput) => {
      const data = await apiFetch<{ accessToken: string; user: AuthUser }>("/auth/register", {
        method: "POST",
        body: input,
        skipAuthRetry: true,
      });
      queryClient.clear();
      setAccessToken(data.accessToken);
      setUser(data.user);
    },
    [queryClient],
  );

  const logout = React.useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } finally {
      setAccessToken(null);
      setUser(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const updateLocalUser = React.useCallback((patch: Partial<AuthUser>) => {
    setUser((u) => (u ? { ...u, ...patch } : u));
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateLocalUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
