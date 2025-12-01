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

const router = express.Router();

// GET /api/homepage/omega - 获取Omega屏数据
router.get('/omega', (req, res) => {
  try {
    const data = getOmegaData();
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
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Market data not found'
      });
    }
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error getting market data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get market data',
      message: error.message
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
router.get('/map', (req, res) => {
  try {
    const data = getMapData();
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
    // 复用现有的 getApprovedAssets
    const { getApprovedAssets } = await import('../utils/storage.js');
    const assets = getApprovedAssets();
    
    // 转换为首页需要的格式
    const formattedAssets = assets.slice(0, 20).map((asset, index) => {
      const sanitized = asset.sanitized || asset;
      return {
        id: asset.id || index + 1,
        city: sanitized.city || 'UNKNOWN',
        title: sanitized.projectName || 'Unknown Project',
        type: sanitized.assetType || 'Residential',
        price: `${(sanitized.debtAmount || 0).toLocaleString()} USDT`,
        yield: `${(sanitized.estimatedYield || 10).toFixed(0)}%`,
        status: asset.status === 'approved' ? 'AVAILABLE' : 'RESERVED',
        risk: sanitized.riskLevel || 'MED'
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
    const omega = getOmegaData();
    const market = getMarketData();
    const map = getMapData();
    
    // 获取资产数据
    const { getApprovedAssets } = await import('../utils/storage.js');
    const assets = getApprovedAssets();
    const formattedAssets = assets.slice(0, 20).map((asset, index) => {
      const sanitized = asset.sanitized || asset;
      return {
        id: asset.id || index + 1,
        city: sanitized.city || 'UNKNOWN',
        title: sanitized.projectName || 'Unknown Project',
        type: sanitized.assetType || 'Residential',
        price: `${(sanitized.debtAmount || 0).toLocaleString()} USDT`,
        yield: `${(sanitized.estimatedYield || 10).toFixed(0)}%`,
        status: asset.status === 'approved' ? 'AVAILABLE' : 'RESERVED',
        risk: sanitized.riskLevel || 'MED'
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

export default router;

