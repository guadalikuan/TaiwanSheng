import express from 'express';
import { getApprovedAssets, getAssetsByStatus, getAllAssets } from '../utils/storage.js';
import { readHomepageData } from '../utils/homepageStorage.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { ROLES } from '../utils/roles.js';

const router = express.Router();

/**
 * GET /api/asset-pool/stats - 获取资产池统计信息
 */
router.get('/stats', async (req, res) => {
  try {
    // 获取所有已审核通过的资产
    const approvedAssets = await getApprovedAssets();
    
    // 获取首页数据中的资产池信息
    const homepageData = readHomepageData();
    const assetPoolData = homepageData?.map?.mainland || {};
    
    // 计算统计信息
    const totalValue = approvedAssets.reduce((sum, asset) => {
      return sum + (asset.financials?.totalTokens || asset.tokenPrice || 0);
    }, 0);
    
    // 按地区统计
    const regionStats = {};
    approvedAssets.forEach(asset => {
      const city = asset.city || asset.locationTag || 'Unknown';
      if (!regionStats[city]) {
        regionStats[city] = {
          count: 0,
          totalValue: 0
        };
      }
      regionStats[city].count++;
      regionStats[city].totalValue += (asset.financials?.totalTokens || asset.tokenPrice || 0);
    });
    
    // 按状态统计
    const statusStats = {
      AVAILABLE: approvedAssets.filter(a => a.status === 'AVAILABLE').length,
      RESERVED: approvedAssets.filter(a => a.status === 'RESERVED').length,
      LOCKED: approvedAssets.filter(a => a.status === 'LOCKED').length
    };
    
    res.json({
      success: true,
      stats: {
        totalAssets: approvedAssets.length,
        totalValue: totalValue,
        assetPoolValue: assetPoolData.assetPoolValue || 0,
        unitCount: assetPoolData.unitCount || 0,
        regionStats: regionStats,
        statusStats: statusStats,
        lastUpdated: Date.now()
      }
    });
  } catch (error) {
    console.error('Error getting asset pool stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get asset pool stats',
      message: error.message
    });
  }
});

/**
 * GET /api/asset-pool/assets - 获取资产池资产列表
 */
router.get('/assets', async (req, res) => {
  try {
    const { 
      region, 
      status, 
      minValue, 
      maxValue,
      page = 1,
      limit = 20
    } = req.query;
    
    // 获取所有已审核通过的资产
    let assets = await getApprovedAssets();
    
    // 按地区筛选
    if (region) {
      assets = assets.filter(asset => {
        const city = asset.city || asset.locationTag || '';
        return city.includes(region) || region.includes(city);
      });
    }
    
    // 按状态筛选
    if (status) {
      assets = assets.filter(asset => asset.status === status);
    }
    
    // 按价值范围筛选
    if (minValue) {
      const min = Number(minValue);
      assets = assets.filter(asset => {
        const value = asset.financials?.totalTokens || asset.tokenPrice || 0;
        return value >= min;
      });
    }
    
    if (maxValue) {
      const max = Number(maxValue);
      assets = assets.filter(asset => {
        const value = asset.financials?.totalTokens || asset.tokenPrice || 0;
        return value <= max;
      });
    }
    
    // 分页
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedAssets = assets.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      total: assets.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(assets.length / limitNum),
      assets: paginatedAssets
    });
  } catch (error) {
    console.error('Error getting asset pool assets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get asset pool assets',
      message: error.message
    });
  }
});

/**
 * GET /api/asset-pool/by-region - 按地区获取资产
 */
router.get('/by-region', async (req, res) => {
  try {
    const { region } = req.query;
    
    if (!region) {
      return res.status(400).json({
        success: false,
        error: 'Region parameter is required'
      });
    }
    
    const approvedAssets = await getApprovedAssets();
    const regionAssets = approvedAssets.filter(asset => {
      const city = asset.city || asset.locationTag || '';
      return city.includes(region) || region.includes(city);
    });
    
    res.json({
      success: true,
      region: region,
      count: regionAssets.length,
      assets: regionAssets
    });
  } catch (error) {
    console.error('Error getting assets by region:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get assets by region',
      message: error.message
    });
  }
});

/**
 * GET /api/asset-pool/health - 获取资产池健康度
 */
router.get('/health', authenticate, requireRole(ROLES.ADMIN, ROLES.REVIEWER), async (req, res) => {
  try {
    const allAssets = await getAllAssets();
    const approvedAssets = await getApprovedAssets();
    
    // 计算健康度指标
    const totalAssets = allAssets.sanitized.length;
    const approvedCount = approvedAssets.length;
    const pendingCount = allAssets.sanitized.filter(a => a.status === 'MINTING').length;
    const rejectedCount = allAssets.sanitized.filter(a => a.status === 'REJECTED').length;
    
    // 上链率
    const mintedCount = approvedAssets.filter(a => a.nftMinted).length;
    const mintRate = approvedCount > 0 ? (mintedCount / approvedCount) * 100 : 0;
    
    // 资产池利用率
    const availableCount = approvedAssets.filter(a => a.status === 'AVAILABLE').length;
    const utilizationRate = approvedCount > 0 ? (availableCount / approvedCount) * 100 : 0;
    
    // 审核通过率
    const approvalRate = totalAssets > 0 ? (approvedCount / totalAssets) * 100 : 0;
    
    res.json({
      success: true,
      health: {
        totalAssets: totalAssets,
        approvedAssets: approvedCount,
        pendingAssets: pendingCount,
        rejectedAssets: rejectedCount,
        mintedAssets: mintedCount,
        availableAssets: availableCount,
        metrics: {
          approvalRate: Math.round(approvalRate * 100) / 100,
          mintRate: Math.round(mintRate * 100) / 100,
          utilizationRate: Math.round(utilizationRate * 100) / 100
        },
        status: mintRate >= 80 && approvalRate >= 70 ? 'healthy' : 
                mintRate >= 50 && approvalRate >= 50 ? 'moderate' : 'needs_attention'
      }
    });
  } catch (error) {
    console.error('Error getting asset pool health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get asset pool health',
      message: error.message
    });
  }
});

export default router;

