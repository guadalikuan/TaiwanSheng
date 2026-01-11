// LB模块路由测试 - F-LB-001-v1.0 到 F-LB-010-v1.0
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import leaderboardRoutes from '../../routes/leaderboard.js';
import * as leaderboardUtils from '../../utils/leaderboard.js';

const app = express();
app.use(express.json());
app.use('/api/leaderboard', leaderboardRoutes);

// Mock leaderboard工具函数
jest.mock('../../utils/leaderboard.js');

describe('F-LB-001-v1.0: 获取持币数排行榜', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该成功获取持币数排行榜', async () => {
    const mockLeaderboard = [
      { address: 'addr1', value: 1000000, rank: 1 },
      { address: 'addr2', value: 500000, rank: 2 },
    ];
    leaderboardUtils.getBalanceLeaderboard.mockResolvedValue(mockLeaderboard);

    const response = await request(app)
      .get('/api/leaderboard/balance')
      .query({ limit: 100, period: 'all' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.leaderboard)).toBe(true);
  });

  it('应该支持不同的时间维度', async () => {
    leaderboardUtils.getBalanceLeaderboard.mockResolvedValue([]);

    const periods = ['day', 'week', 'month', 'all'];
    for (const period of periods) {
      const response = await request(app)
        .get('/api/leaderboard/balance')
        .query({ period });

      expect(response.status).toBe(200);
      expect(response.body.period).toBe(period);
    }
  });
});

describe('F-LB-010-v1.0: 获取奖池历史数据', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该成功获取奖池历史数据', async () => {
    const mockHistory = [
      { time: Date.now(), open: 1000, high: 1100, low: 900, close: 1050 },
    ];
    leaderboardUtils.getJackpotHistory.mockResolvedValue(mockHistory);

    const response = await request(app)
      .get('/api/leaderboard/jackpot-history')
      .query({ limit: 100 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.history)).toBe(true);
  });
});

// 继续添加其他排行榜功能的测试...
