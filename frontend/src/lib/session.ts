import type { User } from "./types";

export const USER_SESSION_KEY = "crm_current_user";
export const TOKEN_STORAGE_KEY = "crm_auth_token";
export const SESSION_STORAGE_KEYS = [USER_SESSION_KEY, TOKEN_STORAGE_KEY] as const;
let inMemoryUser: User | null = null;

const getStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage;
};

const readRaw = (key: string): string | null => {
  try {
    return getStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

const writeRaw = (key: string, value: string) => {
  try {
    getStorage()?.setItem(key, value);
  } catch {
    // ignore storage write failures in demo mode
  }
};

const removeRaw = (key: string) => {
  try {
    getStorage()?.removeItem(key);
  } catch {
    // ignore storage remove failures in demo mode
  }
};

export const session = {
  getUser(): User | null {
    return inMemoryUser;
  },

  setUser(user: User) {
    inMemoryUser = user;
  },

  clearUser() {
    inMemoryUser = null;
  },

  getToken(): string | null {
    return readRaw(TOKEN_STORAGE_KEY);
  },

  setToken(token: string) {
    writeRaw(TOKEN_STORAGE_KEY, token);
  },

  clearToken() {
    removeRaw(TOKEN_STORAGE_KEY);
  },

  clearSession() {
    inMemoryUser = null;
    if (typeof window !== "undefined") {
      try {
        const theme = window.localStorage.getItem("theme");
        window.localStorage.clear();
        if (theme) {
          window.localStorage.setItem("theme", theme);
        }
      } catch (e) {
        removeRaw(TOKEN_STORAGE_KEY);
      }
    } else {
      removeRaw(TOKEN_STORAGE_KEY);
    }
  },
};
