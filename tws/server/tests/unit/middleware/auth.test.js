// 认证中间件测试
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { authenticate } from '../../../middleware/auth.js';
import * as jwt from '../../../utils/jwt.js';
import { testUsers } from '../../fixtures/testUsers.js';
import { createMockRequest, createMockResponse, createMockNext } from '../../helpers/mocks.js';

describe('认证中间件测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该成功验证有效的token', () => {
    const req = createMockRequest({
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

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
  });

  it('应该拒绝缺少token的请求', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('应该拒绝无效的token', () => {
    const req = createMockRequest({
      headers: {
        authorization: 'Bearer invalid-token',
      },
    });
    const res = createMockResponse();
    const next = createMockNext();

    jwt.verifyToken.mockReturnValue(null);

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
