import mongoose from 'mongoose';

const LeadActivitySchema = new mongoose.Schema({
  type: { type: String, required: true },
  description: { type: String, required: true },
  channel: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
});

const LeadTransferSchema = new mongoose.Schema({
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason: { type: String },
  timestamp: { type: Date, default: Date.now },
});

const QualificationChecklistSchema = new mongoose.Schema({
  budgetConfirmed: { type: Boolean, default: false },
  courseInterestConfirmed: { type: Boolean, default: false },
  locationPreference: { type: Boolean, default: false },
  startTimeline: { type: Boolean, default: false },
  placementExpectation: { type: Boolean, default: false },
}, { _id: false });

const UTMTrackingSchema = new mongoose.Schema({
  utmSource: { type: String, default: '' },
  utmMedium: { type: String, default: '' },
  utmCampaign: { type: String, default: '' },
  utmContent: { type: String, default: '' },
  utmTerm: { type: String, default: '' },
}, { _id: false });

const LeadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  source: { type: String, required: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  interestedCourse: { type: String },
  assignedTelecallerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    required: true,
    enum: [
      "New", "Contact Attempted", "Connected", "Interested",
      "Application Submitted", "Interview Scheduled", "Interview Completed",
      "Counseling", "Qualified", "Admission", "Lost", "Contacted", "Follow-up"
    ],
    default: "New"
  },
  programChannel: { type: String },
  internshipCourse: { type: String },
  internshipDuration: { type: String },
  internshipLocation: { type: String },
  internshipFee: { type: Number },
  internshipEnrollmentType: { type: String },
  internshipPipelineStage: { type: String },

  // Attribution
  adSetName: { type: String },
  adName: { type: String },
  landingPageUrl: { type: String },
  utm: UTMTrackingSchema,

  // Quality & Score
  leadScore: { type: Number, default: 0 },
  leadQuality: { type: String, enum: ["Hot", "Warm", "Cold"], default: "Cold" },
  budgetRange: { type: String },
  urgencyLevel: { type: String },
  otherInstitutes: { type: String },

  // Enrichment
  currentEducation: { type: String },
  graduationYear: { type: String },
  currentOccupation: { type: String },
  collegeInstitution: { type: String },
  feePayer: { type: String, enum: ["Self", "Parent", "Sponsor"] },
  decisionMaker: { type: String, enum: ["Self", "Parent", "Joint"] },
  highestQualification: { type: String },
  currentStatus: { type: String },
  careerGoal: { type: String },
  preferredStartTime: { type: String },
  leadSourceFormType: { type: String },
  leadMotivation: { type: String },

  // Placement
  placementInterest: { type: Boolean, default: false },
  expectedSalary: { type: String },
  jobLocationPreference: { type: String },

  // Intent
  intentScore: { type: Number, default: 0 },
  intentCategory: { type: String, enum: ["High Intent", "Medium Intent", "Low Intent"] },
  lastInteractionType: { type: String },
  lastInteractionDate: { type: String },

  // Temperature
  temperature: { type: String, enum: ["Hot", "Warm", "Cold", "Dormant"] },

  // Ownership & Timeline
  assignedCounselor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  leadOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  transferHistory: [LeadTransferSchema],
  activities: [LeadActivitySchema],

  // Qualification
  qualification: QualificationChecklistSchema,
  qualificationScore: { type: Number, default: 0 },

  // Recommendations
  recommendedCourse: { type: String },
  alternateCourse: { type: String },
  recommendationReason: { type: String },

  // Counseling & Admission
  scholarshipDiscussion: { type: String },
  emiOption: { type: Boolean, default: false },
  admissionProbability: { type: String },
  scholarshipApplied: { type: Boolean, default: false },
  scholarshipPercentage: { type: Number },
  loanRequired: { type: Boolean, default: false },
  emiSelected: { type: Boolean, default: false },

  // Lost
  lostReason: { type: String },

  // SLA
  firstCallTime: { type: String },
  firstResponseTime: { type: String },

  // Priority
  priorityScore: { type: Number, default: 0 },
  priorityCategory: { type: String, enum: ["High Priority", "Medium Priority", "Low Priority"] },

  // Walk-in
  walkInStatus: { type: String },
  walkInDate: { type: String },
  walkInTime: { type: String },
  walkInCounselor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  counselingOutcome: { type: String },

  // Joining
  expectedDOJ: { type: String },
  feeCommitment: { type: String },
  totalEmisPlanned: { type: Number },
  firstEmiDate: { type: String },

  // Documents
  documentStatus: { type: String },
  documentsChecklist: {
    idProof: { type: Boolean, default: false },
    addressProof: { type: Boolean, default: false },
    educationCertificate: { type: Boolean, default: false },
    photographs: { type: Boolean, default: false },
  },

  // Failure tracking
  joiningFailureReason: { type: String },
  joiningDelayed: { type: Boolean, default: false },

}, {
  timestamps: true,
});

const Lead = mongoose.model('Lead', LeadSchema);

export default Lead;
