import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admission from '../src/models/Admission.js';

dotenv.config({ path: 'Backend/.env' });

const listAdmissions = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const admissions = await Admission.find({});
    console.log(JSON.stringify(admissions, null, 2));
    await mongoose.connection.close();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

listAdmissions();
