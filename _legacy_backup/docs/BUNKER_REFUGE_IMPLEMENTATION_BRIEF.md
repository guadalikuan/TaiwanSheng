# 地堡避险功能实现（简要版）

## 🎯 核心逻辑

**目的**：避险（应对"统一事件"的恐惧）  
**手段**：买币（TWS代币）+ 买房子（大陆房产）

---

## 📊 生存率计算公式

```
生存率 = 34% + 代币避险加成 + 房产避险加成 + 组合加成 - 风险惩罚
```

---

## 💰 避险手段实现

### 1. 代币避险（流动性避险）

**计算**：
- 每 10,000 TWS = +1% 生存率
- 最高加成：30%

**实现**：
```javascript
const tokenBonus = Math.min((twsBalance / 10000), 30);
```

---

### 2. 房产避险（物理避险）

**计算**：
```
每个房产 = 15% + (位置系数 × 5%) + (面积系数 × 3%)
```

**位置系数**（覆盖全国400+城市）：
- 新疆、西藏：2.0 → +10%
- 西北、西南：1.5-1.8 → +7.5%-9%
- 华中、华北：1.0-1.5 → +5%-7.5%
- 华东、华南：0.5-1.0 → +2.5%-5%

**面积系数**：
- 单兵舱（<50㎡）：0.5 → +1.5%
- 避难所（50-90㎡）：1.0 → +3%
- 地堡（90-140㎡）：1.5 → +4.5%
- 指挥所（>140㎡）：2.0 → +6%

**实现**：
```javascript
// 位置系数查询
const locationFactor = getLocationCoefficient(cityName); // 从全国位置系数表获取

// 面积系数
const areaFactor = area < 50 ? 0.5 : area < 90 ? 1.0 : area < 140 ? 1.5 : 2.0;

// 房产加成
const assetBonus = 15 + (locationFactor * 5) + (areaFactor * 3);
```

---

### 3. 组合加成

**计算**：
- 同时持有代币和房产，总加成提升 10%

**实现**：
```javascript
if (tokenBonus > 0 && assetBonus > 0) {
  combinationBonus = (tokenBonus + assetBonus) * 0.1;
}
```

---

### 4. 风险惩罚（基于倒计时危机感）

**倒计时危机感计算**：
```javascript
// 倒计时越接近，危机感分数越高（0-100）
if (daysRemaining <= 7) {
  crisisScore = 100 - (daysRemaining * 10); // 30-100分
} else if (daysRemaining <= 30) {
  crisisScore = 50 + ((30 - daysRemaining) * 2); // 50-96分
} // ... 其他区间

// 风险分数 = (风险溢价 × 50%) + (危机感分数 × 50%)
riskScore = (riskPremium * 0.5) + (crisisScore * 0.5);

// 风险等级
riskLevel = riskScore >= 80 ? 'CRITICAL' : riskScore >= 60 ? 'HIGH' : ...

// 风险惩罚
riskPenalty = {
  'CRITICAL': -20,
  'HIGH': -10,
  'MEDIUM': 0,
  'LOW': 5
}[riskLevel];
```

---

## 🔄 完整实现流程

```
1. 用户进入地堡
    ↓
2. 加载数据（资产、风险、统计、避险能力）
    ↓
3. 计算生存率
    ├─→ 代币避险加成
    ├─→ 房产避险加成（位置+面积）
    ├─→ 组合加成
    └─→ 风险惩罚（基于倒计时）
    ↓
4. 显示生存率、倒计时、风险等级
    ↓
5. 每30秒刷新风险数据和倒计时
```

---

## 📍 关键文件

**后端**：
- `server/routes/bunker.js` - 避险能力计算API
- `server/utils/locationCoefficient.js` - 全国位置系数表

**前端**：
- `src/components/BunkerApp.jsx` - 地堡主界面
- `src/utils/api.js` - API调用函数

---

## ✅ 总结

**核心实现**：
1. **代币避险**：每10,000 TWS = +1%（最高30%）
2. **房产避险**：每个房产 +15% 起（位置系数 × 5% + 面积系数 × 3%）
3. **组合加成**：同时持有代币和房产，额外+10%
4. **风险惩罚**：基于倒计时危机感（占风险分数50%）

**关键点**：
- 倒计时是危机感的主要来源
- 位置系数覆盖全国400+城市
- 生存率动态计算，实时反映避险能力

