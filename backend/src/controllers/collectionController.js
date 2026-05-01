import Collection from '../models/Collection.js';
import Admission from '../models/Admission.js';
import mongoose from 'mongoose';

const RECEIPT_REF_REGEX = /^RC-(\d{4})-(\d{4})$/i;

const makeReceiptRef = (dateLike = new Date()) => {
  const d = new Date(dateLike || Date.now());
  const year = Number.isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `RC-${year}-${suffix}`;
};

const normalizeReceiptRef = (rawValue, dateLike) => {
  const raw = String(rawValue || '').trim().toUpperCase();
  const match = raw.match(RECEIPT_REF_REGEX);
  if (match) return `RC-${match[1]}-${match[2]}`;
  return makeReceiptRef(dateLike);
};

const resolveUniqueReceiptRef = async (rawValue, dateLike) => {
  let candidate = normalizeReceiptRef(rawValue, dateLike);
  const existsExact = await Collection.exists({ receiptRef: candidate });
  if (!existsExact) return candidate;

  for (let i = 0; i < 30; i += 1) {
    candidate = makeReceiptRef(dateLike);
    // eslint-disable-next-line no-await-in-loop
    const exists = await Collection.exists({ receiptRef: candidate });
    if (!exists) return candidate;
  }
  return `RC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
};

// @desc    Get all collections
// @route   GET /api/collections
// @access  Private
export const getCollections = async (req, res) => {
  try {
    let query = {};
    if (req.user && req.user.role === 'counselor') {
      query.collectedById = req.user._id;
    }
    const collections = await Collection.find(query)
      .populate('collectedById', 'name email role')
      .populate('studentId', 'name phone email courseSelected batch');
    
    res.json(collections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single collection
// @route   GET /api/collections/:id
// @access  Private
export const getCollectionById = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id)
      .populate('collectedById', 'name email role')
      .populate('studentId', 'name phone email');
    
    if (collection) {
      res.json(collection);
    } else {
      res.status(404).json({ message: 'Collection not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a collection
// @route   POST /api/collections
// @access  Private
export const createCollection = async (req, res) => {
  try {
    // Resolve and validate foreign key: studentId (Admission).
    // Frontend may pass either Admission._id or Lead._id; both should map safely.
    const studentIdRaw = req.body.studentId;
    const studentIdIsObjectId = mongoose.isValidObjectId(studentIdRaw);

    let resolvedAdmission = null;
    if (studentIdIsObjectId) {
      resolvedAdmission = await Admission.findById(studentIdRaw);
    }
    if (!resolvedAdmission && studentIdIsObjectId) {
      resolvedAdmission = await Admission.findOne({ leadId: studentIdRaw });
    }
    if (!resolvedAdmission && req.body.studentName) {
      resolvedAdmission = await Admission.findOne({
        studentName: req.body.studentName,
        ...(req.body.studentMobile ? { phone: req.body.studentMobile } : {}),
      });
    }
    const fallbackStudentId = studentIdIsObjectId
      ? studentIdRaw
      : new mongoose.Types.ObjectId();
    const finalStudentId = resolvedAdmission?._id || fallbackStudentId;
    const finalReceiptRef = await resolveUniqueReceiptRef(req.body?.receiptRef, req.body?.collectedAt);

    const statusFromRole = req.user.role === 'admin' ? (req.body?.status || 'Collected') : 'Awaiting Verification';

    const collectionData = {
      ...req.body,
      receiptRef: finalReceiptRef,
      studentId: finalStudentId,
      collectedById: req.user._id,
      collectedByName: req.user.name,
      collectorRole: req.user.role === 'admin' ? 'admin' : 'counselor',
      status: statusFromRole,
    };

    const collection = new Collection(collectionData);
    collection.audit.push({
      byId: req.user._id,
      byName: req.user.name,
      byRole: req.user.role,
      action: resolvedAdmission ? 'Collection Created' : 'Collection Created (unmapped student)',
      toStatus: collection.status || 'Collected',
    });
    const createdCollection = await collection.save();

    // Optionally update Admission's payment history
    const admission = await Admission.findById(createdCollection.studentId);
    if (admission) {
      admission.paymentHistory.push({
        paymentDate: createdCollection.collectedAt,
        amountPaid: createdCollection.amount,
        paymentMode: createdCollection.mode,
        referenceNumber: createdCollection.receiptRef,
        paymentType: createdCollection.reason,
        emiNumber: createdCollection.emiInstallmentNo || null
      });
      await admission.save();
    }

    res.status(201).json(createdCollection);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a collection
// @route   PUT /api/collections/:id
// @access  Private
export const updateCollection = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    
    if (collection) {
      Object.assign(collection, req.body);
      const updatedCollection = await collection.save();
      res.json(updatedCollection);
    } else {
      res.status(404).json({ message: 'Collection not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Verify a collection (Admin only)
// @route   PUT /api/collections/:id/verify
// @access  Private/Admin
export const verifyCollection = async (req, res) => {
  try {
    const { verifiedAmount, verificationMode, remarks } = req.body;
    const collection = await Collection.findById(req.params.id);

    if (collection) {
      const prevStatus = collection.status;
      const matches = Math.abs(verifiedAmount - collection.amount) < 0.5;
      collection.verifiedAmount = verifiedAmount;
      collection.verificationMode = verificationMode;
      collection.verifiedById = req.user._id;
      collection.verifiedByName = req.user.name;
      collection.verifiedAt = new Date();
      collection.verificationRemarks = remarks;
      collection.mismatchAmount = matches ? 0 : collection.amount - verifiedAmount;
      collection.status = matches ? 'Verified' : 'Mismatch';
      collection.audit.push({
        byId: req.user._id,
        byName: req.user.name,
        byRole: req.user.role,
        action: 'Collection Verified',
        fromStatus: prevStatus,
        toStatus: collection.status,
        remarks,
      });
      
      const updatedCollection = await collection.save();
      res.json(updatedCollection);
    } else {
      res.status(404).json({ message: 'Collection not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
