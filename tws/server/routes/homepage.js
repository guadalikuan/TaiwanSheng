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
  addAssetLog,
  addMissileLaunchRecord,
  getMissileLaunchHistory,
  getMissileLaunchStats
} from '../utils/homepageStorage.js';
import { getBotUserStats } from '../utils/botUserManager.js';
import { homepageRateLimiter } from '../middleware/security.js';
import { visitLogger } from '../middleware/visitLogger.js';
import { getVisitLogs, getVisitStats } from '../utils/visitLogger.js';

const router = express.Router();

// 为所有首页路由应用专用的速率限制器
router.use(homepageRateLimiter);

// 为所有首页路由应用访问记录中间件
router.use(visitLogger({
  routes: ['/api/homepage/omega', '/api/homepage/market', '/api/homepage/map', '/api/homepage/assets']
}));

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

// POST /api/homepage/omega/event - 添加Omega事件（用于模拟）
router.post('/omega/event', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Event text is required'
      });
    }
    const event = await addOmegaEvent(text);
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
router.post('/market/trade', async (req, res) => {
  try {
    const { price, amount, type, time } = req.body;
    if (!price || !amount || !type) {
      return res.status(400).json({
        success: false,
        error: 'Price, amount, and type are required'
      });
    }
    const trade = await addMarketTrade({
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
router.post('/map/node', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    const log = await addTaiwanLog(message);
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

// POST /api/homepage/map/asset - 添加资产确认
router.post('/map/asset', async (req, res) => {
  try {
    const { lot, location, value } = req.body;
    if (!location || (!location.lat && !location.lng)) {
      return res.status(400).json({
        success: false,
        error: 'Location with lat and lng are required'
      });
    }
    // 支持新的完整日志对象格式
    const logData = {
      lot: lot || `LOT-${Date.now()}`,
      location: location,
      value: value,
      timestamp: Date.now()
    };
    const log = await addAssetLog(logData);
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
    // 获取资产类型参数
    const assetType = req.query.type || '房产';
    
    // 获取已审核资产和所有资产（用于匹配原始数据）
    const { getApprovedAssets, getAllAssets, getAssetsByStatus, getAssetsByType } = await import('../utils/storage.js');
    
    // 根据类型获取资产
    let availableAssets = [];
    if (assetType === '房产') {
      // 房产使用原有逻辑
      availableAssets = await getApprovedAssets();
      if (availableAssets.length < 10) {
        const mintingAssets = await getAssetsByStatus('MINTING');
        availableAssets = [...availableAssets, ...mintingAssets.slice(0, 10 - availableAssets.length)];
      }
    } else if (assetType === '科创') {
      // 科创类型从techProjects获取
      const { getAll, NAMESPACES } = await import('../utils/rocksdb.js');
      const techProjects = await getAll(NAMESPACES.TECH_PROJECTS);
      availableAssets = techProjects
        .map(p => p.value)
        .filter(p => p.status === 'FUNDING' || p.status === 'FUNDED')
        .map(project => ({
          id: project.id,
          codeName: project.codeName,
          title: project.projectName,
          assetType: '科创',
          price: project.targetAmount,
          yield: project.yield || '15%',
          status: project.status === 'FUNDING' ? 'AVAILABLE' : 'RESERVED',
          location: project.location || '科技园区',
          tokenPrice: project.targetAmount,
          financials: {
            totalTokens: project.targetAmount,
            yield: project.yield || '15% APY'
          },
          isPinned: project.isPinned || false,
          priority: project.priority !== undefined ? project.priority : 999
        }))
        .sort((a, b) => {
          // 置顶项目优先（isPinned = true）
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          // 如果都是置顶或都不是置顶，按 priority 排序（数字越小越靠前）
          if (a.isPinned && b.isPinned) {
            return (a.priority || 999) - (b.priority || 999);
          }
          // 非置顶项目按创建时间倒序（最新的在前）
          return 0; // 保持原有顺序
        });
    } else {
      // 其他类型从getAssetsByType获取
      availableAssets = await getAssetsByType(assetType);
    }
    
    // 获取所有资产数据以匹配原始数据（仅用于房产类型）
    const allAssets = assetType === '房产' ? await getAllAssets() : { raw: [], sanitized: [] };
    
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
        assets: formattedAssets,
        type: assetType
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

// GET /api/homepage/assets/all - 获取所有资产（支持搜索、筛选、排序、分页）
router.get('/assets/all', async (req, res) => {
  try {
    const {
      type,           // 资产类型
      status,          // 状态筛选
      minPrice,        // 最低价格
      maxPrice,        // 最高价格
      minYield,        // 最低收益率
      city,            // 城市筛选
      search,          // 搜索关键词（名称/代号）
      sort = 'time',   // 排序：price_asc, price_desc, yield_asc, yield_desc, time
      page = 1,        // 页码
      limit = 20       // 每页数量
    } = req.query;

    const { getApprovedAssets, getAllAssets, getAssetsByStatus, getAssetsByType } = await import('../utils/storage.js');
    const { getAll, NAMESPACES } = await import('../utils/rocksdb.js');

    // 获取所有资产
    let allAssets = [];

    // 根据类型获取资产
    if (type && type !== '全部') {
      if (type === '房产') {
        allAssets = await getApprovedAssets();
        const mintingAssets = await getAssetsByStatus('MINTING');
        allAssets = [...allAssets, ...mintingAssets];
      } else if (type === '科创') {
        const techProjects = await getAll(NAMESPACES.TECH_PROJECTS);
        allAssets = techProjects
          .map(p => p.value)
          .filter(p => p.status === 'FUNDING' || p.status === 'FUNDED')
          .map(project => ({
            id: project.id,
            codeName: project.codeName,
            title: project.projectName,
            assetType: '科创',
            price: project.targetAmount,
            yield: project.yield || '15%',
            status: project.status === 'FUNDING' ? 'AVAILABLE' : 'RESERVED',
            location: project.location || '科技园区',
            city: project.location || '科技园区',
            tokenPrice: project.targetAmount,
            financials: {
              totalTokens: project.targetAmount,
              yield: project.yield || '15% APY'
            }
          }));
      } else {
        allAssets = await getAssetsByType(type);
      }
    } else {
      // 获取所有类型的资产
      const propertyAssets = await getApprovedAssets();
      const mintingAssets = await getAssetsByStatus('MINTING');
      const techProjects = await getAll(NAMESPACES.TECH_PROJECTS);
      const techAssets = techProjects
        .map(p => p.value)
        .filter(p => p.status === 'FUNDING' || p.status === 'FUNDED')
        .map(project => ({
          id: project.id,
          codeName: project.codeName,
          title: project.projectName,
          assetType: '科创',
          price: project.targetAmount,
          yield: project.yield || '15%',
          status: project.status === 'FUNDING' ? 'AVAILABLE' : 'RESERVED',
          location: project.location || '科技园区',
          city: project.location || '科技园区',
          tokenPrice: project.targetAmount,
          financials: {
            totalTokens: project.targetAmount,
            yield: project.yield || '15% APY'
          }
        }));

      // 获取其他类型的资产
      const otherTypes = ['农田', '酒水', '文创', '矿产', '仓库', '航船', '芯片'];
      const otherAssets = [];
      for (const assetType of otherTypes) {
        const assets = await getAssetsByType(assetType);
        otherAssets.push(...assets);
      }

      allAssets = [...propertyAssets, ...mintingAssets, ...techAssets, ...otherAssets];
    }

    // 获取所有资产数据以匹配原始数据
    const allAssetsData = await getAllAssets();

    // 转换为统一格式
    let formattedAssets = allAssets.map((asset, index) => {
      const sanitized = asset;
      
      // 尝试从原始数据中获取城市信息
      let cityName = 'UNKNOWN';
      if (sanitized.internalRef) {
        const rawAsset = allAssetsData.raw.find(r => r.id === sanitized.internalRef);
        if (rawAsset && rawAsset.city) {
          cityName = rawAsset.city;
        }
      }
      
      if (cityName === 'UNKNOWN' && sanitized.locationTag) {
        const locationMap = {
          'CN-NW-CAPITAL': '西安',
          'CN-NW-SUB': '咸阳',
          'CN-IND-HUB': '宝鸡',
          'CN-QINLING-MTN': '商洛',
          'CN-INT-RES': '汉中'
        };
        cityName = locationMap[sanitized.locationTag] || sanitized.locationTag;
      }

      if (cityName === 'UNKNOWN' && sanitized.city) {
        cityName = sanitized.city;
      }

      // 从yield字符串中提取百分比数字
      let yieldPercent = 10;
      if (sanitized.financials && sanitized.financials.yield) {
        const yieldMatch = sanitized.financials.yield.match(/(\d+\.?\d*)%/);
        if (yieldMatch) {
          yieldPercent = parseFloat(yieldMatch[1]);
        }
      }

      // 计算价格
      const price = sanitized.tokenPrice || (sanitized.financials && sanitized.financials.totalTokens) || sanitized.price || 0;
      const numericPrice = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.]/g, '')) : price;

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
        city: cityName,
        title: sanitized.codeName || sanitized.title || 'Unknown Asset',
        type: sanitized.zoneClass || sanitized.specs?.type || sanitized.assetType || 'Residential',
        assetType: sanitized.assetType || '房产',
        price: numericPrice,
        priceDisplay: `${numericPrice.toLocaleString()} USDT`,
        yield: yieldPercent,
        yieldDisplay: `${yieldPercent.toFixed(0)}%`,
        status: sanitized.status === 'AVAILABLE' ? 'AVAILABLE' : (sanitized.status === 'MINTING' ? 'MINTING' : (sanitized.status === 'RESERVED' ? 'RESERVED' : 'LOCKED')),
        risk: risk,
        createdAt: sanitized.createdAt || sanitized.mintedAt || Date.now()
      };
    });

    // 应用筛选
    if (status) {
      formattedAssets = formattedAssets.filter(a => a.status === status);
    }

    if (city) {
      formattedAssets = formattedAssets.filter(a => a.city && a.city.includes(city));
    }

    if (minPrice) {
      const min = parseFloat(minPrice);
      formattedAssets = formattedAssets.filter(a => a.price >= min);
    }

    if (maxPrice) {
      const max = parseFloat(maxPrice);
      formattedAssets = formattedAssets.filter(a => a.price <= max);
    }

    if (minYield) {
      const min = parseFloat(minYield);
      formattedAssets = formattedAssets.filter(a => a.yield >= min);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      formattedAssets = formattedAssets.filter(a => 
        a.title.toLowerCase().includes(searchLower) ||
        a.city.toLowerCase().includes(searchLower) ||
        (a.id && a.id.toLowerCase().includes(searchLower))
      );
    }

    // 应用排序
    switch (sort) {
      case 'price_asc':
        formattedAssets.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        formattedAssets.sort((a, b) => b.price - a.price);
        break;
      case 'yield_asc':
        formattedAssets.sort((a, b) => a.yield - b.yield);
        break;
      case 'yield_desc':
        formattedAssets.sort((a, b) => b.yield - a.yield);
        break;
      case 'time':
      default:
        formattedAssets.sort((a, b) => b.createdAt - a.createdAt);
        break;
    }

    // 分页
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const total = formattedAssets.length;
    const totalPages = Math.ceil(total / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedAssets = formattedAssets.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        assets: paginatedAssets,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages
        },
        filters: {
          type: type || '全部',
          status,
          minPrice,
          maxPrice,
          minYield,
          city,
          search,
          sort
        }
      }
    });
  } catch (error) {
    console.error('Error getting all assets:', error);
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
    const market = await getMarketData();
    const map = await getMapData();
    
    // 获取资产数据（使用与/assets相同的逻辑）
    const { getApprovedAssets, getAllAssets, getAssetsByStatus } = await import('../utils/storage.js');
    
    // 获取AVAILABLE状态的资产，如果不够则也包含MINTING状态的资产
    let availableAssets = await getApprovedAssets();
    if (availableAssets.length < 10) {
      const mintingAssets = await getAssetsByStatus('MINTING');
      availableAssets = [...availableAssets, ...mintingAssets.slice(0, 10 - availableAssets.length)];
    }
    
    // 获取所有资产数据以匹配原始数据
    const allAssets = await getAllAssets();
    
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

// GET /api/homepage/visit-logs - 获取访问记录
router.get('/visit-logs', async (req, res) => {
  try {
    const { route, ip, userId, startDate, endDate, country, limit } = req.query;
    const filters = {};
    if (route) filters.route = route;
    if (ip) filters.ip = ip;
    if (userId) filters.userId = userId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (country) filters.country = country;
    
    const logs = await getVisitLogs(filters, limit ? parseInt(limit) : 100);
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error getting visit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get visit logs',
      message: error.message
    });
  }
});

// GET /api/homepage/visit-stats - 获取访问统计
router.get('/visit-stats', async (req, res) => {
  try {
    const { startDate, endDate, route } = req.query;
    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (route) filters.route = route;
    
    const stats = await getVisitStats(filters);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting visit stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get visit stats',
      message: error.message
    });
  }
});

// 计算两点间距离（大圆距离公式，单位：公里）
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // 地球半径（公里）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// POST /api/homepage/map/missile-launch - 记录导弹发射
router.post('/map/missile-launch', async (req, res) => {
  try {
    const { missileId, missileName, launchSite, target, walletAddress } = req.body;
    
    if (!missileId || !target || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: missileId, target, walletAddress'
      });
    }

    // 计算飞行时间（简化：假设速度800km/h）
    const distance = target.distance || calculateDistance(
      launchSite.lat, launchSite.lng,
      target.lat, target.lng
    );
    const flightTime = Math.round((distance / 800) * 3600); // 秒

    // 保存发射记录
    const launchRecord = {
      id: `launch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      missileId,
      missileName,
      launchSite,
      target: {
        ...target,
        city: 'Unknown' // 可以根据坐标获取城市名
      },
      distance,
      flightTime,
      status: 'success',
      walletAddress
    };

    // 保存到存储
    await addMissileLaunchRecord(launchRecord);

    // SSE推送更新
    const { pushUpdate } = await import('../utils/sseManager.js');
    pushUpdate('map', {
      type: 'missileLaunch',
      data: launchRecord
    });

    res.json({
      success: true,
      data: launchRecord
    });
  } catch (error) {
    console.error('Error recording missile launch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record launch',
      message: error.message
    });
  }
});

// GET /api/homepage/map/missile-launch-history - 获取导弹发射历史
router.get('/map/missile-launch-history', async (req, res) => {
  try {
    const { walletAddress, limit = 20, missileId } = req.query;
    const history = await getMissileLaunchHistory({ walletAddress, limit, missileId });
    const stats = await getMissileLaunchStats(walletAddress);
    
    res.json({
      success: true,
      data: {
        history,
        stats
      }
    });
  } catch (error) {
    console.error('Error getting launch history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get history',
      message: error.message
    });
  }
});

export default router;

