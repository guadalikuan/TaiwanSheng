// Mock工具函数
import { jest } from '@jest/globals';

/**
 * Mock Solana连接
 */
export const mockSolanaConnection = () => {
  return {
    getBalance: jest.fn().mockResolvedValue(1000000000),
    getAccountInfo: jest.fn().mockResolvedValue(null),
    getTransaction: jest.fn().mockResolvedValue(null),
    sendTransaction: jest.fn().mockResolvedValue('mock-signature'),
    confirmTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
  };
};

/**
 * Mock RocksDB
 */
export const mockRocksDB = () => {
  const db = {
    get: jest.fn(),
    put: jest.fn(),
    del: jest.fn(),
    batch: jest.fn(),
    iterator: jest.fn(),
    close: jest.fn(),
  };
  return db;
};

/**
 * Mock JWT
 */
export const mockJWT = () => {
  return {
    generateToken: jest.fn().mockReturnValue('mock-token'),
    verifyToken: jest.fn().mockReturnValue({ address: 'mock-address', role: 'USER' }),
  };
};

/**
 * Mock用户存储
 */
export const mockUserStorage = () => {
  return {
    getUserByAddress: jest.fn(),
    getUserByUsername: jest.fn(),
    saveUser: jest.fn(),
    updateUser: jest.fn(),
    getAllUsers: jest.fn().mockReturnValue([]),
  };
};

/**
 * Mock请求对象
 */
export const createMockRequest = (overrides = {}) => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ip: '127.0.0.1',
    ...overrides,
  };
};

/**
 * Mock响应对象
 */
export const createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
  };
  return res;
};

/**
 * Mock下一个中间件函数
 */
export const createMockNext = () => {
  return jest.fn();
};
