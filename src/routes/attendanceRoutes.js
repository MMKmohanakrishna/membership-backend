import express from 'express';
import { body } from 'express-validator';
import {
  scanQRCode,
  getAttendance,
  getMemberAttendance,
  getTodayStats,
} from '../controllers/attendanceController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { gymContext } from '../middleware/gymContext.js';
import { validate } from '../middleware/validator.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// Apply authentication and gym context to all routes
router.use(authenticate);
router.use(gymContext);

// Validation rules
const scanValidation = [
  body('qrData').notEmpty().withMessage('QR code data is required'),
];

// Routes
// Routes
router.post(
  '/scan',
  authenticate,
  authorize(ROLES.GYM_OWNER, ROLES.STAFF),
  scanValidation,
  validate,
  scanQRCode
);

router.get(
  '/',
  authenticate,
  authorize(ROLES.GYM_OWNER, ROLES.STAFF, ROLES.TRAINER),
  getAttendance
);

router.get(
  '/stats/today',
  authenticate,
  authorize(ROLES.GYM_OWNER, ROLES.STAFF),
  getTodayStats
);

router.get(
  '/member/:id',
  authenticate,
  authorize(ROLES.GYM_OWNER, ROLES.STAFF, ROLES.TRAINER),
  getMemberAttendance
);

 // Checkout endpoint removed for single-scan clubs

export default router;
