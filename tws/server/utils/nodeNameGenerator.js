/**
 * 节点名称生成工具
 * 根据城市名称生成标准化的节点名称
 */

// 城市到节点名称的映射
const cityNodeMap = {
  '西安': "XI'AN (Urban Reserve)",
  '咸阳': "XIANYANG (Urban Reserve)",
  '宝鸡': "BAOJI (Urban Reserve)",
  '商洛': "SHANGLUO (Urban Reserve)",
  '北京': "BEIJING (Capital Reserve)",
  '上海': "SHANGHAI (Metropolitan Reserve)",
  '广州': "GUANGZHOU (Metropolitan Reserve)",
  '深圳': "SHENZHEN (Metropolitan Reserve)",
  '成都': "CHENGDU (Urban Reserve)",
  '重庆': "CHONGQING (Urban Reserve)",
  '杭州': "HANGZHOU (Urban Reserve)",
  '南京': "NANJING (Urban Reserve)",
  '武汉': "WUHAN (Urban Reserve)",
  '天津': "TIANJIN (Urban Reserve)",
  '苏州': "SUZHOU (Urban Reserve)",
  '郑州': "ZHENGZHOU (Urban Reserve)",
  '长沙': "CHANGSHA (Urban Reserve)",
  '沈阳': "SHENYANG (Urban Reserve)",
  '青岛': "QINGDAO (Urban Reserve)",
  '大连': "DALIAN (Urban Reserve)",
  '厦门': "XIAMEN (Urban Reserve)",
  '福州': "FUZHOU (Urban Reserve)",
  '济南': "JINAN (Urban Reserve)",
  '合肥': "HEFEI (Urban Reserve)",
  '石家庄': "SHIJIAZHUANG (Urban Reserve)",
  '太原': "TAIYUAN (Urban Reserve)",
  '哈尔滨': "HARBIN (Urban Reserve)",
  '长春': "CHANGCHUN (Urban Reserve)",
  '昆明': "KUNMING (Urban Reserve)",
  '南宁': "NANNING (Urban Reserve)",
  '南昌': "NANCHANG (Urban Reserve)",
  '贵阳': "GUIYANG (Urban Reserve)",
  '海口': "HAIKOU (Urban Reserve)",
  '兰州': "LANZHOU (Urban Reserve)",
  '银川': "YINCHUAN (Urban Reserve)",
  '西宁': "XINING (Urban Reserve)",
  '乌鲁木齐': "URUMQI (Urban Reserve)",
  '拉萨': "LHASA (Urban Reserve)",
};

/**
 * 根据城市名称生成节点名称
 * @param {string} city - 城市名称
 * @returns {string} 节点名称
 */
export const generateNodeName = (city) => {
  if (!city) {
    return "UNKNOWN (Reserve)";
  }

  // 直接匹配
  if (cityNodeMap[city]) {
    return cityNodeMap[city];
  }

  // 模糊匹配（包含关系）
  for (const [key, value] of Object.entries(cityNodeMap)) {
    if (city.includes(key) || key.includes(city)) {
      return value;
    }
  }

  // 默认生成：将城市名转换为大写，添加后缀
  const cityUpper = city.toUpperCase().replace(/\s+/g, '_');
  return `${cityUpper} (Urban Reserve)`;
};

/**
 * 根据城市名称获取默认坐标（用于没有坐标时的占位）
 * @param {string} city - 城市名称
 * @returns {Object} { lat, lng } 坐标对象
 */
export const getCityDefaultCoordinates = (city) => {
  // 主要城市的默认坐标
  const cityCoordinates = {
    '西安': { lat: 34.3416, lng: 108.9398 },
    '咸阳': { lat: 34.3333, lng: 108.7167 },
    '宝鸡': { lat: 34.3619, lng: 107.2375 },
    '商洛': { lat: 33.8683, lng: 109.9398 },
    '北京': { lat: 39.9042, lng: 116.4074 },
    '上海': { lat: 31.2304, lng: 121.4737 },
    '广州': { lat: 23.1291, lng: 113.2644 },
    '深圳': { lat: 22.5431, lng: 114.0579 },
    '成都': { lat: 30.6624, lng: 104.0633 },
    '重庆': { lat: 29.5630, lng: 106.5516 },
    '杭州': { lat: 30.2741, lng: 120.1551 },
    '南京': { lat: 32.0603, lng: 118.7969 },
    '武汉': { lat: 30.5928, lng: 114.3055 },
    '天津': { lat: 39.3434, lng: 117.3616 },
    '苏州': { lat: 31.2989, lng: 120.5853 },
    '郑州': { lat: 34.7466, lng: 113.6254 },
    '长沙': { lat: 28.2278, lng: 112.9388 },
    '沈阳': { lat: 41.8057, lng: 123.4315 },
    '青岛': { lat: 36.0671, lng: 120.3826 },
    '大连': { lat: 38.9140, lng: 121.6147 },
    '厦门': { lat: 24.4798, lng: 118.0819 },
    '福州': { lat: 26.0745, lng: 119.2965 },
    '济南': { lat: 36.6512, lng: 117.1201 },
    '合肥': { lat: 31.8206, lng: 117.2272 },
    '石家庄': { lat: 38.0428, lng: 114.5149 },
    '太原': { lat: 37.8706, lng: 112.5489 },
    '哈尔滨': { lat: 45.7731, lng: 126.6169 },
    '长春': { lat: 43.8171, lng: 125.3235 },
    '昆明': { lat: 25.0389, lng: 102.7183 },
    '南宁': { lat: 22.8170, lng: 108.3669 },
    '南昌': { lat: 28.6820, lng: 115.8579 },
    '贵阳': { lat: 26.6470, lng: 106.6302 },
    '海口': { lat: 20.0444, lng: 110.1999 },
    '兰州': { lat: 36.0611, lng: 103.8343 },
    '银川': { lat: 38.4872, lng: 106.2309 },
    '西宁': { lat: 36.6171, lng: 101.7782 },
    '乌鲁木齐': { lat: 43.8256, lng: 87.6168 },
    '拉萨': { lat: 29.6626, lng: 91.1145 },
  };

  // 直接匹配
  if (cityCoordinates[city]) {
    return cityCoordinates[city];
  }

  // 模糊匹配
  for (const [key, coords] of Object.entries(cityCoordinates)) {
    if (city.includes(key) || key.includes(city)) {
      return coords;
    }
  }

  // 默认返回中国中心点（西安附近）
  return { lat: 34.3416, lng: 108.9398 };
};

/**
 * 生成完整的资产日志对象
 * @param {Object} assetData - 资产数据 { raw, sanitized }
 * @param {string} assetId - 资产ID
 * @returns {Object} 资产日志对象
 */
export const generateAssetLog = (assetData, assetId) => {
  const { raw, sanitized } = assetData;
  
  // 获取节点名称
  const nodeName = generateNodeName(raw.city);
  
  // 获取坐标（优先使用资产中的坐标，否则使用城市默认坐标）
  const nodeLocation = (raw.latitude && raw.longitude) 
    ? { lat: raw.latitude, lng: raw.longitude }
    : getCityDefaultCoordinates(raw.city);
  
  // 构建位置地址
  const locationAddress = [
    raw.city,
    raw.district,
    raw.address,
    raw.roomNumber
  ].filter(Boolean).join(' ') || raw.city || 'Unknown';

  return {
    id: `${Date.now()}-${assetId}`,
    lot: sanitized.codeName || sanitized.id || `LOT-${assetId.slice(-6)}`,
    location: locationAddress,
    timestamp: Date.now(),
    assetId: assetId,
    nodeName: nodeName,
    nodeLocation: nodeLocation,
    value: raw.debtAmount || sanitized.financials?.totalTokens || 0,
    status: 'confirmed'
  };
};

