import express from 'express';
import {
  getCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  verifyCollection
} from '../controllers/collectionController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validateObjectIdParam } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getCollections)
  .post(authorize('admin', 'owner', 'counselor'), createCollection);

router.route('/:id')
  .get(validateObjectIdParam('id'), getCollectionById)
  .put(validateObjectIdParam('id'), authorize('admin', 'owner', 'counselor', 'accounts_manager', 'accounts_executive'), updateCollection);

router.route('/:id/verify')
  .put(validateObjectIdParam('id'), authorize('admin', 'accounts_manager', 'accounts_executive', 'owner'), verifyCollection);

export default router;
