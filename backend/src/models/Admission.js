import mongoose from 'mongoose';

const PaymentHistorySchema = new mongoose.Schema({
  paymentDate: { type: String, required: [true, 'Payment date is required'] },
  amountPaid: { type: Number, required: [true, 'Amount paid is required'] },
  paymentMode: { type: String, required: [true, 'Payment mode is required'] },
  referenceNumber: { type: String },
  paymentType: { type: String },
  emiNumber: { type: Number, default: null },
});

const AdmissionSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: [true, 'Lead ID is required'],
    unique: true,
    index: true
  },
  studentName: { type: String, required: [true, 'Student name is required'] },
  phone: { type: String, required: [true, 'Phone number is required'] },
  email: { type: String, required: [true, 'Email is required'] },
  courseSelected: { type: String, required: [true, 'Course selection is required'] },
  batch: { type: String }, // Renamed from batchAssigned for frontend sync
  admissionDate: { type: String, required: [true, 'Admission date is required'] },
  totalFee: { type: Number, required: [true, 'Total fee is required'] },
  feePaid: { type: Number, default: 0 },
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
