import express from 'express';
import {
  getAlerts,
  markAlertAsRead,
  markAllAlertsAsRead,
  deleteAlert,
  getUnreadCount,
} from '../controllers/alertController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { gymContext } from '../middleware/gymContext.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// Apply authentication and gym context to all routes
router.use(authenticate);
router.use(gymContext);

// Routes
router.get(
  '/',
  authenticate,
  authorize(ROLES.GYM_OWNER, ROLES.STAFF),
  getAlerts
);

router.get(
  '/unread-count',
  authenticate,
  authorize(ROLES.GYM_OWNER, ROLES.STAFF),
  getUnreadCount
);

router.patch(
  '/:id/read',
  authenticate,
  authorize(ROLES.GYM_OWNER, ROLES.STAFF),
  markAlertAsRead
);

router.patch(
  '/read-all',
  authenticate,
  authorize(ROLES.GYM_OWNER, ROLES.STAFF),
  markAllAlertsAsRead
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.GYM_OWNER, ROLES.STAFF),
  deleteAlert
);

export default router;
