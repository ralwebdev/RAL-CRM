import mongoose from 'mongoose';

const AllianceTaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AllianceInstitution',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ["Pending", "In Progress", "Done", "Overdue"],
    default: "Pending"
  },
  priority: {
    type: String,
    enum: ["Low", "Medium", "High", "Urgent"],
    default: "Medium"
  }
}, {
  timestamps: true
});

AllianceTaskSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

AllianceTaskSchema.set('toJSON', {
  virtuals: true,
});

const AllianceTask = mongoose.model('AllianceTask', AllianceTaskSchema);

export default AllianceTask;
