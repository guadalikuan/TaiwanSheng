/**
 * 市场数据 API 路由
 * 提供价格、K线、统计等市场数据接口
 */

import express from 'express';
import {
  getLatestPrice,
  getMarketStats,
  getKlineFromCache,
  updatePriceFromJupiter,
  incrementalUpdate
} from '../utils/marketDataService.js';

const router = express.Router();

/**
 * 获取实时价格
 * GET /api/market/price
 */
router.get('/price', async (req, res) => {
  try {
    const priceData = await getLatestPrice();
    
    if (!priceData) {
      return res.status(503).json({
        success: false,
        error: 'Price data unavailable'
      });
    }

    res.json({
      success: true,
      data: priceData
    });
  } catch (error) {
    console.error('[Market API] 获取价格失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch price',
      message: error.message
    });
  }
});

/**
 * 获取 K 线数据
 * GET /api/market/kline?interval=1H&from=xxx&to=xxx
 */
router.get('/kline', async (req, res) => {
  try {
    const { interval = '1H', from, to } = req.query;

    // 验证时间间隔
    const validIntervals = ['1m', '5m', '15m', '1H', '4H', '1D'];
    if (!validIntervals.includes(interval)) {
      return res.status(400).json({
        success: false,
        error: `Invalid interval. Must be one of: ${validIntervals.join(', ')}`
      });
    }

    // 解析时间范围
    const timeFrom = from ? parseInt(from) : Date.now() - 7 * 24 * 3600 * 1000; // 默认7天
    const timeTo = to ? parseInt(to) : Date.now();

    // 从缓存获取 K 线数据
    const klineData = await getKlineFromCache(interval, timeFrom, timeTo);

    res.json({
      success: true,
      data: {
        interval,
        klineData,
        timeFrom,
        timeTo,
        count: klineData.length
      }
    });
  } catch (error) {
    console.error('[Market API] 获取K线数据失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch kline data',
      message: error.message
    });
  }
});

/**
 * 获取市场统计信息
 * GET /api/market/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getMarketStats();

    if (!stats) {
      return res.status(503).json({
        success: false,
        error: 'Market stats unavailable'
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[Market API] 获取市场统计失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market stats',
      message: error.message
    });
  }
});

/**
 * 手动触发数据同步
 * GET /api/market/sync
 * 注意：应该添加管理员认证
 */
router.get('/sync', async (req, res) => {
  try {
    // 触发价格更新
    await updatePriceFromJupiter();
    
    // 触发增量更新
    await incrementalUpdate();

    res.json({
      success: true,
      message: 'Market data sync triggered',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('[Market API] 数据同步失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync market data',
      message: error.message
    });
  }
});

export default router;

