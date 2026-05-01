import mongoose from 'mongoose';

const CallLogSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  telecallerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  outcome: { type: String, required: true },
  notes: { type: String },
  nextFollowUp: { type: String },
  nextFollowUpTime: { type: String },
  followUpType: { type: String },
  notInterestedReason: { type: String },
  callbackDate: { type: String },
  callbackTime: { type: String },
  // Kept for frontend compatibility; canonical write-time comes from timestamps.
  createdAt: { type: Date, default: Date.now },
  conversationInsight: {
    careerGoal: String,
    budgetRange: String,
    leadMotivation: String,
    preferredLearningMode: String,
    decisionMaker: String,
    placementExpectation: String,
    objections: String,
    preferredStartDate: String,
    biggestConcern: String,
  }
}, { timestamps: true });

CallLogSchema.index({ leadId: 1, createdAt: -1 });
CallLogSchema.index({ telecallerId: 1, createdAt: -1 });

export default mongoose.model('CallLog', CallLogSchema);
