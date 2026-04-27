import express from 'express';
import { getAdmissions, getAdmissionById, createAdmission, updateAdmission } from '../controllers/admissionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, getAdmissions).post(protect, createAdmission);
router.route('/:id').get(protect, getAdmissionById).put(protect, updateAdmission);

export default router;
