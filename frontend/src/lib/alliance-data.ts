/**
 * Industry Alliances Module — Mock Data + Store (localStorage)
 */
import type {
  AllianceUser, Institution, AllianceContact, AllianceVisit, AllianceTask,
  AllianceProposal, AllianceEvent, AllianceExpense,
} from "./alliance-types";
import { computePriority } from "./alliance-types";

const today = new Date();
const iso = (offsetDays = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
};

// ── DEMO USERS (separate from main CRM users) ──
export const allianceUsers: AllianceUser[] = [
  { id: "am1", name: "Rohit Banerjee", email: "rohit@redapple.com", password: "alliance123", role: "alliance_manager", status: "active", createdAt: iso(-90) },
  { id: "ae1", name: "Sneha Roy", email: "sneha@redapple.com", password: "alliance123", role: "alliance_executive", status: "active", createdAt: iso(-60) },
  { id: "ae2", name: "Karan Mehta", email: "karan@redapple.com", password: "alliance123", role: "alliance_executive", status: "active", createdAt: iso(-45) },
  { id: "ae3", name: "Pooja Nair", email: "pooja@redapple.com", password: "alliance123", role: "alliance_executive", status: "active", createdAt: iso(-30) },
];

// ── INSTITUTIONS ──
const rawInstitutions: Omit<Institution, "priorityScore" | "priority">[] = [];

export const allianceInstitutions: Institution[] = rawInstitutions.map((r) => {
  const { score, bucket } = computePriority(r.studentStrength);
  return { ...r, priorityScore: score, priority: bucket };
});

// ── CONTACTS ──
export const allianceContacts: AllianceContact[] = [];

// ── VISITS ──
export const allianceVisits: AllianceVisit[] = [];

// ── TASKS ──
export const allianceTasks: AllianceTask[] = [];

// ── PROPOSALS ──
export const allianceProposals: AllianceProposal[] = [];

// ── EVENTS ──
export const allianceEvents: AllianceEvent[] = [];

// ── EXPENSES ──
export const allianceExpenses: AllianceExpense[] = [];

// ── STORAGE ──
const KEYS = {
  institutions: "alliance_institutions",
  contacts: "alliance_contacts",
  visits: "alliance_visits",
  tasks: "alliance_tasks",
  proposals: "alliance_proposals",
  events: "alliance_events",
  expenses: "alliance_expenses",
} as const;

function load<T>(key: string, defaults: T[]): T[] {
  const stored = localStorage.getItem(key);
  if (stored) {
    try { return JSON.parse(stored); } catch { /* fallthrough */ }
  }
  localStorage.setItem(key, JSON.stringify(defaults));
  return defaults;
}
function persist<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export const allianceStore = {
  // Institutions
  getInstitutions: () => load(KEYS.institutions, allianceInstitutions),
  saveInstitutions: (d: Institution[]) => persist(KEYS.institutions, d),
  // Contacts
  getContacts: () => load(KEYS.contacts, allianceContacts),
  saveContacts: (d: AllianceContact[]) => persist(KEYS.contacts, d),
  // Visits
  getVisits: () => load(KEYS.visits, allianceVisits),
  saveVisits: (d: AllianceVisit[]) => persist(KEYS.visits, d),
  // Tasks (recompute Overdue on read)
  getTasks: (): AllianceTask[] => {
    const data = load(KEYS.tasks, allianceTasks);
    const todayStr = new Date().toISOString().split("T")[0];
    return data.map((t) => (t.status !== "Done" && t.dueDate < todayStr ? { ...t, status: "Overdue" as const } : t));
  },
  saveTasks: (d: AllianceTask[]) => persist(KEYS.tasks, d),
  // Proposals
  getProposals: () => load(KEYS.proposals, allianceProposals),
  saveProposals: (d: AllianceProposal[]) => persist(KEYS.proposals, d),
  // Events
  getEvents: () => load(KEYS.events, allianceEvents),
  saveEvents: (d: AllianceEvent[]) => persist(KEYS.events, d),
  // Expenses
  getExpenses: () => load(KEYS.expenses, allianceExpenses),
  saveExpenses: (d: AllianceExpense[]) => persist(KEYS.expenses, d),
  // Users
  getUsers: () => allianceUsers,
  // Reset
  resetAll: () => Object.values(KEYS).forEach((k) => localStorage.removeItem(k)),
};

// CSV export utility
export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
