import mongoose from 'mongoose';

const FollowUpSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  followUpTime: { type: String },
  notes: { type: String },
  completed: { type: Boolean, default: false },
  // Kept for compatibility; canonical created timestamp is handled by mongoose.
  createdAt: { type: Date, default: Date.now },
  followUpType: { type: String },
}, { timestamps: true });

FollowUpSchema.index({ leadId: 1, date: 1 });
FollowUpSchema.index({ assignedTo: 1, date: 1, completed: 1 });

export default mongoose.model('FollowUp', FollowUpSchema);
