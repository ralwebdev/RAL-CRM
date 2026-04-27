import mongoose from 'mongoose';

const PiTiMappingSchema = new mongoose.Schema({
  piId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FinanceInvoice',
    required: true,
  },
  piNo: {
    type: String,
    required: true,
  },
  tiId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FinanceInvoice',
    required: true,
  },
  tiNo: {
    type: String,
    required: true,
  },
  studentId: {
    type: String, // String ID from frontend matching customerId
  },
  studentName: {
    type: String,
  },
  linkedAmount: {
    type: Number,
    required: true,
  },
  conversionDate: {
    type: Date,
    default: Date.now,
  },
  convertedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  mode: {
    type: String,
    enum: ['convert', 'link_existing'],
    default: 'convert',
  },
  reason: {
    type: String,
  },
}, {
  timestamps: true,
});

const PiTiMapping = mongoose.model('PiTiMapping', PiTiMappingSchema);

export default PiTiMapping;
