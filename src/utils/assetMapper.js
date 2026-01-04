/**
 * 将后端返回的资产数据转换为房地产展示格式
 * @param {Object} assetData - 后端返回的资产数据（包含sanitized和raw）
 * @returns {Object} - 房地产展示格式的资产数据
 */
export const mapSanitizedAssetToMarketFormat = (assetData) => {
  const sanitized = assetData.sanitized || assetData;
  const raw = assetData.raw || null;
  
  // 优先使用原始资产数据中的城市信息
  let city = 'UNKNOWN';
  let district = '';
  let projectName = '';
  let area = 0;
  let price = 0;
  let marketValuation = 0;
  
  if (raw) {
    city = raw.city || 'UNKNOWN';
    district = raw.district || '';
    projectName = raw.projectName || '';
    area = raw.area || 0;
    marketValuation = raw.marketValuation || 0;
    // 价格使用工抵价（debtAmount），单位为万元
    price = raw.debtAmount || 0;
  } else {
    // 备用方案：从脱敏数据中提取
    city = sanitized.city || 'UNKNOWN';
    if (sanitized.specs && sanitized.specs.area) {
      area = parseInt(sanitized.specs.area.replace(' m²', '')) || 0;
    }
    // 从 financials.totalTokens 计算价格（转换为万元）
    if (sanitized.financials?.totalTokens) {
      // totalTokens 是美元价格，转换为人民币万元
      const usdPrice = sanitized.financials.totalTokens;
      const rmbPrice = usdPrice * 7.2; // 汇率 7.2
      price = Math.round(rmbPrice / 10000); // 转换为万元
    }
  }
  
  // 如果没有城市，尝试从locationTag中提取
  if (city === 'UNKNOWN' && sanitized.locationTag) {
    const locationToCityMap = {
      'CN-NW-CAPITAL': '西安',
      'CN-NW-SUB': '咸阳',
      'CN-IND-HUB': '宝鸡',
      'CN-QINLING-MTN': '商洛',
      'CN-INT-RES': '汉中'
    };
    city = locationToCityMap[sanitized.locationTag] || sanitized.locationTag || 'UNKNOWN';
  }
  
  // 计算户型（基于面积）
  const getHouseType = (area) => {
    if (area < 60) return '一居室';
    if (area < 90) return '二居室';
    if (area < 120) return '三居室';
    if (area < 150) return '四居室';
    return '五居室及以上';
  };
  
  // 计算单价（元/平米）
  const unitPrice = area > 0 ? Math.round((price * 10000) / area) : 0;
  
  // 安全等级转换为星级（用于展示）
  const securityLevel = sanitized.securityLevel || 3;
  const stars = '★'.repeat(securityLevel) + '☆'.repeat(5 - securityLevel);
  
  // 剩余房源（模拟）
  const remaining = Math.max(1, Math.min(100, Math.floor(Math.random() * 30 + 10)));

  return {
    id: sanitized.displayId || sanitized.codeName || sanitized.id,
    city: city,
    district: district,
    projectName: projectName || '优质房源',
    area: area,
    houseType: getHouseType(area),
    price: price, // 总价（万元）
    unitPrice: unitPrice, // 单价（元/平米）
    marketValuation: marketValuation, // 市场评估价（万元）
    stars: stars,
    securityLevel: securityLevel,
    remaining: remaining, // 剩余房源数量
    status: sanitized.status === 'AVAILABLE' ? 'AVAILABLE' : 'RESERVED',
    // NFT 信息（如果已铸造）
    nftMinted: sanitized.nftMinted || false,
    nftTokenId: sanitized.nftTokenId || null,
    nftTxHash: sanitized.nftTxHash || null,
    nftMintedAt: sanitized.nftMintedAt || null,
    mintedTo: sanitized.mintedTo || null,
    // 保留原始数据用于其他用途
    original: sanitized,
    rawData: raw
  };
};

/**
 * 批量转换资产数据
 * @param {Array} assetsData - 后端返回的资产数据（可能包含raw和sanitized）
 * @returns {Array} - 转换后的资产数组
 */
export const mapAssetsToMarketFormat = (assetsData) => {
  if (!Array.isArray(assetsData)) {
    return [];
  }
  
  // 处理不同格式的返回数据
  return assetsData.map((item) => {
    // 如果item已经是格式化的资产，直接使用
    if (item.city && item.area) {
      return item;
    }
    
    // 如果item包含sanitized和raw
    if (item.sanitized || (item.city && !item.area)) {
      return mapSanitizedAssetToMarketFormat(item);
    }
    
    // 如果只是sanitized资产
    return mapSanitizedAssetToMarketFormat({ sanitized: item });
  });
};
