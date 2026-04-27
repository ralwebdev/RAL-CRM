import { createContext, useContext, useMemo, useState, useCallback, type ReactNode } from "react";
import { AuthLoginResponse, User } from "./types";
import { api, TOKEN_STORAGE_KEY } from "./api";
export { roleNavConfig, roleLabels } from "./role-config";

const USER_STORAGE_KEY = "crm_current_user";

const initialUsers: User[] = [
  { id: "u1", name: "Amit Sharma", email: "amit@redapple.com", role: "admin" },
  { id: "u2", name: "Soumya Saha", email: "soumya@redapple.com", role: "marketing_manager" },
  { id: "u3", name: "Shreya Chakraborty", email: "shreya@redapple.com", role: "telecaller" },
  { id: "u4", name: "Priya Das", email: "priya@redapple.com", role: "telecaller" },
  { id: "u5", name: "Manjari Chakraborty", email: "manjari@redapple.com", role: "counselor" },
  { id: "u6", name: "Vikram Singh", email: "vikram@redapple.com", role: "telecalling_manager" },
  { id: "u7", name: "Rajesh Kapoor", email: "rajesh@redapple.com", role: "owner" },
  { id: "am1", name: "Rohit Banerjee", email: "rohit@redapple.com", role: "alliance_manager" },
  { id: "ae1", name: "Sneha Roy", email: "sneha@redapple.com", role: "alliance_executive" },
  { id: "ae2", name: "Karan Mehta", email: "karan@redapple.com", role: "alliance_executive" },
  { id: "ae3", name: "Pooja Nair", email: "pooja@redapple.com", role: "alliance_executive" },
  { id: "acm1", name: "Neha Gupta", email: "neha@redapple.com", role: "accounts_manager" },
  { id: "ace1", name: "Arjun Patel", email: "arjun@redapple.com", role: "accounts_executive" },
];

interface AuthContextValue {
  currentUser: User | null;
  completeLogin: (response: AuthLoginResponse) => void;
  loginByCredentials: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  token: string | null;
  allUsers: User[];
}

const AuthContext = createContext<AuthContextValue | null>(null);

const normalizeUser = (payload: AuthLoginResponse): User => ({
  id: payload._id,
  name: payload.name,
  email: payload.email,
  role: payload.role,
});

const readStoredUser = (): User | null => {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as User;
  } catch {
    return null;
  }
};

const readStoredToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => readStoredUser());
  const [token, setToken] = useState<string | null>(() => readStoredToken());

  const completeLogin = useCallback((response: AuthLoginResponse) => {
    const normalized = normalizeUser(response);
    setCurrentUser(normalized);
    setToken(response.token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalized));
    localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
  }, []);

  const loginByCredentials = useCallback(async (email: string, password: string) => {
    try {
      const response = await api.post("/api/auth/login", { email, password });
      completeLogin(response.data);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.message || "Invalid credentials. Please try again."
      };
    }
  }, [completeLogin]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }, []);

  const allUsers = useMemo(() => {
    if (!currentUser) return initialUsers;
    const exists = initialUsers.some((u) => u.id === currentUser.id);
    return exists ? initialUsers : [...initialUsers, currentUser];
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, completeLogin, loginByCredentials, logout, isAuthenticated: !!currentUser && !!token, token, allUsers }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

