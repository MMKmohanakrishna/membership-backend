import Alert from '../models/Alert.js';
import { asyncHandler, successResponse, errorResponse, calculatePagination } from '../utils/helpers.js';

// Get alerts
export const getAlerts = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    isRead, 
    type,
    priority 
  } = req.query;

  // Build filter based on user role and gym
  const filter = {
    gymId: req.gymId,
    targetRoles: req.user.role,
  };    

  if (isRead !== undefined) {
    filter.isRead = isRead === 'true';
  }

  if (type) {
    filter.type = type;
  }

  if (priority) {
    filter.priority = priority;
  }

  const total = await Alert.countDocuments(filter);
  const pagination = calculatePagination(page, limit, total);

  const alerts = await Alert.find(filter)
    .populate('member', 'memberId personalInfo')
    .sort({ createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.itemsPerPage);

  successResponse(res, 200, 'Alerts retrieved successfully', {
    alerts,
    pagination,
  });
});

// Mark alert as read
export const markAlertAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const alert = await Alert.findOne({ _id: id, gymId: req.gymId });
  if (!alert) {
    return errorResponse(res, 404, 'Alert not found');
  }

  // Check if already read by this user
  const alreadyRead = alert.readBy.some(
    read => read.user.toString() === req.user._id.toString()
  );

  if (!alreadyRead) {
    alert.readBy.push({
      user: req.user._id,
      readAt: new Date(),
    });

    // Mark as read if any user has read it
    alert.isRead = true;
    await alert.save();
  }

  successResponse(res, 200, 'Alert marked as read', { alert });
});

// Mark all alerts as read
export const markAllAlertsAsRead = asyncHandler(async (req, res) => {
  await Alert.updateMany(
    { 
      gymId: req.gymId,
      targetRoles: req.user.role,
      isRead: false,
    },
    { 
      $set: { isRead: true },
      $push: {
        readBy: {
          user: req.user._id,
          readAt: new Date(),
        },
      },
    }
  );

  successResponse(res, 200, 'All alerts marked as read');
});

// Delete alert
export const deleteAlert = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const alert = await Alert.findOneAndDelete({ _id: id, gymId: req.gymId });
  if (!alert) {
    return errorResponse(res, 404, 'Alert not found');
  }

  successResponse(res, 200, 'Alert deleted successfully');
});

// Get unread count
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Alert.countDocuments({
    gymId: req.gymId,
    targetRoles: req.user.role,
    isRead: false,
  });

  successResponse(res, 200, 'Unread count retrieved successfully', { count });
});
