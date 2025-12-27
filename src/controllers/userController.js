import User from '../models/User.js';
import { asyncHandler, successResponse, errorResponse } from '../utils/helpers.js';

// Get all users
export const getUsers = asyncHandler(async (req, res) => {
  const { role, isActive } = req.query;

  const filter = { gymId: req.gymId };
  if (role) {
    filter.role = role;
  }
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  const users = await User.find(filter).sort({ createdAt: -1 });

  successResponse(res, 200, 'Users retrieved successfully', { users });
});

// Get user by ID
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findOne({ _id: id, gymId: req.gymId });
  if (!user) {
    return errorResponse(res, 404, 'User not found');
  }

  successResponse(res, 200, 'User retrieved successfully', { user });
});

// Update user
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, phone, role, isActive } = req.body;

  const user = await User.findOne({ _id: id, gymId: req.gymId });
  if (!user) {
    return errorResponse(res, 404, 'User not found');
  }

  // Prevent self-deactivation
  if (req.user._id.toString() === id && isActive === false) {
    return errorResponse(res, 400, 'Cannot deactivate your own account');
  }

  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (role) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;

  await user.save();

  successResponse(res, 200, 'User updated successfully', { user });
});

// Delete user
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Prevent self-deletion
  if (req.user._id.toString() === id) {
    return errorResponse(res, 400, 'Cannot delete your own account');
  }

  const user = await User.findOneAndUpdate(
    { _id: id, gymId: req.gymId },
    { isActive: false },
    { new: true }
  );

  if (!user) {
    return errorResponse(res, 404, 'User not found');
  }

  successResponse(res, 200, 'User deactivated successfully');
});
