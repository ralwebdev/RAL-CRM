/**
 * PI ↔ TI mapping store
 * Tracks conversions between Proforma Invoices and Tax Invoices.
 */
import { db } from "./db";

export interface PiTiMapping {
  id: string;
  piId: string;
  piNo: string;
  tiId: string;
  tiNo: string;
  studentId: string;
  studentName: string;
  linkedAmount: number;
  conversionDate: string;
  convertedBy: string;
  convertedByName?: string;
  mode: "convert" | "link_existing";
  reason?: string;
}

const KEY = "ral_pi_ti_mappings_v1";
type Listener = () => void;
const listeners = new Set<Listener>();

function load(): PiTiMapping[] {
  return db.readSync<PiTiMapping[]>(KEY, []) ?? [];
}

let state: PiTiMapping[] = typeof window !== "undefined" ? load() : [];

function save() {
  db.createSync(KEY, state);
  listeners.forEach(l => l());
}

export function subscribePiTi(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getPiTiMappings(): PiTiMapping[] { return state; }

export function getMappingsForPi(piId: string) {
  return state.filter(m => m.piId === piId);
}

export function getMappingsForTi(tiId: string) {
  return state.filter(m => m.tiId === tiId);
}

export function recordMapping(input: Omit<PiTiMapping, "id" | "conversionDate">): PiTiMapping {
  const m: PiTiMapping = {
    ...input,
    id: `map_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`,
    conversionDate: new Date().toISOString(),
  };
  state = [m, ...state];
  save();
  return m;
}

export function removeMapping(id: string) {
  state = state.filter(m => m.id !== id);
  save();
}
