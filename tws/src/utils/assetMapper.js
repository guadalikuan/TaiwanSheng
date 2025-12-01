/**
 * 将后端返回的脱敏资产数据转换为黑市页面需要的格式
 * @param {Object} sanitizedAsset - 后端返回的脱敏资产数据
 * @returns {Object} - 黑市页面格式的资产数据
 */
export const mapSanitizedAssetToMarketFormat = (sanitizedAsset) => {
  // 从 locationTag 提取战区信息
  const sectorMap = {
    'CN-NW-CAPITAL': 'SECTOR-CN-NW (西北战区)',
    'CN-QINLING-MTN': 'SECTOR-CN-QINLING (秦岭战区)',
    'CN-IND-HUB': 'SECTOR-CN-IND (工业区)',
    'CN-INT-RES': 'SECTOR-CN-INT (内陆储备)'
  };

  const sector = sectorMap[sanitizedAsset.locationTag] || `SECTOR-${sanitizedAsset.locationTag}`;
  
  // 从 specs.type 提取类型
  const type = sanitizedAsset.specs?.type || 'UNKNOWN';
  
  // 从 securityLevel 计算防御等级
  const defenseMap = {
    5: 'MAX',
    4: 'HIGH',
    3: 'MED',
    2: 'LOW',
    1: 'MIN'
  };
  const defense = defenseMap[sanitizedAsset.securityLevel] || 'MED';
  
  // 从 securityLevel 计算深度等级
  const depth = `LV.${sanitizedAsset.securityLevel} (${sanitizedAsset.securityLevel >= 4 ? 'DEEP' : sanitizedAsset.securityLevel >= 2 ? 'INLAND' : 'COASTAL'})`;
  
  // 计算剩余容量（模拟，基于 tokenPrice）
  const capacity = Math.max(1, Math.min(100, Math.floor(Math.random() * 30 + 10)));
  
  // 从 financials.totalTokens 计算价格
  const price = sanitizedAsset.financials?.totalTokens 
    ? Math.floor(sanitizedAsset.financials.totalTokens / 100).toLocaleString()
    : '0';
  
  // 根据容量计算状态
  const statusMap = {
    'CRITICAL': capacity < 5,
    'ALMOST GONE': capacity < 10,
    'AVAILABLE': capacity >= 10
  };
  const status = statusMap['CRITICAL'] ? 'CRITICAL' : statusMap['ALMOST GONE'] ? 'ALMOST GONE' : 'AVAILABLE';

  return {
    id: sanitizedAsset.displayId || sanitizedAsset.codeName || sanitizedAsset.id,
    sector,
    type: type.toUpperCase(),
    defense,
    depth,
    capacity,
    price,
    status,
    // 保留原始数据用于其他用途
    original: sanitizedAsset
  };
};

/**
 * 批量转换资产数据
 * @param {Array} sanitizedAssets - 后端返回的脱敏资产数组
 * @returns {Array} - 转换后的资产数组
 */
export const mapAssetsToMarketFormat = (sanitizedAssets) => {
  if (!Array.isArray(sanitizedAssets)) {
    return [];
  }
  return sanitizedAssets.map(mapSanitizedAssetToMarketFormat);
};
