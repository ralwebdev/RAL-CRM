import express from 'express';
import { getLeads, createLead, updateLead, deleteLead } from '../controllers/leadController.js';
import { getCallLogsByLeadId, createCallLogForLead } from '../controllers/callLogController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validateLeadCreate, validateLeadUpdate, validateObjectIdParam } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getLeads)
  .post(protect, authorize('admin', 'owner', 'marketing_manager'), validateLeadCreate, createLead);

router.route('/:id')
  .put(protect, validateObjectIdParam('id'), validateLeadUpdate, updateLead)
  .patch(protect, validateObjectIdParam('id'), validateLeadUpdate, updateLead)
  .delete(protect, authorize('admin', 'owner'), validateObjectIdParam('id'), deleteLead);

router.route('/:id/calls')
  .get(protect, validateObjectIdParam('id'), getCallLogsByLeadId)
  .post(protect, authorize('telecaller', 'telecalling_manager', 'admin', 'owner'), validateObjectIdParam('id'), createCallLogForLead);

export default router;
