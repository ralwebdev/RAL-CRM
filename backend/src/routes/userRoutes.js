import express from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/userController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getUsers)
  .post(protect, authorize('admin', 'owner'), createUser);

router.route('/:id')
  .put(protect, authorize('admin', 'owner'), updateUser)
  .delete(protect, authorize('admin', 'owner'), deleteUser);

export default router;
