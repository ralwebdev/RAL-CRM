import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const extraUsers = [
  { name: 'Rohit Alliance', email: 'rohit@redapple.com', password: 'alliance123', role: 'alliance_manager' },
  { name: 'Sneha Alliance', email: 'sneha@redapple.com', password: 'alliance123', role: 'alliance_executive' },
  { name: 'Neha Accounts', email: 'neha@redapple.com', password: 'accounts123', role: 'accounts_manager' },
  { name: 'Arjun Accounts', email: 'arjun@redapple.com', password: 'accounts123', role: 'accounts_executive' },
];

const seedExtra = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    for (const u of extraUsers) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        await User.create(u);
        console.log(`User ${u.email} created.`);
      } else {
        console.log(`User ${u.email} already exists.`);
      }
    }

    console.log('Extra users seeded successfully!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedExtra();
