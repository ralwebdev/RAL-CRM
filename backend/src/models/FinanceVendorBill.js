import mongoose from 'mongoose';

const FinanceVendorBillSchema = new mongoose.Schema({
  billNo: {
    type: String,
    required: [true, 'Bill number is required'],
    unique: true,
    trim: true,
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FinanceVendor',
    required: true,
  },
  vendorName: {
    type: String,
    required: true,
  },
  billDate: {
    type: Date,
    required: true,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  gst: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
  paid: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Paid', 'Overdue'],
    default: 'Pending',
  },
  notes: {
    type: String,
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Virtual for ID
FinanceVendorBillSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

FinanceVendorBillSchema.set('toJSON', {
  virtuals: true,
});

const FinanceVendorBill = mongoose.model('FinanceVendorBill', FinanceVendorBillSchema);

export default FinanceVendorBill;
