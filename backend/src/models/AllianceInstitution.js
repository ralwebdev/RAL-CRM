import mongoose from 'mongoose';

const AllianceInstitutionSchema = new mongoose.Schema({
  institutionId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ["School", "College", "University", "Coaching Institute", "Training Center"],
    required: true
  },
  boardUniversity: {
    type: String,
    enum: ["CBSE", "ICSE", "State Board", "IB", "IGCSE", "Cambridge", "AICTE", "UGC", "Autonomous", "Deemed University"],
    required: true
  },
  studentStrength: {
    type: Number,
    required: true,
    default: 0
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String
  },
  district: {
    type: String,
    required: true
  },
  pincode: {
    type: String
  },
  website: {
    type: String
  },
  decisionMaker: {
    type: String
  },
  phone: {
    type: String
  },
  email: {
    type: String
  },
  priorityScore: {
    type: Number,
    default: 0
  },
  priority: {
    type: String,
    enum: ["High", "Medium", "Low"],
    default: "Low"
  },
  pipelineStage: {
    type: String,
    enum: ["Identified", "Contacted", "Meeting Scheduled", "Meeting Done", "Proposal Shared", "Negotiation", "MoU Signed", "Program Launched", "Lost"],
    default: "Identified"
  },
  assignedExecutiveId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Virtual for 'id' to match frontend
AllianceInstitutionSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

AllianceInstitutionSchema.set('toJSON', {
  virtuals: true,
});

const AllianceInstitution = mongoose.model('AllianceInstitution', AllianceInstitutionSchema);

export default AllianceInstitution;
