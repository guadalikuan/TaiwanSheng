// 测试用户数据
export const testUsers = {
  regularUser: {
    address: '11111111111111111111111111111111',
    username: 'testuser',
    password: 'Test123456',
    passwordHash: '$2a$10$mockHashForTesting',
    role: 'USER',
    profile: {
      displayName: 'Test User',
      avatar: '',
    },
    createdAt: Date.now(),
    lastLogin: null,
  },
  submitter: {
    address: '22222222222222222222222222222222',
    username: 'submitter',
    password: 'Test123456',
    passwordHash: '$2a$10$mockHashForTesting',
    role: 'SUBMITTER',
    profile: {
      displayName: 'Submitter',
      avatar: '',
    },
    createdAt: Date.now(),
    lastLogin: null,
  },
  reviewer: {
    address: '33333333333333333333333333333333',
    username: 'reviewer',
    password: 'Test123456',
    passwordHash: '$2a$10$mockHashForTesting',
    role: 'REVIEWER',
    profile: {
      displayName: 'Reviewer',
      avatar: '',
    },
    createdAt: Date.now(),
    lastLogin: null,
  },
  admin: {
    address: '44444444444444444444444444444444',
    username: 'admin',
    password: 'Test123456',
    passwordHash: '$2a$10$mockHashForTesting',
    role: 'ADMIN',
    profile: {
      displayName: 'Admin',
      avatar: '',
    },
    createdAt: Date.now(),
    lastLogin: null,
  },
};
