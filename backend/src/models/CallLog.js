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
  createdAt: { type: String, required: true },
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

export default mongoose.model('CallLog', CallLogSchema);
