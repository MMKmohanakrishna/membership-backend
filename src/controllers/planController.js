import Plan from '../models/Plan.js';
import { asyncHandler, successResponse, errorResponse } from '../utils/helpers.js';

// Create plan
export const createPlan = asyncHandler(async (req, res) => {
  const { name, description, duration, price, features } = req.body;

  const existingPlan = await Plan.findOne({ 
    name, 
    gymId: req.gymId,
    isActive: true 
  });
  if (existingPlan) {
    return errorResponse(res, 400, 'Plan with this name already exists');
  }

  const plan = await Plan.create({
    gymId: req.gymId,
    name,
    description,
    duration,
    price,
    features,
    createdBy: req.user._id,
  });

  successResponse(res, 201, 'Plan created successfully', { plan });
});

// Get all plans
export const getPlans = asyncHandler(async (req, res) => {
  const { isActive } = req.query;

  const filter = { gymId: req.gymId };
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  const plans = await Plan.find(filter).sort({ price: 1 });

  successResponse(res, 200, 'Plans retrieved successfully', { plans });
});

// Get plan by ID
export const getPlanById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const plan = await Plan.findOne({ _id: id, gymId: req.gymId });
  if (!plan) {
    return errorResponse(res, 404, 'Plan not found');
  }

  successResponse(res, 200, 'Plan retrieved successfully', { plan });
});

// Update plan
export const updatePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const plan = await Plan.findOneAndUpdate(
    { _id: id, gymId: req.gymId },
    updates,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!plan) {
    return errorResponse(res, 404, 'Plan not found');
  }

  successResponse(res, 200, 'Plan updated successfully', { plan });
});

// Delete plan
export const deletePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const plan = await Plan.findOneAndUpdate(
    { _id: id, gymId: req.gymId },
    { isActive: false },
    { new: true }
  );

  if (!plan) {
    return errorResponse(res, 404, 'Plan not found');
  }

  successResponse(res, 200, 'Plan deactivated successfully');
});
