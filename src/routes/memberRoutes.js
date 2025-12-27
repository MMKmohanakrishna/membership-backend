import express from 'express';
import { body } from 'express-validator';
import {
  createMember,
  getMembers,
  getMemberById,
  getMemberByMemberId,
  updateMember,
  deleteMember,
  regenerateQRCode,
  renewMember,
  getMemberStats,
} from '../controllers/memberController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { gymContext } from '../middleware/gymContext.js';
import { validate } from '../middleware/validator.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// Apply authentication and gym context to all routes
router.use(authenticate);
router.use(gymContext);

// Validation rules
const createMemberValidation = [
  body('personalInfo.name').trim().notEmpty().withMessage('Name is required'),
  body('personalInfo.phone').trim().notEmpty().withMessage('Phone is required'),
  body('personalInfo.email').optional().isEmail().withMessage('Invalid email'),
  body('membership.plan').notEmpty().withMessage('Membership plan is required'),
];

const updateMemberValidation = [
  body('personalInfo.name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('personalInfo.phone').optional().trim().notEmpty().withMessage('Phone cannot be empty'),
  body('personalInfo.email').optional().isEmail().withMessage('Invalid email'),
];

// Routes
router.post(
  '/',
  authorize(ROLES.GYM_OWNER, ROLES.STAFF),
  createMemberValidation,
  validate,
  createMember
);

router.get(
  '/',
  authorize(ROLES.GYM_OWNER, ROLES.STAFF, ROLES.TRAINER),
  getMembers
);

router.get(
  '/stats',
  authorize(ROLES.GYM_OWNER, ROLES.STAFF),
  getMemberStats
);

router.get(
  '/member-id/:memberId',
  getMemberByMemberId
);

router.get(
  '/:id',
  authorize(ROLES.GYM_OWNER, ROLES.STAFF, ROLES.TRAINER),
  getMemberById
);

router.put(
  '/:id',
  authorize(ROLES.GYM_OWNER, ROLES.STAFF),
  updateMemberValidation,
  validate,
  updateMember
);

router.delete(
  '/:id',
  authorize(ROLES.GYM_OWNER, ROLES.STAFF),
  deleteMember
);

router.post(
  '/:id/regenerate-qr',
  authorize(ROLES.GYM_OWNER, ROLES.STAFF),
  regenerateQRCode
);

router.post(
  '/:id/renew',
  authorize(ROLES.GYM_OWNER, ROLES.STAFF),
  renewMember
);

export default router;
