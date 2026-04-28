import { api } from "@/lib/api";
import { allianceStore } from "@/lib/alliance-data";
import { computePriority } from "@/lib/alliance-types";
import type {
  AllianceContact,
  AllianceEvent,
  AllianceExpense,
  AllianceProposal,
  AllianceTask,
  AllianceVisit,
  Institution,
} from "@/lib/alliance-types";

export interface AllianceDirectoryUser {
  id: string;
  name: string;
  email: string;
  role: "alliance_manager" | "alliance_executive";
}

type RawRecord = Record<string, any>;

let lastSyncedAt = 0;
let inFlightSync: Promise<{ users: AllianceDirectoryUser[] }> | null = null;
let cachedUsers: AllianceDirectoryUser[] = [];

const toDateOnly = (value: unknown): string => {
  if (!value) return "";
  const text = String(value);
  return text.includes("T") ? text.split("T")[0] : text;
};

const pickId = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const obj = value as RawRecord;
    return String(obj.id || obj._id || "");
  }
  return String(value);
};

const mapInstitution = (row: RawRecord): Institution => {
  const studentStrength = Number(row.studentStrength || 0);
  const fallbackPriority = computePriority(studentStrength);

  return {
    id: pickId(row.id || row._id),
    institutionId: String(row.institutionId || ""),
    name: String(row.name || ""),
    type: row.type,
    boardUniversity: row.boardUniversity,
    district: String(row.district || ""),
    city: String(row.city || ""),
    address: String(row.address || ""),
    studentStrength,
    decisionMaker: String(row.decisionMaker || ""),
    phone: String(row.phone || ""),
    email: String(row.email || ""),
    priorityScore: Number(row.priorityScore ?? fallbackPriority.score),
    priority: row.priority || fallbackPriority.bucket,
    assignedTo: pickId(row.assignedExecutiveId),
    pipelineStage: row.pipelineStage || "Identified",
    notes: String(row.notes || ""),
    createdAt: toDateOnly(row.createdAt) || toDateOnly(new Date().toISOString()),
  } as Institution;
};

const mapVisit = (row: RawRecord): AllianceVisit => ({
  id: pickId(row.id || row._id),
  institutionId: pickId(row.institutionId),
  executiveId: pickId(row.executiveId),
  visitDate: toDateOnly(row.visitDate),
  meetingPerson: String(row.meetingPerson || ""),
  summary: String(row.summary || ""),
  interestLevel: row.interestLevel,
  nextFollowup: toDateOnly(row.nextFollowup),
  status: row.status,
  photoUrl: String(row.photoUrl || ""),
  createdAt: toDateOnly(row.createdAt),
});

const mapTask = (row: RawRecord): AllianceTask => ({
  id: pickId(row.id || row._id),
  title: String(row.title || ""),
  institutionId: pickId(row.institutionId),
  assignedTo: pickId(row.assignedTo),
  dueDate: toDateOnly(row.dueDate),
  status: row.status,
  priority: row.priority,
  createdAt: toDateOnly(row.createdAt),
});

const mapProposal = (row: RawRecord): AllianceProposal => ({
  id: pickId(row.id || row._id),
  institutionId: pickId(row.institutionId),
  proposalType: row.proposalType,
  amount: Number(row.amount || 0),
  status: row.status,
  sentDate: toDateOnly(row.sentDate),
  approvedBy: pickId(row.approvedBy) || undefined,
  notes: String(row.notes || ""),
});

const mapEvent = (row: RawRecord): AllianceEvent => ({
  id: pickId(row.id || row._id),
  institutionId: pickId(row.institutionId),
  eventName: String(row.eventName || ""),
  eventType: row.eventType,
  eventDate: toDateOnly(row.eventDate),
  attendees: Number(row.attendees || 0),
  leadsGenerated: Number(row.leadsGenerated || 0),
  notes: String(row.notes || ""),
});

const mapExpense = (row: RawRecord): AllianceExpense => ({
  id: pickId(row.id || row._id),
  executiveId: pickId(row.executiveId),
  institutionId: pickId(row.institutionId),
  expenseType: row.expenseType,
  amount: Number(row.amount || 0),
  billUrl: String(row.billUrl || ""),
  expenseDate: toDateOnly(row.expenseDate),
  status: row.status,
  notes: String(row.notes || ""),
});

const mapContact = (row: RawRecord): AllianceContact => ({
  id: pickId(row.id || row._id),
  institutionId: pickId(row.institutionId),
  name: String(row.name || ""),
  designation: String(row.designation || ""),
  phone: String(row.phone || ""),
  email: String(row.email || ""),
  notes: String(row.notes || ""),
});

const mapUsers = (rows: RawRecord[]): AllianceDirectoryUser[] => {
  const mapped = rows.map((row) => ({
    id: pickId(row.id || row._id),
    name: String(row.name || ""),
    email: String(row.email || ""),
    role: row.role,
  } as AllianceDirectoryUser));

  return mapped.filter((u) => u.id && (u.role === "alliance_manager" || u.role === "alliance_executive"));
};

export async function syncAllianceStoreFromBackend(opts?: { force?: boolean; ttlMs?: number }) {
  const ttlMs = opts?.ttlMs ?? 10_000;
  const force = !!opts?.force;

  if (!force && Date.now() - lastSyncedAt < ttlMs) {
    return { users: cachedUsers };
  }

  if (inFlightSync) {
    return inFlightSync;
  }

  inFlightSync = (async () => {
    const [usersRes, institutionsRes, contactsRes, visitsRes, tasksRes, proposalsRes, eventsRes, expensesRes] = await Promise.all([
      api.get("/api/alliances/users"),
      api.get("/api/alliances/institutions"),
      api.get("/api/alliances/contacts"),
      api.get("/api/alliances/visits"),
      api.get("/api/alliances/tasks"),
      api.get("/api/alliances/proposals"),
      api.get("/api/alliances/events"),
      api.get("/api/alliances/expenses"),
    ]);

    const users = mapUsers(usersRes.data || []);
    const institutions = (institutionsRes.data || []).map(mapInstitution);
    const contacts = (contactsRes.data || []).map(mapContact);
    const visits = (visitsRes.data || []).map(mapVisit);
    const tasks = (tasksRes.data || []).map(mapTask);
    const proposals = (proposalsRes.data || []).map(mapProposal);
    const events = (eventsRes.data || []).map(mapEvent);
    const expenses = (expensesRes.data || []).map(mapExpense);

    allianceStore.saveInstitutions(institutions);
    allianceStore.saveContacts(contacts);
    allianceStore.saveVisits(visits);
    allianceStore.saveTasks(tasks);
    allianceStore.saveProposals(proposals);
    allianceStore.saveEvents(events);
    allianceStore.saveExpenses(expenses);

    cachedUsers = users;
    lastSyncedAt = Date.now();

    return { users };
  })();

  try {
    return await inFlightSync;
  } finally {
    inFlightSync = null;
  }
}
