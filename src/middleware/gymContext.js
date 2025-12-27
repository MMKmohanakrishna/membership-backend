import { ROLES } from '../config/constants.js';

/**
 * Middleware to attach gymId to request from authenticated user
 * This ensures all API calls are scoped to the user's gym
 * Super Admin users don't have a gymId
 */
export const attachGymId = (req, res, next) => {
  try {
    // Skip for super admin
    if (req.user && req.user.role === ROLES.SUPER_ADMIN) {
      req.gymId = null;
      return next();
    }

    // For all other users, gymId must exist
    if (!req.user || !req.user.gymId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Gym context not found.',
      });
    }

    // Attach gymId to request
    req.gymId = req.user.gymId;
    next();
  } catch (error) {
    console.error('Gym ID attachment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to establish gym context.',
    });
  }
};

/**
 * Middleware to enforce gymId-based data isolation
 * Prevents cross-gym data access
 */
export const enforceGymIsolation = (req, res, next) => {
  try {
    // Skip for super admin
    if (req.user && req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    // Ensure gymId exists on request
    if (!req.gymId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Gym context required.',
      });
    }

    // If gymId is provided in request body/params/query, verify it matches user's gymId
    const requestGymId = req.body?.gymId || req.params?.gymId || req.query?.gymId;
    
    if (requestGymId && requestGymId !== req.gymId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Cannot access data from another gym.',
      });
    }

    // Remove gymId from request body/params/query to prevent manual override
    if (req.body?.gymId) delete req.body.gymId;
    if (req.params?.gymId) delete req.params.gymId;
    if (req.query?.gymId) delete req.query.gymId;

    next();
  } catch (error) {
    console.error('Gym isolation enforcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enforce gym isolation.',
    });
  }
};

/**
 * Combined middleware for convenience
 * Attaches gymId and enforces isolation in one step
 */
export const gymContext = [attachGymId, enforceGymIsolation];
