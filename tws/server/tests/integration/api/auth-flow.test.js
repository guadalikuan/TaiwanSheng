// 认证流程集成测试
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import authRoutes from '../../../routes/auth.js';
import * as userStorage from '../../../utils/userStorage.js';
import * as web3 from '../../../utils/web3.js';
import * as jwt from '../../../utils/jwt.js';
import { testUsers } from '../../fixtures/testUsers.js';

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
    userStorage.getUserByUsername.mockReturnValue(null);
    userStorage.getUserByAddress.mockReturnValue(null);
    web3.generateMnemonic.mockReturnValue(mockMnemonic);
    web3.getAddressFromMnemonic.mockReturnValue(mockAddress);
    web3.encryptPrivateKey.mockReturnValue('encrypted-mnemonic');
    userStorage.saveUser.mockReturnValue({
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
    userStorage.getUserByAddress.mockReturnValue({
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
