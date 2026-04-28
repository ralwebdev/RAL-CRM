import { api } from "./api";
import type { CallLog, FollowUp, User } from "./types";

type UnknownRecord = Record<string, any>;

const toId = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  if (typeof value === "object" && value.id) return String(value.id);
  return "";
};

const toDateOnly = (value: any): string => {
  if (!value) return new Date().toISOString().split("T")[0];
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    if (typeof value === "string" && value.length >= 10) return value.slice(0, 10);
    return new Date().toISOString().split("T")[0];
  }
  return d.toISOString().split("T")[0];
};

const sanitizeObject = <T extends UnknownRecord>(obj: T): T => {
  const out: UnknownRecord = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined) out[key] = value;
  });
  return out as T;
};

const mapCallLogFromApi = (raw: UnknownRecord): CallLog => ({
  ...raw,
  id: toId(raw),
  leadId: toId(raw.leadId),
  telecallerId: toId(raw.telecallerId),
  createdAt: toDateOnly(raw.createdAt || raw.createdAtAt || raw.updatedAt),
}) as CallLog;

const mapFollowUpFromApi = (raw: UnknownRecord): FollowUp => ({
  ...raw,
  id: toId(raw),
  leadId: toId(raw.leadId),
  assignedTo: toId(raw.assignedTo),
  createdAt: toDateOnly(raw.createdAt || raw.updatedAt),
  date: typeof raw.date === "string" ? raw.date : toDateOnly(raw.date),
}) as FollowUp;

const mapUserFromApi = (raw: UnknownRecord): User => ({
  id: toId(raw),
  name: String(raw.name || ""),
  email: String(raw.email || ""),
  role: raw.role as User["role"],
});

const callLogPayload = (payload: Partial<CallLog>) => sanitizeObject({
  leadId: payload.leadId,
  outcome: payload.outcome,
  notes: payload.notes || "",
  nextFollowUp: payload.nextFollowUp || "",
  nextFollowUpTime: payload.nextFollowUpTime || "",
  followUpType: payload.followUpType,
  notInterestedReason: payload.notInterestedReason,
  callbackDate: payload.callbackDate,
  callbackTime: payload.callbackTime,
  createdAt: payload.createdAt || new Date().toISOString().split("T")[0],
  conversationInsight: payload.conversationInsight,
});

const followUpPayload = (payload: Partial<FollowUp>) => sanitizeObject({
  leadId: payload.leadId,
  assignedTo: payload.assignedTo,
  date: payload.date,
  followUpTime: payload.followUpTime,
  notes: payload.notes,
  completed: payload.completed,
  createdAt: payload.createdAt,
  followUpType: payload.followUpType,
});

export async function fetchTelecallingCallLogs(): Promise<CallLog[]> {
  const response = await api.get("/api/calllogs");
  const items = Array.isArray(response.data) ? response.data : [];
  return items.map(mapCallLogFromApi);
}

export async function createTelecallingCallLog(payload: Partial<CallLog>): Promise<CallLog> {
  const response = await api.post("/api/calllogs", callLogPayload(payload));
  return mapCallLogFromApi(response.data);
}

export async function fetchTelecallingFollowUps(): Promise<FollowUp[]> {
  const response = await api.get("/api/followups");
  const items = Array.isArray(response.data) ? response.data : [];
  return items.map(mapFollowUpFromApi);
}

export async function createTelecallingFollowUp(payload: Partial<FollowUp>): Promise<FollowUp> {
  const response = await api.post("/api/followups", followUpPayload({
    ...payload,
    notes: payload.notes || "",
    completed: payload.completed ?? false,
    createdAt: payload.createdAt || new Date().toISOString().split("T")[0],
  }));
  return mapFollowUpFromApi(response.data);
}

export async function updateTelecallingFollowUp(id: string, payload: Partial<FollowUp>): Promise<FollowUp> {
  const response = await api.put(`/api/followups/${id}`, followUpPayload(payload));
  return mapFollowUpFromApi(response.data);
}

export async function fetchTelecallingUsers(): Promise<User[]> {
  const response = await api.get("/api/users");
  const items = Array.isArray(response.data) ? response.data : [];
  return items.map(mapUserFromApi);
}

export async function createTelecallingUser(payload: { name: string; email: string; password: string; role: User["role"] }): Promise<User> {
  const response = await api.post("/api/users", sanitizeObject(payload));
  return mapUserFromApi(response.data);
}

export async function updateTelecallingUser(id: string, payload: { name?: string; email?: string; password?: string; role?: User["role"] }): Promise<User> {
  const response = await api.put(`/api/users/${id}`, sanitizeObject(payload));
  return mapUserFromApi(response.data);
}

export async function deleteTelecallingUser(id: string): Promise<void> {
  await api.delete(`/api/users/${id}`);
}
