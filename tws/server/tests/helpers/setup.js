// 测试设置文件
import { jest } from '@jest/globals';

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.TWS_TREASURY_ADDRESS = '11111111111111111111111111111111';

// Mock console方法以避免测试输出干扰
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// 设置全局超时
jest.setTimeout(30000);

// 在每个测试前执行
beforeEach(() => {
  jest.clearAllMocks();
});
