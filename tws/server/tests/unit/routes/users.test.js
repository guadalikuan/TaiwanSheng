// 用户管理路由测试 - F-USER-001-v1.0 到 F-USER-006-v1.0
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import usersRoutes from '../../routes/users.js';
import * as userStorage from '../../utils/userStorage.js';
import { testUsers } from '../fixtures/testUsers.js';

const app = express();
app.use(express.json());
app.use('/api/users', usersRoutes);

// Mock中间件
const mockAuthenticate = (req, res, next) => {
  req.user = testUsers.admin;
  next();
};

const mockRequireAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  next();
};

// 应用mock中间件
app.use('/api/users', mockAuthenticate);
app.use('/api/users', mockRequireAdmin);

describe('F-USER-001-v1.0: 获取所有用户', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该成功获取所有用户列表', async () => {
    const mockUsers = [testUsers.regularUser, testUsers.submitter];
    userStorage.getAllUsers.mockReturnValue(mockUsers);

    const response = await request(app)
      .get('/api/users');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.users)).toBe(true);
  });

  it('应该拒绝非管理员访问', async () => {
    const appNoAdmin = express();
    appNoAdmin.use(express.json());
    appNoAdmin.use('/api/users', (req, res, next) => {
      req.user = testUsers.regularUser; // 非管理员
      next();
    });
    appNoAdmin.use('/api/users', mockRequireAdmin);
    appNoAdmin.use('/api/users', usersRoutes);

    const response = await request(appNoAdmin)
      .get('/api/users');

    expect(response.status).toBe(403);
  });
});

describe('F-USER-002-v1.0: 获取所有房地产开发商账户', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该成功获取开发商列表', async () => {
    const mockDevelopers = [testUsers.submitter];
    userStorage.getAllUsers.mockReturnValue(mockDevelopers);

    const response = await request(app)
      .get('/api/users/developers');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

// 继续添加其他用户管理功能的测试...
// F-USER-003-v1.0: 创建房地产开发商账户
// F-USER-004-v1.0: 更新房地产开发商账户
// F-USER-005-v1.0: 删除房地产开发商账户
// F-USER-006-v1.0: 获取单个用户信息
