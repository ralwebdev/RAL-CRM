import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Lead from '../models/Lead.js';

dotenv.config();

const fixLeads = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ral_cms');
    console.log('MongoDB Connected...');

    const telecaller = await User.findOne({ role: 'telecaller' });
    if (!telecaller) {
      console.log('No telecaller found in DB. Please run seed script first.');
      process.exit();
    }

    console.log(`Assigning all leads to: ${telecaller.name} (${telecaller._id})`);
    
    // Update all leads that were assigned to mock IDs (like 'u1', 'u2', 'u3') or are unassigned
    const res = await Lead.updateMany(
      {},
      { $set: { assignedTelecallerId: telecaller._id.toString() } }
    );

    console.log(`Successfully updated ${res.modifiedCount} leads.`);
    process.exit();
  } catch (error) {
    console.error('Error fixing leads:', error);
    process.exit(1);
  }
};

fixLeads();
