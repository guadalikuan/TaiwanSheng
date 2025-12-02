import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../data');
const RAW_ASSETS_FILE = join(DATA_DIR, 'rawAssets.json');
const SANITIZED_ASSETS_FILE = join(DATA_DIR, 'sanitizedAssets.json');

// 初始化数据文件
const initDataFiles = () => {
  if (!existsSync(RAW_ASSETS_FILE)) {
    writeFileSync(RAW_ASSETS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
  if (!existsSync(SANITIZED_ASSETS_FILE)) {
    writeFileSync(SANITIZED_ASSETS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
};

// 读取原始资产数据
export const getRawAssets = () => {
  initDataFiles();
  try {
    const data = readFileSync(RAW_ASSETS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading raw assets:', error);
    return [];
  }
};

// 保存原始资产数据
export const saveRawAsset = (rawAsset) => {
  initDataFiles();
  try {
    const assets = getRawAssets();
    assets.push(rawAsset);
    writeFileSync(RAW_ASSETS_FILE, JSON.stringify(assets, null, 2), 'utf8');
    return rawAsset;
  } catch (error) {
    console.error('Error saving raw asset:', error);
    throw error;
  }
};

// 读取脱敏资产数据
export const getSanitizedAssets = () => {
  initDataFiles();
  try {
    const data = readFileSync(SANITIZED_ASSETS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading sanitized assets:', error);
    return [];
  }
};

// 保存脱敏资产数据
export const saveSanitizedAsset = (sanitizedAsset) => {
  initDataFiles();
  try {
    const assets = getSanitizedAssets();
    assets.push(sanitizedAsset);
    writeFileSync(SANITIZED_ASSETS_FILE, JSON.stringify(assets, null, 2), 'utf8');
    return sanitizedAsset;
  } catch (error) {
    console.error('Error saving sanitized asset:', error);
    throw error;
  }
};

// 获取所有资产（用于审核台）
export const getAllAssets = () => {
  return {
    raw: getRawAssets(),
    sanitized: getSanitizedAssets()
  };
};

// 更新资产状态
export const updateAssetStatus = (id, status, reviewData = {}) => {
  initDataFiles();
  try {
    const assets = getSanitizedAssets();
    const index = assets.findIndex(asset => asset.id === id);
    
    if (index === -1) {
      throw new Error(`Asset with id ${id} not found`);
    }
    
    // 保存审核历史
    const reviewHistory = assets[index].reviewHistory || [];
    reviewHistory.push({
      status,
      reviewedBy: reviewData.reviewedBy || 'system',
      reviewNotes: reviewData.reviewNotes || '',
      reviewedAt: Date.now()
    });
    
    assets[index] = {
      ...assets[index],
      status,
      reviewedAt: Date.now(),
      reviewHistory,
      ...reviewData
    };
    
    writeFileSync(SANITIZED_ASSETS_FILE, JSON.stringify(assets, null, 2), 'utf8');
    return assets[index];
  } catch (error) {
    console.error('Error updating asset status:', error);
    throw error;
  }
};

// 更新原始资产数据（用于编辑）
export const updateRawAsset = (id, updates) => {
  initDataFiles();
  try {
    const assets = getRawAssets();
    const index = assets.findIndex(asset => asset.id === id);
    
    if (index === -1) {
      throw new Error(`Raw asset with id ${id} not found`);
    }
    
    assets[index] = {
      ...assets[index],
      ...updates,
      updatedAt: Date.now()
    };
    
    writeFileSync(RAW_ASSETS_FILE, JSON.stringify(assets, null, 2), 'utf8');
    return assets[index];
  } catch (error) {
    console.error('Error updating raw asset:', error);
    throw error;
  }
};

// 获取资产的审核历史
export const getAssetReviewHistory = (id) => {
  const asset = getSanitizedAssets().find(a => a.id === id);
  return asset?.reviewHistory || [];
};

// 根据状态获取资产
export const getAssetsByStatus = (status) => {
  initDataFiles();
  try {
    const assets = getSanitizedAssets();
    return assets.filter(asset => asset.status === status);
  } catch (error) {
    console.error('Error getting assets by status:', error);
    return [];
  }
};

// 获取待审核资产（MINTING 状态）
export const getPendingAssets = () => {
  const allAssets = getAllAssets();
  const pendingSanitized = getAssetsByStatus('MINTING');
  
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
export const getApprovedAssets = () => {
  return getAssetsByStatus('AVAILABLE');
};

// 根据 ID 获取资产（包含原始和脱敏数据）
export const getAssetById = (id) => {
  const allAssets = getAllAssets();
  const raw = allAssets.raw.find(r => r.id === id);
  const sanitized = allAssets.sanitized.find(s => s.id === id);
  
  return {
    raw: raw || null,
    sanitized: sanitized || null
  };
};

