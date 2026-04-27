import express from 'express';
import { getCampaigns, createCampaign, updateCampaign, deleteCampaign } from '../controllers/campaignController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getCampaigns)
  .post(protect, authorize('marketing_manager', 'admin', 'owner'), createCampaign);

router.route('/:id')
  .put(protect, authorize('marketing_manager', 'admin', 'owner'), updateCampaign)
  .delete(protect, authorize('marketing_manager', 'admin', 'owner'), deleteCampaign);

export default router;
