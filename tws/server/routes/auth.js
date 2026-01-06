import express from 'express';
import bcrypt from 'bcryptjs';
import { 
  saveUser, 
  getUserByAddress, 
  getUserByUsername,
  updateUser 
} from '../utils/userStorage.js';
import { 
  generateMnemonic, 
  validateMnemonic, 
  getAddressFromMnemonic,
  encryptPrivateKey,
  decryptPrivateKey
} from '../utils/web3.js';
import { generateToken } from '../utils/jwt.js';
import { ROLES } from '../utils/roles.js';
import nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

const router = express.Router();

// POST /api/auth/register - 用户注册
router.post('/register', async (req, res) => {
  try {
    const { username, password, mnemonic, role, inviteCode } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Username and password are required'
      });
    }

    // 验证用户名格式（至少3个字符，只能包含字母、数字、下划线）
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid username',
        message: 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
      });
    }

    // 验证密码强度（至少8个字符，包含字母和数字）
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

    // 角色验证和分配
    let assignedRole = ROLES.USER; // 默认角色
    
    // 如果提供了角色，验证是否有效
    if (role) {
      const validRoles = Object.values(ROLES);
      if (validRoles.includes(role)) {
        // 特殊角色需要邀请码或管理员权限
        if (role === ROLES.ADMIN || role === ROLES.REVIEWER) {
          // 这里可以添加邀请码验证逻辑
          // 暂时允许通过inviteCode参数设置（生产环境需要更严格的验证）
          if (inviteCode && inviteCode === process.env.ADMIN_INVITE_CODE) {
            assignedRole = role;
          } else {
            // 没有有效邀请码，降级为普通用户
            assignedRole = ROLES.USER;
          }
        } else if (role === ROLES.SUBMITTER) {
          // SUBMITTER角色可以直接注册（资产提交者）
          assignedRole = ROLES.SUBMITTER;
        } else {
          assignedRole = role;
        }
      }
    }

    // 创建用户数据
    const userData = {
      address: walletAddress,
      username,
      passwordHash,
      encryptedMnemonic,
      role: assignedRole,
      profile: {
        displayName: username,
        avatar: ''
      },
      lastLogin: null
    };

    // 保存用户
    const savedUser = saveUser(userData);

    // 生成 JWT token
    const token = generateToken(savedUser);

    // 返回结果（不包含敏感信息）
    res.json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        address: savedUser.address,
        username: savedUser.username,
        role: savedUser.role,
        profile: savedUser.profile
      },
      mnemonic: finalMnemonic // 首次注册时返回助记符，用户需要保存
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: error.message
    });
  }
});

// POST /api/auth/login - 用户登录（用户名/密码）
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: 'Username and password are required'
      });
    }

    // 查找用户（支持用户名或地址）
    let user = getUserByUsername(username);
    if (!user) {
      user = getUserByAddress(username);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Username or password is incorrect'
      });
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Username or password is incorrect'
      });
    }

    // 更新最后登录时间
    updateUser(user.address, { lastLogin: Date.now() });

    // 生成 JWT token
    const token = generateToken(user);

    // 记录钱包连接（异步，不阻塞登录响应）
    try {
      const { addWalletLog } = await import('../utils/homepageStorage.js');
      const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || '127.0.0.1';
      
      // 简单的IP定位：根据IP返回一个默认的台湾位置
      // 这里可以后续集成真实的IP定位服务
      const taiwanHotspots = [
        { name: 'Taipei (Xinyi)', lat: 25.033, lng: 121.5654 },
        { name: 'New Taipei', lat: 25.012, lng: 121.4654 },
        { name: 'Taichung', lat: 24.1477, lng: 120.6736 },
        { name: 'Kaohsiung', lat: 22.6273, lng: 120.3014 },
        { name: 'Tainan', lat: 22.9997, lng: 120.227 },
        { name: 'Hsinchu (Science Park)', lat: 24.8138, lng: 120.9675 },
        { name: 'Taoyuan (Airport)', lat: 25.0724, lng: 121.2272 },
      ];
      
      // 根据IP地址的hash值选择一个位置（确保同一IP总是返回相同位置）
      const ipHash = clientIp.split('.').reduce((acc, val) => acc + parseInt(val || 0), 0);
      const selectedSpot = taiwanHotspots[ipHash % taiwanHotspots.length] || taiwanHotspots[0]; // 增加兜底逻辑
      
      // 添加一些随机偏移，使位置更自然
      const lat = selectedSpot.lat + (Math.random() - 0.5) * 0.04;
      const lng = selectedSpot.lng + (Math.random() - 0.5) * 0.04;
      
      addWalletLog({
        address: user.address,
        userId: user.id || user.address,
        username: user.username,
        location: { lat, lng },
        city: selectedSpot.name,
        timestamp: Date.now()
      });
    } catch (error) {
      // 钱包日志记录失败不影响登录流程
      console.warn('Failed to log wallet connection:', error);
    }

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        address: user.address,
        username: user.username,
        role: user.role,
        profile: user.profile
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message
    });
  }
});

// POST /api/auth/login-mnemonic - 使用助记符登录
router.post('/login-mnemonic', async (req, res) => {
  try {
    const { mnemonic, password } = req.body;

    if (!mnemonic || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: 'Mnemonic and password are required'
      });
    }

    // 验证助记符
    if (!validateMnemonic(mnemonic)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mnemonic',
        message: 'The provided mnemonic is invalid'
      });
    }

    // 从助记符获取地址
    const walletAddress = getAddressFromMnemonic(mnemonic);

    // 查找用户
    const user = getUserByAddress(walletAddress);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        message: 'No account found for this mnemonic'
      });
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password',
        message: 'Password is incorrect'
      });
    }

    // 更新最后登录时间
    updateUser(user.address, { lastLogin: Date.now() });

    // 生成 JWT token
    const token = generateToken(user);

    // 记录钱包连接（异步，不阻塞登录响应）
    try {
      const { addWalletLog } = await import('../utils/homepageStorage.js');
      const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || '127.0.0.1';
      
      // 简单的IP定位：根据IP返回一个默认的台湾位置
      const taiwanHotspots = [
        { name: 'Taipei (Xinyi)', lat: 25.033, lng: 121.5654 },
        { name: 'New Taipei', lat: 25.012, lng: 121.4654 },
        { name: 'Taichung', lat: 24.1477, lng: 120.6736 },
        { name: 'Kaohsiung', lat: 22.6273, lng: 120.3014 },
        { name: 'Tainan', lat: 22.9997, lng: 120.227 },
        { name: 'Hsinchu (Science Park)', lat: 24.8138, lng: 120.9675 },
        { name: 'Taoyuan (Airport)', lat: 25.0724, lng: 121.2272 },
      ];
      
      // 根据IP地址的hash值选择一个位置（确保同一IP总是返回相同位置）
      const ipHash = clientIp.split('.').reduce((acc, val) => acc + parseInt(val || 0), 0);
      const selectedSpot = taiwanHotspots[ipHash % taiwanHotspots.length];
      
      // 添加一些随机偏移，使位置更自然
      const lat = selectedSpot.lat + (Math.random() - 0.5) * 0.04;
      const lng = selectedSpot.lng + (Math.random() - 0.5) * 0.04;
      
      addWalletLog({
        address: user.address,
        userId: user.id || user.address,
        username: user.username,
        location: { lat, lng },
        city: selectedSpot.name,
        timestamp: Date.now()
      });
    } catch (error) {
      // 钱包日志记录失败不影响登录流程
      console.warn('Failed to log wallet connection:', error);
    }

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        address: user.address,
        username: user.username,
        role: user.role,
        profile: user.profile
      }
    });

  } catch (error) {
    console.error('Mnemonic login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message
    });
  }
});

// POST /api/auth/verify-mnemonic - 验证助记符
router.post('/verify-mnemonic', (req, res) => {
  try {
    const { mnemonic } = req.body;

    if (!mnemonic) {
      return res.status(400).json({
        success: false,
        error: 'Missing mnemonic',
        message: 'Mnemonic is required'
      });
    }

    // 验证助记符
    const isValid = validateMnemonic(mnemonic);
    
    if (!isValid) {
      return res.json({
        success: false,
        message: 'Invalid mnemonic'
      });
    }

    // 获取钱包地址
    const address = getAddressFromMnemonic(mnemonic);

    res.json({
      success: true,
      message: 'Mnemonic is valid',
      address
    });

  } catch (error) {
    console.error('Verify mnemonic error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: error.message
    });
  }
});

// POST /api/auth/login-wallet - 钱包登录
router.post('/login-wallet', async (req, res) => {
  try {
    const { address, signature, message } = req.body;

    if (!address || !signature || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Address, signature, and message are required'
      });
    }

    // 验证 Solana 地址格式
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!solanaAddressRegex.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address',
        message: 'Invalid Solana wallet address format'
      });
    }

    // 查找用户
    const user = getUserByAddress(address);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: '该钱包地址未注册，请先注册账户',
        needsRegistration: true
      });
    }

    // 验证签名
    try {
      const publicKey = new PublicKey(address);
      const messageBytes = new TextEncoder().encode(message);
      // 假设签名是 base64 编码
      const signatureBytes = Buffer.from(signature, 'base64');

      const isValid = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKey.toBytes()
      );

      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid signature',
          message: '签名验证失败'
        });
      }
    } catch (error) {
      console.error('签名验证错误:', error);
      return res.status(401).json({
        success: false,
        error: 'Invalid signature',
        message: '签名验证失败'
      });
    }

    // 更新最后登录时间
    updateUser(user.address, { lastLogin: Date.now() });
    
    // 生成 Token
    const token = generateToken(user);

    // 记录钱包连接
    try {
      const { addWalletLog } = await import('../utils/homepageStorage.js');
      const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
      // 简化定位逻辑
      addWalletLog({
        address: user.address,
        userId: user.id || user.address,
        username: user.username,
        location: { lat: 25.033, lng: 121.5654 }, // 默认台北
        city: 'Taipei',
        timestamp: Date.now()
      });
    } catch (e) {
      console.warn('Wallet log failed:', e);
    }

    res.json({
      success: true,
      message: 'Wallet login successful',
      token,
      user: {
        address: user.address,
        username: user.username,
        role: user.role,
        profile: user.profile
      }
    });
  } catch (error) {
    console.error('Wallet login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message
    });
  }
});

// POST /api/auth/register-wallet - 钱包注册
router.post('/register-wallet', async (req, res) => {
  try {
    const { address, signature, message, username, password, inviteCode } = req.body;

    if (!address || !signature || !message || !username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Address, signature, message, username, and password are required'
      });
    }

    // 验证地址格式
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!solanaAddressRegex.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address',
        message: 'Invalid Solana wallet address format'
      });
    }

    // 验证用户名
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid username',
        message: 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
      });
    }

    // 验证密码
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(password)) {
      return res.status(400).json({
        success: false,
        error: 'Weak password',
        message: 'Password must be at least 8 characters and contain both letters and numbers'
      });
    }

    // 检查是否已存在
    const existingUser = getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Username already exists',
        message: 'This username is already taken'
      });
    }

    const existingAddress = getUserByAddress(address);
    if (existingAddress) {
      return res.status(400).json({
        success: false,
        error: 'Address already exists',
        message: 'This wallet address is already registered'
      });
    }

    // 验证签名
    try {
      const publicKey = new PublicKey(address);
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = Buffer.from(signature, 'base64');

      const isValid = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKey.toBytes()
      );

      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid signature',
          message: '签名验证失败'
        });
      }
    } catch (error) {
      console.error('签名验证错误:', error);
      return res.status(401).json({
        success: false,
        error: 'Invalid signature',
        message: '签名验证失败'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    // 角色处理
    let role = ROLES.USER;
    if (inviteCode && inviteCode === process.env.ADMIN_INVITE_CODE) {
       // 简化的邀请码检查
       role = ROLES.USER; // 默认还是USER，除非特殊逻辑
    }

    const userData = {
      address: address,
      username,
      passwordHash,
      encryptedMnemonic: '', // 钱包注册没有助记符托管
      role,
      profile: { 
        displayName: username, 
        avatar: '' 
      },
      lastLogin: null
    };

    const savedUser = saveUser(userData);
    const token = generateToken(savedUser);

    res.json({
      success: true,
      message: 'Wallet registration successful',
      token,
      user: {
        address: savedUser.address,
        username: savedUser.username,
        role: savedUser.role,
        profile: savedUser.profile
      }
    });
  } catch (error) {
    console.error('Wallet registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: error.message
    });
  }
});

// GET /api/auth/me - 获取当前用户信息（需要认证）
router.get('/me', async (req, res) => {
  try {
    // 从请求头获取 token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    // 验证 token（这里简化处理，实际应该使用中间件）
    const { verifyToken } = await import('../utils/jwt.js');
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    // 获取用户信息
    const user = getUserByAddress(decoded.address);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        address: user.address,
        username: user.username,
        role: user.role,
        profile: user.profile,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
      message: error.message
    });
  }
});

// PUT /api/auth/profile - 更新用户资料（需要认证）
router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    const { verifyToken } = await import('../utils/jwt.js');
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    const { displayName, avatar } = req.body;
    const updates = {};

    if (displayName !== undefined) {
      updates['profile.displayName'] = displayName;
    }
    if (avatar !== undefined) {
      updates['profile.avatar'] = avatar;
    }

    // 更新用户资料
    const user = getUserByAddress(decoded.address);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const updatedProfile = {
      ...user.profile,
      ...(displayName !== undefined && { displayName }),
      ...(avatar !== undefined && { avatar })
    };

    const updatedUser = updateUser(decoded.address, {
      profile: updatedProfile
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        address: updatedUser.address,
        username: updatedUser.username,
        role: updatedUser.role,
        profile: updatedUser.profile
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      message: error.message
    });
  }
});

// POST /api/auth/change-password - 修改密码（需要认证）
router.post('/change-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    const { verifyToken } = await import('../utils/jwt.js');
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Missing passwords',
        message: 'Old password and new password are required'
      });
    }

    // 验证新密码强度
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: 'Weak password',
        message: 'New password must be at least 8 characters and contain both letters and numbers'
      });
    }

    // 获取用户
    const user = getUserByAddress(decoded.address);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // 验证旧密码
    const isValidPassword = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password',
        message: 'Old password is incorrect'
      });
    }

    // 加密新密码
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // 重新加密助记符（使用新密码）
    const decryptedMnemonic = decryptPrivateKey(user.encryptedMnemonic, oldPassword);
    const newEncryptedMnemonic = encryptPrivateKey(decryptedMnemonic, newPassword);

    // 更新密码和加密的助记符
    updateUser(decoded.address, {
      passwordHash: newPasswordHash,
      encryptedMnemonic: newEncryptedMnemonic
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
      message: error.message
    });
  }
});

export default router;

