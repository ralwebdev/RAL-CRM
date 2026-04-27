import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

const checkData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({});
    console.log('Users in DB:');
    users.forEach(u => {
      console.log(`Email: ${u.email}, Role: ${u.role}, Password (start): ${u.password.substring(0, 10)}...`);
    });
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkData();
