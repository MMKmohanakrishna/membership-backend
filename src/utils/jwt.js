import jwt from 'jsonwebtoken';

export const generateAccessToken = (userId, gymId = null, role = null) => {
  const payload = { userId };
  
  // Include gymId for non-superadmin users
  if (gymId) {
    payload.gymId = gymId;
  }
  
  // Include role for authorization checks
  if (role) {
    payload.role = role;
  }
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30m' }
  );
};

export const generateRefreshToken = (userId, gymId = null) => {
  const payload = { userId };
  
  // Include gymId for non-superadmin users
  if (gymId) {
    payload.gymId = gymId;
  }
  
  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};
