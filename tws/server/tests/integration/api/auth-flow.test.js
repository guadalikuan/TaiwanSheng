// 认证流程集成测试
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { testUsers } from '../../fixtures/testUsers.js';

const userStorage = {
  getUserByUsername: jest.fn(),
  getUserByAddress: jest.fn(),
  saveUser: jest.fn(),
  updateUser: jest.fn(),
  getAllUsers: jest.fn(),
  getUsersByRole: jest.fn(),
};

const web3 = {
  generateMnemonic: jest.fn(),
  validateMnemonic: jest.fn(),
  getAddressFromMnemonic: jest.fn(),
  encryptPrivateKey: jest.fn(),
  decryptPrivateKey: jest.fn(),
};

const jwt = {
  generateToken: jest.fn(),
  verifyToken: jest.fn(),
};

jest.unstable_mockModule('../../../utils/userStorage.js', () => userStorage);
jest.unstable_mockModule('../../../utils/web3.js', () => web3);
jest.unstable_mockModule('../../../utils/jwt.js', () => jwt);

const { default: authRoutes } = await import('../../../routes/auth.js');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('认证流程集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该完成完整的注册-登录流程', async () => {
    const mockMnemonic = 'test mnemonic phrase with twelve words here';
    const mockAddress = 'new-user-address-123';

    // 1. 注册
    userStorage.getUserByUsername.mockResolvedValue(null);
    userStorage.getUserByAddress.mockResolvedValue(null);
    web3.generateMnemonic.mockReturnValue(mockMnemonic);
    web3.getAddressFromMnemonic.mockReturnValue(mockAddress);
    web3.encryptPrivateKey.mockReturnValue('encrypted-mnemonic');
    userStorage.saveUser.mockResolvedValue({
      ...testUsers.regularUser,
      address: mockAddress,
      username: 'newuser',
    });
    jwt.generateToken.mockReturnValue('mock-token-123');

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'newuser',
        password: 'Test123456',
      });

    expect(registerResponse.status).toBe(200);
    expect(registerResponse.body.success).toBe(true);
    const token = registerResponse.body.token;

    // 2. 使用token获取用户信息
    userStorage.getUserByAddress.mockResolvedValue({
      ...testUsers.regularUser,
      address: mockAddress,
      username: 'newuser',
    });
    jwt.verifyToken.mockReturnValue({
      address: mockAddress,
      role: 'USER',
    });

    const meResponse = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.success).toBe(true);
    expect(meResponse.body.user.username).toBe('newuser');
  });
});
