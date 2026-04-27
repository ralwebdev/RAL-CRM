import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from './src/models/Lead.js';
import Admission from './src/models/Admission.js';
import FinancePayment from './src/models/FinancePayment.js';
import Campaign from './src/models/Campaign.js';

dotenv.config();

const verify = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const johnDoeLead = await Lead.findOne({ name: 'John Doe' });
    const johnDoeAdmission = await Admission.findOne({ studentName: 'John Doe' });
    const johnDoePayments = await FinancePayment.find({ customerName: 'John Doe' });
    const payments = await FinancePayment.find({});
    const campaigns = await Campaign.find({});
    
    console.log('--- E2E DATA VERIFICATION ---');
    console.log('John Doe Lead:', johnDoeLead ? 'FOUND' : 'NOT FOUND');
    if (johnDoeLead) console.log('Lead Status:', johnDoeLead.status);
    
    console.log('John Doe Admission:', johnDoeAdmission ? 'FOUND' : 'NOT FOUND');
    if (johnDoeAdmission) {
        console.log('Course:', johnDoeAdmission.courseSelected);
        console.log('Total Fee:', johnDoeAdmission.totalFee);
        console.log('John Doe Payments:', johnDoePayments.length);
        johnDoePayments.forEach(p => console.log(`  - Amount: ${p.amount}, Mode: ${p.mode}, Date: ${p.paidOn}`));
    }
    
    console.log('Total Finance Payments:', payments.length);
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    console.log('Total Revenue Collected:', totalCollected);
    
    console.log('Campaigns:', campaigns.length);
    const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
    const totalLeads = await Lead.countDocuments();
    console.log('Total Marketing Budget:', totalBudget);
    console.log('Total Leads:', totalLeads);
    console.log('Calculated CPL:', totalLeads > 0 ? (totalBudget / totalLeads).toFixed(2) : 0);
    
    console.log('---------------------------');
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

verify();
