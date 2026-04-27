import express from 'express';
import { getFollowUps, createFollowUp, updateFollowUp } from '../controllers/followUpController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, getFollowUps).post(protect, createFollowUp);
router.route('/:id').put(protect, updateFollowUp);

export default router;
