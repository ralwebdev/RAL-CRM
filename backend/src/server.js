import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import userRoutes from './routes/userRoutes.js';
import callLogRoutes from './routes/callLogRoutes.js';
import followUpRoutes from './routes/followUpRoutes.js';
import admissionRoutes from './routes/admissionRoutes.js';
import revenueRoutes from './routes/revenueRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import allianceRoutes from './routes/allianceRoutes.js';

dotenv.config();

const app = express();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

connectDB();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/calllogs', callLogRoutes);
app.use('/api/followups', followUpRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/alliances', allianceRoutes);

app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));
