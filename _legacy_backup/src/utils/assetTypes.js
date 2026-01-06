/**
 * TWS Asset DNA Definition
 * 绝密：仅在后端和总司令控制台可见
 */

/**
 * 原始资产数据 (老板录入的)
 * @typedef {Object} RawAsset
 * @property {string} id - 唯一标识符
 * @property {string} ownerName - 债权人/老板姓名
 * @property {string} ownerId - 身份证后四位 (用于核实)
 * @property {string} contactPhone - 联系电话
 * @property {string} projectName - 项目名称 (例：西安·曲江·大唐不夜城三期)
 * @property {string} city - 所在城市 (例：西安)
 * @property {string} district - 所在区县 (例：雁塔区)
 * @property {string} address - 详细地址 (绝密)
 * @property {string} roomNumber - 房号 (例：3-1001)
 * @property {number} area - 面积 (平米)
 * @property {number} marketValuation - 市场评估价 (人民币，单位：万元)
 * @property {number} debtAmount - 工抵折算价 (人民币，单位：万元 - 他急于变现的价格)
 * @property {string[]} proofDocs - 房产证照片、工抵协议照片 (URL)
 * @property {number} timestamp - 时间戳
 */

/**
 * 脱敏资产数据 (上链的，台湾人看到的)
 * @typedef {Object} SanitizedAsset
 * @property {string} id - 对应 RawAsset ID
 * @property {string} codeName - 代号 (例：CN-XI-BKR-4921) -> 系统自动生成
 * @property {string} zoneClass - 战区等级 (例：Class A - Strategic Rear)
 * @property {string} region - 模糊地理 (例：Northwest Sector (西北大区))
 * @property {number} securityLevel - 安全指数 (1-5星) -> 越偏僻越高
 * @property {number} tokenPrice - 链上发行价 (基于工抵价 + 溢价)
 * @property {'MINTING' | 'AVAILABLE' | 'LOCKED' | 'OCCUPIED'} status - 状态
 */

export {};

