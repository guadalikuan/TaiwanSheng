# 进入地堡后的实现逻辑

## 🎯 完整流程概览

```
用户点击"进入地堡"按钮
    ↓
1. 页面导航（路由跳转）
    ↓
2. 地堡页面初始化（加载状态）
    ↓
3. 并行加载数据（API 请求）
    ↓
4. 计算避险能力（生存率）
    ↓
5. 渲染地堡界面
    ↓
6. 实时更新（定时刷新）
```

---

## 📋 详细实现步骤

### 阶段 1: 页面导航

**触发位置**：`OmegaSection.jsx` - "进入地堡"按钮

**代码逻辑**：
```javascript
const handleEnterBunker = () => {
  setIsEnteringBunker(true); // 按钮加载状态
  setTimeout(() => {
    navigate('/bunker'); // 路由跳转
    setIsEnteringBunker(false);
  }, 300); // 短暂延迟，提供视觉反馈
};
```

**UI 反馈**：
- 按钮显示"正在进入..."
- 按钮禁用，防止重复点击
- 300ms 延迟后跳转

---

### 阶段 2: 地堡页面初始化

**组件**：`BunkerApp.jsx`

**初始化状态**：
```javascript
const [isLoading, setIsLoading] = useState(true);        // 页面加载状态
const [dataLoading, setDataLoading] = useState(true);   // 数据加载状态
const [survivalRate, setSurvivalRate] = useState(34);  // 初始生存率：34%（极度危险）
```

**加载界面显示**：
```jsx
if (isLoading) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
      <Activity className="w-12 h-12 animate-pulse mb-4" />
      <div className="text-xs tracking-[0.2em]">正在建立安全連線...</div>
      <div className="mt-2 text-xs text-slate-500">節點：廈門_03</div>
    </div>
  );
}
```

**目的**：
- 营造"系统检查"的仪式感
- 给用户心理准备时间
- 避免空白页面闪烁

---

### 阶段 3: 并行加载数据

**触发时机**：认证状态加载完成后

**代码逻辑**：
```javascript
useEffect(() => {
  const loadUserData = async () => {
    try {
      setDataLoading(true);
      
      // 并行加载所有数据
      const [assetsResponse, riskResponse, statsResponse, capacityResponse] = await Promise.all([
        getHomepageAssets(),      // 获取资产列表
        getRiskData(),            // 获取风险预警（包含倒计时）
        getBunkerStats(),         // 获取社区统计
        getRefugeCapacity(user?.address) // 获取避险能力详情
      ]);
      
      // 处理数据...
    } finally {
      setDataLoading(false);
    }
  };

  if (!authLoading) {
    loadUserData();
  }
}, [isAuthenticated, user, authLoading]);
```

**API 请求**：

1. **`GET /api/homepage/assets`** - 获取资产列表
   - 返回：已审核通过的资产
   - 用途：显示用户拥有的资产

2. **`GET /api/bunker/risk`** - 获取风险预警
   - 返回：风险等级、风险分数、倒计时信息
   - 用途：显示实时风险、倒计时危机感

3. **`GET /api/bunker/stats`** - 获取社区统计
   - 返回：全平台统计、最近活动
   - 用途：显示社区数据

4. **`GET /api/bunker/refuge-capacity`** - 获取避险能力详情
   - 返回：生存率、代币加成、房产加成、组合加成、风险惩罚
   - 用途：计算和显示生存率

---

### 阶段 4: 计算避险能力（生存率）

**计算公式**：
```
生存率 = 34% + 代币避险加成 + 房产避险加成 + 组合加成 - 风险惩罚
```

**详细计算**：

#### 4.1 代币避险加成
```javascript
// 每 10,000 TWS = +1%，最高 30%
const tokenBonus = Math.min((twsBalance / 10000), 30);
```

#### 4.2 房产避险加成
```javascript
assets.forEach(asset => {
  let bonus = 15; // 基础加成
  
  // 位置加成：从全国位置系数表获取
  const locationFactor = getLocationCoefficient(cityName);
  bonus += locationFactor * 5; // 位置系数 × 5%
  
  // 面积加成
  const area = parseInt(asset.specs.area);
  let areaFactor = 1.0;
  if (area < 50) areaFactor = 0.5;      // 单兵舱
  else if (area < 90) areaFactor = 1.0;  // 避难所
  else if (area < 140) areaFactor = 1.5; // 地堡
  else areaFactor = 2.0;                 // 指挥所
  bonus += areaFactor * 3; // 面积系数 × 3%
  
  assetBonus += bonus;
});
```

#### 4.3 组合加成
```javascript
// 如果同时持有代币和房产，总加成提升 10%
if (tokenBonus > 0 && assetBonus > 0) {
  combinationBonus = (tokenBonus + assetBonus) * 0.1;
}
```

#### 4.4 风险惩罚（基于倒计时危机感）
```javascript
// 倒计时危机感计算
const countdownCrisisScore = calculateCountdownCrisis(targetTime);

// 风险分数 = (风险溢价 × 50%) + (危机感分数 × 50%)
const riskScore = (riskPremium * 0.5) + (countdownCrisisScore * 0.5);

// 风险等级
let riskLevel = 'LOW';
if (riskScore >= 80) riskLevel = 'CRITICAL';
else if (riskScore >= 60) riskLevel = 'HIGH';
else if (riskScore >= 40) riskLevel = 'MEDIUM';

// 风险惩罚
const riskPenalty = {
  'CRITICAL': -20,
  'HIGH': -10,
  'MEDIUM': 0,
  'LOW': 5
}[riskLevel] || 0;
```

#### 4.5 最终生存率
```javascript
const totalRate = baseRate + tokenBonus + assetBonus + combinationBonus + riskPenalty;
const finalRate = Math.max(0, Math.min(100, totalRate));
```

---

### 阶段 5: 渲染地堡界面

**界面结构**：

#### 5.1 顶部：用户信息栏 + 实时风险预警

```jsx
<div className="border-b border-slate-800">
  {/* 用户信息 */}
  <div className="flex justify-between items-center p-4">
    <div>身份：{user?.username || '訪客模式'}</div>
    <div>會員等級：{user?.role || '訪客'}</div>
  </div>
  
  {/* 倒计时显示 */}
  {riskData?.countdown && (
    <div className="px-4 pb-3">
      <div className="倒计时卡片">
        {riskData.countdown.daysRemaining}天 
        {riskData.countdown.hoursRemaining}时 
        {riskData.countdown.minutesRemaining}分
      </div>
    </div>
  )}
  
  {/* 风险等级 */}
  <div className="px-4 pb-3">
    <div className="风险等级卡片">
      風險等級：{getRiskText(riskData.riskLevel)}
      危機感：{riskData.countdown?.crisisScore}/100
    </div>
  </div>
</div>
```

#### 5.2 核心仪表盘：生存率

```jsx
<div className="p-6 flex flex-col items-center">
  <div className="text-xs uppercase">當前生存機率</div>
  
  {/* 环形进度条 */}
  <div className="relative w-48 h-48">
    <svg>
      <circle className="背景圆" />
      <circle 
        className={survivalRate > 60 ? 'text-emerald-500' : 'text-red-600'}
        strokeDashoffset={552 - (552 * survivalRate) / 100}
      />
    </svg>
    <div className="absolute center">
      <span className="text-5xl">{survivalRate}%</span>
      <span className={survivalRate > 60 ? '安全' : '極度危險'}>
        {survivalRate > 60 ? '安全' : '極度危險'}
      </span>
    </div>
  </div>
  
  {/* 提示文字 */}
  <p className="mt-4 text-xs text-center">
    {riskData?.countdown && riskData.countdown.daysRemaining <= 30 ? (
      <span className="text-red-400">
        距離事件僅剩 {riskData.countdown.daysRemaining} 天
      </span>
    ) : survivalRate > 60 ? (
      "系統已穩定。維持資產以保持狀態。"
    ) : (
      "警告：您的資產不足以應對事件。請立即獲取避難所。"
    )}
  </p>
  
  {/* 避险能力详情（可展开） */}
  {refugeCapacity && (
    <details className="mt-4">
      <summary>查看避险能力详情</summary>
      <div className="详情面板">
        <div>基础生存率：{refugeCapacity.breakdown.base}%</div>
        <div>代币避险加成：+{refugeCapacity.breakdown.token}%</div>
        <div>房产避险加成：+{refugeCapacity.breakdown.assets}%</div>
        <div>组合加成：+{refugeCapacity.breakdown.combination}%</div>
        <div>风险惩罚：{refugeCapacity.breakdown.risk}%</div>
        <div>总生存率：{survivalRate}%</div>
      </div>
    </details>
  )}
</div>
```

#### 5.3 社区统计

```jsx
{bunkerStats && (
  <div className="px-4 mb-4">
    <div className="bg-slate-900/50 rounded p-3">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4" />
        <span>全平台統計</span>
      </div>
      <div>
        平均生存率：{bunkerStats.platform?.avgSurvivalRate}%
        {bunkerStats.platform?.avgSurvivalRateChange > 0 && (
          <span>↑ +{bunkerStats.platform.avgSurvivalRateChange}%</span>
        )}
      </div>
      <div>用戶數：{bunkerStats.platform?.totalUsers}</div>
      <div>資產數：{bunkerStats.platform?.totalAssets}</div>
    </div>
  </div>
)}
```

#### 5.4 快速行动区

```jsx
<div className="px-4 mb-6">
  <div className="grid grid-cols-2 gap-3">
    <button onClick={() => navigate('/market')}>
      <ShieldCheck />
      <span>獲取資產</span>
      <span>+15% 生存率</span>
    </button>
    <button onClick={() => handleAction(5)}>
      <Crosshair />
      <span>任務行動</span>
      <span>+5% 生存率</span>
    </button>
  </div>
</div>
```

#### 5.5 资产金库

```jsx
<div className="px-4 pb-20">
  <h3>資產金庫</h3>
  
  {/* TWS 代币卡片 */}
  <div className="bg-slate-900 rounded p-4">
    <div className="flex items-center">
      <Zap className="w-5 h-5 text-yellow-500" />
      <div>
        <div>TWS 代幣</div>
        <div>餘額：{refugeCapacity?.tokenBalance || 0}</div>
        <div>每 10,000 TWS = +1%（最高+30%）</div>
      </div>
    </div>
    <div className="text-right">
      <div>+{refugeCapacity?.breakdown?.token || 0}%</div>
      <div>代币避险</div>
      <button onClick={() => navigate('/market')}>購買代幣</button>
    </div>
  </div>
  
  {/* 房产资产卡片 */}
  {userAssets.length > 0 ? (
    userAssets.map(asset => (
      <div 
        key={asset.id}
        onClick={() => loadAssetScenario(asset.id)}
        className="bg-slate-900 rounded p-4 cursor-pointer"
      >
        <div>
          <div>產權編號</div>
          <div>{asset.codeName || asset.title}</div>
          <div>{asset.city}</div>
          {refugeCapacity?.assetDetails?.find(d => d.id === asset.id) && (
            <div>避险加成：+{refugeCapacity.assetDetails.find(d => d.id === asset.id).bonus}%</div>
          )}
        </div>
        <div>{asset.status === 'AVAILABLE' ? '已驗證' : '待審核'}</div>
      </div>
    ))
  ) : (
    <div className="bg-red-950/10 border-dashed rounded p-4">
      <div>未獲取避難所</div>
      <div>風險等級：極度危險</div>
      <button onClick={() => navigate('/market')}>獲取</button>
    </div>
  )}
</div>
```

---

### 阶段 6: 实时更新

**定时刷新机制**：

```javascript
useEffect(() => {
  // 每30秒刷新风险数据（包含倒计时）
  const riskInterval = setInterval(() => {
    getRiskData().then(response => {
      if (response && response.success && response.data) {
        setRiskData(response.data);
        
        // 重新计算生存率
        const assets = userAssets;
        const calculatedRate = calculateSurvivalRate(
          twsBalance, 
          assets, 
          response.data.riskLevel
        );
        setSurvivalRate(calculatedRate);
        
        // 检查紧急警报
        if (response.data.riskLevel === 'CRITICAL' || response.data.riskLevel === 'HIGH') {
          setShowEmergencyAlert(true);
        }
      }
    });
  }, 30000); // 30秒
  
  return () => clearInterval(riskInterval);
}, [userAssets, twsBalance]);
```

**更新内容**：
- 倒计时剩余时间（实时减少）
- 危机感分数（随倒计时变化）
- 风险等级（可能提升）
- 生存率（动态调整）

---

## 🔄 完整数据流

```
用户进入地堡
    ↓
并行加载数据
    ├─→ 资产列表 API
    ├─→ 风险预警 API（包含倒计时）
    ├─→ 社区统计 API
    └─→ 避险能力 API
    ↓
计算生存率
    ├─→ 基础生存率：34%
    ├─→ 代币避险加成：min(余额/10000, 30)%
    ├─→ 房产避险加成：sum(每个房产的加成)
    │   ├─→ 基础：15%
    │   ├─→ 位置：位置系数 × 5%
    │   └─→ 面积：面积系数 × 3%
    ├─→ 组合加成：(代币+房产) × 10%
    └─→ 风险惩罚：根据风险等级
        ├─→ CRITICAL: -20%
        ├─→ HIGH: -10%
        ├─→ MEDIUM: 0%
        └─→ LOW: +5%
    ↓
渲染界面
    ├─→ 生存率仪表盘
    ├─→ 倒计时显示
    ├─→ 风险等级
    ├─→ 社区统计
    ├─→ 资产列表
    └─→ 快速行动按钮
    ↓
实时更新（每30秒）
    ├─→ 刷新风险数据
    ├─→ 更新倒计时
    ├─→ 重新计算生存率
    └─→ 检查紧急警报
```

---

## 💡 关键实现细节

### 1. 倒计时危机感计算

**后端**：`server/routes/bunker.js`

```javascript
const calculateCountdownCrisis = (targetTime) => {
  const now = Date.now();
  const distance = Math.max(targetTime - now, 0);
  const daysRemaining = distance / (1000 * 60 * 60 * 24);
  
  let crisisScore = 0;
  if (daysRemaining <= 7) {
    crisisScore = 100 - (daysRemaining * 10); // 30-100分
  } else if (daysRemaining <= 30) {
    crisisScore = 50 + ((30 - daysRemaining) * 2); // 50-96分
  } else if (daysRemaining <= 90) {
    crisisScore = 30 + ((90 - daysRemaining) * 0.3); // 30-48分
  } else if (daysRemaining <= 365) {
    crisisScore = 20 + ((365 - daysRemaining) * 0.03); // 20-30分
  } else {
    crisisScore = Math.max(10, 20 - ((daysRemaining - 365) * 0.01)); // 10-20分
  }
  
  return {
    daysRemaining,
    crisisScore: Math.min(100, Math.max(0, crisisScore))
  };
};
```

### 2. 位置系数查询

**后端**：`server/utils/locationCoefficient.js`

```javascript
export const getLocationCoefficient = (cityName) => {
  // 直接匹配
  if (LOCATION_COEFFICIENT_MAP[cityName]) {
    return LOCATION_COEFFICIENT_MAP[cityName];
  }
  
  // 模糊匹配
  for (const [city, coefficient] of Object.entries(LOCATION_COEFFICIENT_MAP)) {
    if (cityName.includes(city) || city.includes(cityName)) {
      return coefficient;
    }
  }
  
  // 省份匹配
  // ...
  
  return 1.0; // 默认值
};
```

### 3. 紧急警报触发

```javascript
// 当风险等级为 CRITICAL 或 HIGH 时显示
{showEmergencyAlert && riskData && 
  (riskData.riskLevel === 'CRITICAL' || riskData.riskLevel === 'HIGH') && (
  <div className="bg-red-950/90 border-b-2 border-red-600 p-3 animate-pulse">
    <AlertTriangle />
    <div>⚠️ 系統警報：地緣政治風險上升</div>
    <div>偵測到異常活動。您的生存率可能受到影響。</div>
    <button onClick={() => setShowEmergencyAlert(false)}>關閉</button>
  </div>
)}
```

---

## 📊 状态管理

### 主要状态变量

```javascript
// 页面状态
const [isLoading, setIsLoading] = useState(true);
const [dataLoading, setDataLoading] = useState(true);

// 核心数据
const [survivalRate, setSurvivalRate] = useState(34);
const [userAssets, setUserAssets] = useState([]);
const [twsBalance, setTwsBalance] = useState(0);

// 风险数据
const [riskData, setRiskData] = useState(null);
const [bunkerStats, setBunkerStats] = useState(null);
const [refugeCapacity, setRefugeCapacity] = useState(null);
const [showEmergencyAlert, setShowEmergencyAlert] = useState(false);

// UI 状态
const [selectedAssetScenario, setSelectedAssetScenario] = useState(null);
```

### 状态更新流程

```
初始化
    ↓
isLoading = true
    ↓
加载数据
    ↓
dataLoading = true
    ↓
API 请求完成
    ↓
dataLoading = false
    ↓
延迟 1.5 秒（仪式感）
    ↓
isLoading = false
    ↓
渲染完整界面
    ↓
定时刷新（每30秒）
```

---

## ✅ 总结

**进入地堡后的完整逻辑**：

1. **导航**：从首页跳转到地堡页面
2. **初始化**：显示加载界面，营造仪式感
3. **数据加载**：并行加载4个API（资产、风险、统计、避险能力）
4. **计算生存率**：基于代币、房产、组合、风险惩罚
5. **渲染界面**：显示生存率、倒计时、风险等级、资产列表
6. **实时更新**：每30秒刷新风险数据和倒计时

**核心特点**：
- ✅ 倒计时是危机感的主要来源（占风险分数50%）
- ✅ 生存率动态计算，实时反映避险能力
- ✅ 位置系数覆盖全国400+城市
- ✅ 紧急警报系统，风险上升时自动提示

**心理作用**：
- 倒计时营造紧迫感
- 生存率提供量化安全感
- 风险等级提供真实感
- 资产展示提供拥有感

