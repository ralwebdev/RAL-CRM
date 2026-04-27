import mongoose from 'mongoose';

const FinanceInvoiceSchema = new mongoose.Schema({
  invoiceNo: {
    type: String,
    required: [true, 'Invoice number is required'],
    unique: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
  },
  customerId: {
    type: String, // String ID from frontend
    required: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  customerType: {
    type: String,
    enum: ['Student', 'Institution', 'Event', 'Other'],
    default: 'Student',
  },
  revenueStream: {
    type: String,
    required: true,
  },
  courseName: {
    type: String,
  },
  programName: {
    type: String,
  },
  gstType: {
    type: String,
    enum: ['Taxable', 'Exempt', 'Zero Rated'],
    default: 'Taxable',
  },
  subtotal: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  gstRate: {
    type: Number,
    default: 18,
  },
  cgst: {
    type: Number,
    default: 0,
  },
  sgst: {
    type: Number,
    default: 0,
  },
  igst: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  amountPaid: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Partial', 'Paid', 'Overdue', 'Cancelled'],
    default: 'Draft',
  },
  invoiceType: {
    type: String,
    enum: ['PI', 'TI'],
    default: 'TI',
  },
  linkedPiId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FinanceInvoice',
  },
  conversionDate: {
    type: Date,
  },
  convertedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  issueDate: {
    type: Date,
    default: Date.now,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  notes: {
    type: String,
  },
  gstin: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Virtual for 'total' to match frontend
FinanceInvoiceSchema.virtual('total').get(function() {
  return this.totalAmount;
});

FinanceInvoiceSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

FinanceInvoiceSchema.set('toJSON', {
  virtuals: true,
});

const FinanceInvoice = mongoose.model('FinanceInvoice', FinanceInvoiceSchema);

export default FinanceInvoice;
