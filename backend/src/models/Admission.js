import mongoose from 'mongoose';

const PaymentHistorySchema = new mongoose.Schema({
  paymentDate: { type: String, required: true },
  amountPaid: { type: Number, required: true },
  paymentMode: { type: String, required: true },
  referenceNumber: { type: String },
  paymentType: { type: String },
  emiNumber: { type: Number, default: null },
});

const AdmissionSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  studentName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  courseSelected: { type: String, required: true },
  batch: { type: String }, // Renamed from batchAssigned for frontend sync
  admissionDate: { type: String, required: true },
  totalFee: { type: Number, required: true },
  feePaid: { type: Number, default: 0 }, // Changed from required: true to default: 0
  paymentStatus: { type: String, enum: ['Pending', 'Partial', 'Paid'], default: 'Pending' },
  paymentMode: { type: String },
  chequeNumber: { type: String },
  transactionId: { type: String },
  paymentType: { type: String },
  emiNumber: { type: Number, default: null },
  totalEmis: { type: Number, default: null },
  paymentHistory: [PaymentHistorySchema],
  parentName: { type: String },
  parentPhone: { type: String },
  studentBankName: { type: String },
  parentBankName: { type: String },
  scholarshipAmount: { type: Number, default: 0 },
  counselorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, default: 'Confirmed' },
  approvalStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  invoiceId: { type: String }
}, { timestamps: true });

export default mongoose.model('Admission', AdmissionSchema);
