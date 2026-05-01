/**
 * Student Collection Control System — central store
 *
 * Workflow:
 *   1. Counselor records payment → auto-routed to Admin (status: "Awaiting Verification").
 *   2. Admin verifies against cash/bank and Approves / Rejects / Marks Mismatch.
 *   3. Once Verified, the entry appears in the Accounts queue → "Ready For Invoice".
 *   4. Accounts generates a Tax Invoice → status flips to "Invoice Generated".
 *
 * EMI late-fee engine: ₹50 / day overdue, accrued on read (no schedule mutation).
 */
import { db } from "./db";
import { api } from "./api";

export type CollectionMode = "cash" | "upi" | "bank_transfer" | "cheque" | "card";

export type CollectionReason =
  | "admission_fee"
  | "registration_fee"
  | "seat_booking"
  | "emi_payment"
  | "emi_late_fine"
  | "id_card_charge"
  | "rfid_charge"
  | "stationery_sale"
  | "misc_approved_charge";

export type CollectionStatus =
  | "Collected"
  | "Awaiting Verification"
  | "Verified"
  | "Mismatch"
  | "Rejected"
  | "Ready For Invoice"
  | "Invoice Generated";

/** Who logged the collection — counselor or admin (direct). */
export type CollectorRole = "counselor" | "admin";

/** Invoice request lifecycle (Counselor → Admin → Accounts → Issued). */
export type InvoiceRequestType = "PI" | "TI" | "none";
export type InvoiceRequestStatus =
  | "none"
  | "awaiting_admin_review"
  | "awaiting_accounts"
  | "draft_prepared"
  | "on_hold"
  | "clarification_requested"
  | "rejected"
  | "issued";

export interface InvoiceRequest {
  type: InvoiceRequestType;
  status: InvoiceRequestStatus;
  requestedById?: string;
  requestedByName?: string;
  requestedByRole?: string;
  requestedAt?: string;
  /** Admin review */
  adminReviewedById?: string;
  adminReviewedByName?: string;
  adminReviewedAt?: string;
  adminRemarks?: string;
  /** Accounts handling */
  preparedById?: string;
  preparedByName?: string;
  preparedAt?: string;
  issuedById?: string;
  issuedByName?: string;
  issuedAt?: string;
  invoiceId?: string;
  invoiceNo?: string;
  /** Hold / clarification / rejection */
  holdReason?: string;
  clarificationQuestion?: string;
  clarificationAnswer?: string;
  rejectionReason?: string;
}

export interface CollectionAttachment {
  id: string;
  kind: "payment_screenshot" | "deposit_slip" | "student_note";
  name: string;
  /** base64 data URL */
  dataUrl?: string;
  uploadedAt: string;
}

export const COLLECTION_REASONS: { value: CollectionReason; label: string }[] = [
  { value: "admission_fee", label: "Admission Fee" },
  { value: "registration_fee", label: "Registration Fee" },
  { value: "seat_booking", label: "Seat Booking" },
  { value: "emi_payment", label: "EMI Payment" },
  { value: "emi_late_fine", label: "EMI Late Fine" },
  { value: "id_card_charge", label: "ID Card Charge" },
  { value: "rfid_charge", label: "RFID Charge" },
  { value: "stationery_sale", label: "Stationery Sale" },
  { value: "misc_approved_charge", label: "Misc Approved Charge" },
];

export const COLLECTION_MODES: { value: CollectionMode; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
];

export interface CollectionAuditEntry {
  id: string;
  at: string;
  byId: string;
  byName: string;
  byRole: string;
  action: string;
  fromStatus?: CollectionStatus;
  toStatus?: CollectionStatus;
  remarks?: string;
}

export interface Collection {
  id: string;
  receiptRef: string; // human-readable reference, e.g. RC-2026-0001
  studentId: string;
  studentName: string;
  studentMobile?: string;
  courseName: string;
  branch?: string;
  amount: number;
  mode: CollectionMode;
  reason: CollectionReason;
  collectedAt: string;
  collectedById: string;
  collectedByName: string;
  collectorRole: CollectorRole;
  remarks?: string;

  /** Mode-conditional reference data captured at collection time. */
  txnId?: string;
  bankName?: string;
  chequeNumber?: string;
  chequeDate?: string;

  /** Optional file attachments (base64). */
  attachments?: CollectionAttachment[];

  /** Invoice request workflow (PI/TI/none). */
  invoiceRequest?: InvoiceRequest;

  /** Optional reference to an EMI schedule when reason = emi_payment / emi_late_fine */
  emiId?: string;
  emiInstallmentNo?: number;
  /** Late fee component (₹50/day × days overdue) included in this collection */
  lateFeeAmount?: number;

  status: CollectionStatus;

  /** Verification metadata */
  verifiedAmount?: number;
  verificationMode?: "cash_in_hand" | "bank_statement" | "upi_confirmation" | "cheque_status";
  verifiedById?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  verificationRemarks?: string;
  mismatchAmount?: number;

  /** Linked TI after invoice generation */
  invoiceId?: string;
  invoiceNo?: string;
  invoicedById?: string;
  invoicedByName?: string;
  invoicedAt?: string;

  audit: CollectionAuditEntry[];
  createdAt: string;
}

const KEY = "ral_collections_v1";
type Listener = () => void;
const listeners = new Set<Listener>();

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
const objectIdRegex = /^[a-fA-F0-9]{24}$/;
const toId = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  if (typeof value === "object" && value.id) return String(value.id);
  return "";
};

function load(): Collection[] {
  return db.readSync<Collection[]>(KEY, seed()) ?? seed();
}

function seed(): Collection[] {
  return [];
}

let state: Collection[] = typeof window !== "undefined" ? load() : [];

function save(next: Collection[]) {
  state = next;
  db.createSync(KEY, next);
  listeners.forEach(l => l());
}

export function subscribeCollections(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getCollections(): Collection[] { return state; }
export function resetCollections() { save(seed()); }

async function persistCollectionToAdmissionHistory(c: Collection): Promise<void> {
  // Only persist when we can confidently map to an Admission document id.
  if (!objectIdRegex.test(c.studentId)) return;
  try {
    const admissionRes = await api.get(`/api/admissions/${c.studentId}`);
    const admission = admissionRes.data || {};
    const history = Array.isArray(admission.paymentHistory) ? admission.paymentHistory : [];
    const exists = history.some((h: any) =>
      String(h?.referenceNumber || "").trim() === c.receiptRef,
    );
    if (exists) return;

    const paymentModeMap: Record<CollectionMode, string> = {
      cash: "Cash",
      upi: "UPI",
      bank_transfer: "Online Transfer",
      cheque: "Cheque",
      card: "Online Transfer",
    };

    const paymentTypeMap: Record<CollectionReason, string> = {
      admission_fee: "Admission Fee",
      registration_fee: "Registration",
      seat_booking: "Seat Booking",
      emi_payment: "EMI",
      emi_late_fine: "EMI",
      id_card_charge: "Registration",
      rfid_charge: "Registration",
      stationery_sale: "Registration",
      misc_approved_charge: "Registration",
    };

    const paymentEntry = {
      paymentDate: c.collectedAt,
      amountPaid: c.amount,
      paymentMode: paymentModeMap[c.mode] || "Cash",
      referenceNumber: c.receiptRef,
      paymentType: paymentTypeMap[c.reason] || "Registration",
      emiNumber: c.emiInstallmentNo ?? null,
    };

    await api.put(`/api/admissions/${c.studentId}`, {
      paymentHistory: [...history, paymentEntry],
    });
  } catch {
    // Keep UI flow non-blocking; backend persistence is best-effort.
  }
}

export async function hydrateCollectionsFromBackend(): Promise<void> {
  const collectionsRes = await api.get("/api/collections");
  const rows = Array.isArray(collectionsRes.data) ? collectionsRes.data : [];
  const mapped: Collection[] = rows.map((raw: any) => ({
      id: toId(raw),
      receiptRef: String(raw?.receiptRef || ""),
      studentId: toId(raw?.studentId),
      studentName: String(raw?.studentName || raw?.studentId?.studentName || "Student"),
      studentMobile: raw?.studentMobile ? String(raw.studentMobile) : undefined,
      courseName: String(raw?.courseName || raw?.studentId?.courseSelected || "Course"),
      branch: raw?.branch ? String(raw.branch) : undefined,
      amount: Number(raw?.amount || 0),
      mode: raw?.mode || "cash",
      reason: raw?.reason || "admission_fee",
      collectedAt: raw?.collectedAt ? new Date(raw.collectedAt).toISOString() : new Date().toISOString(),
      collectedById: toId(raw?.collectedById),
      collectedByName: String(raw?.collectedByName || raw?.collectedById?.name || "Unknown"),
      collectorRole: raw?.collectorRole || "counselor",
      remarks: raw?.remarks ? String(raw.remarks) : undefined,
      txnId: raw?.txnId ? String(raw.txnId) : undefined,
      bankName: raw?.bankName ? String(raw.bankName) : undefined,
      chequeNumber: raw?.chequeNumber ? String(raw.chequeNumber) : undefined,
      chequeDate: raw?.chequeDate ? new Date(raw.chequeDate).toISOString() : undefined,
      attachments: Array.isArray(raw?.attachments) ? raw.attachments.map((a: any) => ({
        id: toId(a) || uid("att"),
        kind: a?.kind,
        name: String(a?.name || "attachment"),
        dataUrl: a?.dataUrl,
        uploadedAt: a?.uploadedAt ? new Date(a.uploadedAt).toISOString() : new Date().toISOString(),
      })) : [],
      invoiceRequest: raw?.invoiceRequest ? {
        type: raw.invoiceRequest.type || "none",
        status: raw.invoiceRequest.status || "none",
        requestedById: toId(raw.invoiceRequest.requestedById) || undefined,
        requestedByName: raw.invoiceRequest.requestedByName || undefined,
        requestedByRole: raw.invoiceRequest.requestedByRole || undefined,
        requestedAt: raw.invoiceRequest.requestedAt ? new Date(raw.invoiceRequest.requestedAt).toISOString() : undefined,
        adminReviewedById: toId(raw.invoiceRequest.adminReviewedById) || undefined,
        adminReviewedByName: raw.invoiceRequest.adminReviewedByName || undefined,
        adminReviewedAt: raw.invoiceRequest.adminReviewedAt ? new Date(raw.invoiceRequest.adminReviewedAt).toISOString() : undefined,
        adminRemarks: raw.invoiceRequest.adminRemarks || undefined,
        preparedById: toId(raw.invoiceRequest.preparedById) || undefined,
        preparedByName: raw.invoiceRequest.preparedByName || undefined,
        preparedAt: raw.invoiceRequest.preparedAt ? new Date(raw.invoiceRequest.preparedAt).toISOString() : undefined,
        issuedById: toId(raw.invoiceRequest.issuedById) || undefined,
        issuedByName: raw.invoiceRequest.issuedByName || undefined,
        issuedAt: raw.invoiceRequest.issuedAt ? new Date(raw.invoiceRequest.issuedAt).toISOString() : undefined,
        invoiceId: toId(raw.invoiceRequest.invoiceId) || undefined,
        invoiceNo: raw.invoiceRequest.invoiceNo || undefined,
        holdReason: raw.invoiceRequest.holdReason || undefined,
        clarificationQuestion: raw.invoiceRequest.clarificationQuestion || undefined,
        clarificationAnswer: raw.invoiceRequest.clarificationAnswer || undefined,
        rejectionReason: raw.invoiceRequest.rejectionReason || undefined,
      } : { type: "none", status: "none" },
      emiId: toId(raw?.emiId) || undefined,
      emiInstallmentNo: raw?.emiInstallmentNo ?? undefined,
      lateFeeAmount: Number(raw?.lateFeeAmount || 0),
      status: raw?.status || "Collected",
      verifiedAmount: raw?.verifiedAmount ?? undefined,
      verificationMode: raw?.verificationMode ?? undefined,
      verifiedById: toId(raw?.verifiedById) || undefined,
      verifiedByName: raw?.verifiedByName || undefined,
      verifiedAt: raw?.verifiedAt ? new Date(raw.verifiedAt).toISOString() : undefined,
      verificationRemarks: raw?.verificationRemarks || undefined,
      mismatchAmount: raw?.mismatchAmount ?? undefined,
      invoiceId: toId(raw?.invoiceId) || undefined,
      invoiceNo: raw?.invoiceNo || undefined,
      invoicedById: toId(raw?.invoicedById) || undefined,
      invoicedByName: raw?.invoicedByName || undefined,
      invoicedAt: raw?.invoicedAt ? new Date(raw.invoicedAt).toISOString() : undefined,
      audit: Array.isArray(raw?.audit) ? raw.audit.map((a: any) => ({
        id: toId(a) || uid("aud"),
        at: a?.at ? new Date(a.at).toISOString() : new Date().toISOString(),
        byId: toId(a?.byId),
        byName: String(a?.byName || "Unknown"),
        byRole: String(a?.byRole || "unknown"),
        action: String(a?.action || "update"),
        fromStatus: a?.fromStatus,
        toStatus: a?.toStatus,
        remarks: a?.remarks,
      })) : [],
      createdAt: raw?.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
    }));
  save(mapped);
}

function pushAudit(c: Collection, entry: Omit<CollectionAuditEntry, "id" | "at">) {
  c.audit = [
    { id: uid("aud"), at: new Date().toISOString(), ...entry },
    ...c.audit,
  ];
}

async function syncCollectionUpdateToBackend(id: string, patch: Record<string, unknown>) {
  if (!objectIdRegex.test(id)) return;
  try {
    await api.put(`/api/collections/${id}`, patch);
  } catch {
    // best-effort sync; local workflow continues
  }
}

/* ───────── Counselor / Admin: log collection ───────── */

export interface LogCollectionInput {
  studentId: string;
  studentName: string;
  studentMobile?: string;
  courseName: string;
  branch?: string;
  amount: number;
  mode: CollectionMode;
  reason: CollectionReason;
  remarks?: string;
  emiId?: string;
  emiInstallmentNo?: number;
  lateFeeAmount?: number;
  /** mode-conditional */
  txnId?: string;
  bankName?: string;
  chequeNumber?: string;
  chequeDate?: string;
  attachments?: CollectionAttachment[];
  /** Collector may simultaneously request a PI / TI to be issued. */
  requestInvoiceType?: InvoiceRequestType; // "PI" | "TI" | "none"
}

export function logCollection(
  input: LogCollectionInput,
  by: { id: string; name: string; role: string },
): Collection {
  const collectorRole: CollectorRole = by.role === "admin" ? "admin" : "counselor";
  const initialStatus: CollectionStatus = collectorRole === "admin" ? "Collected" : "Awaiting Verification";
  const reqType: InvoiceRequestType = input.requestInvoiceType ?? "none";
  const invoiceRequest: InvoiceRequest | undefined = reqType === "none"
    ? { type: "none", status: "none" }
    : {
        type: reqType,
        // Counselor → goes through admin first; Admin → straight to accounts.
        status: collectorRole === "admin" ? "awaiting_accounts" : "awaiting_admin_review",
        requestedById: by.id,
        requestedByName: by.name,
        requestedByRole: by.role,
        requestedAt: new Date().toISOString(),
      };

  const { requestInvoiceType, ...rest } = input;
  void requestInvoiceType;
  const txnSuffix = String(Math.floor(1000 + Math.random() * 9000));
  const c: Collection = {
    id: uid("col"),
    receiptRef: `RC-${new Date().getFullYear()}-${txnSuffix}`,
    ...rest,
    collectedAt: new Date().toISOString(),
    collectedById: by.id,
    collectedByName: by.name,
    collectorRole,
    status: initialStatus,
    invoiceRequest,
    audit: [],
    createdAt: new Date().toISOString(),
  };
  pushAudit(c, {
    byId: by.id, byName: by.name, byRole: by.role,
    action: collectorRole === "admin" ? "Direct collection logged (admin)" : "Collection logged and sent for admin verification",
    toStatus: initialStatus,
    remarks: input.remarks,
  });
  if (invoiceRequest && invoiceRequest.type !== "none") {
    pushAudit(c, {
      byId: by.id, byName: by.name, byRole: by.role,
      action: `Invoice request created (${invoiceRequest.type})`,
      remarks: `Status: ${invoiceRequest.status.replace(/_/g, " ")}`,
    });
  }
  save([c, ...state]);
  void persistCollectionToAdmissionHistory(c);
  void (async () => {
    let backendStudentId = c.studentId;
    try {
      if (objectIdRegex.test(backendStudentId)) {
        // If this is already an Admission id, this succeeds. If it's a Lead id, it 404s and we fallback.
        await api.get(`/api/admissions/${backendStudentId}`);
      } else {
        backendStudentId = "";
      }
    } catch {
      backendStudentId = "";
    }

    if (!objectIdRegex.test(backendStudentId)) {
      try {
        const admissionsRes = await api.get("/api/admissions");
        const admissions = Array.isArray(admissionsRes.data) ? admissionsRes.data : [];
        const matched = admissions.find((a: any) =>
          toId(a) === c.studentId ||
          toId(a?.leadId) === c.studentId ||
          String(a?.studentName || "").trim().toLowerCase() === c.studentName.trim().toLowerCase(),
        );
        if (matched) backendStudentId = toId(matched);
      } catch {
        // ignore resolution failure
      }
    }

    // If we still don't have an Admission ObjectId, send original studentId too.
    // Backend will attempt global resolution by leadId / student name.
    const postStudentId = objectIdRegex.test(backendStudentId) ? backendStudentId : c.studentId;
    if (!postStudentId) return;

    void api.post("/api/collections", {
      studentId: postStudentId,
      studentName: c.studentName,
      studentMobile: c.studentMobile,
      courseName: c.courseName,
      branch: c.branch,
      amount: c.amount,
      mode: c.mode,
      reason: c.reason,
      remarks: c.remarks,
      txnId: c.txnId,
      bankName: c.bankName,
      chequeNumber: c.chequeNumber,
      chequeDate: c.chequeDate,
      invoiceRequest: c.invoiceRequest,
      status: c.status,
      receiptRef: c.receiptRef,
    }).then((res) => {
      const savedId = String(res?.data?._id || res?.data?.id || "");
      if (!savedId) return;
      const idx = state.findIndex((x) => x.id === c.id);
      if (idx >= 0) {
        const resolvedId = toId(res?.data?.studentId) || backendStudentId || c.studentId;
        state[idx] = { ...state[idx], id: savedId, studentId: resolvedId };
        save([...state]);
      }
    }).catch(() => {
      // keep local UX non-blocking; admin view depends on backend row
    });
  })();
  return c;
}

export function submitToAdmin(id: string, by: { id: string; name: string; role: string }, remarks?: string): Collection | null {
  const c = state.find(x => x.id === id);
  if (!c) return null;
  if (c.status !== "Collected") return null;
  const prev = c.status;
  c.status = "Awaiting Verification";
  pushAudit(c, {
    byId: by.id, byName: by.name, byRole: by.role,
    action: "Submitted to admin",
    fromStatus: prev, toStatus: c.status,
    remarks,
  });
  save([...state]);
  void syncCollectionUpdateToBackend(c.id, { status: c.status, audit: c.audit });
  return c;
}

/* ───────── Admin verification ───────── */

export interface VerificationInput {
  verifiedAmount: number;
  verificationMode: NonNullable<Collection["verificationMode"]>;
  remarks?: string;
}

export function verifyCollection(
  id: string,
  input: VerificationInput,
  by: { id: string; name: string; role: string },
): Collection | null {
  const c = state.find(x => x.id === id);
  if (!c) return null;
  if (c.status !== "Awaiting Verification" && c.status !== "Mismatch" && c.status !== "Collected") return null;
  const prev = c.status;
  const matches = Math.abs(input.verifiedAmount - c.amount) < 0.5;
  c.verifiedAmount = input.verifiedAmount;
  c.verificationMode = input.verificationMode;
  c.verifiedById = by.id;
  c.verifiedByName = by.name;
  c.verifiedAt = new Date().toISOString();
  c.verificationRemarks = input.remarks;
  c.mismatchAmount = matches ? 0 : c.amount - input.verifiedAmount;
  c.status = matches ? "Verified" : "Mismatch";
  pushAudit(c, {
    byId: by.id, byName: by.name, byRole: by.role,
    action: matches ? "Verified" : "Mismatch flagged",
    fromStatus: prev, toStatus: c.status,
    remarks: input.remarks,
  });
  save([...state]);
  void syncCollectionUpdateToBackend(c.id, {
    status: c.status,
    verifiedById: c.verifiedById,
    verifiedByName: c.verifiedByName,
    verifiedAt: c.verifiedAt,
    verificationRemarks: c.verificationRemarks,
    audit: c.audit,
  });
  return c;
}

export function rejectCollection(
  id: string,
  remarks: string,
  by: { id: string; name: string; role: string },
): Collection | null {
  const c = state.find(x => x.id === id);
  if (!c) return null;
  const prev = c.status;
  c.status = "Rejected";
  c.verifiedById = by.id;
  c.verifiedByName = by.name;
  c.verifiedAt = new Date().toISOString();
  c.verificationRemarks = remarks;
  pushAudit(c, {
    byId: by.id, byName: by.name, byRole: by.role,
    action: "Rejected",
    fromStatus: prev, toStatus: c.status,
    remarks,
  });
  save([...state]);
  void syncCollectionUpdateToBackend(c.id, {
    status: c.status,
    invoiceRequest: c.invoiceRequest,
    audit: c.audit,
  });
  return c;
}

export function markReadyForInvoice(
  id: string,
  by: { id: string; name: string; role: string },
): Collection | null {
  const c = state.find(x => x.id === id);
  if (!c || c.status !== "Verified") return null;
  const prev = c.status;
  c.status = "Ready For Invoice";
  pushAudit(c, {
    byId: by.id, byName: by.name, byRole: by.role,
    action: "Marked ready for invoice",
    fromStatus: prev, toStatus: c.status,
  });
  save([...state]);
  void syncCollectionUpdateToBackend(c.id, {
    status: c.status,
    invoiceRequest: c.invoiceRequest,
    audit: c.audit,
  });
  return c;
}

/* ───────── Accounts: link generated TI ───────── */

export function linkTiToCollection(
  id: string,
  invoiceId: string,
  invoiceNo: string,
  by: { id: string; name: string; role: string },
): Collection | null {
  const c = state.find(x => x.id === id);
  if (!c) return null;
  const prev = c.status;
  c.invoiceId = invoiceId;
  c.invoiceNo = invoiceNo;
  c.invoicedById = by.id;
  c.invoicedByName = by.name;
  c.invoicedAt = new Date().toISOString();
  c.status = "Invoice Generated";
  pushAudit(c, {
    byId: by.id, byName: by.name, byRole: by.role,
    action: `Linked TI ${invoiceNo}`,
    fromStatus: prev, toStatus: c.status,
  });
  save([...state]);
  void syncCollectionUpdateToBackend(c.id, {
    status: c.status,
    invoiceRequest: c.invoiceRequest,
    audit: c.audit,
  });
  return c;
}

/* ───────── Selectors ───────── */

export function getCollectionsByCounselor(counselorId: string) {
  return state.filter(c => c.collectedById === counselorId);
}

export function getCollectionsAwaitingVerification() {
  return state.filter(c => c.status === "Awaiting Verification" || c.status === "Mismatch");
}

export function getVerifiedReadyForInvoice() {
  return state.filter(c => c.status === "Verified" || c.status === "Ready For Invoice");
}

export function getMismatches() {
  return state.filter(c => c.status === "Mismatch");
}

/** Sum of amounts where status would still reasonably be "money in counselor's hand" */
export function getUnverifiedTotal() {
  return state
    .filter(c => c.status === "Collected" || c.status === "Awaiting Verification")
    .reduce((s, c) => s + c.amount, 0);
}

/* ───────── EMI late-fee engine ───────── */

const LATE_FEE_PER_DAY = 50;

export interface LateFeeInfo {
  daysOverdue: number;
  fee: number;
}

/** Pure helper — accrues ₹50/day on read; never mutates the EMI schedule. */
export function computeEmiLateFee(dueDateIso: string, asOf: number = Date.now()): LateFeeInfo {
  const due = new Date(dueDateIso).getTime();
  const days = Math.max(0, Math.floor((asOf - due) / 86400000));
  return { daysOverdue: days, fee: days * LATE_FEE_PER_DAY };
}

export const LATE_FEE_RATE = LATE_FEE_PER_DAY;

/* ───────── Audit access ───────── */

export function getAllAuditEntries(): (CollectionAuditEntry & { collectionId: string; receiptRef: string; studentName: string })[] {
  return state.flatMap(c =>
    c.audit.map(a => ({
      ...a,
      collectionId: c.id,
      receiptRef: c.receiptRef,
      studentName: c.studentName,
    })),
  );
}

/* ═══════════════════════════════════════════════════════════════
 * Invoice-request workflow (Counselor → Admin → Accounts → Issued)
 * ═══════════════════════════════════════════════════════════════ */

export type ActorContext = { id: string; name: string; role: string };

function ensureRequest(c: Collection): InvoiceRequest {
  if (!c.invoiceRequest) c.invoiceRequest = { type: "none", status: "none" };
  return c.invoiceRequest;
}

/** Counselor or Admin attaches an invoice request after the fact. */
export function requestInvoice(
  id: string,
  type: Exclude<InvoiceRequestType, "none">,
  by: ActorContext,
): Collection | null {
  const c = state.find(x => x.id === id);
  if (!c) return null;
  const req = ensureRequest(c);
  if (req.type !== "none" && req.status !== "rejected" && req.status !== "issued") return c;
  req.type = type;
  req.status = by.role === "admin" ? "awaiting_accounts" : "awaiting_admin_review";
  req.requestedById = by.id;
  req.requestedByName = by.name;
  req.requestedByRole = by.role;
  req.requestedAt = new Date().toISOString();
  pushAudit(c, {
    byId: by.id, byName: by.name, byRole: by.role,
    action: `Invoice request created (${type})`,
    remarks: `Status: ${req.status.replace(/_/g, " ")}`,
  });
  save([...state]);
  void syncCollectionUpdateToBackend(c.id, {
    invoiceRequest: c.invoiceRequest,
    audit: c.audit,
  });
  return c;
}

/** Admin approves a counselor's request and forwards it to Accounts. */
export function adminApproveInvoiceRequest(id: string, by: ActorContext, remarks?: string): Collection | null {
  const c = state.find(x => x.id === id);
  if (!c?.invoiceRequest) return null;
  const req = c.invoiceRequest;
  if (req.status !== "awaiting_admin_review") return null;
  req.status = "awaiting_accounts";
  req.adminReviewedById = by.id;
  req.adminReviewedByName = by.name;
  req.adminReviewedAt = new Date().toISOString();
  req.adminRemarks = remarks;
  pushAudit(c, {
    byId: by.id, byName: by.name, byRole: by.role,
    action: "Admin approved invoice request",
    remarks,
  });
  save([...state]);
  void syncCollectionUpdateToBackend(c.id, {
    invoiceRequest: c.invoiceRequest,
    audit: c.audit,
  });
  return c;
}

export function adminRejectInvoiceRequest(id: string, reason: string, by: ActorContext): Collection | null {
  const c = state.find(x => x.id === id);
  if (!c?.invoiceRequest) return null;
  const req = c.invoiceRequest;
  req.status = "rejected";
  req.rejectionReason = reason;
  req.adminReviewedById = by.id;
  req.adminReviewedByName = by.name;
  req.adminReviewedAt = new Date().toISOString();
  pushAudit(c, {
    byId: by.id, byName: by.name, byRole: by.role,
    action: "Admin rejected invoice request",
    remarks: reason,
  });
  save([...state]);
  void syncCollectionUpdateToBackend(c.id, {
    status: c.status,
    invoiceRequest: c.invoiceRequest,
    audit: c.audit,
  });
  return c;
}

/** Accounts Executive prepares a draft (Manager / Owner will issue). */
export function accountsPrepareDraft(id: string, by: ActorContext): Collection | null {
  const c = state.find(x => x.id === id);
  if (!c?.invoiceRequest) return null;
  const req = c.invoiceRequest;
  if (req.status !== "awaiting_accounts") return null;
  req.status = "draft_prepared";
  req.preparedById = by.id;
  req.preparedByName = by.name;
  req.preparedAt = new Date().toISOString();
  pushAudit(c, {
    byId: by.id, byName: by.name, byRole: by.role,
    action: "Accounts prepared draft",
  });
  save([...state]);
  void syncCollectionUpdateToBackend(c.id, {
    invoiceRequest: c.invoiceRequest,
    audit: c.audit,
  });
  return c;
}

/** Accounts Manager / Owner issues the invoice (links to TI/PI created elsewhere). */
export function accountsIssueInvoice(
  id: string,
  invoiceId: string,
  invoiceNo: string,
  by: ActorContext,
): Collection | null {
  const c = state.find(x => x.id === id);
  if (!c?.invoiceRequest) return null;
  const req = c.invoiceRequest;
  req.status = "issued";
  req.invoiceId = invoiceId;
  req.invoiceNo = invoiceNo;
  req.issuedById = by.id;
  req.issuedByName = by.name;
  req.issuedAt = new Date().toISOString();
  // Mirror onto the legacy TI fields if it's a TI.
  if (req.type === "TI") {
    c.invoiceId = invoiceId;
    c.invoiceNo = invoiceNo;
    c.invoicedById = by.id;
    c.invoicedByName = by.name;
    c.invoicedAt = new Date().toISOString();
    if (c.status === "Verified" || c.status === "Ready For Invoice") c.status = "Invoice Generated";
  }
  pushAudit(c, {
    byId: by.id, byName: by.name, byRole: by.role,
    action: `Invoice issued (${req.type} ${invoiceNo})`,
  });
  save([...state]);
  void syncCollectionUpdateToBackend(c.id, {
    invoiceRequest: c.invoiceRequest,
    invoiceId: c.invoiceId,
    invoiceNo: c.invoiceNo,
    invoicedById: c.invoicedById,
    invoicedByName: c.invoicedByName,
    invoicedAt: c.invoicedAt,
    status: c.status,
    audit: c.audit,
  });
  return c;
}

export function accountsHoldRequest(id: string, reason: string, by: ActorContext): Collection | null {
  const c = state.find(x => x.id === id);
  if (!c?.invoiceRequest) return null;
  c.invoiceRequest.status = "on_hold";
  c.invoiceRequest.holdReason = reason;
  pushAudit(c, {
    byId: by.id, byName: by.name, byRole: by.role,
    action: "Accounts placed request on hold",
    remarks: reason,
  });
  save([...state]);
  void syncCollectionUpdateToBackend(c.id, {
    invoiceRequest: c.invoiceRequest,
    audit: c.audit,
  });
  return c;
}

export function accountsRequestClarification(id: string, question: string, by: ActorContext): Collection | null {
  const c = state.find(x => x.id === id);
  if (!c?.invoiceRequest) return null;
  c.invoiceRequest.status = "clarification_requested";
  c.invoiceRequest.clarificationQuestion = question;
  pushAudit(c, {
    byId: by.id, byName: by.name, byRole: by.role,
    action: "Accounts requested clarification",
    remarks: question,
  });
  save([...state]);
  void syncCollectionUpdateToBackend(c.id, {
    invoiceRequest: c.invoiceRequest,
    audit: c.audit,
  });
  return c;
}

export function accountsRejectRequest(id: string, reason: string, by: ActorContext): Collection | null {
  const c = state.find(x => x.id === id);
  if (!c?.invoiceRequest) return null;
  c.invoiceRequest.status = "rejected";
  c.invoiceRequest.rejectionReason = reason;
  pushAudit(c, {
    byId: by.id, byName: by.name, byRole: by.role,
    action: "Accounts rejected request",
    remarks: reason,
  });
  save([...state]);
  void syncCollectionUpdateToBackend(c.id, {
    invoiceRequest: c.invoiceRequest,
    status: c.status,
    audit: c.audit,
  });
  return c;
}

/** Counselor / collector answers a clarification — moves back to awaiting_accounts. */
export function answerClarification(id: string, answer: string, by: ActorContext): Collection | null {
  const c = state.find(x => x.id === id);
  if (!c?.invoiceRequest) return null;
  if (c.invoiceRequest.status !== "clarification_requested") return null;
  c.invoiceRequest.clarificationAnswer = answer;
  c.invoiceRequest.status = "awaiting_accounts";
  pushAudit(c, {
    byId: by.id, byName: by.name, byRole: by.role,
    action: "Clarification provided",
    remarks: answer,
  });
  save([...state]);
  void syncCollectionUpdateToBackend(c.id, {
    invoiceRequest: c.invoiceRequest,
    audit: c.audit,
  });
  return c;
}

/* ───────── Selectors for the new workflow ───────── */

export function getRequestsAwaitingAdmin() {
  return state.filter(c => c.invoiceRequest?.status === "awaiting_admin_review");
}
export function getRequestsAwaitingAccounts() {
  return state.filter(c => c.invoiceRequest?.status === "awaiting_accounts" || c.invoiceRequest?.status === "draft_prepared");
}
export function getRequestsOnHoldOrClarification() {
  return state.filter(c => c.invoiceRequest?.status === "on_hold" || c.invoiceRequest?.status === "clarification_requested");
}
export function getRequestsRejected() {
  return state.filter(c => c.invoiceRequest?.status === "rejected");
}
export function getCollectionsByAdminToday() {
  const k = new Date().toDateString();
  return state.filter(c => c.collectorRole === "admin" && new Date(c.collectedAt).toDateString() === k);
}
export function getRequestsAwaitingAdminFor(counselorId: string) {
  return getRequestsAwaitingAdmin().filter(c => c.collectedById === counselorId);
}
/** Requests that the given user originally created and that have been issued. */
export function getRequestsIssuedByMe(userId: string) {
  return state.filter(c => c.invoiceRequest?.requestedById === userId && c.invoiceRequest?.status === "issued");
}
/** Requests > N hours old still pending verification or accounts action. */
export function getStalePendingRequests(hours = 6) {
  const cutoff = Date.now() - hours * 3600 * 1000;
  return state.filter(c => {
    const r = c.invoiceRequest;
    if (!r) return false;
    if (!["awaiting_admin_review", "awaiting_accounts"].includes(r.status)) return false;
    return r.requestedAt ? new Date(r.requestedAt).getTime() < cutoff : false;
  });
}
