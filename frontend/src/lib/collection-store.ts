/**
 * Student Collection Control System — central store
 *
 * Workflow:
 *   1. Counselor logs a Collection (status: "Collected").
 *   2. Counselor submits to Admin (status: "Awaiting Verification").
 *   3. Admin verifies against cash/bank and Approves / Rejects / Marks Mismatch.
 *   4. Once Verified, the entry appears in the Accounts queue → "Ready For Invoice".
 *   5. Accounts generates a Tax Invoice → status flips to "Invoice Generated".
 *
 * EMI late-fee engine: ₹50 / day overdue, accrued on read (no schedule mutation).
 */

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
  /** base64 data URL — fine for the localStorage demo */
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

  /** Optional file attachments (base64 in localStorage). */
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

function load(): Collection[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return seed();
}

function seed(): Collection[] {
  return [];
}

let state: Collection[] = typeof window !== "undefined" ? load() : [];

function save(next: Collection[]) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach(l => l());
}

export function subscribeCollections(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getCollections(): Collection[] { return state; }
export function resetCollections() { save(seed()); }

function pushAudit(c: Collection, entry: Omit<CollectionAuditEntry, "id" | "at">) {
  c.audit = [
    { id: uid("aud"), at: new Date().toISOString(), ...entry },
    ...c.audit,
  ];
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
  const c: Collection = {
    id: uid("col"),
    receiptRef: `RC-${new Date().getFullYear()}-${String(state.length + 1).padStart(4, "0")}`,
    ...rest,
    collectedAt: new Date().toISOString(),
    collectedById: by.id,
    collectedByName: by.name,
    collectorRole,
    status: "Collected",
    invoiceRequest,
    audit: [],
    createdAt: new Date().toISOString(),
  };
  pushAudit(c, {
    byId: by.id, byName: by.name, byRole: by.role,
    action: collectorRole === "admin" ? "Direct collection logged (admin)" : "Collection logged",
    toStatus: "Collected",
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
  if (c.status !== "Awaiting Verification" && c.status !== "Mismatch") return null;
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
