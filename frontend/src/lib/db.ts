import { SESSION_STORAGE_KEYS } from "./session";

type Updater<T> = (current: T | undefined) => T;

interface ClearOptions {
  preserveKeys?: string[];
}

const getStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage;
};

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
    const storage = getStorage();
    if (!storage) return value;
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore storage write failures in demo mode
    }
    return value;
  },

  readSync<T>(key: string, fallback?: T): T | undefined {
    const storage = getStorage();
    if (!storage) return fallback;
    try {
      const parsed = parseJSON<T>(storage.getItem(key));
      return parsed === undefined ? fallback : parsed;
    } catch {
      return fallback;
    }
  },

  updateSync<T>(key: string, updater: Updater<T>, fallback?: T): T {
    const current = db.readSync<T>(key, fallback);
    const next = updater(current);
    return db.createSync(key, next);
  },

  deleteSync(key: string) {
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.removeItem(key);
    } catch {
      // ignore storage remove failures in demo mode
    }
  },

  clearSync(options: ClearOptions = {}) {
    const storage = getStorage();
    if (!storage) return;
    const preserve = new Set<string>([...SESSION_STORAGE_KEYS, ...(options.preserveKeys ?? [])]);
    try {
      preserveAndClear(storage, Array.from(preserve));
    } catch {
      // ignore storage clear failures in demo mode
    }
  },

  getOrInitSync<T>(key: string, defaults: T): T {
    const existing = db.readSync<T>(key);
    if (existing !== undefined) return existing;
    return db.createSync(key, defaults);
  },

  keysSync(): string[] {
    const storage = getStorage();
    if (!storage) return [];
    return Array.from({ length: storage.length }, (_, idx) => storage.key(idx)).filter((key): key is string => !!key);
  },

  hasSync(key: string): boolean {
    const storage = getStorage();
    if (!storage) return false;
    return storage.getItem(key) !== null;
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
