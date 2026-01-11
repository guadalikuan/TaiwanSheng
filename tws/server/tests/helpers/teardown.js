// 测试清理文件
import { jest } from '@jest/globals';

// 在每个测试套件后执行清理
afterAll(async () => {
  // 清理测试数据库连接
  // 清理测试文件
  // 清理其他资源
  jest.clearAllMocks();
});
