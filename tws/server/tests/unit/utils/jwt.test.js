// JWT工具函数测试
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { generateToken, verifyToken } from '../../../utils/jwt.js';
import { testUsers } from '../../fixtures/testUsers.js';

describe('JWT工具函数测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key';
  });

  describe('generateToken', () => {
    it('应该成功生成token', () => {
      const token = generateToken(testUsers.regularUser);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('应该为不同用户生成不同的token', () => {
      const token1 = generateToken(testUsers.regularUser);
      const token2 = generateToken(testUsers.admin);
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('应该成功验证有效的token', () => {
      const token = generateToken(testUsers.regularUser);
      const decoded = verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.address).toBe(testUsers.regularUser.address);
      expect(decoded.role).toBe(testUsers.regularUser.role);
    });

    it('应该拒绝无效的token', () => {
      const decoded = verifyToken('invalid-token');
      expect(decoded).toBeNull();
    });

    it('应该拒绝空token', () => {
      const decoded = verifyToken('');
      expect(decoded).toBeNull();
    });
  });
});
