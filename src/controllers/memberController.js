import Member from '../models/Member.js';
import Plan from '../models/Plan.js';
import { generateMemberId, generateQRCodeData, generateQRCodeImage } from '../utils/qrGenerator.js';
import { asyncHandler, successResponse, errorResponse, calculatePagination } from '../utils/helpers.js';
import { MEMBERSHIP_STATUS, FEE_STATUS } from '../config/constants.js';

// Create new member
export const createMember = asyncHandler(async (req, res) => {
  const { personalInfo, membership, feeStatus, emergencyContact, notes } = req.body;

  // Check if plan exists and belongs to same gym
  const plan = await Plan.findOne({ _id: membership.plan, gymId: req.gymId });
  if (!plan) {
    return errorResponse(res, 404, 'Membership plan not found');
  }

  // Generate unique member ID
  const memberId = generateMemberId();

  // Calculate end date based on plan
  const startDate = new Date(membership.startDate || Date.now());
  const durationInDays = plan.getDurationInDays();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationInDays);

  // Generate QR code with gymId and memberId
  const qrData = generateQRCodeData(req.gymId, memberId);
  const qrCode = await generateQRCodeImage(qrData);

  // Create member with gymId
  const member = await Member.create({
    gymId: req.gymId,
    memberId,
    personalInfo,
    membership: {
      ...membership,
      startDate,
      endDate,
      status: MEMBERSHIP_STATUS.ACTIVE,
    },
    feeStatus: feeStatus || FEE_STATUS.PAID,
    qrCode,
    emergencyContact,
    notes,
    createdBy: req.user._id,
  });

  // Keep expiryDate in sync with membership.endDate
  member.expiryDate = member.membership.endDate;
  await member.save();

  await member.populate('membership.plan');

  successResponse(res, 201, 'Member created successfully', { member });
});

// Get all members with pagination and filters
export const getMembers = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    search, 
    status, 
    feeStatus,
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;

  // Build filter query with gymId isolation
  const filter = { gymId: req.gymId, isActive: true };

  if (search) {
    filter.$or = [
      { 'personalInfo.name': { $regex: search, $options: 'i' } },
      { 'personalInfo.email': { $regex: search, $options: 'i' } },
      { 'personalInfo.phone': { $regex: search, $options: 'i' } },
      { memberId: { $regex: search, $options: 'i' } },
    ];
  }

  if (status) {
    filter['membership.status'] = status;
  }

  if (feeStatus) {
    filter.feeStatus = feeStatus;
  }

  // Get total count
  const total = await Member.countDocuments(filter);
  const pagination = calculatePagination(page, limit, total);

  // Get members
  const members = await Member.find(filter)
    .populate('membership.plan')
    .populate('createdBy', 'name email')
    .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
    .skip(pagination.skip)
    .limit(pagination.itemsPerPage);

  successResponse(res, 200, 'Members retrieved successfully', {
    members,
    pagination,
  });
});

// Get member by ID
export const getMemberById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const member = await Member.findOne({ _id: id, gymId: req.gymId })
    .populate('membership.plan')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

  if (!member) {
    return errorResponse(res, 404, 'Member not found');
  }

  successResponse(res, 200, 'Member retrieved successfully', { member });
});

// Get member by Member ID (for QR scanning)
export const getMemberByMemberId = asyncHandler(async (req, res) => {
  const { memberId } = req.params;

  const member = await Member.findOne({ memberId, gymId: req.gymId })
    .populate('membership.plan');

  if (!member) {
    return errorResponse(res, 404, 'Member not found');
  }

  successResponse(res, 200, 'Member retrieved successfully', { member });
});

// Update member
export const updateMember = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const member = await Member.findOne({ _id: id, gymId: req.gymId });
  if (!member) {
    return errorResponse(res, 404, 'Member not found');
  }

  // If plan is being updated, recalculate end date
  if (updates.membership?.plan && updates.membership.plan !== member.membership.plan.toString()) {
    const plan = await Plan.findOne({ _id: updates.membership.plan, gymId: req.gymId });
    if (!plan) {
      return errorResponse(res, 404, 'Membership plan not found');
    }

    const startDate = new Date(updates.membership.startDate || member.membership.startDate);
    const durationInDays = plan.getDurationInDays();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationInDays);

    updates.membership.endDate = endDate;
  }

  // Update member
  Object.keys(updates).forEach(key => {
    if (key === 'personalInfo' || key === 'membership' || key === 'emergencyContact') {
      member[key] = { ...member[key], ...updates[key] };
    } else {
      member[key] = updates[key];
    }
  });

  member.updatedBy = req.user._id;
  await member.save();

  await member.populate('membership.plan');

  successResponse(res, 200, 'Member updated successfully', { member });
});

// Delete member (soft delete)
export const deleteMember = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const member = await Member.findOne({ _id: id, gymId: req.gymId });
  if (!member) {
    return errorResponse(res, 404, 'Member not found');
  }

  member.isActive = false;
  member.updatedBy = req.user._id;
  await member.save();

  successResponse(res, 200, 'Member deleted successfully');
});

// Regenerate QR code
export const regenerateQRCode = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const member = await Member.findOne({ _id: id, gymId: req.gymId });
  if (!member) {
    return errorResponse(res, 404, 'Member not found');
  }

  // QR codes are permanent and must not be regenerated. Return error to prevent accidental changes.
  return errorResponse(res, 403, 'QR code is permanent and cannot be regenerated');
});

// Renew membership (extend expiryDate based on plan). If planId is provided, use that plan, otherwise use member's current plan.
export const renewMember = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { planId } = req.body; // optional: allow selecting a new plan for renewal

  const member = await Member.findOne({ _id: id, gymId: req.gymId });
  if (!member) {
    return errorResponse(res, 404, 'Member not found');
  }

  // Determine plan to use for renewal
  let plan = null;
  if (planId) {
    plan = await Plan.findOne({ _id: planId, gymId: req.gymId });
    if (!plan) return errorResponse(res, 404, 'Selected plan not found');
  } else {
    plan = await Plan.findById(member.membership.plan);
    if (!plan) return errorResponse(res, 404, 'Member plan not found for renewal');
  }

  // Compute base date: extend from current expiry if still in future, otherwise from now
  const now = new Date();
  const base = member.expiryDate && new Date(member.expiryDate) > now ? new Date(member.expiryDate) : now;

  const durationInDays = plan.getDurationInDays();
  const newExpiry = new Date(base);
  newExpiry.setDate(newExpiry.getDate() + durationInDays);

  // Update membership and related fields
  member.membership.endDate = newExpiry;
  member.expiryDate = newExpiry;
  member.membership.status = MEMBERSHIP_STATUS.ACTIVE;
  member.isActive = true;
  member.lastPaymentDate = now;
  member.feeStatus = FEE_STATUS.PAID;
  member.updatedBy = req.user._id;

  // If planId provided and differs, update stored plan reference
  if (planId && planId.toString() !== member.membership.plan.toString()) {
    member.membership.plan = plan._id;
    member.membership.startDate = now;
  }

  await member.save();

  await member.populate('membership.plan');

  successResponse(res, 200, 'Membership renewed successfully', { member });
});

// Get membership statistics
export const getMemberStats = asyncHandler(async (req, res) => {
  const baseFilter = { gymId: req.gymId };
  
  const totalMembers = await Member.countDocuments({ ...baseFilter, isActive: true });
  const activeMembers = await Member.countDocuments({ 
    ...baseFilter,
    isActive: true, 
    'membership.status': MEMBERSHIP_STATUS.ACTIVE 
  });
  const expiredMembers = await Member.countDocuments({ 
    ...baseFilter,
    isActive: true, 
    'membership.status': MEMBERSHIP_STATUS.EXPIRED 
  });
  const pendingPayments = await Member.countDocuments({ 
    isActive: true, 
    feeStatus: { $in: [FEE_STATUS.PENDING, FEE_STATUS.OVERDUE] }
  });

  // Get members expiring in next 7 days
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const expiringMembers = await Member.countDocuments({
    isActive: true,
    'membership.status': MEMBERSHIP_STATUS.ACTIVE,
    'membership.endDate': {
      $gte: new Date(),
      $lte: sevenDaysFromNow,
    },
  });

  successResponse(res, 200, 'Statistics retrieved successfully', {
    stats: {
      totalMembers,
      activeMembers,
      expiredMembers,
      pendingPayments,
      expiringMembers,
    },
  });
});
