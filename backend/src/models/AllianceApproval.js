import mongoose from 'mongoose';

const allianceApprovalSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
  },
  requestType: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium',
  },
  notes: {
    type: String,
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  submittedRole: {
    type: String,
    required: true,
  },
  currentApproverRole: {
    type: String,
    required: true,
  },
  currentApproverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Hold', 'Overridden', 'Resubmitted'],
    default: 'Pending',
  },
  nextReviewDate: {
    type: Date,
  },
}, { timestamps: true });

allianceApprovalSchema.index({ submittedBy: 1, createdAt: -1 });
allianceApprovalSchema.index({ currentApproverId: 1, status: 1 });
allianceApprovalSchema.index({ currentApproverRole: 1, status: 1 });

const allianceApprovalLogSchema = new mongoose.Schema({
  approvalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AllianceApproval',
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  fromStatus: {
    type: String,
    required: true,
  },
  toStatus: {
    type: String,
    required: true,
  },
  actedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  actedRole: {
    type: String,
    required: true,
  },
  comment: {
    type: String,
  },
}, { timestamps: true });

allianceApprovalLogSchema.index({ approvalId: 1, createdAt: -1 });
allianceApprovalLogSchema.index({ actedBy: 1, createdAt: -1 });

export const AllianceApproval = mongoose.model('AllianceApproval', allianceApprovalSchema);
export const AllianceApprovalLog = mongoose.model('AllianceApprovalLog', allianceApprovalLogSchema);
