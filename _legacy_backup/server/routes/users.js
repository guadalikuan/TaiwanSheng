import express from 'express';
import bcrypt from 'bcryptjs';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { 
  getAllUsers,
  getUserByAddress,
  getUserByUsername,
  saveUser,
  updateUser,
  getUsersByRole
} from '../utils/userStorage.js';
import { generateMnemonic, getAddressFromMnemonic, encryptPrivateKey } from '../utils/web3.js';
import { generateToken } from '../utils/jwt.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { ROLES } from '../utils/roles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const USERS_FILE = join(__dirname, '../data/users.json');

const router = express.Router();

// GET /api/users - 获取所有用户（仅管理员）
router.get('/', authenticate, requireRole(ROLES.ADMIN), (req, res) => {
  try {
    const users = getAllUsers();
    // 不返回敏感信息（密码、助记符）
    const sanitizedUsers = users.map(user => ({
      address: user.address,
      username: user.username,
      role: user.role,
      profile: user.profile,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.lastLogin
    }));
    
    res.json({
      success: true,
      count: sanitizedUsers.length,
      users: sanitizedUsers
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users',
      message: error.message
    });
  }
});

// GET /api/users/developers - 获取所有房地产开发商账户
router.get('/developers', authenticate, requireRole(ROLES.ADMIN), (req, res) => {
  try {
    const developers = getUsersByRole(ROLES.DEVELOPER);
    const sanitizedDevelopers = developers.map(user => ({
      address: user.address,
      username: user.username,
      role: user.role,
      profile: user.profile,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.lastLogin
    }));
    
    res.json({
      success: true,
      count: sanitizedDevelopers.length,
      users: sanitizedDevelopers
    });
  } catch (error) {
    console.error('Error getting developers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get developers',
      message: error.message
    });
  }
});

// POST /api/users/developers - 创建房地产开发商账户（仅管理员）
router.post('/developers', authenticate, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { username, password, mnemonic } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Username and password are required'
      });
    }

    // 验证用户名格式
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid username',
        message: 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
      });
    }

    // 验证密码强度
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(password)) {
      return res.status(400).json({
        success: false,
        error: 'Weak password',
        message: 'Password must be at least 8 characters and contain both letters and numbers'
      });
    }

    // 检查用户名是否已存在
    const existingUser = getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Username already exists',
        message: 'This username is already taken'
      });
    }

    let walletAddress;
    let finalMnemonic = mnemonic;

    // 如果提供了助记符，验证并使用它
    if (mnemonic) {
      const { validateMnemonic } = await import('../utils/web3.js');
      if (!validateMnemonic(mnemonic)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid mnemonic',
          message: 'The provided mnemonic is invalid'
        });
      }
      walletAddress = getAddressFromMnemonic(mnemonic);
    } else {
      // 生成新的助记符和钱包
      finalMnemonic = generateMnemonic();
      walletAddress = getAddressFromMnemonic(finalMnemonic);
    }

    // 检查地址是否已存在
    const existingAddress = getUserByAddress(walletAddress);
    if (existingAddress) {
      return res.status(400).json({
        success: false,
        error: 'Address already exists',
        message: 'This wallet address is already registered'
      });
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 加密助记符（使用密码作为密钥）
    const encryptedMnemonic = encryptPrivateKey(finalMnemonic, password);

    // 创建用户数据（角色为DEVELOPER）
    const userData = {
      address: walletAddress,
      username,
      passwordHash,
      encryptedMnemonic,
      role: ROLES.DEVELOPER, // 固定为DEVELOPER角色
      profile: {
        displayName: username,
        avatar: ''
      },
      lastLogin: null,
      createdBy: req.user?.username || req.user?.address || 'admin' // 记录创建者
    };

    // 保存用户
    const savedUser = saveUser(userData);

    // 不返回敏感信息
    res.json({
      success: true,
      message: 'Developer account created successfully',
      user: {
        address: savedUser.address,
        username: savedUser.username,
        role: savedUser.role,
        profile: savedUser.profile
      },
      mnemonic: finalMnemonic // 返回助记符给管理员（仅一次）
    });

  } catch (error) {
    console.error('Error creating developer account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create developer account',
      message: error.message
    });
  }
});

// PUT /api/users/developers/:address - 更新房地产开发商账户（仅管理员）
router.put('/developers/:address', authenticate, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { address } = req.params;
    const { username, password, profile } = req.body;

    // 查找用户
    const user = getUserByAddress(address);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'Developer account not found'
      });
    }

    // 只能更新DEVELOPER角色的用户
    if (user.role !== ROLES.DEVELOPER) {
      return res.status(403).json({
        success: false,
        error: 'Invalid role',
        message: 'Can only update developer accounts'
      });
    }

    const updates = {};

    // 更新用户名（如果提供）
    if (username) {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid username',
          message: 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
        });
      }
      
      // 检查新用户名是否已被其他用户使用
      const existingUser = getUserByUsername(username);
      if (existingUser && existingUser.address !== address) {
        return res.status(400).json({
          success: false,
          error: 'Username already exists',
          message: 'This username is already taken'
        });
      }
      
      updates.username = username;
      if (!updates.profile) updates.profile = { ...user.profile };
      updates.profile.displayName = username;
    }

    // 更新密码（如果提供）
    if (password) {
      if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(password)) {
        return res.status(400).json({
          success: false,
          error: 'Weak password',
          message: 'Password must be at least 8 characters and contain both letters and numbers'
        });
      }
      
      const passwordHash = await bcrypt.hash(password, 10);
      updates.passwordHash = passwordHash;
      
      // 如果用户有助记符，需要用新密码重新加密
      if (user.encryptedMnemonic) {
        const { decryptPrivateKey } = await import('../utils/web3.js');
        const decryptedMnemonic = decryptPrivateKey(user.encryptedMnemonic, req.body.oldPassword || '');
        // 如果提供了旧密码且能解密，则重新加密
        if (decryptedMnemonic) {
          updates.encryptedMnemonic = encryptPrivateKey(decryptedMnemonic, password);
        }
        // 如果没有提供旧密码，则清除助记符（安全考虑）
        else {
          updates.encryptedMnemonic = '';
        }
      }
    }

    // 更新资料（如果提供）
    if (profile) {
      if (!updates.profile) updates.profile = { ...user.profile };
      updates.profile = { ...updates.profile, ...profile };
    }

    // 更新用户
    const updatedUser = updateUser(address, updates);

    res.json({
      success: true,
      message: 'Developer account updated successfully',
      user: {
        address: updatedUser.address,
        username: updatedUser.username,
        role: updatedUser.role,
        profile: updatedUser.profile
      }
    });

  } catch (error) {
    console.error('Error updating developer account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update developer account',
      message: error.message
    });
  }
});

// DELETE /api/users/developers/:address - 删除房地产开发商账户（仅管理员）
router.delete('/developers/:address', authenticate, requireRole(ROLES.ADMIN), (req, res) => {
  try {
    const { address } = req.params;

    // 查找用户
    const user = getUserByAddress(address);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'Developer account not found'
      });
    }

    // 只能删除DEVELOPER角色的用户
    if (user.role !== ROLES.DEVELOPER) {
      return res.status(403).json({
        success: false,
        error: 'Invalid role',
        message: 'Can only delete developer accounts'
      });
    }

    // 读取所有用户
    const users = JSON.parse(readFileSync(USERS_FILE, 'utf8'));
    const filteredUsers = users.filter(u => u.address !== address);
    writeFileSync(USERS_FILE, JSON.stringify(filteredUsers, null, 2), 'utf8');

    res.json({
      success: true,
      message: 'Developer account deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting developer account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete developer account',
      message: error.message
    });
  }
});

// GET /api/users/:address - 获取单个用户信息（仅管理员）
router.get('/:address', authenticate, requireRole(ROLES.ADMIN), (req, res) => {
  try {
    const { address } = req.params;
    const user = getUserByAddress(address);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found'
      });
    }

    // 不返回敏感信息
    res.json({
      success: true,
      user: {
        address: user.address,
        username: user.username,
        role: user.role,
        profile: user.profile,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin,
        createdBy: user.createdBy
      }
    });

  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
      message: error.message
    });
  }
});

export default router;

