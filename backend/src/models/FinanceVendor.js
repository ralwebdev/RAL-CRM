import mongoose from 'mongoose';

const FinanceVendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vendor name is required'],
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
  },
  gstin: {
    type: String,
    trim: true,
  },
  contactName: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  address: {
    type: String,
  },
  openingBalance: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// To match frontend 'id' field
FinanceVendorSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

FinanceVendorSchema.set('toJSON', {
  virtuals: true,
});

const FinanceVendor = mongoose.model('FinanceVendor', FinanceVendorSchema);

export default FinanceVendor;
