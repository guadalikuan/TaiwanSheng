/**
 * RWA智能推荐引擎
 * 基于地理位置、价格、面积等因素推荐匹配的房源
 */

import { getApprovedAssets } from './storage.js';
import { getLocationCoefficient } from './locationCoefficient.js';

/**
 * 计算资产与购买需求的匹配度
 * @param {Object} asset - 资产对象（sanitized）
 * @param {Object} buyRequest - 购买需求
 * @returns {number} 匹配度分数 (0-100)
 */
export const calculateMatchScore = (asset, buyRequest) => {
  let score = 0;
  
  // 获取资产原始数据（需要从rawAsset获取城市和区域信息）
  const assetCity = asset.city || asset.locationTag || '';
  const assetDistrict = asset.district || '';
  const assetPrice = asset.financials?.totalTokens || asset.tokenPrice || 0;
  const assetArea = asset.area || 0;
  
  // 1. 地理位置匹配 (40%)
  const cityMatch = assetCity === buyRequest.preferredCity ? 1.0 : 
                   (assetCity.includes(buyRequest.preferredCity) || 
                    buyRequest.preferredCity.includes(assetCity)) ? 0.7 : 0.3;
  
  const districtMatch = buyRequest.preferredDistrict ? 
    (assetDistrict === buyRequest.preferredDistrict ? 1.0 : 
     (assetDistrict.includes(buyRequest.preferredDistrict) || 
      buyRequest.preferredDistrict.includes(assetDistrict)) ? 0.7 : 0.3) : 0.8;
  
  const locationScore = (cityMatch * 0.7 + districtMatch * 0.3) * 40;
  score += locationScore;
  
  // 2. 价格匹配 (30%)
  if (buyRequest.maxPrice > 0 && assetPrice > 0) {
    const priceRatio = assetPrice / buyRequest.maxPrice;
    if (priceRatio <= 1.0) {
      // 价格在预算内，越接近预算上限分数越高（性价比考虑）
      const priceScore = (1 - priceRatio * 0.5) * 30;
      score += priceScore;
    } else {
      // 超出预算，按超出比例扣分
      const overBudgetRatio = (priceRatio - 1.0);
      const priceScore = Math.max(0, 30 * (1 - overBudgetRatio * 2));
      score += priceScore;
    }
  } else {
    // 没有价格限制，给中等分数
    score += 15;
  }
  
  // 3. 面积匹配 (20%)
  if (buyRequest.minArea > 0 && buyRequest.maxArea > 0 && assetArea > 0) {
    const areaInRange = assetArea >= buyRequest.minArea && 
                        assetArea <= buyRequest.maxArea;
    if (areaInRange) {
      const idealArea = (buyRequest.minArea + buyRequest.maxArea) / 2;
      const areaDiff = Math.abs(assetArea - idealArea);
      const areaRange = buyRequest.maxArea - buyRequest.minArea;
      const areaScore = areaRange > 0 ? 
        (1 - Math.min(areaDiff / areaRange, 1)) * 20 : 20;
      score += areaScore;
    } else {
      // 面积不在范围内，按距离扣分
      const areaDiff = assetArea < buyRequest.minArea ? 
        (buyRequest.minArea - assetArea) : 
        (assetArea - buyRequest.maxArea);
      const avgArea = (buyRequest.minArea + buyRequest.maxArea) / 2;
      const areaPenalty = Math.min(areaDiff / avgArea, 1) * 20;
      score += Math.max(0, 20 - areaPenalty);
    }
  } else {
    // 没有面积限制，给中等分数
    score += 10;
  }
  
  // 4. 紧急程度加权 (10%)
  const locationCoefficient = getLocationCoefficient(assetCity);
  if (buyRequest.urgency === 'high') {
    // 高紧急度：优先推荐位置系数高的资产（更安全）
    const urgencyScore = Math.min(locationCoefficient * 5, 10);
    score += urgencyScore;
  } else if (buyRequest.urgency === 'medium') {
    score += 5;
  } else {
    // 低紧急度：推荐性价比高的（位置系数影响较小）
    score += 3;
  }
  
  return Math.min(100, Math.max(0, score));
};

/**
 * 根据购买需求推荐房源
 * @param {Object} buyRequest - 购买需求
 * @param {number} limit - 返回数量限制
 * @returns {Promise<Array>} 推荐房源列表（按匹配度排序）
 */
export const recommendAssets = async (buyRequest, limit = 10) => {
  try {
    // 获取所有已审核通过的资产
    const approvedAssets = await getApprovedAssets();
    
    // 筛选可用资产（状态为AVAILABLE且未被购买）
    const availableAssets = approvedAssets.filter(asset => {
      return asset.status === 'AVAILABLE' && 
             !asset.purchasedBy && 
             !asset.lockedBy;
    });
    
    // 计算每个资产的匹配度
    const assetsWithScore = availableAssets.map(asset => {
      const matchScore = calculateMatchScore(asset, buyRequest);
      return {
        asset,
        matchScore,
        // 添加推荐理由
        reasons: generateRecommendationReasons(asset, buyRequest, matchScore)
      };
    });
    
    // 按匹配度降序排序
    assetsWithScore.sort((a, b) => b.matchScore - a.matchScore);
    
    // 相同匹配度按价格升序（性价比优先）
    assetsWithScore.sort((a, b) => {
      if (Math.abs(b.matchScore - a.matchScore) < 0.1) {
        const priceA = a.asset.financials?.totalTokens || a.asset.tokenPrice || 0;
        const priceB = b.asset.financials?.totalTokens || b.asset.tokenPrice || 0;
        return priceA - priceB;
      }
      return 0;
    });
    
    // 返回前N个
    return assetsWithScore.slice(0, limit).map(item => ({
      ...item.asset,
      matchScore: Math.round(item.matchScore * 10) / 10,
      reasons: item.reasons
    }));
  } catch (error) {
    console.error('Error recommending assets:', error);
    return [];
  }
};

/**
 * 生成推荐理由
 * @param {Object} asset - 资产
 * @param {Object} buyRequest - 购买需求
 * @param {number} matchScore - 匹配度分数
 * @returns {Array<string>} 推荐理由列表
 */
const generateRecommendationReasons = (asset, buyRequest, matchScore) => {
  const reasons = [];
  
  const assetCity = asset.city || asset.locationTag || '';
  const assetPrice = asset.financials?.totalTokens || asset.tokenPrice || 0;
  const assetArea = asset.area || 0;
  
  // 地理位置匹配
  if (assetCity === buyRequest.preferredCity) {
    reasons.push(`精确匹配目标城市：${assetCity}`);
  } else if (assetCity.includes(buyRequest.preferredCity) || 
             buyRequest.preferredCity.includes(assetCity)) {
    reasons.push(`城市相近：${assetCity}`);
  }
  
  // 价格优势
  if (buyRequest.maxPrice > 0 && assetPrice > 0) {
    const priceRatio = assetPrice / buyRequest.maxPrice;
    if (priceRatio <= 0.8) {
      reasons.push(`价格优势：低于预算${Math.round((1 - priceRatio) * 100)}%`);
    } else if (priceRatio <= 1.0) {
      reasons.push(`价格合理：在预算范围内`);
    }
  }
  
  // 面积匹配
  if (buyRequest.minArea > 0 && buyRequest.maxArea > 0 && assetArea > 0) {
    if (assetArea >= buyRequest.minArea && assetArea <= buyRequest.maxArea) {
      reasons.push(`面积符合要求：${assetArea}㎡`);
    }
  }
  
  // 安全等级
  const locationCoefficient = getLocationCoefficient(assetCity);
  if (locationCoefficient >= 1.5) {
    reasons.push(`高安全等级：位置系数${locationCoefficient.toFixed(1)}`);
  }
  
  // 匹配度
  if (matchScore >= 80) {
    reasons.push(`高度匹配：匹配度${Math.round(matchScore)}%`);
  } else if (matchScore >= 60) {
    reasons.push(`良好匹配：匹配度${Math.round(matchScore)}%`);
  }
  
  return reasons.length > 0 ? reasons : ['符合基本要求'];
};

/**
 * 批量推荐（为多个购买需求推荐）
 * @param {Array<Object>} buyRequests - 购买需求列表
 * @param {number} limitPerRequest - 每个需求返回的数量
 * @returns {Promise<Object>} 每个需求对应的推荐列表
 */
export const batchRecommend = async (buyRequests, limitPerRequest = 5) => {
  const results = {};
  
  for (const request of buyRequests) {
    if (request.status === 'active') {
      results[request.id] = await recommendAssets(request, limitPerRequest);
    }
  }
  
  return results;
};

