import mongoose from 'mongoose';

const AllianceEventSchema = new mongoose.Schema({
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AllianceInstitution',
    required: true
  },
  eventName: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    enum: ["Seminar", "Workshop", "Career Fair", "Open Day", "Demo Session", "Sponsorship"],
    required: true
  },
  eventDate: {
    type: Date,
    required: true
  },
  attendees: {
    type: Number,
    default: 0
  },
  leadsGenerated: {
    type: Number,
    default: 0
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

AllianceEventSchema.index({ institutionId: 1, eventDate: -1 });

AllianceEventSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

AllianceEventSchema.set('toJSON', {
  virtuals: true,
});

const AllianceEvent = mongoose.model('AllianceEvent', AllianceEventSchema);

export default AllianceEvent;
