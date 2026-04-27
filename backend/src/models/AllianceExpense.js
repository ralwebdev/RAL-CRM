import mongoose from 'mongoose';

const AllianceExpenseSchema = new mongoose.Schema({
  executiveId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AllianceInstitution',
    required: true
  },
  expenseType: {
    type: String,
    enum: ["Travel", "Meals", "Print Material", "Gifts", "Accommodation", "Misc"],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  billUrl: {
    type: String
  },
  expenseDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ["Submitted", "Approved", "Rejected", "Reimbursed"],
    default: "Submitted"
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

AllianceExpenseSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

AllianceExpenseSchema.set('toJSON', {
  virtuals: true,
});

const AllianceExpense = mongoose.model('AllianceExpense', AllianceExpenseSchema);

export default AllianceExpense;
