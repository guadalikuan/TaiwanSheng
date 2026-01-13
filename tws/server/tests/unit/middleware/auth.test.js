// 认证中间件测试
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { testUsers } from '../../fixtures/testUsers.js';
import { createMockRequest, createMockResponse, createMockNext } from '../../helpers/mocks.js';

const jwt = {
  verifyToken: jest.fn(),
  generateToken: jest.fn(),
};

jest.unstable_mockModule('../../../utils/jwt.js', () => jwt);

const { authenticate } = await import('../../../middleware/auth.js');

describe('认证中间件测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该成功验证有效的token', async () => {
    const req = createMockRequest({
      path: '/api/auth/login',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });
    const res = createMockResponse();
    const next = createMockNext();

    jwt.verifyToken.mockReturnValue({
      address: testUsers.regularUser.address,
      role: testUsers.regularUser.role,
    });

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
  });

  it('应该拒绝缺少token的请求', async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('应该拒绝无效的token', async () => {
    const req = createMockRequest({
      path: '/api/auth/login',
      headers: {
        authorization: 'Bearer invalid-token',
      },
    });
    const res = createMockResponse();
    const next = createMockNext();

    jwt.verifyToken.mockReturnValue(null);

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
