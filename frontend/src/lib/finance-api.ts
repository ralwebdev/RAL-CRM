import { api } from "./api";
import type { EmiSchedule, Expense, Invoice, Payment, Vendor, VendorBill } from "./finance-types";

type UnknownRecord = Record<string, any>;

const toId = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  if (typeof value === "object" && value.id) return String(value.id);
  return "";
};

const toIso = (value: any): string => {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
};

const toDateOnly = (value: any): string => toIso(value).slice(0, 10);

const sanitizeObject = <T extends UnknownRecord>(obj: T): T => {
  const out: UnknownRecord = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined) out[key] = value;
  });
  return out as T;
};

const mapInvoiceFromApi = (raw: UnknownRecord): Invoice => ({
  ...raw,
  id: toId(raw),
  invoiceType: raw.invoiceType,
  invoiceNo: String(raw.invoiceNo || ""),
  customerId: String(raw.customerId || ""),
  customerName: String(raw.customerName || ""),
  customerType: raw.customerType || "Student",
  revenueStream: raw.revenueStream || "Student Admissions",
  programName: raw.programName || raw.courseName || "",
  issueDate: toIso(raw.issueDate),
  dueDate: toIso(raw.dueDate),
  subtotal: Number(raw.subtotal || 0),
  discount: Number(raw.discount || 0),
  gstType: raw.gstType || "Taxable",
  gstRate: Number(raw.gstRate ?? 18),
  cgst: Number(raw.cgst || 0),
  sgst: Number(raw.sgst || 0),
  igst: Number(raw.igst || 0),
  total: Number(raw.total ?? raw.totalAmount ?? 0),
  amountPaid: Number(raw.amountPaid || 0),
  status: raw.status || "Draft",
  notes: raw.notes || "",
  gstin: raw.gstin || "",
  createdBy: toId(raw.createdBy) || String(raw.createdBy || ""),
  createdAt: toIso(raw.createdAt),
}) as Invoice;

const invoicePayload = (inv: Partial<Invoice>) => sanitizeObject({
  invoiceType: inv.invoiceType,
  linkedPiId: inv.linkedPiId,
  invoiceNo: inv.invoiceNo,
  customerId: inv.customerId,
  customerName: inv.customerName,
  customerType: inv.customerType,
  revenueStream: inv.revenueStream,
  programName: inv.programName,
  courseName: inv.programName, // backend has both in places; safe mapping
  issueDate: inv.issueDate ? toIso(inv.issueDate) : undefined,
  dueDate: inv.dueDate ? toIso(inv.dueDate) : undefined,
  subtotal: inv.subtotal,
  discount: inv.discount,
  gstType: inv.gstType,
  gstRate: inv.gstRate,
  cgst: inv.cgst,
  sgst: inv.sgst,
  igst: inv.igst,
  total: inv.total,
  totalAmount: (inv as any).totalAmount, // allow callers to pass through if needed
  amountPaid: inv.amountPaid,
  status: inv.status,
  notes: inv.notes,
  gstin: inv.gstin,
});

const mapPaymentFromApi = (raw: UnknownRecord): Payment => ({
  ...raw,
  id: toId(raw),
  receiptNo: String(raw.receiptNo || ""),
  invoiceId: toId(raw.invoiceId) || undefined,
  customerId: String(raw.customerId || ""),
  customerName: String(raw.customerName || ""),
  amount: Number(raw.amount || 0),
  mode: raw.mode,
  reference: raw.reference || "",
  paidOn: toIso(raw.paidOn),
  notes: raw.notes || "",
  recordedBy: toId(raw.recordedBy) || String(raw.recordedBy || ""),
  createdAt: toIso(raw.createdAt),
}) as Payment;

const paymentPayload = (p: Partial<Payment>) => sanitizeObject({
  receiptNo: p.receiptNo,
  invoiceId: p.invoiceId,
  customerId: p.customerId,
  customerName: p.customerName,
  amount: p.amount,
  mode: p.mode,
  reference: p.reference,
  paidOn: p.paidOn ? toIso(p.paidOn) : undefined,
  notes: p.notes,
});

const mapExpenseFromApi = (raw: UnknownRecord): Expense => ({
  ...raw,
  id: toId(raw),
  expenseNo: String(raw.expenseNo || ""),
  category: raw.category,
  vendorId: toId(raw.vendorId) || undefined,
  vendorName: raw.vendorName || "",
  amount: Number(raw.amount || 0),
  gst: Number(raw.gst || 0),
  total: Number(raw.total || 0),
  spendDate: toDateOnly(raw.date || raw.spendDate),
  description: raw.description || "",
  status: raw.status || "Pending",
  paymentMode: raw.paymentMode,
  attachmentRef: raw.attachmentRef || "",
  submittedBy: raw.submittedBy || "",
  approvedBy: toId(raw.approvedBy) || undefined,
  createdAt: toIso(raw.createdAt),
}) as Expense;

const expensePayload = (e: Partial<Expense>) => sanitizeObject({
  expenseNo: e.expenseNo,
  title: (e as any).title || e.description || "Expense",
  category: e.category,
  amount: e.amount,
  gst: e.gst,
  total: e.total,
  date: e.spendDate ? toIso(e.spendDate) : undefined,
  description: e.description,
  paymentMode: e.paymentMode,
  status: e.status,
  vendorId: e.vendorId,
  vendorName: e.vendorName,
  submittedBy: e.submittedBy,
  attachmentRef: e.attachmentRef,
});

const mapVendorFromApi = (raw: UnknownRecord): Vendor => ({
  ...raw,
  id: toId(raw),
  name: String(raw.name || ""),
  category: String(raw.category || ""),
  gstin: raw.gstin || "",
  contactName: raw.contactName || "",
  phone: raw.phone || "",
  email: raw.email || "",
  address: raw.address || "",
  openingBalance: Number(raw.openingBalance || 0),
  createdAt: toIso(raw.createdAt),
}) as Vendor;

const vendorPayload = (v: Partial<Vendor>) => sanitizeObject({
  name: v.name,
  category: v.category,
  gstin: v.gstin,
  contactName: v.contactName,
  phone: v.phone,
  email: v.email,
  address: v.address,
  openingBalance: v.openingBalance ?? 0,
});

const mapVendorBillFromApi = (raw: UnknownRecord): VendorBill => ({
  ...raw,
  id: toId(raw),
  billNo: String(raw.billNo || ""),
  vendorId: toId(raw.vendorId),
  vendorName: raw.vendorName || "",
  billDate: toDateOnly(raw.billDate),
  dueDate: toDateOnly(raw.dueDate),
  amount: Number(raw.amount || 0),
  gst: Number(raw.gst || 0),
  total: Number(raw.total || 0),
  paid: Number(raw.paid || 0),
  status: raw.status || "Pending",
  notes: raw.notes || "",
  createdAt: toIso(raw.createdAt),
}) as VendorBill;

const vendorBillPayload = (b: Partial<VendorBill>) => sanitizeObject({
  billNo: b.billNo,
  vendorId: b.vendorId,
  vendorName: b.vendorName,
  billDate: b.billDate ? toIso(b.billDate) : undefined,
  dueDate: b.dueDate ? toIso(b.dueDate) : undefined,
  amount: b.amount,
  gst: b.gst,
  total: b.total,
  paid: b.paid,
  status: b.status,
  notes: b.notes,
});

const mapEmiFromApi = (raw: UnknownRecord): EmiSchedule => ({
  ...raw,
  id: toId(raw),
  invoiceId: toId(raw.invoiceId),
  customerId: String(raw.customerId || ""),
  customerName: String(raw.customerName || ""),
  installmentNo: Number(raw.installmentNo || 0),
  dueDate: toIso(raw.dueDate),
  amount: Number(raw.amount || 0),
  status: raw.status || "Upcoming",
  paidOn: raw.paidOn ? toIso(raw.paidOn) : undefined,
  paymentId: toId(raw.paymentId) || undefined,
}) as EmiSchedule;

const emiPayload = (e: Partial<EmiSchedule>) => sanitizeObject({
  invoiceId: e.invoiceId,
  customerId: e.customerId,
  customerName: e.customerName,
  installmentNo: e.installmentNo,
  dueDate: e.dueDate ? toIso(e.dueDate) : undefined,
  amount: e.amount,
  status: e.status,
  paidOn: e.paidOn ? toIso(e.paidOn) : undefined,
  paymentId: e.paymentId,
});

export async function fetchFinanceSnapshot(): Promise<{
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  vendors: Vendor[];
  vendorBills: VendorBill[];
  emiSchedules: EmiSchedule[];
}> {
  const [inv, pay, exp, ven, vb, emi] = await Promise.all([
    api.get("/api/finance/invoices"),
    api.get("/api/finance/payments"),
    api.get("/api/finance/expenses"),
    api.get("/api/finance/vendors"),
    api.get("/api/finance/vendor-bills"),
    api.get("/api/finance/emi-schedules"),
  ]);
  const invoices = (Array.isArray(inv.data) ? inv.data : []).map(mapInvoiceFromApi);
  const payments = (Array.isArray(pay.data) ? pay.data : []).map(mapPaymentFromApi);
  const expenses = (Array.isArray(exp.data) ? exp.data : []).map(mapExpenseFromApi);
  const vendors = (Array.isArray(ven.data) ? ven.data : []).map(mapVendorFromApi);
  const vendorBills = (Array.isArray(vb.data) ? vb.data : []).map(mapVendorBillFromApi);
  const emiSchedules = (Array.isArray(emi.data) ? emi.data : []).map(mapEmiFromApi);
  return { invoices, payments, expenses, vendors, vendorBills, emiSchedules };
}

export async function createFinanceInvoice(payload: Partial<Invoice>): Promise<Invoice> {
  const response = await api.post("/api/finance/invoices", invoicePayload(payload));
  return mapInvoiceFromApi(response.data);
}

export async function updateFinanceInvoice(id: string, payload: Partial<Invoice>): Promise<Invoice> {
  const response = await api.put(`/api/finance/invoices/${id}`, invoicePayload(payload));
  return mapInvoiceFromApi(response.data);
}

export async function createFinancePayment(payload: Partial<Payment>): Promise<Payment> {
  const response = await api.post("/api/finance/payments", paymentPayload(payload));
  return mapPaymentFromApi(response.data);
}

export async function createFinanceExpense(payload: Partial<Expense>): Promise<Expense> {
  const response = await api.post("/api/finance/expenses", expensePayload(payload));
  return mapExpenseFromApi(response.data);
}

export async function updateFinanceExpense(id: string, payload: Partial<Expense>): Promise<Expense> {
  const response = await api.put(`/api/finance/expenses/${id}`, expensePayload(payload));
  return mapExpenseFromApi(response.data);
}

export async function createFinanceVendor(payload: Partial<Vendor>): Promise<Vendor> {
  const response = await api.post("/api/finance/vendors", vendorPayload(payload));
  return mapVendorFromApi(response.data);
}

export async function updateFinanceVendor(id: string, payload: Partial<Vendor>): Promise<Vendor> {
  const response = await api.put(`/api/finance/vendors/${id}`, vendorPayload(payload));
  return mapVendorFromApi(response.data);
}

export async function createFinanceVendorBill(payload: Partial<VendorBill>): Promise<VendorBill> {
  const response = await api.post("/api/finance/vendor-bills", vendorBillPayload(payload));
  return mapVendorBillFromApi(response.data);
}

export async function updateFinanceVendorBill(id: string, payload: Partial<VendorBill>): Promise<VendorBill> {
  const response = await api.put(`/api/finance/vendor-bills/${id}`, vendorBillPayload(payload));
  return mapVendorBillFromApi(response.data);
}

export async function createFinanceEmiSchedule(payload: Partial<EmiSchedule>): Promise<EmiSchedule> {
  const response = await api.post("/api/finance/emi-schedules", emiPayload(payload));
  return mapEmiFromApi(response.data);
}

export async function updateFinanceEmiSchedule(id: string, payload: Partial<EmiSchedule>): Promise<EmiSchedule> {
  const response = await api.put(`/api/finance/emi-schedules/${id}`, emiPayload(payload));
  return mapEmiFromApi(response.data);
}

