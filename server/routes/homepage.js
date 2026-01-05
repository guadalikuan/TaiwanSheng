import express from 'express';
import {
  getOmegaData,
  updateOmegaData,
  addOmegaEvent,
  getMarketData,
  updateMarketData,
  addKlinePoint,
  addMarketTrade,
  updateOrderBook,
  getMapData,
  updateMapData,
  addTaiwanLog,
  addAssetLog
} from '../utils/homepageStorage.js';
import { getBotUserStats } from '../utils/botUserManager.js';
import { homepageRateLimiter } from '../middleware/security.js';

const router = express.Router();

// 为所有首页路由应用专用的速率限制器
router.use(homepageRateLimiter);

// GET /api/homepage/omega - 获取Omega屏数据
router.get('/omega', async (req, res) => {
  try {
    const data = await getOmegaData();
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Omega data not found'
      });
    }
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error getting omega data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get omega data',
      message: error.message
    });
  }
});

// GET /api/homepage/countdown - 专为 LINE 小程序提供的倒计时接口
router.get('/countdown', async (req, res) => {
  try {
    // 复用 Omega 数据获取逻辑，确保时间源统一
    const data = await getOmegaData();
    
    // 构造符合 line-countdown-app 期望的响应格式
    const responseData = {
      title: "TWS 统一倒计时", // 或 "重大事项倒计时"
      // data.etuTargetTime 是时间戳 (number)
      // 前端 new Date(timestamp) 支持数字
      targetDate: data.etuTargetTime || (Date.now() + 1000 * 60 * 60 * 24 * 600)
    };

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error getting countdown data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get countdown data',
      message: error.message
    });
  }
});

// POST /api/homepage/omega/event - 添加Omega事件（用于模拟）
router.post('/omega/event', (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Event text is required'
      });
    }
    const event = addOmegaEvent(text);
    if (event) {
      res.json({
        success: true,
        event
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to add event'
      });
    }
  } catch (error) {
    console.error('Error adding omega event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add event',
      message: error.message
    });
  }
});

// GET /api/homepage/market - 获取Market屏数据
router.get('/market', (req, res) => {
  try {
    const data = getMarketData();
    
    // 确保返回有效的市场数据（即使数据为空也返回默认结构）
    const marketData = data || {
      currentPrice: 142.85,
      priceChange24h: 12.4,
      volume24h: 4291002911,
      marketIndex: 'STRONG BUY',
      klineData: [],
      orderBook: {
        asks: [],
        bids: []
      },
      recentTrades: []
    };
    
    // 确保所有必需字段都存在
    if (!marketData.klineData) marketData.klineData = [];
    if (!marketData.orderBook) {
      marketData.orderBook = { asks: [], bids: [] };
    }
    if (!marketData.recentTrades) marketData.recentTrades = [];
    if (marketData.currentPrice === undefined) marketData.currentPrice = 142.85;
    if (marketData.priceChange24h === undefined) marketData.priceChange24h = 12.4;
    if (marketData.volume24h === undefined) marketData.volume24h = 4291002911;
    if (!marketData.marketIndex) marketData.marketIndex = 'STRONG BUY';
    
    res.json({
      success: true,
      data: marketData
    });
  } catch (error) {
    console.error('Error getting market data:', error);
    // 即使出错也返回默认数据，而不是错误响应
    res.json({
      success: true,
      data: {
        currentPrice: 142.85,
        priceChange24h: 12.4,
        volume24h: 4291002911,
        marketIndex: 'STRONG BUY',
        klineData: [],
        orderBook: {
          asks: [],
          bids: []
        },
        recentTrades: []
      }
    });
  }
});

// POST /api/homepage/market/trade - 添加交易记录（用于模拟）
router.post('/market/trade', (req, res) => {
  try {
    const { price, amount, type, time } = req.body;
    if (!price || !amount || !type) {
      return res.status(400).json({
        success: false,
        error: 'Price, amount, and type are required'
      });
    }
    const trade = addMarketTrade({
      price: String(price),
      amount: String(amount),
      type,
      time: time || new Date().toLocaleTimeString()
    });
    if (trade) {
      res.json({
        success: true,
        trade
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to add trade'
      });
    }
  } catch (error) {
    console.error('Error adding market trade:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add trade',
      message: error.message
    });
  }
});

// GET /api/homepage/map - 获取Map屏数据
router.get('/map', async (req, res) => {
  try {
    const data = await getMapData();
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Map data not found'
      });
    }
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error getting map data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get map data',
      message: error.message
    });
  }
});

// POST /api/homepage/map/node - 添加台湾节点连接（用于模拟）
router.post('/map/node', (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    const log = addTaiwanLog(message);
    if (log) {
      res.json({
        success: true,
        log
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to add node log'
      });
    }
  } catch (error) {
    console.error('Error adding map node:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add node log',
      message: error.message
    });
  }
});

// POST /api/homepage/map/asset - 添加资产确认（用于模拟）
router.post('/map/asset', (req, res) => {
  try {
    const { lot, location } = req.body;
    if (!lot || !location) {
      return res.status(400).json({
        success: false,
        error: 'Lot and location are required'
      });
    }
    const log = addAssetLog(lot, location);
    if (log) {
      res.json({
        success: true,
        log
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to add asset log'
      });
    }
  } catch (error) {
    console.error('Error adding map asset:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add asset log',
      message: error.message
    });
  }
});

// GET /api/homepage/assets - 获取Assets屏数据（复用arsenal API）
router.get('/assets', async (req, res) => {
  try {
    // 获取已审核资产和所有资产（用于匹配原始数据）
    const { getApprovedAssets, getAllAssets, getAssetsByStatus } = await import('../utils/storage.js');
    
    // 获取AVAILABLE状态的资产，如果不够则也包含MINTING状态的资产
    let availableAssets = getApprovedAssets();
    if (availableAssets.length < 10) {
      const mintingAssets = getAssetsByStatus('MINTING');
      availableAssets = [...availableAssets, ...mintingAssets.slice(0, 10 - availableAssets.length)];
    }
    
    // 获取所有资产数据以匹配原始数据
    const allAssets = getAllAssets();
    
    // 转换为首页需要的格式
    const formattedAssets = availableAssets.slice(0, 20).map((asset, index) => {
      // asset已经是脱敏资产对象
      const sanitized = asset;
      
      // 尝试从原始数据中获取城市信息
      let city = 'UNKNOWN';
      if (sanitized.internalRef) {
        const rawAsset = allAssets.raw.find(r => r.id === sanitized.internalRef);
        if (rawAsset && rawAsset.city) {
          city = rawAsset.city;
        }
      }
      
      // 如果还是没有城市，尝试从locationTag中提取
      if (city === 'UNKNOWN' && sanitized.locationTag) {
        const locationMap = {
          'CN-NW-CAPITAL': '西安',
          'CN-NW-SUB': '咸阳',
          'CN-IND-HUB': '宝鸡',
          'CN-QINLING-MTN': '商洛',
          'CN-INT-RES': '汉中'
        };
        city = locationMap[sanitized.locationTag] || sanitized.locationTag;
      }
      
      // 从yield字符串中提取百分比数字
      let yieldPercent = 10;
      if (sanitized.financials && sanitized.financials.yield) {
        const yieldMatch = sanitized.financials.yield.match(/(\d+\.?\d*)%/);
        if (yieldMatch) {
          yieldPercent = parseFloat(yieldMatch[1]);
        }
      }
      
      // 计算价格（使用tokenPrice或totalTokens）
      const price = sanitized.tokenPrice || (sanitized.financials && sanitized.financials.totalTokens) || 0;
      
      // 从securityLevel转换为risk等级
      const riskMap = {
        5: 'LOW',
        4: 'LOW',
        3: 'MED',
        2: 'HIGH',
        1: 'HIGH'
      };
      const risk = riskMap[sanitized.securityLevel] || 'MED';
      
      return {
        id: sanitized.id || `asset_${index + 1}`,
        city: city,
        title: sanitized.codeName || sanitized.title || 'Unknown Asset',
        type: sanitized.zoneClass || sanitized.specs?.type || 'Residential',
        price: `${price.toLocaleString()} USDT`,
        yield: `${yieldPercent.toFixed(0)}%`,
        status: sanitized.status === 'AVAILABLE' ? 'AVAILABLE' : (sanitized.status === 'MINTING' ? 'MINTING' : 'RESERVED'),
        risk: risk
      };
    });
    
    res.json({
      success: true,
      data: {
        assets: formattedAssets
      }
    });
  } catch (error) {
    console.error('Error getting homepage assets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get assets',
      message: error.message
    });
  }
});

// GET /api/homepage/all - 一次性获取所有屏数据（可选优化）
router.get('/all', async (req, res) => {
  try {
    const omega = await getOmegaData();
    const market = getMarketData();
    const map = await getMapData();
    
    // 获取资产数据（使用与/assets相同的逻辑）
    const { getApprovedAssets, getAllAssets, getAssetsByStatus } = await import('../utils/storage.js');
    
    // 获取AVAILABLE状态的资产，如果不够则也包含MINTING状态的资产
    let availableAssets = getApprovedAssets();
    if (availableAssets.length < 10) {
      const mintingAssets = getAssetsByStatus('MINTING');
      availableAssets = [...availableAssets, ...mintingAssets.slice(0, 10 - availableAssets.length)];
    }
    
    // 获取所有资产数据以匹配原始数据
    const allAssets = getAllAssets();
    
    // 转换为首页需要的格式（使用与/assets相同的格式化逻辑）
    const formattedAssets = availableAssets.slice(0, 20).map((asset, index) => {
      const sanitized = asset;
      
      // 尝试从原始数据中获取城市信息
      let city = 'UNKNOWN';
      if (sanitized.internalRef) {
        const rawAsset = allAssets.raw.find(r => r.id === sanitized.internalRef);
        if (rawAsset && rawAsset.city) {
          city = rawAsset.city;
        }
      }
      
      // 如果还是没有城市，尝试从locationTag中提取
      if (city === 'UNKNOWN' && sanitized.locationTag) {
        const locationMap = {
          'CN-NW-CAPITAL': '西安',
          'CN-NW-SUB': '咸阳',
          'CN-IND-HUB': '宝鸡',
          'CN-QINLING-MTN': '商洛',
          'CN-INT-RES': '汉中'
        };
        city = locationMap[sanitized.locationTag] || sanitized.locationTag;
      }
      
      // 从yield字符串中提取百分比数字
      let yieldPercent = 10;
      if (sanitized.financials && sanitized.financials.yield) {
        const yieldMatch = sanitized.financials.yield.match(/(\d+\.?\d*)%/);
        if (yieldMatch) {
          yieldPercent = parseFloat(yieldMatch[1]);
        }
      }
      
      // 计算价格（使用tokenPrice或totalTokens）
      const price = sanitized.tokenPrice || (sanitized.financials && sanitized.financials.totalTokens) || 0;
      
      // 从securityLevel转换为risk等级
      const riskMap = {
        5: 'LOW',
        4: 'LOW',
        3: 'MED',
        2: 'HIGH',
        1: 'HIGH'
      };
      const risk = riskMap[sanitized.securityLevel] || 'MED';
      
      return {
        id: sanitized.id || `asset_${index + 1}`,
        city: city,
        title: sanitized.codeName || sanitized.title || 'Unknown Asset',
        type: sanitized.zoneClass || sanitized.specs?.type || 'Residential',
        price: `${price.toLocaleString()} USDT`,
        yield: `${yieldPercent.toFixed(0)}%`,
        status: sanitized.status === 'AVAILABLE' ? 'AVAILABLE' : (sanitized.status === 'MINTING' ? 'MINTING' : 'RESERVED'),
        risk: risk
      };
    });
    
    res.json({
      success: true,
      data: {
        omega,
        market,
        map,
        assets: {
          assets: formattedAssets
        }
      }
    });
  } catch (error) {
    console.error('Error getting all homepage data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get homepage data',
      message: error.message
    });
  }
});

// GET /api/homepage/stats - 获取首页统计信息（在线用户数等）
router.get('/stats', (req, res) => {
  try {
    // 获取机器人用户统计
    const botStats = getBotUserStats();
    
    // 计算在线用户数（机器人用户 + 基础在线数，模拟真实用户）
    // 基础在线数可以基于系统运行时间等因素计算
    const baseOnlineUsers = 1000; // 基础在线用户数
    const onlineUsers = baseOnlineUsers + botStats.active * 50; // 每个活跃机器人代表50个在线用户
    
    res.json({
      success: true,
      data: {
        onlineUsers: onlineUsers,
        botStats: {
          total: botStats.total,
          active: botStats.active,
          byRole: botStats.byRole,
          byActivityLevel: botStats.byActivityLevel
        }
      }
    });
  } catch (error) {
    console.error('Error getting homepage stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get homepage stats',
      message: error.message
    });
  }
});

// GET /api/homepage/node/:id - 获取节点详情（基于日志数据）
router.get('/node/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const mapData = await getMapData();
    
    if (!mapData || !mapData.taiwan || !mapData.taiwan.logs) {
      return res.status(404).json({
        success: false,
        error: 'Node not found',
        message: `Node with id ${id} not found`
      });
    }
    
    // 从日志中查找节点
    const nodeLog = mapData.taiwan.logs.find(log => 
      log.nodeId === id || 
      log.id === id ||
      (log.id && log.id.toString() === id.toString())
    );
    
    if (!nodeLog) {
      return res.status(404).json({
        success: false,
        error: 'Node not found',
        message: `Node with id ${id} not found`
      });
    }
    
    // 格式化节点详情
    const nodeDetail = {
      id: nodeLog.nodeId || nodeLog.id,
      message: nodeLog.message || '',
      city: nodeLog.city || 'Unknown',
      location: nodeLog.location || {
        lat: 0,
        lng: 0
      },
      timestamp: nodeLog.timestamp || Date.now(),
      status: nodeLog.status || 'active',
      connectionType: nodeLog.connectionType || 'direct',
      userId: nodeLog.userId || null,
      username: nodeLog.username || null,
      userAddress: nodeLog.userAddress || null
    };
    
    res.json({
      success: true,
      data: nodeDetail
    });
  } catch (error) {
    console.error('Error getting node detail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get node detail',
      message: error.message
    });
  }
});

export default router;

