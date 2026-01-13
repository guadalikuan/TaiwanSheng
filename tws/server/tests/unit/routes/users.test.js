// 用户管理路由测试 - F-USER-001-v1.0 到 F-USER-006-v1.0
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { testUsers } from '../../fixtures/testUsers.js';

const userStorage = {
  getAllUsers: jest.fn(),
  getUsersByRole: jest.fn(),
  getUserByAddress: jest.fn(),
  getUserByUsername: jest.fn(),
  saveUser: jest.fn(),
  updateUser: jest.fn(),
};

const authMiddleware = {
  authenticate: (req, res, next) => {
    if (!req.user) {
      req.user = testUsers.admin;
    }
    next();
  },
  requireRole: (...allowedRoles) => {
    return (req, res, next) => {
      const role = req.user?.role;
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
      next();
    };
  },
  authorize: (...allowedRoles) => {
    return authMiddleware.requireRole(...allowedRoles);
  },
  optionalAuth: (req, _res, next) => next(),
};

jest.unstable_mockModule('../../../utils/userStorage.js', () => userStorage);
jest.unstable_mockModule('../../../middleware/auth.js', () => authMiddleware);

const { default: usersRoutes } = await import('../../../routes/users.js');

const app = express();
app.use(express.json());
app.use('/api/users', usersRoutes);

describe('F-USER-001-v1.0: 获取所有用户', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该成功获取所有用户列表', async () => {
    const mockUsers = [testUsers.regularUser, testUsers.submitter];
    userStorage.getAllUsers.mockResolvedValue(mockUsers);

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
    userStorage.getUsersByRole.mockResolvedValue(mockDevelopers);

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
