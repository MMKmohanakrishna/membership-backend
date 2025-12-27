import AuditLog from '../models/AuditLog.js';

/**
 * Create an audit log entry
 * @param {Object} data - Audit log data
 * @param {string} data.user - User ID
 * @param {string} data.action - Action performed
 * @param {string} data.resource - Resource type
 * @param {string} data.resourceId - Resource ID
 * @param {Object} data.details - Additional details
 * @param {string} data.ipAddress - IP address
 * @param {string} data.userAgent - User agent
 */
export const createAuditLog = async (data) => {
  try {
    await AuditLog.create(data);
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw - audit log failure shouldn't break the main operation
  }
};

/**
 * Get client IP address from request
 */
export const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         'unknown';
};

/**
 * Get user agent from request
 */
export const getUserAgent = (req) => {
  return req.headers['user-agent'] || 'unknown';
};

/**
 * Log audit entry from request context
 */
export const logAudit = async (req, action, resource, resourceId, details = {}) => {
  if (!req.user) return;
  
  await createAuditLog({
    user: req.user.id,
    action,
    resource,
    resourceId,
    details,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
  });
};
