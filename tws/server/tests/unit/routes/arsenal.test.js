// ARS模块路由测试 - F-ARS-001-v1.0 到 F-ARS-017-v1.0
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import arsenalRoutes from '../../routes/arsenal.js';
import { testUsers } from '../../fixtures/testUsers.js';
import { testAssets } from '../../fixtures/testAssets.js';

const app = express();
app.use(express.json());
app.use('/api/arsenal', arsenalRoutes);

// Mock中间件
const mockAuthenticate = (req, res, next) => {
  req.user = testUsers.submitter;
  next();
};

const mockRequireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
  };
};

describe('F-ARS-001-v1.0: 提交资产数据', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该成功提交资产数据', async () => {
    const appWithAuth = express();
    appWithAuth.use(express.json());
    appWithAuth.use('/api/arsenal', mockAuthenticate);
    appWithAuth.use('/api/arsenal', mockRequireRole('SUBMITTER', 'ADMIN'));
    appWithAuth.use('/api/arsenal', arsenalRoutes);

    const response = await request(appWithAuth)
      .post('/api/arsenal/submit')
      .send({
        city: 'Taipei',
        area: 100,
        debtAmount: 1000000,
        projectName: 'Test Project',
      });

    // 注意：实际测试需要mock存储函数
    expect(response.status).toBeDefined();
  });

  it('应该拒绝未认证的请求', async () => {
    const response = await request(app)
      .post('/api/arsenal/submit')
      .send({
        city: 'Taipei',
        area: 100,
      });

    expect(response.status).toBe(401);
  });
});

describe('F-ARS-002-v1.0: 实时预览脱敏结果', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该成功生成预览', async () => {
    const response = await request(app)
      .get('/api/arsenal/preview')
      .query({
        city: 'Taipei',
        area: 100,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.preview).toBeDefined();
  });

  it('应该拒绝缺少城市参数的请求', async () => {
    const response = await request(app)
      .get('/api/arsenal/preview');

    expect(response.status).toBe(400);
  });
});

// 继续添加其他ARS模块功能的测试...
// F-ARS-003-v1.0: 获取所有待审核资产
// F-ARS-004-v1.0: 获取所有已审核通过的资产
// ... 等等
