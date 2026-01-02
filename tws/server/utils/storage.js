import { put, get, getAll, getAllKeys, del, NAMESPACES, initRocksDB } from './rocksdb.js';

// 初始化RocksDB（如果尚未初始化）
let dbInitialized = false;
const ensureDB = async () => {
  if (!dbInitialized) {
    await initRocksDB();
    dbInitialized = true;
  }
};

// 初始化数据文件（兼容性函数，实际使用RocksDB）
const initDataFiles = async () => {
  await ensureDB();
};

// 读取原始资产数据
export const getRawAssets = async () => {
  await ensureDB();
  try {
    const results = await getAll(NAMESPACES.RAW_ASSETS);
    return results.map(r => r.value);
  } catch (error) {
    console.error('Error reading raw assets:', error);
    return [];
  }
};

// 保存原始资产数据
export const saveRawAsset = async (rawAsset) => {
  await ensureDB();
  try {
    if (!rawAsset.id) {
      rawAsset.id = `raw_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    await put(NAMESPACES.RAW_ASSETS, rawAsset.id, rawAsset);
    return rawAsset;
  } catch (error) {
    console.error('Error saving raw asset:', error);
    throw error;
  }
};

// 读取脱敏资产数据
export const getSanitizedAssets = async () => {
  await ensureDB();
  try {
    const results = await getAll(NAMESPACES.SANITIZED_ASSETS);
    return results.map(r => r.value);
  } catch (error) {
    console.error('Error reading sanitized assets:', error);
    return [];
  }
};

// 保存脱敏资产数据
export const saveSanitizedAsset = async (sanitizedAsset) => {
  await ensureDB();
  try {
    if (!sanitizedAsset.id) {
      sanitizedAsset.id = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    
    await put(NAMESPACES.SANITIZED_ASSETS, sanitizedAsset.id, sanitizedAsset);
    
    // 按资产类型建立索引（默认为房产）
    const assetType = sanitizedAsset.assetType || '房产';
    const typeKey = `${assetType}:${sanitizedAsset.id}`;
    await put(NAMESPACES.ASSETS_BY_TYPE, typeKey, sanitizedAsset.id);
    
    return sanitizedAsset;
  } catch (error) {
    console.error('Error saving sanitized asset:', error);
    throw error;
  }
};

// 获取所有资产（用于审核台）
export const getAllAssets = async () => {
  await ensureDB();
  const raw = await getRawAssets();
  const sanitized = await getSanitizedAssets();
  return {
    raw,
    sanitized
  };
};

// 更新资产状态
export const updateAssetStatus = async (id, status, reviewData = {}) => {
  await ensureDB();
  try {
    const asset = await get(NAMESPACES.SANITIZED_ASSETS, id);
    
    if (!asset) {
      throw new Error(`Asset with id ${id} not found`);
    }
    
    // 保存审核历史
    const reviewHistory = asset.reviewHistory || [];
    reviewHistory.push({
      status,
      reviewedBy: reviewData.reviewedBy || 'system',
      reviewNotes: reviewData.reviewNotes || '',
      reviewedAt: Date.now()
    });
    
    const updatedAsset = {
      ...asset,
      status,
      reviewedAt: Date.now(),
      reviewHistory,
      ...reviewData
    };
    
    await put(NAMESPACES.SANITIZED_ASSETS, id, updatedAsset);
    return updatedAsset;
  } catch (error) {
    console.error('Error updating asset status:', error);
    throw error;
  }
};

// 更新原始资产数据（用于编辑）
export const updateRawAsset = async (id, updates) => {
  await ensureDB();
  try {
    const asset = await get(NAMESPACES.RAW_ASSETS, id);
    
    if (!asset) {
      throw new Error(`Raw asset with id ${id} not found`);
    }
    
    const updatedAsset = {
      ...asset,
      ...updates,
      updatedAt: Date.now()
    };
    
    await put(NAMESPACES.RAW_ASSETS, id, updatedAsset);
    return updatedAsset;
  } catch (error) {
    console.error('Error updating raw asset:', error);
    throw error;
  }
};

// 获取资产的审核历史
export const getAssetReviewHistory = async (id) => {
  await ensureDB();
  const asset = await get(NAMESPACES.SANITIZED_ASSETS, id);
  return asset?.reviewHistory || [];
};

// 根据状态获取资产
export const getAssetsByStatus = async (status) => {
  await ensureDB();
  try {
    const assets = await getSanitizedAssets();
    return assets.filter(asset => asset.status === status);
  } catch (error) {
    console.error('Error getting assets by status:', error);
    return [];
  }
};

// 根据资产类型获取资产
export const getAssetsByType = async (assetType) => {
  await ensureDB();
  try {
    if (assetType === '房产') {
      // 房产使用原有的逻辑
      return await getAssetsByStatus('AVAILABLE');
    }
    
    // 其他类型从索引中获取
    const allTypeKeys = await getAllKeys(NAMESPACES.ASSETS_BY_TYPE);
    const typeKeys = allTypeKeys.filter(key => key.startsWith(`${assetType}:`));
    
    const assets = [];
    for (const typeKey of typeKeys) {
      const assetId = await get(NAMESPACES.ASSETS_BY_TYPE, typeKey);
      if (assetId) {
        const asset = await get(NAMESPACES.SANITIZED_ASSETS, assetId);
        if (asset) {
          assets.push(asset);
        }
      }
    }
    
    return assets;
  } catch (error) {
    console.error(`Error getting assets by type ${assetType}:`, error);
    return [];
  }
};

// 获取待审核资产（MINTING 状态）
export const getPendingAssets = async () => {
  const allAssets = await getAllAssets();
  const pendingSanitized = await getAssetsByStatus('MINTING');
  
  // 匹配原始数据和脱敏数据
  return pendingSanitized.map(sanitized => {
    const raw = allAssets.raw.find(r => r.id === sanitized.id);
    return {
      raw: raw || null,
      sanitized
    };
  });
};

// 获取已审核通过的资产（AVAILABLE 状态）
export const getApprovedAssets = async () => {
  return await getAssetsByStatus('AVAILABLE');
};

// 根据 ID 获取资产（包含原始和脱敏数据）
export const getAssetById = async (id) => {
  const allAssets = await getAllAssets();
  const raw = allAssets.raw.find(r => r.id === id);
  const sanitized = allAssets.sanitized.find(s => s.id === id);
  
  return {
    raw: raw || null,
    sanitized: sanitized || null
  };
};
