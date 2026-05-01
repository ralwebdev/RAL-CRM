import mongoose from 'mongoose';

const CollectionAttachmentSchema = new mongoose.Schema({
  kind: { type: String, enum: ["payment_screenshot", "deposit_slip", "student_note"], required: true },
  name: { type: String, required: true },
  dataUrl: { type: String },
  uploadedAt: { type: Date, default: Date.now }
});

const CollectionAuditEntrySchema = new mongoose.Schema({
  at: { type: Date, default: Date.now },
  byId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  byName: { type: String },
  byRole: { type: String },
  action: { type: String, required: true },
  fromStatus: { type: String },
  toStatus: { type: String },
  remarks: { type: String }
});

const CollectionSchema = new mongoose.Schema({
  receiptRef: { type: String, required: true, unique: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', required: true },
  studentName: { type: String, required: true },
  studentMobile: { type: String },
  courseName: { type: String, required: true },
  branch: { type: String },
  amount: { type: Number, required: true },
  mode: { 
    type: String, 
    enum: ["cash", "upi", "bank_transfer", "cheque", "card"],
    required: true 
  },
  reason: { 
    type: String,
    enum: [
      "admission_fee", "registration_fee", "seat_booking", "emi_payment", 
      "emi_late_fine", "id_card_charge", "rfid_charge", "stationery_sale", "misc_approved_charge"
    ],
    required: true
  },
  collectedAt: { type: Date, default: Date.now },
  collectedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collectedByName: { type: String },
  collectorRole: { type: String, enum: ["counselor", "admin"] },
  remarks: { type: String },

  txnId: { type: String },
  bankName: { type: String },
  chequeNumber: { type: String },
  chequeDate: { type: Date },

  attachments: [CollectionAttachmentSchema],

  invoiceRequest: {
    type: { type: String, enum: ["PI", "TI", "none"], default: "none" },
    status: { 
      type: String, 
      enum: [
        "none", "awaiting_admin_review", "awaiting_accounts", "draft_prepared", 
        "on_hold", "clarification_requested", "rejected", "issued"
      ],
      default: "none"
    },
    requestedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requestedByName: { type: String },
    requestedByRole: { type: String },
    requestedAt: { type: Date },
    adminReviewedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adminReviewedByName: { type: String },
    adminReviewedAt: { type: Date },
    adminRemarks: { type: String },
    preparedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    preparedByName: { type: String },
    preparedAt: { type: Date },
    issuedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    issuedByName: { type: String },
    issuedAt: { type: Date },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceInvoice' },
    invoiceNo: { type: String },
    holdReason: { type: String },
    clarificationQuestion: { type: String },
    clarificationAnswer: { type: String },
    rejectionReason: { type: String }
  },

  emiId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceEmiSchedule' },
  emiInstallmentNo: { type: Number },
  lateFeeAmount: { type: Number, default: 0 },

  status: { 
    type: String, 
    enum: [
      "Collected", "Awaiting Verification", "Verified", "Mismatch", 
      "Rejected", "Ready For Invoice", "Invoice Generated"
    ],
    default: "Collected"
  },

  verifiedAmount: { type: Number },
  verificationMode: { type: String, enum: ["cash_in_hand", "bank_statement", "upi_confirmation", "cheque_status"] },
  verifiedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedByName: { type: String },
  verifiedAt: { type: Date },
  verificationRemarks: { type: String },
  mismatchAmount: { type: Number, default: 0 },

  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceInvoice' },
  invoiceNo: { type: String },
  invoicedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  invoicedByName: { type: String },
  invoicedAt: { type: Date },

  audit: [CollectionAuditEntrySchema]

}, { timestamps: true });

CollectionSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

CollectionSchema.set('toJSON', {
  virtuals: true,
});

const Collection = mongoose.model('Collection', CollectionSchema);

export default Collection;
