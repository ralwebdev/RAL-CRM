import express from 'express';
import { getAdmissions, getAdmissionById, createAdmission, updateAdmission } from '../controllers/admissionController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getAdmissions)
  .post(protect, authorize('counselor', 'admin', 'owner'), createAdmission);

router.route('/:id')
  .get(protect, getAdmissionById)
  .put(protect, authorize('counselor', 'admin', 'owner'), updateAdmission);

export default router;
