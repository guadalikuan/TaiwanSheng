// 认证路由测试 - F-AUTH-001-v1.0 到 F-AUTH-009-v1.0
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

describe('F-AUTH-001-v1.0: 用户注册', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该成功注册新用户', async () => {
    const mockMnemonic = 'test mnemonic phrase with twelve words here';
    const mockAddress = '11111111111111111111111111111111';

    userStorage.getUserByUsername.mockResolvedValue(null);
    userStorage.getUserByAddress.mockResolvedValue(null);
    web3.generateMnemonic.mockReturnValue(mockMnemonic);
    web3.getAddressFromMnemonic.mockReturnValue(mockAddress);
    web3.encryptPrivateKey.mockReturnValue('encrypted-mnemonic');
    userStorage.saveUser.mockResolvedValue({
      ...testUsers.regularUser,
      address: mockAddress,
    });
    jwt.generateToken.mockReturnValue('mock-token');

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'newuser',
        password: 'Test123456',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toBe('mock-token');
    expect(response.body.mnemonic).toBe(mockMnemonic);
  });

  it('应该拒绝缺少必填字段的注册', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'newuser',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Missing required fields');
  });

  it('应该拒绝无效的用户名格式', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'ab', // 太短
        password: 'Test123456',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Invalid username');
  });

  it('应该拒绝弱密码', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'newuser',
        password: 'weak', // 太弱
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Weak password');
  });

  it('应该拒绝重复的用户名', async () => {
    userStorage.getUserByUsername.mockResolvedValue(testUsers.regularUser);

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        password: 'Test123456',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Username already exists');
  });

  it('应该拒绝重复的地址', async () => {
    const mockAddress = '11111111111111111111111111111111';
    userStorage.getUserByUsername.mockResolvedValue(null);
    web3.generateMnemonic.mockReturnValue('test mnemonic');
    web3.getAddressFromMnemonic.mockReturnValue(mockAddress);
    userStorage.getUserByAddress.mockResolvedValue(testUsers.regularUser);

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'newuser',
        password: 'Test123456',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Address already exists');
  });
});

describe('F-AUTH-002-v1.0: 用户登录', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该成功登录', async () => {
    userStorage.getUserByUsername.mockResolvedValue(testUsers.regularUser);
    // Mock bcrypt.compare
    const bcryptModule = await import('bcryptjs');
    const bcrypt = bcryptModule.default ?? bcryptModule;
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    jwt.generateToken.mockReturnValue('mock-token');
    userStorage.updateUser.mockResolvedValue(testUsers.regularUser);

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'Test123456',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toBe('mock-token');
  });

  it('应该拒绝缺少凭证的登录', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('应该拒绝无效凭证', async () => {
    userStorage.getUserByUsername.mockResolvedValue(null);
    userStorage.getUserByAddress.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'nonexistent',
        password: 'Test123456',
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('应该拒绝错误密码', async () => {
    userStorage.getUserByUsername.mockResolvedValue(testUsers.regularUser);
    const bcryptModule = await import('bcryptjs');
    const bcrypt = bcryptModule.default ?? bcryptModule;
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'WrongPassword',
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

// 继续添加其他认证功能的测试...
// F-AUTH-003-v1.0: 使用助记符登录
// F-AUTH-004-v1.0: 验证助记符
// F-AUTH-005-v1.0: 钱包登录
// F-AUTH-006-v1.0: 钱包注册
// F-AUTH-007-v1.0: 获取当前用户信息
// F-AUTH-008-v1.0: 更新用户资料
// F-AUTH-009-v1.0: 修改密码
