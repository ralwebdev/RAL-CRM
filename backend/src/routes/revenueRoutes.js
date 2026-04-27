import express from 'express';
import { getRevenueDashboard, getTargets, updateTargets } from '../controllers/revenueController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All revenue routes are protected and typically restricted to high-level roles
router.use(protect);

router.get('/dashboard', authorize('admin', 'owner', 'marketing_manager'), getRevenueDashboard);

router.route('/targets')
    .get(getTargets)
    .put(authorize('admin', 'owner'), updateTargets);

export default router;
