// 用户存储工具函数测试
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { testUsers } from '../../fixtures/testUsers.js';

const db = new Map();

jest.unstable_mockModule('../../../utils/rocksdb.js', () => {
  const getKey = (namespace, key) => `${namespace}:${key}`;

  return {
    NAMESPACES: {
      USERS: 'users',
    },
    initRocksDB: jest.fn(async () => {}),
    put: jest.fn(async (namespace, key, value) => {
      db.set(getKey(namespace, key), value);
    }),
    get: jest.fn(async (namespace, key) => {
      return db.get(getKey(namespace, key)) || null;
    }),
    getAll: jest.fn(async (namespace) => {
      const results = [];
      for (const [k, value] of db.entries()) {
        if (k.startsWith(`${namespace}:`)) {
          results.push({ key: k.slice(namespace.length + 1), value });
        }
      }
      return results;
    }),
  };
});

const userStorage = await import('../../../utils/userStorage.js');

describe('用户存储工具函数测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.clear();
  });

  describe('getUserByAddress', () => {
    it('应该成功根据地址获取用户', async () => {
      await userStorage.saveUser({
        ...testUsers.regularUser,
        address: testUsers.regularUser.address,
      });

      const user = await userStorage.getUserByAddress(testUsers.regularUser.address);
      expect(user).toBeDefined();
      expect(user.address).toBe(testUsers.regularUser.address.toLowerCase());
    });

    it('应该对不存在的地址返回null', async () => {
      const user = await userStorage.getUserByAddress('nonexistent-address');
      expect(user).toBeNull();
    });
  });

  describe('getUserByUsername', () => {
    it('应该成功根据用户名获取用户', async () => {
      await userStorage.saveUser({
        ...testUsers.regularUser,
        address: testUsers.regularUser.address,
        username: testUsers.regularUser.username,
      });

      const user = await userStorage.getUserByUsername(testUsers.regularUser.username);
      expect(user).toBeDefined();
      expect(user.username).toBe(testUsers.regularUser.username);
    });

    it('应该对不存在的用户名返回null', async () => {
      const user = await userStorage.getUserByUsername('nonexistent');
      expect(user).toBeNull();
    });
  });

  describe('saveUser', () => {
    it('应该成功保存新用户', async () => {
      const newUser = {
        ...testUsers.regularUser,
        address: 'new-address-123',
        username: 'newuser',
      };
      const saved = await userStorage.saveUser(newUser);
      expect(saved).toBeDefined();
      expect(saved.address).toBe(newUser.address.toLowerCase());
    });
  });

  describe('updateUser', () => {
    it('应该成功更新用户信息', async () => {
      await userStorage.saveUser({
        ...testUsers.regularUser,
        address: testUsers.regularUser.address,
      });

      const updates = {
        profile: {
          displayName: 'Updated Name',
        },
      };
      const updated = await userStorage.updateUser(testUsers.regularUser.address, updates);
      expect(updated).toBeDefined();
      expect(updated.profile.displayName).toBe('Updated Name');
    });
  });
});
