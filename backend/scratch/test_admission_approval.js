import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admission from '../src/models/Admission.js';
import { AllianceApproval } from '../src/models/AllianceApproval.js';
import User from '../src/models/User.js';

dotenv.config({ path: 'Backend/.env' });

const testCreation = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const counselor = await User.findOne({ role: 'counselor' });
    const admin = await User.findOne({ role: 'admin' });
    
    if (!counselor || !admin) {
      console.log("Required users not found");
      return;
    }

    // 1. Create a dummy Admission
    const dummyAdmission = new Admission({
      leadId: new mongoose.Types.ObjectId(), // dummy
      studentName: "Test Student " + Date.now(),
      phone: "9999999999",
      email: "test@student.com",
      courseSelected: "Full Stack Development",
      admissionDate: new Date().toISOString().split('T')[0],
      totalFee: 50000,
      paymentStatus: 'Pending',
      approvalStatus: 'Pending'
    });
    const savedAdm = await dummyAdmission.save();
    console.log("Saved Admission:", savedAdm._id);

    // 2. Create an AllianceApproval
    const approval = new AllianceApproval({
      requestId: savedAdm._id.toString(),
      requestType: "Admission",
      title: "Admission Approval: Test Student",
      submittedBy: counselor._id,
      submittedRole: "counselor",
      currentApproverRole: "admin",
      status: 'Pending',
      amount: 50000,
      notes: "Test admission"
    });
    const savedApp = await approval.save();
    console.log("Saved Approval:", savedApp._id);

    await mongoose.connection.close();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

testCreation();
