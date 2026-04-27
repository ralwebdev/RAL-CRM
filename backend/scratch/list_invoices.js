import mongoose from 'mongoose';
import dotenv from 'dotenv';
import FinanceInvoice from '../src/models/FinanceInvoice.js';

dotenv.config({ path: 'Backend/.env' });

const listInvoices = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const invoices = await FinanceInvoice.find({});
    console.log(JSON.stringify(invoices, null, 2));
    await mongoose.connection.close();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

listInvoices();
