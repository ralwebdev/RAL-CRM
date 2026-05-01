import express from 'express';
import { getLeads, createLead, updateLead, deleteLead } from '../controllers/leadController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getLeads)
  .post(protect, authorize('admin', 'owner', 'marketing_manager'), createLead);

router.route('/:id')
  .put(protect, updateLead)
  .delete(protect, authorize('admin', 'owner'), deleteLead);

export default router;
