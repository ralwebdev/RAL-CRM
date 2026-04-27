import mongoose from 'mongoose';

const FinanceExpenseSchema = new mongoose.Schema({
  expenseNo: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['Marketing', 'Salaries', 'Travel', 'Rent', 'Vendor', 'Trainer', 'Office', 'Misc'],
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
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  description: {
    type: String,
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'Bank', 'UPI', 'Card', 'Cheque', 'Online'],
  },
  status: {
    type: String,
    enum: ['Draft', 'Pending', 'Approved', 'Rejected', 'Paid', 'Hold'],
    default: 'Pending',
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FinanceVendor',
  },
  vendorName: {
    type: String,
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  submittedBy: {
    type: String, // String name for frontend
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  attachmentRef: {
    type: String,
  },
}, {
  timestamps: true,
});

FinanceExpenseSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

FinanceExpenseSchema.set('toJSON', {
  virtuals: true,
});

const FinanceExpense = mongoose.model('FinanceExpense', FinanceExpenseSchema);

export default FinanceExpense;
