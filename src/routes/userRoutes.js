import express from 'express';
import { body } from 'express-validator';
import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { gymContext } from '../middleware/gymContext.js';
import { validate } from '../middleware/validator.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// Apply authentication and gym context to all routes
router.use(authenticate);
router.use(gymContext);

// Validation rules
const updateUserValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('phone').optional().trim().notEmpty().withMessage('Phone cannot be empty'),
  body('role').optional().isIn(Object.values(ROLES)).withMessage('Invalid role'),
];

// Routes
router.get(
  '/',
  authenticate,
  authorize(ROLES.GYM_OWNER),
  getUsers
);

router.get(
  '/:id',
  authenticate,
  authorize(ROLES.GYM_OWNER),
  getUserById
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.GYM_OWNER),
  updateUserValidation,
  validate,
  updateUser
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.GYM_OWNER),
  deleteUser
);

export default router;
