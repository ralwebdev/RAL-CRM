import mongoose from 'mongoose';

const UTMTrackingSchema = new mongoose.Schema({
  utmSource: { type: String, default: '' },
  utmMedium: { type: String, default: '' },
  utmCampaign: { type: String, default: '' },
  utmContent: { type: String, default: '' },
  utmTerm: { type: String, default: '' },
}, { _id: false });

const AdCreativeSchema = new mongoose.Schema({
  adType: { type: String, required: true },
  creativeHook: { type: String, default: '' },
  primaryMessage: { type: String, default: '' },
  cta: { type: String, default: '' },
});

const AdSetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  audienceType: { type: String, required: true },
  sourceAudience: { type: String, default: '' },
  retargetingSource: { type: String, default: '' },
  ads: [AdCreativeSchema],
});

const LandingPageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  pageVersion: { type: String, default: '' },
  conversionRate: { type: Number, default: 0 },
});

const CampaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  platform: {
    type: String,
    required: true,
    enum: ["Meta", "Google", "LinkedIn", "YouTube", "Referral", "Offline Event"]
  },
  objective: {
    type: String,
    required: true,
    enum: ["Lead Generation", "Brand Awareness", "Webinar", "Course Promotion"]
  },
  budget: { type: Number, required: true, default: 0 },
  dailyBudget: { type: Number, default: 0 },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  targetLocation: { type: String, default: '' },
  leadsGenerated: { type: Number, default: 0 },
  costPerLead: { type: Number, default: 0 },
  ageGroup: { type: String, default: '' },
  educationLevel: { type: String, default: '' },
  interestCategory: { type: String, default: '' },
  targetCity: { type: String, default: '' },
  marketingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  campaignOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  campaignNotes: { type: String, default: '' },
  approvalStatus: {
    type: String,
    required: true,
    enum: ["Draft", "Active", "Paused", "Completed", "Archived"],
    default: "Draft"
  },
  adSets: [AdSetSchema],
  utmTracking: UTMTrackingSchema,
  landingPages: [LandingPageSchema],
}, {
  timestamps: true,
});

CampaignSchema.index({ platform: 1, approvalStatus: 1 });
CampaignSchema.index({ campaignOwner: 1 });
CampaignSchema.index({ marketingManager: 1 });

const Campaign = mongoose.model('Campaign', CampaignSchema);

export default Campaign;
