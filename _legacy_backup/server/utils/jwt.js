import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'tws-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * 生成 JWT token
 * @param {Object} user - 用户对象
 * @returns {string} JWT token
 */
export const generateToken = (user) => {
  const payload = {
    address: user.address,
    username: user.username,
    role: user.role
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

/**
 * 验证 JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} 解码后的 payload 或 null
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return null;
  }
};

/**
 * 解码 token（不验证）
 * @param {string} token - JWT token
 * @returns {Object|null} 解码后的 payload 或 null
 */
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    console.error('JWT decode error:', error.message);
    return null;
  }
};

