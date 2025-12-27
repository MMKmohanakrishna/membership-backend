import express from 'express';
import { body } from 'express-validator';
import {
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  deletePlan,
} from '../controllers/planController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { gymContext } from '../middleware/gymContext.js';
import { validate } from '../middleware/validator.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// Apply authentication and gym context to all routes
router.use(authenticate);
router.use(gymContext);

// Validation rules
const createPlanValidation = [
  body('name').trim().notEmpty().withMessage('Plan name is required'),
  body('duration.value').isInt({ min: 1 }).withMessage('Duration must be at least 1'),
  body('duration.unit').isIn(['days', 'months', 'years']).withMessage('Invalid duration unit'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
];

// Routes
router.post(
  '/',
  authenticate,
  authorize(ROLES.GYM_OWNER, ROLES.STAFF),
  createPlanValidation,
  validate,
  createPlan
);

router.get(
  '/',
  authenticate,
  getPlans
);

router.get(
  '/:id',
  authenticate,
  getPlanById
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.GYM_OWNER, ROLES.STAFF),
  updatePlan
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.GYM_OWNER, ROLES.STAFF),
  deletePlan
);

export default router;
