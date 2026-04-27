import express from 'express';
import { getCallLogs, createCallLog } from '../controllers/callLogController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, getCallLogs).post(protect, createCallLog);

export default router;
