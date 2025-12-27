import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';
import {
  createGym,
  getAllGyms,
  getGymById,
  updateGym,
  deleteGym,
  getGymStats,
} from '../controllers/gymController.js';
import { getAuditLogs, getSystemAnalytics } from '../controllers/analyticsController.js';

const router = express.Router();

// All routes require authentication. Some routes are superadmin-only.
router.use(authenticate);

// Route for authenticated gym users to fetch their own gym by context
router.get('/me', async (req, res, next) => {
  try {
    const gymId = req.gymId;
    if (!gymId) {
      return res.status(400).json({ success: false, message: 'No gym context for this user' });
    }
    const Gym = (await import('../models/Gym.js')).default;
    const gym = await Gym.findOne({ gymId }).select('-__v');
    if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });
    return res.json({ success: true, data: { gym } });
  } catch (err) {
    next(err);
  }
});

// Superadmin-only routes
router.use(authorize(ROLES.SUPER_ADMIN));

// Analytics routes
router.get('/analytics/system', getSystemAnalytics);
router.get('/analytics/audit-logs', getAuditLogs);

// Gym management routes
router.post('/', createGym);
router.get('/', getAllGyms);
router.get('/stats', getGymStats);
router.get('/:id', getGymById);
router.put('/:id', updateGym);
router.delete('/:id', deleteGym);

export default router;
