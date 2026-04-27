import type { User } from "./types";

export const USER_SESSION_KEY = "crm_current_user";
export const TOKEN_STORAGE_KEY = "crm_auth_token";
export const SESSION_STORAGE_KEYS = [USER_SESSION_KEY, TOKEN_STORAGE_KEY] as const;

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
    const raw = readRaw(USER_SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  setUser(user: User) {
    writeRaw(USER_SESSION_KEY, JSON.stringify(user));
  },

  clearUser() {
    removeRaw(USER_SESSION_KEY);
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
    removeRaw(USER_SESSION_KEY);
    removeRaw(TOKEN_STORAGE_KEY);
  },
};
