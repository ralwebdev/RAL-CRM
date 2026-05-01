import mongoose from 'mongoose';

const FinancePaymentSchema = new mongoose.Schema({
  receiptNo: {
    type: String,
    required: true,
    unique: true,
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FinanceInvoice',
  },
  expenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FinanceExpense',
  },
  customerId: {
    type: String,
    required: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  mode: {
    type: String,
    required: true,
    enum: ['Cash', 'Bank', 'UPI', 'Card', 'Cheque', 'Online'],
  },
  reference: {
    type: String,
  },
  paidOn: {
    type: Date,
    required: true,
    default: Date.now,
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

FinancePaymentSchema.index({ recordedBy: 1, createdAt: -1 });
FinancePaymentSchema.index({ invoiceId: 1, paidOn: -1 });
FinancePaymentSchema.index({ expenseId: 1, paidOn: -1 });

FinancePaymentSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

FinancePaymentSchema.set('toJSON', {
  virtuals: true,
});

const FinancePayment = mongoose.model('FinancePayment', FinancePaymentSchema);

export default FinancePayment;
