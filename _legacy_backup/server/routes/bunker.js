import express from 'express';
import { getOmegaData } from '../utils/homepageStorage.js';
import { getApprovedAssets, getAllAssets } from '../utils/storage.js';
import { getAllUsers } from '../utils/userStorage.js';
import { getLocationCoefficient } from '../utils/locationCoefficient.js';
import { getTargetTime } from '../utils/timeManager.js';

const router = express.Router();

/**
 * 计算风险等级和风险分数
 * 基于风险溢价、最近事件和倒计时剩余时间
 */
const calculateRiskLevel = (riskPremium, recentEvents, etuTargetTime) => {
  // 风险分数：0-100
  // 基础分数：风险溢价 / 2（假设风险溢价范围是 0-200）
  let riskScore = Math.min(100, (riskPremium / 2) || 50);
  
  // 根据最近事件调整
  const highImpactEvents = recentEvents?.filter(e => 
    e.impact && (e.impact.includes('+') || e.impact.includes('-'))
  ) || [];
  
  if (highImpactEvents.length > 0) {
    riskScore += highImpactEvents.length * 5; // 每个高影响事件 +5
  }
  
    // ========== 倒计时危机感计算（主要来源）==========
    // 倒计时越接近，危机感越强，风险越高
    let countdownCrisisScore = 0;
    let daysRemaining = 0;
    
    if (etuTargetTime) {
      const now = Date.now();
      const timeRemaining = Math.max(etuTargetTime - now, 0); // 剩余时间（毫秒）
      daysRemaining = timeRemaining / (1000 * 60 * 60 * 24); // 剩余天数
      
      // 危机感分数：0-100（倒计时越接近，分数越高）
      if (daysRemaining <= 0) {
        // 倒计时已到，极度危险
        countdownCrisisScore = 100;
      } else if (daysRemaining <= 7) {
        // 7天内：极度危险
        countdownCrisisScore = 100 - (daysRemaining * 10); // 30-100分
      } else if (daysRemaining <= 30) {
        // 30天内：高度危险
        countdownCrisisScore = 50 + ((30 - daysRemaining) * 2); // 50-96分
      } else if (daysRemaining <= 90) {
        // 90天内：中等危险
        countdownCrisisScore = 30 + ((90 - daysRemaining) * 0.3); // 30-48分
      } else if (daysRemaining <= 365) {
        // 365天内：轻微危险
        countdownCrisisScore = 20 + ((365 - daysRemaining) * 0.03); // 20-30分
      } else {
        // 1年以上：基本安全
        countdownCrisisScore = Math.max(10, 20 - ((daysRemaining - 365) * 0.01)); // 10-20分
      }
      
      countdownCrisisScore = Math.min(100, Math.max(0, countdownCrisisScore));
      
      // 倒计时危机感占风险分数的 50%（主要来源）
      // 风险溢价和事件占 50%
      riskScore = (riskScore * 0.5) + (countdownCrisisScore * 0.5);
    }
  
  riskScore = Math.min(100, Math.max(0, riskScore));
  
  // 风险等级
  let riskLevel = 'LOW';
  if (riskScore >= 80) riskLevel = 'CRITICAL';
  else if (riskScore >= 60) riskLevel = 'HIGH';
  else if (riskScore >= 40) riskLevel = 'MEDIUM';
  
  return { 
    riskLevel, 
    riskScore,
    countdownCrisisScore: countdownCrisisScore || 0 // 返回危机感分数
  };
};

/**
 * GET /api/bunker/risk - 获取实时风险预警
 */
router.get('/risk', async (req, res) => {
  try {
    const omegaData = await getOmegaData();
    if (!omegaData) {
      return res.status(404).json({
        success: false,
        error: 'Omega data not found'
      });
    }
    
    const { riskPremium, events, etuTargetTime } = omegaData;
    const recentEvents = events?.slice(0, 5) || []; // 最近5个事件
    
    // 获取倒计时目标时间（优先使用 omegaData，否则从 timeManager 获取）
    const targetTime = etuTargetTime || getTargetTime();
    
    // 计算剩余时间
    const now = Date.now();
    const timeRemaining = Math.max(0, targetTime - now);
    const daysRemaining = timeRemaining / (1000 * 60 * 60 * 24);
    const hoursRemaining = (timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60);
    const minutesRemaining = (timeRemaining % (1000 * 60 * 60)) / (1000 * 60);
    
    const { riskLevel, riskScore, countdownCrisisScore } = calculateRiskLevel(riskPremium, recentEvents, targetTime);
    
    // 格式化最近事件
    const formattedEvents = recentEvents.map(event => ({
      id: event.id,
      type: event.impact?.includes('+') ? 'ACCELERATE' : 
            event.impact?.includes('-') ? 'DECELERATE' : 'NEUTRAL',
      description: event.text || event.title || 'Unknown event',
      impact: event.impact || 'NEUTRAL',
      timestamp: event.timestamp || Date.now()
    }));
    
    // 计算危机等级
    let crisisLevel = 'LOW';
    if (countdownCrisisScore >= 80) crisisLevel = 'CRITICAL';
    else if (countdownCrisisScore >= 60) crisisLevel = 'HIGH';
    else if (countdownCrisisScore >= 40) crisisLevel = 'MEDIUM';
    
    res.json({
      success: true,
      data: {
        riskLevel,      // LOW / MEDIUM / HIGH / CRITICAL
        riskScore,      // 0-100
        riskPremium,    // 风险溢价
        lastUpdate: new Date().toISOString(),
        events: formattedEvents,
        // 倒计时危机感信息（主要来源）
        countdown: {
          targetTime: targetTime,
          timeRemaining: timeRemaining,
          daysRemaining: Math.floor(daysRemaining),
          hoursRemaining: Math.floor(hoursRemaining),
          minutesRemaining: Math.floor(minutesRemaining),
          formatted: `${Math.floor(daysRemaining)}天 ${Math.floor(hoursRemaining)}小时 ${Math.floor(minutesRemaining)}分钟`,
          crisisScore: Math.round(countdownCrisisScore || 0), // 危机感分数 0-100
          crisisLevel: crisisLevel // 危机等级
        }
      }
    });
  } catch (error) {
    console.error('Error getting risk data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get risk data',
      message: error.message
    });
  }
});

/**
 * GET /api/bunker/stats - 获取社区统计
 */
router.get('/stats', async (req, res) => {
  try {
    // 获取所有资产
    const allAssets = getAllAssets();
    const approvedAssets = getApprovedAssets();
    
    // 获取所有用户
    const allUsers = getAllUsers();
    
    // 计算平均生存率（基于资产数量）
    // 假设每个用户平均拥有资产数量
    const totalAssets = approvedAssets.length;
    const totalUsers = allUsers.length;
    const avgAssetsPerUser = totalUsers > 0 ? totalAssets / totalUsers : 0;
    
    // 基础生存率 34% + 每个资产 15%
    const avgSurvivalRate = Math.min(100, 34 + (avgAssetsPerUser * 15));
    
    // 最近活动（模拟）
    const recentActivity = [
      {
        type: 'PURCHASE',
        user: allUsers[0]?.username || 'User_xxx',
        message: '刚刚购买了 1 个地堡',
        timestamp: Date.now() - 1000 * 60 * 30 // 30分钟前
      },
      {
        type: 'SURVIVAL_RATE',
        user: allUsers[1]?.username || 'User_yyy',
        message: '生存率提升到 85%',
        timestamp: Date.now() - 1000 * 60 * 60 // 1小时前
      },
      {
        type: 'TASK',
        user: allUsers[2]?.username || 'User_zzz',
        message: '完成了避难准备任务',
        timestamp: Date.now() - 1000 * 60 * 90 // 1.5小时前
      }
    ];
    
    res.json({
      success: true,
      data: {
        platform: {
          totalUsers: totalUsers,
          totalAssets: totalAssets,
          avgSurvivalRate: Math.round(avgSurvivalRate),
          avgSurvivalRateChange: +5, // 过去24小时变化
        },
        recentActivity: recentActivity.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Error getting bunker stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get bunker stats',
      message: error.message
    });
  }
});

/**
 * 计算避险能力（生存率）
 * @param {number} twsBalance - TWS代币余额
 * @param {Array} assets - 用户拥有的资产列表
 * @param {string} riskLevel - 风险等级
 * @param {Object} allAssets - 所有资产数据（用于获取原始城市信息）
 * @returns {Object} 避险能力详情
 */
const calculateRefugeCapacity = (twsBalance, assets, riskLevel, allAssets = { raw: [], sanitized: [] }) => {
  // 基础生存率
  const baseRate = 34;
  
  // 代币避险加成：每10,000 TWS = +1%，最高30%
  const tokenBonus = Math.min((twsBalance || 0) / 10000, 30);
  
  // 房产避险加成
  let assetBonus = 0;
  let assetDetails = [];
  
  if (assets && assets.length > 0) {
      assets.forEach(asset => {
        // 基础加成：每个房产 +15%
        let bonus = 15;
        
        // 位置加成：从原始资产数据获取城市名称
        let cityName = null;
        if (asset.internalRef) {
          const rawAsset = allAssets.raw.find(r => r.id === asset.internalRef);
          if (rawAsset && rawAsset.city) {
            cityName = rawAsset.city;
          }
        }
        
        // 如果没有原始数据，尝试从 locationTag 推断
        if (!cityName) {
          // 从 locationTag 映射回城市（兼容旧数据）
          const locationTagMap = {
            'CN-QINLING-MTN': '商洛',
            'CN-IND-HUB': '宝鸡',
            'CN-NW-SUB': '咸阳',
            'CN-NW-CAPITAL': '西安',
            'CN-INT-RES': null // 需要从其他数据获取
          };
          cityName = locationTagMap[asset.locationTag];
        }
        
        // 使用全国位置系数表获取位置系数
        const locationFactor = getLocationCoefficient(cityName || asset.city || '');
        bonus += locationFactor * 5; // 位置系数 * 5%
      
      // 面积加成
      const area = asset.specs?.area ? parseInt(asset.specs.area) : 100;
      let areaFactor = 1.0;
      if (area < 50) areaFactor = 0.5;      // 单兵舱
      else if (area < 90) areaFactor = 1.0;  // 避难所
      else if (area < 140) areaFactor = 1.5; // 地堡
      else areaFactor = 2.0;                 // 指挥所
      bonus += areaFactor * 3; // 面积系数 * 3%
      
      assetBonus += bonus;
      assetDetails.push({
        id: asset.id,
        codeName: asset.codeName,
        bonus: Math.round(bonus * 10) / 10
      });
    });
  }
  
  // 风险惩罚
  const riskPenalty = {
    'CRITICAL': -20,
    'HIGH': -10,
    'MEDIUM': 0,
    'LOW': 5
  }[riskLevel] || 0;
  
  // 组合加成：如果同时持有代币和房产，总加成提升10%
  let combinationBonus = 0;
  if (tokenBonus > 0 && assetBonus > 0) {
    combinationBonus = (tokenBonus + assetBonus) * 0.1;
  }
  
  // 计算总生存率
  const totalRate = baseRate + tokenBonus + assetBonus + combinationBonus + riskPenalty;
  const finalRate = Math.max(0, Math.min(100, totalRate));
  
  return {
    baseRate,
    tokenBonus: Math.round(tokenBonus * 10) / 10,
    assetBonus: Math.round(assetBonus * 10) / 10,
    combinationBonus: Math.round(combinationBonus * 10) / 10,
    riskPenalty,
    totalRate: Math.round(finalRate * 10) / 10,
    assetDetails
  };
};

/**
 * GET /api/bunker/refuge-capacity - 获取用户避险能力详情
 */
router.get('/refuge-capacity', async (req, res) => {
  try {
    // 获取用户信息（从token或query参数）
    const userId = req.query.userId || req.user?.address;
    
    // 获取风险等级（包含倒计时因素）
    const omegaData = await getOmegaData();
    const targetTime = omegaData?.etuTargetTime || getTargetTime();
    const { riskLevel } = calculateRiskLevel(
      omegaData?.riskPremium || 50,
      omegaData?.events || [],
      targetTime
    );
    
    // 获取用户代币余额（模拟，实际应从区块链或数据库获取）
    const twsBalance = 0; // TODO: 从数据库或区块链获取
    
    // 获取用户资产（模拟，实际应过滤用户专属资产）
    const allAssets = getAllAssets();
    const userAssets = allAssets.sanitized.filter(asset => 
      asset.status === 'AVAILABLE' || asset.status === 'RESERVED'
    ).slice(0, 10); // 模拟：显示前10个资产
    
    // 计算避险能力（传入 allAssets 以便获取原始城市数据）
    const capacity = calculateRefugeCapacity(twsBalance, userAssets, riskLevel, allAssets);
    
    res.json({
      success: true,
      data: {
        survivalRate: capacity.totalRate,
        breakdown: {
          base: capacity.baseRate,
          token: capacity.tokenBonus,
          assets: capacity.assetBonus,
          combination: capacity.combinationBonus,
          risk: capacity.riskPenalty
        },
        tokenBalance: twsBalance,
        assetCount: userAssets.length,
        assetDetails: capacity.assetDetails,
        riskLevel
      }
    });
  } catch (error) {
    console.error('Error getting refuge capacity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get refuge capacity',
      message: error.message
    });
  }
});

/**
 * GET /api/bunker/scenario/:assetId - 获取资产的真实避难场景
 */
router.get('/scenario/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    const allAssets = getAllAssets();
    
    // 查找资产
    const sanitizedAsset = allAssets.sanitized.find(a => a.id === assetId);
    const rawAsset = allAssets.raw.find(a => a.id === assetId);
    
    if (!sanitizedAsset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }
    
    // 获取城市信息
    const city = rawAsset?.city || 'Unknown';
    const locationTag = sanitizedAsset.locationTag || 'CN-INT-RES';
    
    // 城市到台湾的距离（公里）
    const distanceMap = {
      '西安': 1800,
      '咸阳': 1750,
      '宝鸡': 1700,
      '商洛': 1650,
      '汉中': 1600
    };
    const distance = distanceMap[city] || 1800;
    
    // 到达路线
    const route = {
      from: '台北',
      to: city,
      steps: [
        { location: '台北', method: '飞机/高铁', time: '1-2小时' },
        { location: '厦门/福州', method: '中转', time: '1小时' },
        { location: city, method: '高铁/汽车', time: '4-6小时' }
      ],
      totalTime: '8-10小时',
      distance: `${distance} 公里`
    };
    
    // 准备状态
    const preparation = {
      status: 'READY', // READY / PREPARING / NOT_READY
      supplies: '充足',
      facilities: '完善',
      notes: '物资充足，设施完善，可立即使用'
    };
    
    res.json({
      success: true,
      data: {
        assetId,
        location: {
          city,
          locationTag,
          description: sanitizedAsset.title || 'Unknown location'
        },
        route,
        preparation,
        coordinates: {
          // 模拟坐标（实际应该从资产数据获取）
          lat: 34.3416,
          lng: 108.9398
        }
      }
    });
  } catch (error) {
    console.error('Error getting scenario:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scenario',
      message: error.message
    });
  }
});

export default router;

