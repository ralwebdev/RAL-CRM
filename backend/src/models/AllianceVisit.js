import mongoose from 'mongoose';

const AllianceVisitSchema = new mongoose.Schema({
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AllianceInstitution',
    required: true
  },
  executiveId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  visitDate: {
    type: Date,
    required: true
  },
  meetingPerson: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["Planned", "Completed", "Cancelled", "No Show"],
    default: "Planned"
  },
  summary: {
    type: String,
    required: true
  },
  interestLevel: {
    type: String,
    enum: ["Hot", "Warm", "Cold", "Not Interested"],
    default: "Warm"
  },
  nextFollowup: {
    type: Date
  },
  photoUrl: {
    type: String
  }
}, {
  timestamps: true
});

AllianceVisitSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

AllianceVisitSchema.set('toJSON', {
  virtuals: true,
});

const AllianceVisit = mongoose.model('AllianceVisit', AllianceVisitSchema);

export default AllianceVisit;
