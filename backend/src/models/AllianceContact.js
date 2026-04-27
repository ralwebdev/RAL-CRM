import mongoose from 'mongoose';

const AllianceContactSchema = new mongoose.Schema({
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AllianceInstitution',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  designation: {
    type: String,
    required: true
  },
  department: {
    type: String
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

AllianceContactSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

AllianceContactSchema.set('toJSON', {
  virtuals: true,
});

const AllianceContact = mongoose.model('AllianceContact', AllianceContactSchema);

export default AllianceContact;
