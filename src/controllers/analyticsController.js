import AuditLog from '../models/AuditLog.js';
import Member from '../models/Member.js';
import Gym from '../models/Gym.js';
import { asyncHandler, successResponse } from '../utils/helpers.js';

// Get audit logs (Super Admin only)
export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, action, resource, userId } = req.query;

  const query = {};
  
  if (action) query.action = action;
  if (resource) query.resource = resource;
  if (userId) query.user = userId;

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    AuditLog.countDocuments(query),
  ]);

  successResponse(res, 200, 'Audit logs retrieved successfully', {
    logs,
    pagination: {
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
      total,
      limit: Number(limit),
    },
  });
});

// Get system-wide analytics (Super Admin only)
export const getSystemAnalytics = asyncHandler(async (req, res) => {
  // Get gym stats
  const [totalGyms, activeGyms, blockedGyms] = await Promise.all([
    Gym.countDocuments(),
    Gym.countDocuments({ isActive: true }),
    Gym.countDocuments({ isActive: false }),
  ]);

  // Get all gyms to calculate total members
  const gyms = await Gym.find().select('gymId');
  const gymIds = gyms.map(g => g.gymId);

  // Get member stats across all gyms
  const [totalMembers, activeMembers] = await Promise.all([
    Member.countDocuments({ gymId: { $in: gymIds } }),
    Member.countDocuments({ 
      gymId: { $in: gymIds },
      isActive: true,
      'membership.status': 'active'
    }),
  ]);

  // Recent activity
  const recentAuditLogs = await AuditLog.find()
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(10);

  successResponse(res, 200, 'System analytics retrieved successfully', {
    stats: {
      gyms: {
        total: totalGyms,
        active: activeGyms,
        blocked: blockedGyms,
      },
      members: {
        total: totalMembers,
        active: activeMembers,
        inactive: totalMembers - activeMembers,
      },
    },
    recentActivity: recentAuditLogs,
  });
});
