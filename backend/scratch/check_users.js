import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const checkUsers = async () => {
  try {
    // Manually specify path to .env if needed, but normally it's in the root
    dotenv.config({ path: '../.env' });
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ralcms');
    const users = await User.find({ role: { $in: ['alliance_manager', 'alliance_executive', 'admin', 'owner'] } });
    console.log(JSON.stringify(users, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkUsers();
