/**
 * RWA ETF管理器
 * 管理ETF篮子，支持多资产组合购买
 */

import { put, get, getAll, NAMESPACES } from './rocksdb.js';
import { getApprovedAssets } from './storage.js';
import { getLocationCoefficient } from './locationCoefficient.js';

/**
 * 创建ETF篮子
 * @param {Object} etfData - ETF数据
 * @returns {Promise<Object>} ETF篮子
 */
export const createEtfBasket = async (etfData) => {
  const {
    name,
    description,
    assetIds, // 资产ID列表
    weights, // 每个资产的权重（数组，总和应为1）
    cities, // 包含的城市列表
    minInvestment = 0, // 最小投资额
    managementFee = 0.02 // 管理费（2%）
  } = etfData;
  
  if (!assetIds || assetIds.length === 0) {
    throw new Error('ETF must contain at least one asset');
  }
  
  if (weights && weights.length !== assetIds.length) {
    throw new Error('Weights array must match assetIds length');
  }
  
  // 如果没有提供权重，平均分配
  const finalWeights = weights || assetIds.map(() => 1 / assetIds.length);
  
  // 验证权重总和
  const weightSum = finalWeights.reduce((sum, w) => sum + w, 0);
  if (Math.abs(weightSum - 1.0) > 0.01) {
    throw new Error('Weights must sum to 1.0 (within 0.01 tolerance)');
  }
  
  const etf = {
    id: etfData.id || `etf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name,
    description: description || '',
    assetIds,
    weights: finalWeights,
    cities: cities || [],
    minInvestment,
    managementFee,
    createdAt: Date.now(),
    status: 'active'
  };
  
  await put(NAMESPACES.ETF_BASKETS, etf.id, etf);
  return etf;
};

/**
 * 获取ETF篮子
 * @param {string} etfId - ETF ID
 * @returns {Promise<Object|null>} ETF篮子
 */
export const getEtfBasket = async (etfId) => {
  try {
    const result = await get(NAMESPACES.ETF_BASKETS, etfId);
    return result?.value || null;
  } catch (error) {
    if (error.notFound || error.code === 'LEVEL_NOT_FOUND') return null;
    throw error;
  }
};

/**
 * 获取所有ETF篮子
 * @returns {Promise<Array>} ETF列表
 */
export const getAllEtfBaskets = async () => {
  try {
    const allEtfs = await getAll(NAMESPACES.ETF_BASKETS);
    return allEtfs.map(e => e.value).filter(e => e.status === 'active');
  } catch (error) {
    console.error('Error getting all ETFs:', error);
    return [];
  }
};

/**
 * 根据城市推荐ETF
 * @param {Array<string>} cities - 城市列表
 * @returns {Promise<Array>} 匹配的ETF列表（按匹配度排序）
 */
export const recommendEtfByCities = async (cities) => {
  try {
    const allEtfs = await getAllEtfBaskets();
    
    if (!cities || cities.length === 0) {
      return allEtfs.map(etf => ({ ...etf, matchScore: 50 }));
    }
    
    // 筛选包含指定城市的ETF
    const matchingEtfs = allEtfs.filter(etf => {
      if (etf.cities.length === 0) return true; // 如果ETF没有指定城市，则匹配所有
      return cities.some(city => etf.cities.includes(city));
    });
    
    // 计算匹配度并排序
    const etfsWithScore = matchingEtfs.map(etf => {
      let score = 0;
      if (etf.cities.length > 0) {
        const matchingCities = cities.filter(c => etf.cities.includes(c)).length;
        score = (matchingCities / cities.length) * 100;
      } else {
        score = 50; // 如果没有指定城市，给中等分数
      }
      
      return { ...etf, matchScore: score };
    });
    
    etfsWithScore.sort((a, b) => b.matchScore - a.matchScore);
    return etfsWithScore;
  } catch (error) {
    console.error('Error recommending ETF:', error);
    return [];
  }
};

/**
 * 计算ETF购买后的份额分配
 * @param {string} etfId - ETF ID
 * @param {number} totalInvestment - 总投资额（TOT）
 * @returns {Promise<Array>} 每个资产应购买的份额分配
 */
export const calculateEtfAllocation = async (etfId, totalInvestment) => {
  const etf = await getEtfBasket(etfId);
  if (!etf) {
    throw new Error('ETF not found');
  }
  
  const allocations = [];
  
  for (let i = 0; i < etf.assetIds.length; i++) {
    const assetId = etf.assetIds[i];
    const weight = etf.weights[i];
    const allocationAmount = totalInvestment * weight;
    
    allocations.push({
      assetId,
      weight,
      investmentAmount: allocationAmount
    });
  }
  
  return allocations;
};

/**
 * 自动生成ETF（根据城市和资产数量）
 * @param {Array<string>} cities - 城市列表
 * @param {number} assetCount - 每个ETF包含的资产数量
 * @returns {Promise<Object>} 生成的ETF
 */
export const autoGenerateEtf = async (cities, assetCount = 5) => {
  try {
    // 获取所有已审核通过的资产
    const approvedAssets = await getApprovedAssets();
    
    // 筛选匹配城市的资产
    let candidateAssets = approvedAssets.filter(asset => {
      if (!cities || cities.length === 0) return true;
      const assetCity = asset.city || asset.locationTag || '';
      return cities.some(city => 
        assetCity === city || 
        assetCity.includes(city) || 
        city.includes(assetCity)
      );
    });
    
    // 筛选可用资产（状态为AVAILABLE或LOCKED）
    candidateAssets = candidateAssets.filter(asset => 
      asset.status === 'AVAILABLE' || asset.status === 'LOCKED'
    );
    
    if (candidateAssets.length === 0) {
      throw new Error('No available assets found for the specified cities');
    }
    
    // 按位置系数和安全等级排序，选择前N个
    candidateAssets.sort((a, b) => {
      const cityA = a.city || a.locationTag || '';
      const cityB = b.city || b.locationTag || '';
      const coeffA = getLocationCoefficient(cityA);
      const coeffB = getLocationCoefficient(cityB);
      return coeffB - coeffA; // 降序
    });
    
    const selectedAssets = candidateAssets.slice(0, Math.min(assetCount, candidateAssets.length));
    const assetIds = selectedAssets.map(a => a.id);
    const weights = selectedAssets.map(() => 1 / selectedAssets.length); // 平均分配
    
    // 提取城市列表
    const etfCities = [
      ...new Set(
        selectedAssets
          .map(a => a.city || a.locationTag || '')
          .filter(c => c)
      )
    ];
    
    const etfName = cities && cities.length > 0 
      ? `${cities.join('、')}房产ETF`
      : '多元化房产ETF';
    
    const etfDescription = `包含${selectedAssets.length}个${etfCities.length > 0 ? etfCities.join('、') : '多个城市'}的优质房产资产`;
    
    const etf = await createEtfBasket({
      name: etfName,
      description: etfDescription,
      assetIds,
      weights,
      cities: etfCities,
      minInvestment: 100, // 默认最小投资100 TOT
      managementFee: 0.02
    });
    
    return etf;
  } catch (error) {
    console.error('Error auto-generating ETF:', error);
    throw error;
  }
};

/**
 * 更新ETF篮子
 * @param {string} etfId - ETF ID
 * @param {Object} updates - 更新字段
 * @returns {Promise<Object>} 更新后的ETF
 */
export const updateEtfBasket = async (etfId, updates) => {
  const etf = await getEtfBasket(etfId);
  if (!etf) {
    throw new Error('ETF not found');
  }
  
  const updatedEtf = {
    ...etf,
    ...updates,
    updatedAt: Date.now()
  };
  
  // 如果更新了权重，验证总和
  if (updates.weights) {
    const weightSum = updatedEtf.weights.reduce((sum, w) => sum + w, 0);
    if (Math.abs(weightSum - 1.0) > 0.01) {
      throw new Error('Weights must sum to 1.0');
    }
  }
  
  await put(NAMESPACES.ETF_BASKETS, etfId, updatedEtf);
  return updatedEtf;
};

/**
 * 删除ETF篮子（软删除）
 * @param {string} etfId - ETF ID
 * @returns {Promise<boolean>} 是否成功
 */
export const deleteEtfBasket = async (etfId) => {
  const etf = await getEtfBasket(etfId);
  if (!etf) {
    throw new Error('ETF not found');
  }
  
  await updateEtfBasket(etfId, { status: 'inactive' });
  return true;
};

