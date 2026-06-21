import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, setAuthToken } from "@/lib/api";

export type Role = "admin" | "host";
export interface User {
  id: string;
  username: string;
  displayName: string;
  role: Role;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    password: string,
    referralCode: string,
  ) => Promise<void>;
  logout: () => void;
}

const TOKEN_KEY = "pp_token";
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    setAuthToken(token);
    api
      .get<{ user: User }>("/auth/me")
      .then((r) => setUser(r.user))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setAuthToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function authenticate(path: string, body: unknown) {
    const r = await api.post<{ token: string; user: User }>(path, body);
    localStorage.setItem(TOKEN_KEY, r.token);
    setAuthToken(r.token);
    setUser(r.user);
  }

  const value: AuthState = {
    user,
    loading,
    login: (username, password) =>
      authenticate("/auth/login", { username, password }),
    register: (username, password, referralCode) =>
      authenticate("/auth/register", { username, password, referralCode }),
    logout: () => {
      localStorage.removeItem(TOKEN_KEY);
      setAuthToken(null);
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
