import User from '../models/User.js';
import Gym from '../models/Gym.js';
import { ROLES } from '../config/constants.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { asyncHandler, successResponse, errorResponse } from '../utils/helpers.js';

// Register new user
export const register = asyncHandler(async (req, res) => {
  const { email, password, name, phone, role } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return errorResponse(res, 400, 'User with this email already exists');
  }

  // Determine gymId - inherit from creating user unless super admin is creating
  let gymId = null;
  if (req.user) {
    // If creator is not super admin, new user inherits the same gymId
    if (req.user.role !== 'superadmin') {
      gymId = req.user.gymId;
    }
    // If creator is super admin and creating a gym owner, gymId should be provided separately
    // For other roles, super admin must specify gymId
  }

  // Create user
  const user = await User.create({
    email,
    password,
    name,
    phone,
    role,
    gymId,
    createdBy: req.user ? req.user._id : null,
  });

  successResponse(res, 201, 'User registered successfully', {
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

// Login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return errorResponse(res, 401, 'Invalid email or password');
  }

  // If user belongs to a gym, ensure the gym is active (not blocked by superadmin)
  if (user.role !== ROLES.SUPER_ADMIN && user.gymId) {
    const gym = await Gym.findOne({ gymId: user.gymId }).select('isActive name');
    if (gym && gym.isActive === false) {
      // Message per request
      return errorResponse(res, 403, 'superadmin has Blocked You');
    }
  }

  // Check if user is active
  if (!user.isActive) {
    return errorResponse(res, 403, 'Account is deactivated. Please contact administrator.');
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return errorResponse(res, 401, 'Invalid email or password');
  }

  // Generate tokens with gymId and role
  const accessToken = generateAccessToken(user._id, user.gymId, user.role);
  const refreshToken = generateRefreshToken(user._id, user.gymId);

  // Save refresh token
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save();

  // Set refresh token in httpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Return exact response shape expected by frontend
  return res.status(200).json({
    success: true,
    data: {
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    },
  });
});

// Refresh token
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.cookies;

  if (!token) {
    return errorResponse(res, 401, 'Refresh token not found');
  }

  try {
    const decoded = verifyRefreshToken(token);
    
    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      return errorResponse(res, 401, 'Invalid refresh token');
    }

    // If user's gym is blocked, disallow refresh
    if (user.role !== ROLES.SUPER_ADMIN && user.gymId) {
      const gym = await Gym.findOne({ gymId: user.gymId }).select('isActive');
      if (gym && gym.isActive === false) {
        return errorResponse(res, 403, 'superadmin has Blocked You');
      }
    }

    // Generate new tokens with gymId and role
    const accessToken = generateAccessToken(user._id, user.gymId, user.role);
    const newRefreshToken = generateRefreshToken(user._id, user.gymId);

    // Update refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    // Set new refresh token in cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    successResponse(res, 200, 'Token refreshed successfully', { accessToken });
  } catch (error) {
    return errorResponse(res, 401, 'Invalid or expired refresh token');
  }
});

// Logout
export const logout = asyncHandler(async (req, res) => {
  // Clear refresh token from database
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  }

  // Clear cookie
  res.clearCookie('refreshToken');

  successResponse(res, 200, 'Logout successful');
});

// Get current user
export const getCurrentUser = asyncHandler(async (req, res) => {
  successResponse(res, 200, 'User retrieved successfully', { user: req.user });
});

// Change password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  
  const isPasswordValid = await user.comparePassword(currentPassword);
  if (!isPasswordValid) {
    return errorResponse(res, 401, 'Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  successResponse(res, 200, 'Password changed successfully');
});
