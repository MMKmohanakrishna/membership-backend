import Attendance from '../models/Attendance.js';
import Member from '../models/Member.js';
import Alert from '../models/Alert.js';
import { validateQRCodeData } from '../utils/qrGenerator.js';
import { asyncHandler, successResponse, errorResponse, calculatePagination } from '../utils/helpers.js';
import { ALERT_TYPES } from '../config/constants.js';

// Scan QR code and validate member
export const scanQRCode = asyncHandler(async (req, res) => {
  const { qrData } = req.body;
  const io = req.app.get('io');

  // Validate QR code format and gym ownership
  const validation = validateQRCodeData(qrData, req.gymId);
  if (!validation.valid) {
    return errorResponse(res, 400, validation.error);
  }

  // Find member within the same gym
  const member = await Member.findOne({ 
    memberId: validation.memberId,
    gymId: req.gymId 
  }).populate('membership.plan');

  if (!member) {
    return errorResponse(res, 404, 'Member not found or does not belong to this gym');
  }

  // Check if member can access gym
  const canAccess = member.canAccessGym();
  let denialReason = null;

  if (!canAccess) {
    // Determine denial reason
    if (!member.isActive) {
      denialReason = 'Member account is inactive';
    } else if (member.isMembershipExpired()) {
      denialReason = 'Membership has expired';
    } else if (member.isFeeOverdue()) {
      denialReason = 'Fee payment is overdue';
    } else {
      denialReason = 'Access denied';
    }

    // Create alert
    const alert = await Alert.create({
      gymId: req.gymId,
      type: member.isMembershipExpired() ? ALERT_TYPES.MEMBERSHIP_EXPIRED : ALERT_TYPES.ACCESS_DENIED,
      member: member._id,
      title: 'Access Denied',
      message: `${member.personalInfo.name} (${member.personalInfo.phone}) was denied access. Reason: ${denialReason}`,
      priority: 'high',
      targetRoles: ['gymowner', 'staff'],
      metadata: {
        memberId: member.memberId,
        memberName: member.personalInfo.name,
        memberPhone: member.personalInfo.phone,
        denialReason,
      },
    });

    // Emit real-time alert via Socket.io to gym owner and staff
    io.to('gymowner-room').emit('access-denied', {
      alert: {
        id: alert._id,
        type: alert.type,
        title: alert.title,
        message: alert.message,
        priority: alert.priority,
        member: {
          id: member._id,
          memberId: member.memberId,
          name: member.personalInfo.name,
          phone: member.personalInfo.phone,
        },
        metadata: alert.metadata,
        timestamp: alert.createdAt,
      },
    });

    io.to('staff-room').emit('access-denied', {
      alert: {
        id: alert._id,
        type: alert.type,
        title: alert.title,
        message: alert.message,
        priority: alert.priority,
        member: {
          id: member._id,
          memberId: member.memberId,
          name: member.personalInfo.name,
          phone: member.personalInfo.phone,
        },
        metadata: alert.metadata,
        timestamp: alert.createdAt,
      },
    });

    // Record attendance with denial
    const attendance = await Attendance.create({
      gymId: req.gymId,
      member: member._id,
      checkInTime: new Date(),
      method: 'qr',
      verifiedBy: req.user._id,
      accessGranted: false,
      denialReason,
    });

    return successResponse(res, 200, 'Access denied', {
      accessGranted: false,
      denialReason,
      member: {
        id: member._id,
        memberId: member.memberId,
        name: member.personalInfo.name,
        phone: member.personalInfo.phone,
        membershipStatus: member.membership.status,
        membershipEndDate: member.membership.endDate,
        feeStatus: member.feeStatus,
      },
      attendance,
    });
  }

  // Record successful attendance
  // Prevent duplicate successful scans within a short window (default 5 minutes)
  const DUPLICATE_WINDOW_MINUTES = parseInt(process.env.DUPLICATE_SCAN_WINDOW_MINUTES, 10) || 5;
  const windowStart = new Date(Date.now() - DUPLICATE_WINDOW_MINUTES * 60 * 1000);
  const recent = await Attendance.findOne({
    gymId: req.gymId,
    member: member._id,
    accessGranted: true,
    checkInTime: { $gte: windowStart },
  });

  if (recent) {
    // If a recent successful check-in exists, return it instead of creating a duplicate
    return successResponse(res, 200, 'Already checked in recently', {
      accessGranted: true,
      message: `Member already checked in within last ${DUPLICATE_WINDOW_MINUTES} minutes`,
      attendance: recent,
      skippedDuplicate: true,
    });
  }

  const attendance = await Attendance.create({
    gymId: req.gymId,
    member: member._id,
    checkInTime: new Date(),
    method: 'qr',
    verifiedBy: req.user._id,
    accessGranted: true,
  });

  await attendance.populate('member');

  // Emit successful check-in to gym owner and staff
  io.to('gymowner-room').emit('check-in', {
    member: {
      id: member._id,
      memberId: member.memberId,
      name: member.personalInfo.name,
    },
    timestamp: attendance.checkInTime,
  });

  io.to('staff-room').emit('check-in', {
    member: {
      id: member._id,
      memberId: member.memberId,
      name: member.personalInfo.name,
    },
    timestamp: attendance.checkInTime,
  });

  successResponse(res, 200, 'Access granted', {
    accessGranted: true,
    member: {
      id: member._id,
      memberId: member.memberId,
      name: member.personalInfo.name,
      phone: member.personalInfo.phone,
      membershipPlan: member.membership.plan.name,
      membershipEndDate: member.membership.endDate,
      photo: member.personalInfo.photo,
    },
    attendance,
  });
});

// Get attendance records
export const getAttendance = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 50, 
    startDate, 
    endDate, 
    memberId,
    accessGranted,
    sortBy = 'checkInTime',
    order = 'desc'
  } = req.query;

  // Build filter with gymId isolation
  const filter = { gymId: req.gymId };

  if (startDate || endDate) {
    filter.checkInTime = {};
    if (startDate) {
      filter.checkInTime.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.checkInTime.$lte = end;
    }
  }

  if (memberId) {
    const member = await Member.findOne({ memberId, gymId: req.gymId });
    if (member) {
      filter.member = member._id;
    }
  }

  if (accessGranted !== undefined) {
    filter.accessGranted = accessGranted === 'true';
  }

  // Get total count
  const total = await Attendance.countDocuments(filter);
  const pagination = calculatePagination(page, limit, total);

  // Get attendance records
  const records = await Attendance.find(filter)
    .populate({
      path: 'member',
      select: 'memberId personalInfo membership',
    })
    .populate('verifiedBy', 'name')
    .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
    .skip(pagination.skip)
    .limit(pagination.itemsPerPage);

  // Filter out records with null members and log them
  const validRecords = records.filter(record => {
    if (!record.member) {
      console.warn(`⚠️  Attendance record ${record._id} has no associated member`);
      return false;
    }
    return true;
  });

  successResponse(res, 200, 'Attendance records retrieved successfully', {
    records: validRecords,
    pagination: {
      ...pagination,
      itemsCount: validRecords.length,
    },
  });
});

// Get attendance for specific member
export const getMemberAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const member = await Member.findOne({ _id: id, gymId: req.gymId });
  if (!member) {
    return errorResponse(res, 404, 'Member not found');
  }

  const filter = { member: id, accessGranted: true };

  const total = await Attendance.countDocuments(filter);
  const pagination = calculatePagination(page, limit, total);

  const records = await Attendance.find(filter)
    .populate('verifiedBy', 'name')
    .sort({ checkInTime: -1 })
    .skip(pagination.skip)
    .limit(pagination.itemsPerPage);

  successResponse(res, 200, 'Member attendance retrieved successfully', {
    records,
    pagination,
  });
});


// Get today's attendance statistics
export const getTodayStats = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const baseFilter = { gymId: req.gymId };

  const totalCheckIns = await Attendance.countDocuments({
    ...baseFilter,
    checkInTime: { $gte: today, $lt: tomorrow },
    accessGranted: true,
  });

  const deniedAccess = await Attendance.countDocuments({
    ...baseFilter,
    checkInTime: { $gte: today, $lt: tomorrow },
    accessGranted: false,
  });

  // For 'single-scan' clubs (no checkout), currently in gym equals today's total successful check-ins
  const currentlyInGym = totalCheckIns;

  successResponse(res, 200, 'Today\'s statistics retrieved successfully', {
    stats: {
      totalCheckIns,
      deniedAccess,
      currentlyInGym,
      date: today,
    },
  });
});
