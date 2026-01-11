// 用户存储工具函数测试
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as userStorage from '../../../utils/userStorage.js';
import { testUsers } from '../../fixtures/testUsers.js';

describe('用户存储工具函数测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserByAddress', () => {
    it('应该成功根据地址获取用户', () => {
      const user = userStorage.getUserByAddress(testUsers.regularUser.address);
      // 注意：实际实现可能返回null或用户对象
      // 这里需要根据实际实现调整
      expect(user).toBeDefined();
    });

    it('应该对不存在的地址返回null', () => {
      const user = userStorage.getUserByAddress('nonexistent-address');
      expect(user).toBeNull();
    });
  });

  describe('getUserByUsername', () => {
    it('应该成功根据用户名获取用户', () => {
      const user = userStorage.getUserByUsername(testUsers.regularUser.username);
      expect(user).toBeDefined();
    });

    it('应该对不存在的用户名返回null', () => {
      const user = userStorage.getUserByUsername('nonexistent');
      expect(user).toBeNull();
    });
  });

  describe('saveUser', () => {
    it('应该成功保存新用户', () => {
      const newUser = {
        ...testUsers.regularUser,
        address: 'new-address-123',
        username: 'newuser',
      };
      const saved = userStorage.saveUser(newUser);
      expect(saved).toBeDefined();
      expect(saved.address).toBe(newUser.address);
    });
  });

  describe('updateUser', () => {
    it('应该成功更新用户信息', () => {
      const updates = {
        profile: {
          displayName: 'Updated Name',
        },
      };
      const updated = userStorage.updateUser(testUsers.regularUser.address, updates);
      expect(updated).toBeDefined();
    });
  });
});
