import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import FinancePayment from '../models/FinancePayment.js';
import FinanceExpense from '../models/FinanceExpense.js';
import FinanceInvoice from '../models/FinanceInvoice.js';

dotenv.config({ path: '.env' });

function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthDate(monthsBack, day) {
  const d = new Date();
  d.setHours(10, 0, 0, 0);
  d.setDate(day);
  d.setMonth(d.getMonth() - monthsBack);
  return d;
}

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set in backend/.env');
  }

  await mongoose.connect(process.env.MONGO_URI);

  try {
    const actor =
      (await User.findOne({ role: 'owner' }).select('_id name').lean()) ||
      (await User.findOne({ role: 'accounts_manager' }).select('_id name').lean()) ||
      (await User.findOne().select('_id name').lean());

    if (!actor?._id) {
      throw new Error('No user found. Seed at least one user before running this script.');
    }

    const revenuePlan = [
      { monthsBack: 5, amount: 215000 },
      { monthsBack: 4, amount: 248000 },
      { monthsBack: 3, amount: 276000 },
      { monthsBack: 2, amount: 322000 },
      { monthsBack: 1, amount: 354000 },
      { monthsBack: 0, amount: 296000 },
    ];

    const expensePlan = [
      { monthsBack: 5, amount: 92000, category: 'Marketing' },
      { monthsBack: 4, amount: 108000, category: 'Salaries' },
      { monthsBack: 3, amount: 118000, category: 'Travel' },
      { monthsBack: 2, amount: 126000, category: 'Rent' },
      { monthsBack: 1, amount: 139000, category: 'Vendor' },
      { monthsBack: 0, amount: 121000, category: 'Office' },
    ];
    const tiPlan = [
      { monthsBack: 5, subtotal: 182000, gstRate: 18, paidRatio: 1, status: 'Paid' },
      { monthsBack: 4, subtotal: 205000, gstRate: 18, paidRatio: 0.8, status: 'Partial' },
      { monthsBack: 3, subtotal: 226000, gstRate: 18, paidRatio: 1, status: 'Paid' },
      { monthsBack: 2, subtotal: 251000, gstRate: 18, paidRatio: 0.65, status: 'Partial' },
      { monthsBack: 1, subtotal: 279000, gstRate: 18, paidRatio: 0.4, status: 'Partial' },
      { monthsBack: 0, subtotal: 238000, gstRate: 18, paidRatio: 0, status: 'Sent' },
    ];

    let insertedPayments = 0;
    let insertedExpenses = 0;
    let insertedTiInvoices = 0;

    for (const row of revenuePlan) {
      const paidOn = monthDate(row.monthsBack, 12);
      const mKey = monthKey(paidOn);
      const receiptNo = `SEED-RCP-${mKey}`;

      const exists = await FinancePayment.findOne({ receiptNo }).select('_id').lean();
      if (!exists) {
        await FinancePayment.create({
          receiptNo,
          customerId: `seed-customer-${mKey}`,
          customerName: `Seed Revenue ${mKey}`,
          amount: row.amount,
          mode: 'Bank',
          reference: `SEED-REF-${mKey}`,
          paidOn,
          notes: 'Synthetic seed data for dashboard trend chart',
          recordedBy: actor._id,
        });
        insertedPayments += 1;
      }
    }

    for (const row of expensePlan) {
      const spendDate = monthDate(row.monthsBack, 18);
      const mKey = monthKey(spendDate);
      const expenseNo = `SEED-EXP-${mKey}`;
      const gst = Math.round(row.amount * 0.18);
      const total = row.amount + gst;

      const exists = await FinanceExpense.findOne({ expenseNo }).select('_id').lean();
      if (!exists) {
        await FinanceExpense.create({
          expenseNo,
          title: `Seed ${row.category} ${mKey}`,
          category: row.category,
          amount: row.amount,
          gst,
          total,
          date: spendDate,
          spendDate,
          description: 'Synthetic seed data for dashboard trend chart',
          paymentMode: 'Bank',
          status: 'Approved',
          requestedBy: actor._id,
          submittedBy: actor.name || 'Seed User',
          submittedById: actor._id,
          submittedByRole: 'owner',
          approvedBy: actor._id,
          vendorName: 'Seed Vendor',
          sourceModule: 'finance',
        });
        insertedExpenses += 1;
      }
    }

    for (const row of tiPlan) {
      const issueDate = monthDate(row.monthsBack, 10);
      const dueDate = monthDate(row.monthsBack, 20);
      const mKey = monthKey(issueDate);
      const invoiceNo = `SEED-TI-${mKey}`;

      const exists = await FinanceInvoice.findOne({ invoiceNo }).select('_id').lean();
      if (!exists) {
        const gstAmount = Math.round((row.subtotal * row.gstRate) / 100);
        const totalAmount = row.subtotal + gstAmount;
        const amountPaid = Math.round(totalAmount * row.paidRatio);

        await FinanceInvoice.create({
          invoiceNo,
          customerId: `seed-ti-customer-${mKey}`,
          customerName: `Seed TI Customer ${mKey}`,
          customerType: 'Student',
          revenueStream: 'Student Admissions',
          courseName: 'Digital Marketing Pro',
          programName: 'Digital Marketing Pro',
          gstType: 'Taxable',
          subtotal: row.subtotal,
          discount: 0,
          gstRate: row.gstRate,
          cgst: Math.round(gstAmount / 2),
          sgst: Math.round(gstAmount / 2),
          igst: 0,
          totalAmount,
          amountPaid,
          status: row.status,
          invoiceType: 'TI',
          issueDate,
          dueDate,
          notes: 'Synthetic TI seed for historical dashboard trend',
          createdBy: actor._id,
          createdByRole: 'owner',
        });
        insertedTiInvoices += 1;
      }
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          insertedPayments,
          insertedExpenses,
          insertedTiInvoices,
          actor: actor.name || String(actor._id),
          monthsSeeded: revenuePlan.length,
        },
        null,
        2,
      ),
    );
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
