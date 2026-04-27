import mongoose from 'mongoose';

const AllianceProposalSchema = new mongoose.Schema({
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AllianceInstitution',
    required: true
  },
  proposalType: {
    type: String,
    enum: ["MoU", "Workshop Proposal", "Internship Proposal", "Training Proposal", "Custom Program"],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ["Draft", "Sent", "Under Review", "Approved", "Rejected"],
    default: "Draft"
  },
  sentDate: {
    type: Date
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

AllianceProposalSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

AllianceProposalSchema.set('toJSON', {
  virtuals: true,
});

const AllianceProposal = mongoose.model('AllianceProposal', AllianceProposalSchema);

export default AllianceProposal;
