import Gym from '../models/Gym.js';
import User from '../models/User.js';
import { asyncHandler, successResponse, errorResponse } from '../utils/helpers.js';
import { ROLES } from '../config/constants.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { logAudit } from '../utils/auditLog.js';

// Create new gym (Super Admin only)
export const createGym = asyncHandler(async (req, res) => {
  const { 
    name, 
    description, 
    address, 
    contact, 
    settings,
    ownerDetails // { email, password, name, phone }
  } = req.body;

  // Validate owner details
  if (!ownerDetails || !ownerDetails.email || !ownerDetails.password || !ownerDetails.name) {
    return errorResponse(res, 400, 'Owner details (email, password, name) are required');
  }

  // Check if owner email already exists
  const existingUser = await User.findOne({ email: ownerDetails.email });
  if (existingUser) {
    return errorResponse(res, 400, 'User with this email already exists');
  }

  // Create gym - gymId will be auto-generated
  const gym = await Gym.create({
    name,
    description,
    address,
    contact,
    settings,
    createdBy: req.user._id,
  });

  // Create gym owner user with the generated gymId
  const owner = await User.create({
    gymId: gym.gymId,
    email: ownerDetails.email,
    password: ownerDetails.password,
    name: ownerDetails.name,
    phone: ownerDetails.phone || '',
    role: ROLES.GYM_OWNER,
    createdBy: req.user._id,
  });

  // Log audit
  await logAudit(req, 'gym_created', 'gym', gym._id.toString(), {
    gymId: gym.gymId,
    name: gym.name,
    ownerEmail: owner.email,
  });

  successResponse(res, 201, 'Gym and owner created successfully', {
    gym: {
      id: gym._id,
      gymId: gym.gymId, // Super admin can see gymId
      name: gym.name,
      description: gym.description,
      address: gym.address,
      contact: gym.contact,
      isActive: gym.isActive,
      createdAt: gym.createdAt,
    },
    owner: {
      id: owner._id,
      email: owner.email,
      name: owner.name,
      phone: owner.phone,
      role: owner.role,
    },
  });
});

// Get all gyms (Super Admin only)
export const getAllGyms = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '', isActive } = req.query;

  const query = {};
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { gymId: { $regex: search, $options: 'i' } },
    ];
  }

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  const skip = (page - 1) * limit;

  const [gyms, total] = await Promise.all([
    Gym.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Gym.countDocuments(query),
  ]);

  // Attach member counts for each gym (optional - non-blocking)
  let gymsWithCounts = gyms;
  try {
    const Member = (await import('../models/Member.js')).default;
    const gymIds = gyms.map((g) => g.gymId).filter(Boolean);
    if (gymIds.length > 0) {
      const counts = await Member.aggregate([
        { $match: { gymId: { $in: gymIds } } },
        { $group: { _id: '$gymId', count: { $sum: 1 } } },
      ]);

      const countsMap = {};
      counts.forEach((c) => { countsMap[c._id] = c.count; });

      gymsWithCounts = gyms.map((g) => {
        const obj = g.toObject ? g.toObject() : g;
        obj.memberCount = countsMap[g.gymId] || 0;
        return obj;
      });
    } else {
      gymsWithCounts = gyms.map((g) => {
        const obj = g.toObject ? g.toObject() : g;
        obj.memberCount = 0;
        return obj;
      });
    }
  } catch (err) {
    // If anything goes wrong, fall back to original gyms without counts
    console.error('Failed to attach member counts to gyms:', err.message);
    gymsWithCounts = gyms.map((g) => (g.toObject ? g.toObject() : g));
    gymsWithCounts.forEach((g) => { g.memberCount = 0; });
  }

  successResponse(res, 200, 'Gyms retrieved successfully', {
    gyms: gymsWithCounts,
    pagination: {
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
      totalGyms: total,
      limit: Number(limit),
    },
  });
});

// Get gym by ID (Super Admin only)
export const getGymById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const gym = await Gym.findById(id).populate('createdBy', 'name email');

  if (!gym) {
    return errorResponse(res, 404, 'Gym not found');
  }

  // Get gym statistics
  const [totalUsers, totalMembers] = await Promise.all([
    User.countDocuments({ gymId: gym.gymId }),
    (async () => {
      try {
        const Member = (await import('../models/Member.js')).default;
        return await Member.countDocuments({ gymId: gym.gymId });
      } catch {
        return 0;
      }
    })(),
  ]);

  successResponse(res, 200, 'Gym retrieved successfully', {
    gym,
    stats: {
      totalUsers,
      totalMembers,
    },
  });
});

// Update gym (Super Admin only)
export const updateGym = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, address, contact, settings, isActive } = req.body;

  const gym = await Gym.findById(id);

  if (!gym) {
    return errorResponse(res, 404, 'Gym not found');
  }

  // Update fields
  if (name !== undefined) gym.name = name;
  if (description !== undefined) gym.description = description;
  if (address !== undefined) gym.address = address;
  if (contact !== undefined) gym.contact = contact;
  if (settings !== undefined) gym.settings = { ...gym.settings, ...settings };
  if (isActive !== undefined) gym.isActive = isActive;

  await gym.save();

  // If isActive was explicitly provided, sync users' isActive with gym status
  if (isActive !== undefined) {
    try {
      await User.updateMany({ gymId: gym.gymId }, { isActive: isActive });
    } catch (err) {
      console.error('Failed to sync user active state for gym:', gym.gymId, err.message);
    }
  }

  // Log audit
  const action = isActive === false ? 'gym_blocked' : isActive === true ? 'gym_unblocked' : 'gym_updated';
  await logAudit(req, action, 'gym', gym._id.toString(), {
    gymId: gym.gymId,
    name: gym.name,
    changes: { name, description, address, contact, isActive },
  });

  successResponse(res, 200, 'Gym updated successfully', { gym });
});

// Delete/Deactivate gym (Super Admin only)
export const deleteGym = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { hardDelete = false } = req.body;

  const gym = await Gym.findById(id);

  if (!gym) {
    return errorResponse(res, 404, 'Gym not found');
  }

  if (hardDelete) {
    // Hard delete - remove gym and all associated data
    // WARNING: This is destructive
    await Gym.findByIdAndDelete(id);
    
    // Optionally cascade delete users, members, etc.
    // await User.deleteMany({ gymId: gym.gymId });
    // await Member.deleteMany({ gymId: gym.gymId });
    
    // Log audit
    await logAudit(req, 'gym_deleted', 'gym', gym._id.toString(), {
      gymId: gym.gymId,
      name: gym.name,
      hardDelete: true,
    });
    
    successResponse(res, 200, 'Gym permanently deleted');
  } else {
    // Soft delete - deactivate
    gym.isActive = false;
    await gym.save();
    
    // Deactivate all users in this gym
    await User.updateMany({ gymId: gym.gymId }, { isActive: false });
    
    // Log audit
    await logAudit(req, 'gym_blocked', 'gym', gym._id.toString(), {
      gymId: gym.gymId,
      name: gym.name,
    });
    
    successResponse(res, 200, 'Gym deactivated successfully', { gym });
  }
});

// Get gym stats (Super Admin only)
export const getGymStats = asyncHandler(async (req, res) => {
  const totalGyms = await Gym.countDocuments();
  const activeGyms = await Gym.countDocuments({ isActive: true });
  const inactiveGyms = await Gym.countDocuments({ isActive: false });

  const recentGyms = await Gym.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select('name gymId createdAt isActive');

  successResponse(res, 200, 'Gym statistics retrieved successfully', {
    stats: {
      total: totalGyms,
      active: activeGyms,
      inactive: inactiveGyms,
    },
    recentGyms,
  });
});
