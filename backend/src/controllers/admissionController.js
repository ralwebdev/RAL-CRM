import Admission from '../models/Admission.js';
import Collection from '../models/Collection.js';

const RECEIPT_REF_REGEX = /^RC-(\d{4})-(\d{4})$/i;

const toCollectionMode = (paymentMode = '') => {
  const mode = String(paymentMode).trim().toLowerCase();
  if (mode.includes('upi')) return 'upi';
  if (mode.includes('cheque') || mode.includes('check')) return 'cheque';
  if (
    mode.includes('bank') ||
    mode.includes('online') ||
    mode.includes('net') ||
    mode.includes('transfer')
  ) return 'bank_transfer';
  if (mode.includes('card') || mode.includes('credit') || mode.includes('debit')) return 'card';
  return 'cash';
};

const toCollectionReason = (paymentType = '') => {
  const type = String(paymentType).trim().toLowerCase();
  if (type.includes('emi') && type.includes('late')) return 'emi_late_fine';
  if (type.includes('emi')) return 'emi_payment';
  if (type.includes('admission')) return 'admission_fee';
  if (type.includes('registration')) return 'registration_fee';
  if (type.includes('seat')) return 'seat_booking';
  if (type.includes('id')) return 'id_card_charge';
  if (type.includes('rfid')) return 'rfid_charge';
  if (type.includes('station')) return 'stationery_sale';
  return 'misc_approved_charge';
};

const normalizeRef = (value) => String(value || '').trim();

const historyEntryKey = (entry = {}) => {
  const ref = normalizeRef(entry.referenceNumber).toUpperCase();
  if (RECEIPT_REF_REGEX.test(ref)) return `ref:${ref}`;
  const entryId = String(entry?._id || '');
  if (entryId) return `entry:${entryId}`;
  return [
    String(entry.paymentDate || ''),
    String(entry.amountPaid || 0),
    String(entry.paymentMode || '').toLowerCase(),
    String(entry.paymentType || '').toLowerCase(),
    String(entry.emiNumber ?? ''),
  ].join('|');
};

const buildReceiptRef = (admissionId, entry) => {
  const normalizedRef = normalizeRef(entry.referenceNumber);
  const match = normalizedRef.toUpperCase().match(RECEIPT_REF_REGEX);
  if (match) return `RC-${match[1]}-${match[2]}`;

  // Deterministic RC format when admission payment history has no explicit reference number.
  const year = new Date(entry.paymentDate || Date.now()).getFullYear();
  const seed = String(entry?._id || admissionId || Date.now()).replace(/[^a-fA-F0-9]/g, '');
  const numeric = parseInt(seed.slice(-6) || '0', 16);
  const suffix = String((numeric % 9000) + 1000).padStart(4, '0');
  return `RC-${year}-${suffix}`;
};

const actorToCollectorRole = (role) => (role === 'counselor' ? 'counselor' : 'admin');
const actorToInitialStatus = (role) => (role === 'counselor' ? 'Awaiting Verification' : 'Collected');

const syncAdmissionPaymentHistoryToCollections = async ({
  admission,
  actor,
  previousPaymentHistory = [],
}) => {
  if (!admission?._id || !actor?._id) return;

  const previousKeys = new Set((previousPaymentHistory || []).map((h) => historyEntryKey(h)));
  const history = Array.isArray(admission.paymentHistory) ? admission.paymentHistory : [];
  const collectorRole = actorToCollectorRole(actor.role);
  const initialStatus = actorToInitialStatus(actor.role);

  for (const entry of history) {
    if (!entry?.amountPaid || Number(entry.amountPaid) <= 0) continue;

    const currentKey = historyEntryKey(entry);
    if (previousKeys.has(currentKey)) continue;

    const receiptRef = buildReceiptRef(admission._id, entry);
    const refLower = receiptRef.toLowerCase();

    // Idempotency: don't create duplicates if this admission-payment is already synced.
    const existing = await Collection.findOne({
      studentId: admission._id,
      $or: [
        { receiptRef },
        { receiptRef: { $regex: new RegExp(`^${receiptRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      ],
    }).select('_id receiptRef');

    if (existing) continue;

    const mode = toCollectionMode(entry.paymentMode);
    const reason = toCollectionReason(entry.paymentType);
    const collectedAt = entry.paymentDate ? new Date(entry.paymentDate) : new Date();
    const safeCollectedAt = Number.isNaN(collectedAt.getTime()) ? new Date() : collectedAt;

    const collection = new Collection({
      receiptRef,
      studentId: admission._id,
      studentName: admission.studentName,
      studentMobile: admission.phone,
      courseName: admission.courseSelected,
      branch: admission.batch || undefined,
      amount: Number(entry.amountPaid) || 0,
      mode,
      reason,
      collectedAt: safeCollectedAt,
      collectedById: actor._id,
      collectedByName: actor.name,
      collectorRole,
      status: initialStatus,
      txnId: normalizeRef(entry.referenceNumber) || undefined,
      emiInstallmentNo: entry.emiNumber ?? undefined,
      remarks: 'Auto-synced from admission payment history',
      invoiceRequest: { type: 'none', status: 'none' },
      audit: [{
        byId: actor._id,
        byName: actor.name,
        byRole: actor.role,
        action: 'Synced from Admission payment history',
        toStatus: initialStatus,
        remarks: `key=${currentKey} ref=${refLower}`,
      }],
    });

    await collection.save();
  }
};

export const getAdmissions = async (req, res) => {
  try {
    let query = {};
    if (req.user && req.user.role === 'counselor') {
      query.counselorId = req.user._id;
    }
    const admissions = await Admission.find(query);
    res.json(admissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdmissionById = async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission) {
      return res.status(404).json({ message: 'Admission not found' });
    }
    res.json(admission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createAdmission = async (req, res) => {
  try {
    const payload = { ...req.body };
    // Ensure counselor-created admissions remain visible to the same counselor
    // when GET /api/admissions applies role-based filtering.
    if (!payload.counselorId && req.user?._id) {
      payload.counselorId = req.user._id;
    }

    // Validate foreign key: leadId
    if (payload.leadId) {
      const Lead = (await import('../models/Lead.js')).default;
      const leadExists = await Lead.findById(payload.leadId);
      if (!leadExists) {
        return res.status(400).json({ message: 'Invalid leadId: Lead does not exist.' });
      }
    }

    const admission = new Admission(payload);
    console.log('Creating Admission with payload:', JSON.stringify(payload, null, 2));
    const createdAdmission = await admission.save();
    await syncAdmissionPaymentHistoryToCollections({
      admission: createdAdmission,
      actor: req.user,
      previousPaymentHistory: [],
    });
    res.status(201).json(createdAdmission);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateAdmission = async (req, res) => {
  try {
    let admission = await Admission.findById(req.params.id);
    if (!admission) {
      return res.status(404).json({ message: 'Admission not found' });
    }

    if (req.user.role === 'counselor' && String(admission.counselorId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to update this admission' });
    }

    const previousPaymentHistory = Array.isArray(admission.paymentHistory)
      ? admission.paymentHistory.map((h) => h.toObject ? h.toObject() : h)
      : [];

    Object.assign(admission, req.body);
    admission = await admission.save();

    await syncAdmissionPaymentHistoryToCollections({
      admission,
      actor: req.user,
      previousPaymentHistory,
    });

    res.json(admission);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
