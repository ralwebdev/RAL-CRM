import { SESSION_STORAGE_KEYS } from "./session";
import { TOKEN_STORAGE_KEY } from "./session";

type Updater<T> = (current: T | undefined) => T;

interface ClearOptions {
  preserveKeys?: string[];
}

const getStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage;
};

const memoryStore = new Map<string, string>();
const canPersist = (key: string) => false; // Disabled localStorage for data stores

// Clean up old mock data from user's browser on app load
if (typeof window !== "undefined") {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k !== "crm_auth_token" && k !== "theme") {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => window.localStorage.removeItem(k));
  } catch (e) {}
}

const parseJSON = <T>(raw: string | null): T | undefined => {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
};

const preserveAndClear = (storage: Storage, keysToPreserve: string[]) => {
  const snapshot = new Map<string, string>();
  keysToPreserve.forEach((key) => {
    const value = storage.getItem(key);
    if (value !== null) snapshot.set(key, value);
  });

  storage.clear();
  snapshot.forEach((value, key) => storage.setItem(key, value));
};

export const db = {
  createSync<T>(key: string, value: T): T {
    memoryStore.set(key, JSON.stringify(value));
    return value;
  },

  readSync<T>(key: string, fallback?: T): T | undefined {
    const parsed = parseJSON<T>(memoryStore.get(key) ?? null);
    return parsed === undefined ? fallback : parsed;
  },

  updateSync<T>(key: string, updater: Updater<T>, fallback?: T): T {
    const current = db.readSync<T>(key, fallback);
    const next = updater(current);
    return db.createSync(key, next);
  },

  deleteSync(key: string) {
    memoryStore.delete(key);
  },

  clearSync(options: ClearOptions = {}) {
    memoryStore.clear();
  },

  getOrInitSync<T>(key: string, defaults: T): T {
    const existing = db.readSync<T>(key);
    if (existing !== undefined) return existing;
    return db.createSync(key, defaults);
  },

  keysSync(): string[] {
    return Array.from(memoryStore.keys());
  },

  hasSync(key: string): boolean {
    return memoryStore.has(key);
  },

  async create<T>(key: string, value: T): Promise<T> {
    return db.createSync(key, value);
  },

  async read<T>(key: string, fallback?: T): Promise<T | undefined> {
    return db.readSync<T>(key, fallback);
  },

  async update<T>(key: string, updater: Updater<T>, fallback?: T): Promise<T> {
    return db.updateSync<T>(key, updater, fallback);
  },

  async delete(key: string): Promise<void> {
    db.deleteSync(key);
  },

  async clear(options: ClearOptions = {}): Promise<void> {
    db.clearSync(options);
  },

  async getOrInit<T>(key: string, defaults: T): Promise<T> {
    return db.getOrInitSync<T>(key, defaults);
  },

  async keys(): Promise<string[]> {
    return db.keysSync();
  },

  async has(key: string): Promise<boolean> {
    return db.hasSync(key);
  },
};
