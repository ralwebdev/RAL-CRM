import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { AllianceApproval } from '../src/models/AllianceApproval.js';

dotenv.config({ path: 'Backend/.env' });

const listApprovals = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const approvals = await AllianceApproval.find({});
    console.log(JSON.stringify(approvals, null, 2));
    await mongoose.connection.close();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

listApprovals();
