/**
 * RAL-CMS E2E Integration Test: B2C Revenue Pipeline
 * This script simulates the student lifecycle from Lead to Revenue.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Models
import User from './src/models/User.js';
import Lead from './src/models/Lead.js';
import CallLog from './src/models/CallLog.js';
import Admission from './src/models/Admission.js';
import FinanceInvoice from './src/models/FinanceInvoice.js';
import FinancePayment from './src/models/FinancePayment.js';
import Campaign from './src/models/Campaign.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runE2E() {
  console.log('🚀 Starting E2E Integration Test...');
  
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ral-cms';
    await mongoose.connect(mongoUri);
    console.log('📦 Connected to MongoDB.');

    // --- STEP 1: Data Setup ---
    console.log('\n--- Step 1: Data Setup ---');
    const marketing_mgr = await User.findOne({ email: 'soumya@redapple.com' });
    const telecaller = await User.findOne({ email: 'shreya@redapple.com' });
    const counselor = await User.findOne({ email: 'manjari@redapple.com' });

    if (!marketing_mgr || !telecaller || !counselor) {
      throw new Error('Required test users not found. Ensure seed data is loaded.');
    }
    console.log(`✅ Users found: Marketing(${marketing_mgr.name}), Telecaller(${telecaller.name}), Counselor(${counselor.name})`);

    let campaign = await Campaign.findOne({ name: 'E2E Test Campaign' });
    if (!campaign) {
      campaign = await Campaign.create({
        name: 'E2E Test Campaign',
        platform: 'Meta',
        objective: 'Lead Generation',
        budget: 10000,
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        approvalStatus: 'Active',
        createdBy: marketing_mgr._id
      });
    }
    console.log(`✅ Campaign ready: ${campaign.name}`);

    // --- STEP 2: Marketing (Create Lead) ---
    console.log('\n--- Step 2: Marketing (Lead Creation) ---');
    const lead = await Lead.create({
      name: 'E2E Student Test',
      phone: '9999999999',
      email: 'e2e_test@example.com',
      source: 'Apply Now',
      campaignId: campaign._id,
      assignedTelecallerId: telecaller._id,
      status: 'New',
      interestedCourse: 'MBA'
    });
    console.log(`✅ Lead created: ${lead._id} (Status: ${lead.status})`);

    // --- STEP 3: Telecalling (Outreach) ---
    console.log('\n--- Step 3: Telecalling (Call & Status Change) ---');
    const callLog = await CallLog.create({
      leadId: lead._id,
      telecallerId: telecaller._id,
      outcome: 'Connected',
      duration: 120,
      notes: 'Interested in counseling session.',
      createdAt: new Date().toISOString()
    });
    
    lead.status = 'Counseling';
    lead.assignedCounselor = counselor._id;
    await lead.save();
    console.log(`✅ Call Log created. Lead moved to: ${lead.status} (Assigned to Counselor: ${counselor.name})`);

    // --- STEP 4: Counseling (Admission) ---
    console.log('\n--- Step 4: Conversion (Admission) ---');
    const admission = await Admission.create({
      leadId: lead._id,
      studentName: lead.name,
      phone: lead.phone,
      email: lead.email,
      courseSelected: lead.interestedCourse,
      admissionDate: new Date().toISOString().split('T')[0],
      totalFee: 59000,
      counselorId: counselor._id,
      status: 'Confirmed'
    });

    lead.status = 'Admission';
    await lead.save();
    console.log(`✅ Admission Confirmed: ${admission._id}. Lead moved to: ${lead.status}`);

    // --- STEP 5: Finance (Revenue) ---
    console.log('\n--- Step 5: Finance (Invoicing & Payment) ---');
    const invoiceNo = `INV-E2E-${Date.now()}`;
    const invoice = await FinanceInvoice.create({
      invoiceNo,
      studentId: lead._id,
      customerId: lead._id.toString(),
      customerName: lead.name,
      revenueStream: 'Course Fees',
      items: [{ description: 'Tuition Fees - MBA', amount: 50000 }],
      subtotal: 50000,
      gstRate: 18,
      totalAmount: 59000,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'Sent',
      createdBy: marketing_mgr._id
    });

    const receiptNo = `REC-E2E-${Date.now()}`;
    const payment = await FinancePayment.create({
      receiptNo,
      invoiceId: invoice._id,
      customerId: lead._id.toString(),
      customerName: lead.name,
      amount: 59000,
      mode: 'UPI',
      paidOn: new Date(),
      recordedBy: marketing_mgr._id
    });

    invoice.status = 'Paid';
    invoice.amountPaid = 59000;
    await invoice.save();
    console.log(`✅ Finance Flow Complete. Invoice ${invoice.invoiceNo} status: ${invoice.status}`);

    // --- VERIFICATION ---
    console.log('\n--- Final Verification ---');
    const fullLead = await Lead.findById(lead._id)
      .populate('campaignId')
      .populate('assignedTelecallerId')
      .populate('assignedCounselor');
    
    const finalInvoice = await FinanceInvoice.findOne({ studentId: lead._id });
    const finalAdmission = await Admission.findOne({ leadId: lead._id });

    console.log('\nIntegrity Report:');
    console.log(`1. Reference Integrity:`);
    console.log(`   - Campaign ID linked: ${fullLead.campaignId?._id.equals(campaign._id) ? '✅ YES' : '❌ NO'}`);
    console.log(`   - Telecaller ID linked: ${fullLead.assignedTelecallerId?._id.equals(telecaller._id) ? '✅ YES' : '❌ NO'}`);
    console.log(`   - Counselor ID linked: ${fullLead.assignedCounselor?._id.equals(counselor._id) ? '✅ YES' : '❌ NO'}`);
    console.log(`   - Admission linked to Lead: ${finalAdmission?.leadId.equals(lead._id) ? '✅ YES' : '❌ NO'}`);
    console.log(`   - Invoice linked to Lead: ${finalInvoice?.studentId.equals(lead._id) ? '✅ YES' : '❌ NO'}`);

    console.log(`2. State Transitions:`);
    console.log(`   - Final Lead Status: ${fullLead.status} (Expected: Admission) -> ${fullLead.status === 'Admission' ? '✅' : '❌'}`);
    console.log(`   - Invoice Status: ${finalInvoice?.status} (Expected: Paid) -> ${finalInvoice?.status === 'Paid' ? '✅' : '❌'}`);

    console.log(`3. Data Gaps:`);
    console.log(`   - Admission Course Carry-over: ${finalAdmission?.courseSelected === lead.interestedCourse ? '✅ MATCH' : '❌ MISMATCH'} (${finalAdmission?.courseSelected})`);

    console.log('\n🎉 E2E Pipeline Test Completed Successfully.');
  } catch (error) {
    console.error('\n❌ E2E Pipeline Test Failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 DB Connection Closed.');
  }
}

runE2E();
