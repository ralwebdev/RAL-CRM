import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const users = [
  { name: 'Shreya Chakraborty', email: 'shreya@redapple.com', password: 'telecaller123', role: 'telecaller' },
  { name: 'Priya Das', email: 'priya@redapple.com', password: 'telecaller123', role: 'telecaller' },
  { name: 'Manjari Chakraborty', email: 'manjari@redapple.com', password: 'counselor123', role: 'counselor' },
  { name: 'Soumya Saha', email: 'soumya@redapple.com', password: 'marketing123', role: 'marketing_manager' },
  { name: 'Amit Sharma', email: 'amit@redapple.com', password: 'admin123', role: 'admin' },
  { name: 'Rajesh Kapoor', email: 'rajesh@redapple.com', password: 'owner123', role: 'owner' },
  { name: 'Rohit Alliance', email: 'rohit@redapple.com', password: 'alliance123', role: 'alliance_manager' },
  { name: 'Sneha Alliance', email: 'sneha@redapple.com', password: 'alliance123', role: 'alliance_executive' },
  { name: 'Neha Accounts', email: 'neha@redapple.com', password: 'accounts123', role: 'accounts_manager' },
  { name: 'Arjun Accounts', email: 'arjun@redapple.com', password: 'accounts123', role: 'accounts_executive' },
];

const seedAll = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // 1. Delete all collections except 'users'
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const collection of collections) {
      if (collection.name !== 'users') {
        try {
          await mongoose.connection.db.dropCollection(collection.name);
          console.log(`Dropped collection: ${collection.name}`);
        } catch (dropError) {
          console.log(`Could not drop collection ${collection.name}: ${dropError.message}`);
        }
      }
    }

    // 2. Clear and Seed Users
    await User.deleteMany({});
    console.log('Users collection cleared.');

    const hashedUsers = await Promise.all(users.map(async u => {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(u.password, salt);
      return { ...u, password: hashedPassword };
    }));

    const createdUsers = await User.insertMany(hashedUsers);
    console.log(`${createdUsers.length} Users seeded with hashed passwords.`);

    console.log('Seeding completed successfully!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedAll();
