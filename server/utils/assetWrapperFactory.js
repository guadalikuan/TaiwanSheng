// =================================================================
// MODULE: ASSET WRAPPER ENGINE (脱敏与包装引擎)
// ACCESS LEVEL: TOP SECRET
// =================================================================

// 1. 战区映射表 (战略地图)
const STRATEGIC_SECTORS = {
  "西安": { 
    city: "Xi'an", 
    sectorCode: "CN-NW-CAPITAL", 
    riskFactor: 0.2, // 相对繁华，不仅是避难，还有升值属性
    description: "Strategic Rear Capital (大后方核心指挥部)" 
  },
  "咸阳": { 
    city: "Xianyang", 
    sectorCode: "CN-NW-SUB", 
    riskFactor: 0.15,
    description: "Suburban Reserve Zone (近郊储备区)" 
  },
  "宝鸡": { 
    city: "Baoji", 
    sectorCode: "CN-IND-HUB", 
    riskFactor: 0.1,
    description: "Heavy Industry Reserve Zone (重工业储备区)" 
  },
  "商洛": { 
    city: "Shangluo", 
    sectorCode: "CN-QINLING-MTN", 
    riskFactor: 0.05, // 极度安全，深山老林
    description: "Deep Mountain Nuclear Bunker (秦岭深山核掩体)" 
  },
  "DEFAULT": { 
    city: "Unknown", 
    sectorCode: "CN-INT-RES", 
    riskFactor: 0.15, 
    description: "Inland Strategic Reserve (内陆战略储备)" 
  }
};

// 2. 资产等级判定算法
const determineClass = (area, price) => {
  // 逻辑：面积越小越像"单兵舱"，面积越大越像"指挥所"
  if (area < 50) return "POD (单兵休眠舱)";
  if (area < 90) return "SHELTER (标准避难所)";
  if (area < 140) return "BUNKER (加固地堡)";
  return "COMMAND_POST (前线指挥所)";
};

// 3. 生成代号
const generateCodeName = (city, area) => {
  if (!city) return "WAITING_INPUT...";
  const geoInfo = STRATEGIC_SECTORS[city] || STRATEGIC_SECTORS["DEFAULT"];
  const sizeCode = area > 120 ? "CMD" : "BKR"; // CMD=指挥所, BKR=地堡
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  return `CN-${geoInfo.sectorCode.split('-')[1] || 'INT'}-${sizeCode}-${randomNum}`;
};

// 4. 包装主函数
export const wrapAsset = (raw) => {
  
  // A. 获取地理情报
  const geoInfo = STRATEGIC_SECTORS[raw.city] || STRATEGIC_SECTORS["DEFAULT"];
  
  // B. 生成唯一代号
  const salt = Math.floor(Math.random() * 1000);
  const uniqueID = `${geoInfo.sectorCode}-${salt}`;
  const codeName = generateCodeName(raw.city, raw.area);

  // C. 生成"故事" (Flavor Text)
  const flavorText = `[CLASSIFIED]
Located in the ${geoInfo.description}. 
Structure integrity: 99.8%. 
Distance from coastline: >1000km (Safe from naval bombardment).
Resources: Water source nearby.
Status: READY FOR OCCUPANCY.`;

  // D. 计算初始发行价 (Token Price)
  const exchangeRate = 7.2;
  const basePriceUSD = Math.floor((raw.debtAmount || 0) * 10000 / exchangeRate);
  const tokenSupply = basePriceUSD;

  // E. 返回包装后的对象 (Sanitized)
  return {
    // --- 公开展示数据 (Public) ---
    id: raw.id || `asset_${Date.now()}`,
    codeName: codeName,
    displayId: uniqueID,
    title: `${geoInfo.description} - ${determineClass(raw.area || 0, raw.debtAmount || 0)}`,
    locationTag: geoInfo.sectorCode,
    region: geoInfo.description,
    zoneClass: determineClass(raw.area || 0, raw.debtAmount || 0),
    securityLevel: Math.max(1, Math.min(5, Math.round(5 - (geoInfo.riskFactor * 10)))), // 1-5 星级
    specs: {
      area: `${raw.area || 0} m²`,
      capacity: `${Math.floor((raw.area || 0) / 20)} Personnel`,
      type: determineClass(raw.area || 0, raw.debtAmount || 0)
    },
    financials: {
      totalTokens: tokenSupply,
      pricePerToken: 1.00,
      yield: "3.5% APY (Rent derived)"
    },
    flavorText: flavorText.trim(),
    status: 'MINTING',
    tokenPrice: tokenSupply,
    
    // --- 视觉素材 ---
    imageUrl: `/assets/blueprints/${determineClass(raw.area || 0, 0).split(' ')[0].toLowerCase()}.png`,

    // --- 隐秘链接 (Private) ---
    internalRef: raw.id 
  };
};

export { generateCodeName, determineClass };

