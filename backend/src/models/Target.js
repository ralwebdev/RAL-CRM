import mongoose from 'mongoose';

const targetSchema = new mongoose.Schema({
  monthlyTarget: {
    type: Number,
    required: true,
    default: 600000,
  },
  roasTarget: {
    type: Number,
    required: true,
    default: 10,
  },
  maxCPA: {
    type: Number,
    required: true,
    default: 6500,
  },
  month: {
    type: String, // format YYYY-MM
    required: true,
    unique: true,
  }
}, { timestamps: true });

const Target = mongoose.model('Target', targetSchema);
export default Target;
