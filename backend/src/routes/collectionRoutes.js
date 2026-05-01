import express from 'express';
import {
  getCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  verifyCollection
} from '../controllers/collectionController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getCollections)
  .post(authorize('admin', 'owner', 'counselor'), createCollection);

router.route('/:id')
  .get(getCollectionById)
  .put(authorize('admin', 'owner', 'counselor', 'accounts_manager', 'accounts_executive'), updateCollection);

router.route('/:id/verify')
  .put(authorize('admin', 'accounts_manager', 'accounts_executive', 'owner'), verifyCollection);

export default router;
