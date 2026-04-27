import mongoose from 'mongoose';

const FollowUpSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  followUpTime: { type: String },
  notes: { type: String },
  completed: { type: Boolean, default: false },
  createdAt: { type: String },
  followUpType: { type: String },
}, { timestamps: true });

export default mongoose.model('FollowUp', FollowUpSchema);
