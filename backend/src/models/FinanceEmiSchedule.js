import mongoose from 'mongoose';

const FinanceEmiScheduleSchema = new mongoose.Schema({
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FinanceInvoice',
    required: true,
  },
  customerId: {
    type: String,
    required: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  installmentNo: {
    type: Number,
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
  status: {
    type: String,
    enum: ['Upcoming', 'Due', 'Paid', 'Overdue'],
    default: 'Upcoming',
  },
  paidOn: {
    type: Date,
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FinancePayment',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Virtual for 'id' to match frontend expected interface
FinanceEmiScheduleSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

FinanceEmiScheduleSchema.set('toJSON', {
  virtuals: true,
});

const FinanceEmiSchedule = mongoose.model('FinanceEmiSchedule', FinanceEmiScheduleSchema);

export default FinanceEmiSchedule;
