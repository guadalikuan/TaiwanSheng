import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  MapPin, 
  Lock, 
  CreditCard, 
  Crosshair, 
  FileText,
  ChevronRight,
  Zap,
  Radio,
  AlertTriangle,
  TrendingUp,
  Users,
  Clock,
  Route,
  CheckCircle,
  Timer
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getHomepageAssets, getRiskData, getBunkerStats, getAssetScenario, getRefugeCapacity } from '../utils/api';

// 模拟组件：地堡主程序
const BunkerApp = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  
  // 核心状态：生存率 (0-100)
  // 初始设置为 34% (极度危险)，诱导用户行动
  const [survivalRate, setSurvivalRate] = useState(34);
  const [userBalance, setUserBalance] = useState(0);
  const [twsBalance, setTwsBalance] = useState(0); // TWS代币余额
  const [userAssets, setUserAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  
  // 新增：风险预警状态
  const [riskData, setRiskData] = useState(null);
  const [bunkerStats, setBunkerStats] = useState(null);
  const [selectedAssetScenario, setSelectedAssetScenario] = useState(null);
  const [showEmergencyAlert, setShowEmergencyAlert] = useState(false);

  // 计算生存率：基于TWS代币余额、用户资产数量和风险等级（完整避险逻辑）
  // 注意：优先使用后端API返回的完整计算结果，此函数仅作为备用
  const calculateSurvivalRate = (twsBalance, assets, riskLevel = 'MEDIUM') => {
    // 基础生存率
    const baseRate = 34;
    
    // 代币避险加成：每10,000 TWS = +1%，最高30%（与后端一致）
    const tokenBonus = Math.min((twsBalance || 0) / 10000, 30);
    
    // 房产避险加成（简化版，完整计算在后端）
    let assetBonus = 0;
    if (assets && assets.length > 0) {
      // 简化：每个资产基础 +15%（完整版包括位置和面积系数，由后端计算）
      assetBonus = assets.length * 15;
      // 限制最高加成（实际由后端精确计算）
      assetBonus = Math.min(assetBonus, 66);
    }
    
    // 组合加成：如果同时持有代币和房产，总加成提升10%
    let combinationBonus = 0;
    if (tokenBonus > 0 && assetBonus > 0) {
      combinationBonus = (tokenBonus + assetBonus) * 0.1;
    }
    
    // 风险惩罚
    const riskPenalty = {
      'CRITICAL': -20,
      'HIGH': -10,
      'MEDIUM': 0,
      'LOW': 5
    }[riskLevel] || 0;
    
    // 计算总生存率
    const totalRate = baseRate + tokenBonus + assetBonus + combinationBonus + riskPenalty;
    return Math.max(0, Math.min(100, totalRate));
  };

  // 加载用户数据
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setDataLoading(true);
        
        // 并行加载所有数据
        const [assetsResponse, riskResponse, statsResponse, capacityResponse] = await Promise.all([
          getHomepageAssets(),
          getRiskData(),
          getBunkerStats(),
          getRefugeCapacity(isAuthenticated ? user?.address : null)
        ]);
        
        // 加载资产列表
        if (assetsResponse && assetsResponse.success && assetsResponse.data) {
          const assets = assetsResponse.data.assets || [];
          setUserAssets(assets);
        }
        
        // 加载风险数据
        if (riskResponse && riskResponse.success && riskResponse.data) {
          setRiskData(riskResponse.data);
          
          // 检查是否需要显示紧急警报
          if (riskResponse.data.riskLevel === 'CRITICAL' || riskResponse.data.riskLevel === 'HIGH') {
            setShowEmergencyAlert(true);
          }
          
          // 根据风险等级、代币余额和资产重新计算生存率
          const assets = assetsResponse?.data?.assets || [];
          const calculatedRate = calculateSurvivalRate(twsBalance, assets, riskResponse.data.riskLevel);
          setSurvivalRate(calculatedRate);
        } else {
          // 如果没有风险数据，使用默认计算
          const assets = assetsResponse?.data?.assets || [];
          const calculatedRate = calculateSurvivalRate(twsBalance, assets);
          setSurvivalRate(calculatedRate);
        }
        
        // 加载TWS代币余额（如果已登录）
        if (isAuthenticated && user) {
          try {
            const balanceResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/token/balance/${user.address}`);
            if (balanceResponse.ok) {
              const balanceData = await balanceResponse.json();
              if (balanceData.success) {
                setTwsBalance(balanceData.balance || 0);
              }
            }
          } catch (error) {
            console.error('Failed to load TWS balance:', error);
          }
        }
        
        // 加载社区统计
        if (statsResponse && statsResponse.success && statsResponse.data) {
          setBunkerStats(statsResponse.data);
        }
        
        // 加载避险能力详情
        if (capacityResponse && capacityResponse.success && capacityResponse.data) {
          setRefugeCapacity(capacityResponse.data);
          // 使用服务器计算的生存率
          setSurvivalRate(capacityResponse.data.survivalRate);
        } else {
          // 如果没有服务器数据，使用本地计算
          const assets = assetsResponse?.data?.assets || [];
          const riskLevel = riskResponse?.data?.riskLevel || 'MEDIUM';
          const calculatedRate = calculateSurvivalRate(twsBalance, assets, riskLevel);
          setSurvivalRate(calculatedRate);
        }
        
        // 如果已登录，可以加载用户余额等信息
        if (isAuthenticated && user) {
          // TODO: 加载用户余额
          // const balanceResponse = await getUserBalance(user.address);
          // setUserBalance(balanceResponse.balance || 0);
        }
      } catch (error) {
        console.error('Failed to load bunker data:', error);
        // 保持默认值
      } finally {
        setDataLoading(false);
      }
    };

    // 等待认证状态加载完成
    if (!authLoading) {
      loadUserData();
    }
    
    // 每30秒刷新风险数据
    const riskInterval = setInterval(() => {
      getRiskData().then(response => {
        if (response && response.success && response.data) {
          setRiskData(response.data);
          // 动态调整生存率
          const assets = userAssets;
          const calculatedRate = calculateSurvivalRate(twsBalance, assets, response.data.riskLevel);
          setSurvivalRate(calculatedRate);
          
          // 检查紧急警报
          if (response.data.riskLevel === 'CRITICAL' || response.data.riskLevel === 'HIGH') {
            setShowEmergencyAlert(true);
          }
        }
      });
    }, 30000);
    
    return () => clearInterval(riskInterval);
  }, [isAuthenticated, user, authLoading, userAssets]);

  // 模拟启动时的系统自检效果（保持仪式感）
  useEffect(() => {
    // 如果数据加载完成，延迟显示内容（营造加载感）
    if (!dataLoading && !authLoading) {
      const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
    }
  }, [dataLoading, authLoading]);

  // 增加生存率的模拟函数 (充值/买房/做任务)
  const handleAction = (points) => {
    const newRate = Math.min(survivalRate + points, 100);
    setSurvivalRate(newRate);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-mono text-emerald-500">
        <Activity className="w-12 h-12 animate-pulse mb-4" />
        <div className="text-xs tracking-[0.2em]">正在建立安全連線...</div>
        <div className="mt-2 text-xs text-slate-500">節點：廈門_03 <span className="animate-ping">.</span></div>
      </div>
    );
  }

  // 获取风险等级颜色
  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'CRITICAL': return 'text-red-500 bg-red-900/30 border-red-500';
      case 'HIGH': return 'text-orange-500 bg-orange-900/30 border-orange-500';
      case 'MEDIUM': return 'text-yellow-500 bg-yellow-900/30 border-yellow-500';
      case 'LOW': return 'text-emerald-500 bg-emerald-900/30 border-emerald-500';
      default: return 'text-slate-500 bg-slate-900/30 border-slate-500';
    }
  };

  // 获取风险等级文本
  const getRiskText = (riskLevel) => {
    switch (riskLevel) {
      case 'CRITICAL': return '極度危險';
      case 'HIGH': return '高度風險';
      case 'MEDIUM': return '中等風險';
      case 'LOW': return '低風險';
      default: return '未知';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-mono pb-20 select-none">
      
      {/* 紧急通知系统 */}
      {showEmergencyAlert && riskData && (riskData.riskLevel === 'CRITICAL' || riskData.riskLevel === 'HIGH') && (
        <div className="bg-red-950/90 border-b-2 border-red-600 p-3 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <div className="text-sm font-bold text-red-400">⚠️ 系統警報：地緣政治風險上升</div>
              <div className="text-xs text-red-300">偵測到異常活動。您的生存率可能受到影響。</div>
            </div>
          </div>
          <button
            onClick={() => setShowEmergencyAlert(false)}
            className="text-red-400 hover:text-red-300 text-xs"
          >
            關閉
          </button>
        </div>
      )}

      {/* 顶部：用户信息栏 + 实时风险预警 */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="flex justify-between items-center p-4">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${survivalRate > 80 ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></div>
            <span className="text-xs text-slate-400">
              {isAuthenticated && user 
                ? `身份：${user.username || user.address?.slice(0, 8) || 'TWS-USER'}`
                : '身份：訪客模式'
              }
            </span>
        </div>
        <div className="text-xs text-gold text-yellow-500 border border-yellow-500/30 px-2 py-1 rounded">
            會員等級：{isAuthenticated ? (user?.role || '0') : '訪客'}
          </div>
        </div>
        
        {/* 实时风险预警 + 倒计时 */}
        {riskData && (
          <div className="px-4 pb-3 space-y-2">
            {/* 倒计时显示 */}
            {riskData.countdown && (
              <div className="bg-red-950/30 border border-red-800/50 rounded p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-bold text-red-400">倒計時剩餘</span>
                  </div>
                  <div className="text-xs font-mono text-red-300">
                    {riskData.countdown.daysRemaining}天 {riskData.countdown.hoursRemaining}时 {riskData.countdown.minutesRemaining}分
                  </div>
                </div>
                {riskData.countdown.daysRemaining <= 7 && (
                  <div className="mt-1 text-[10px] text-red-500 animate-pulse">
                    ⚠️ 倒计时接近，危机感上升！
                  </div>
                )}
              </div>
            )}
            
            {/* 风险等级 */}
            <div className={`flex items-center justify-between p-2 rounded border ${getRiskColor(riskData.riskLevel)}`}>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span className="text-xs font-bold">風險等級：{getRiskText(riskData.riskLevel)}</span>
                <span className="text-xs opacity-75">({riskData.riskScore}/100)</span>
              </div>
              <div className="text-[10px] opacity-60">
                {new Date(riskData.lastUpdate).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            {riskData.events && riskData.events.length > 0 && (
              <div className="mt-2 text-[10px] text-slate-500">
                最近事件：{riskData.events[0].description?.substring(0, 30)}...
              </div>
            )}
          </div>
        )}
      </div>

      {/* 核心仪表盘：生存率 */}
      <div className="p-6 flex flex-col items-center relative overflow-hidden">
        {/* 背景装饰网格 */}
        <div className="absolute inset-0 opacity-10" 
             style={{backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-4">當前生存機率</div>
          
          {/* 环形进度条模拟 */}
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
              <circle 
                cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" 
                strokeDasharray={552} 
                strokeDashoffset={552 - (552 * survivalRate) / 100}
                className={`${survivalRate > 60 ? 'text-emerald-500' : 'text-red-600'} transition-all duration-1000 ease-out`}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className={`text-5xl font-bold ${survivalRate > 60 ? 'text-emerald-400' : 'text-red-500'}`}>
                {survivalRate}%
              </span>
              <span className={`text-xs mt-1 px-2 py-0.5 rounded ${survivalRate > 60 ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400 blink'}`}>
                {survivalRate > 60 ? '安全' : '極度危險'}
              </span>
            </div>
          </div>

          <p className="mt-4 text-xs text-center max-w-[200px] text-slate-400">
            {riskData?.countdown && riskData.countdown.daysRemaining <= 30 ? (
              <span className="text-red-400">
                距離事件僅剩 <span className="font-mono font-bold">{riskData.countdown.daysRemaining}</span> 天
                <br />
                危機感：{riskData.countdown.daysRemaining <= 7 ? '極度危險' : riskData.countdown.daysRemaining <= 14 ? '高度危險' : '中等危險'}
              </span>
            ) : survivalRate > 60 ? (
              "系統已穩定。維持資產以保持狀態。"
            ) : (
              "警告：您的資產不足以應對事件。請立即獲取避難所。"
            )}
          </p>
          
          {/* 倒计时危机提示 */}
          {riskData?.countdown && riskData.countdown.daysRemaining <= 30 && (
            <div className="mt-3 px-3 py-2 bg-red-950/20 border border-red-800/50 rounded text-[10px] text-red-400">
              <div className="flex items-center gap-1 mb-1">
                <Timer className="w-3 h-3" />
                <span className="font-bold">倒計時警告</span>
              </div>
              <div>
                距離事件僅剩 <span className="font-mono font-bold">{riskData.countdown.daysRemaining}</span> 天
              </div>
              <div className="text-red-500 mt-1">
                危機感：{riskData.countdown.daysRemaining <= 7 ? '極度危險' : riskData.countdown.daysRemaining <= 14 ? '高度危險' : '中等危險'}
              </div>
            </div>
          )}
          
          {/* 避险能力详情（展开/收起） */}
          {refugeCapacity && (
            <div className="mt-4 w-full max-w-[280px]">
              <details className="text-[10px] text-slate-500">
                <summary className="cursor-pointer hover:text-slate-400 mb-2">查看避险能力详情</summary>
                <div className="bg-slate-900/50 rounded p-3 mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span>基础生存率：</span>
                    <span className="text-slate-400">{refugeCapacity.breakdown?.base || 34}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>代币避险加成：</span>
                    <span className="text-emerald-400">+{refugeCapacity.breakdown?.token || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>房产避险加成：</span>
                    <span className="text-blue-400">+{refugeCapacity.breakdown?.assets || 0}%</span>
                  </div>
                  {refugeCapacity.breakdown?.combination > 0 && (
                    <div className="flex justify-between">
                      <span>组合加成：</span>
                      <span className="text-yellow-400">+{refugeCapacity.breakdown.combination}%</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>风险惩罚：</span>
                    <span className="text-red-400">{refugeCapacity.breakdown?.risk || 0}%</span>
                  </div>
                  <div className="border-t border-slate-800 pt-1 mt-1 flex justify-between font-bold">
                    <span>总生存率：</span>
                    <span className={survivalRate > 60 ? 'text-emerald-400' : 'text-red-400'}>
                      {survivalRate}%
                    </span>
                  </div>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* 社区统计 */}
      {bunkerStats && (
        <div className="px-4 mb-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-slate-300">全平台統計</span>
              </div>
              <div className="text-xs text-slate-500">
                平均生存率：<span className="text-emerald-400 font-bold">{bunkerStats.platform?.avgSurvivalRate || 0}%</span>
                {bunkerStats.platform?.avgSurvivalRateChange > 0 && (
                  <span className="text-emerald-400 ml-1">↑ +{bunkerStats.platform.avgSurvivalRateChange}%</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500">
              <div>用戶數：{bunkerStats.platform?.totalUsers || 0}</div>
              <div>資產數：{bunkerStats.platform?.totalAssets || 0}</div>
            </div>
            {bunkerStats.recentActivity && bunkerStats.recentActivity.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-800">
                <div className="text-[10px] text-slate-500 mb-1">最近活動：</div>
                {bunkerStats.recentActivity.slice(0, 2).map((activity, idx) => (
                  <div key={idx} className="text-[10px] text-slate-600 mb-1">
                    • {activity.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 快速行动区 (Action Grid) */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          {/* 购买TWS代币 */}
          <button 
            onClick={() => navigate('/token-purchase')}
            className="bg-yellow-900/20 border border-yellow-800 hover:bg-yellow-900/40 active:scale-95 transition-all p-3 rounded flex flex-col items-center group"
          >
            <Zap className="w-6 h-6 text-yellow-500 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold text-yellow-100">購買代幣</span>
            <span className="text-[10px] text-yellow-400 mt-1">+5% per 1000</span>
          </button>

          {/* 购买房产 */}
          <button 
            onClick={() => navigate('/market')}
            className="bg-red-900/20 border border-red-800 hover:bg-red-900/40 active:scale-95 transition-all p-3 rounded flex flex-col items-center group"
          >
            <ShieldCheck className="w-6 h-6 text-red-500 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold text-red-100">購買房產</span>
            <span className="text-[10px] text-red-400 mt-1">+15% per 房產</span>
          </button>

          {/* 组合避险推荐 */}
          <button 
            onClick={() => navigate('/market')}
            className="bg-emerald-900/20 border border-emerald-800 hover:bg-emerald-900/40 active:scale-95 transition-all p-3 rounded flex flex-col items-center group"
          >
            <ShieldAlert className="w-6 h-6 text-emerald-500 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold text-emerald-100">組合避險</span>
            <span className="text-[10px] text-emerald-400 mt-1">最大化效果</span>
          </button>
        </div>
      </div>

      {/* 资产金库 (Vault) */}
      <div className="px-4 pb-20">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-slate-400 flex items-center">
            <Lock className="w-3 h-3 mr-2" />
            資產金庫
          </h3>
          <span className="text-xs text-slate-600">透過 TWS 鏈加密</span>
        </div>

        <div className="space-y-3">
          {/* 资产卡片 1: TWS代币 */}
          <div className="bg-slate-900 border border-slate-800 rounded p-4 flex justify-between items-center shadow-lg">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center mr-3 border border-slate-700">
                <Zap className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">TWS 代幣</div>
                <div className="text-xs text-slate-500">
                  餘額：{refugeCapacity?.tokenBalance?.toLocaleString() || twsBalance.toLocaleString() || '0'}
                </div>
                <div className="text-[10px] text-slate-600 mt-1">
                  每 10,000 TWS = +1%（最高+30%）
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono text-emerald-400">
                +{refugeCapacity?.breakdown?.token?.toFixed(1) || Math.min((twsBalance / 10000), 30).toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-600">代币避险</div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/market');
                }}
                className="mt-2 px-2 py-1 bg-yellow-700 hover:bg-yellow-600 text-white text-[10px] font-bold rounded"
              >
                購買代幣
              </button>
            </div>
          </div>

          {/* 资产卡片 2: 房产 */}
          {userAssets.length > 0 ? (
            // 已拥有资产：显示资产列表
            userAssets.slice(0, 3).map((asset, index) => (
              <div 
                key={asset.id || index} 
                className="bg-slate-900 border-l-4 border-l-red-600 border-y border-r border-slate-800 rounded p-4 flex justify-between items-center cursor-pointer hover:bg-slate-800 transition-all"
                onClick={async () => {
                  // 加载资产的真实避难场景
                  try {
                    const scenarioResponse = await getAssetScenario(asset.id);
                    if (scenarioResponse && scenarioResponse.success) {
                      setSelectedAssetScenario(scenarioResponse.data);
                    }
                  } catch (error) {
                    console.error('Failed to load scenario:', error);
                  }
                }}
              >
                <div className="flex items-center flex-1 min-w-0">
                  <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    <FileText className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-slate-500 uppercase truncate">產權編號</div>
                    <div className="text-sm font-mono text-white tracking-widest truncate">
                      {asset.title || asset.codeName || 'UNKNOWN'}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{asset.city || 'Unknown'}</div>
                    {refugeCapacity?.assetDetails?.find(d => d.id === asset.id) && (
                      <div className="text-[10px] text-blue-400 mt-1">
                        避险加成：+{refugeCapacity.assetDetails.find(d => d.id === asset.id).bonus}%
                      </div>
                    )}
                  </div>
                </div>
                <div className="px-2 py-1 bg-emerald-900/30 border border-emerald-800 rounded text-[10px] text-emerald-500 flex-shrink-0 ml-2">
                  {asset.status === 'AVAILABLE' ? '已驗證' : '待審核'}
                </div>
              </div>
            ))
          ) : (
            // 未拥有资产：显示获取提示
          <div className="bg-red-950/10 border border-dashed border-red-900/60 rounded p-4 flex justify-between items-center group cursor-pointer hover:bg-red-950/20 transition-all">
            <div className="flex items-center opacity-80">
              <div className="w-10 h-10 bg-red-900/20 rounded-full flex items-center justify-center mr-3">
                <FileText className="w-5 h-5 text-red-600 animate-pulse" />
              </div>
              <div>
                <div className="text-sm font-bold text-red-500 group-hover:text-red-400 transition-colors">
                  未獲取避難所
                </div>
                <div className="text-xs text-red-800 group-hover:text-red-600">
                  風險等級：極度危險
                </div>
              </div>
            </div>
            <button 
              onClick={() => navigate('/market')}
              className="bg-red-700 hover:bg-red-600 text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-[0_0_10px_rgba(220,38,38,0.5)] animate-pulse"
            >
              獲取
            </button>
          </div>
          )}

          {/* 模拟已购买状态 (注释掉，供演示用) */}
          {/* 
          <div className="bg-slate-900 border-l-4 border-l-red-600 border-y border-r border-slate-800 rounded p-4 flex justify-between items-center">
            <div className="flex items-center">
              <div className="mr-3">
                <div className="text-[10px] text-slate-500 uppercase">產權編號</div>
                <div className="text-sm font-mono text-white tracking-widest">CN-FUJ-8901</div>
              </div>
            </div>
            <div className="px-2 py-1 bg-emerald-900/30 border border-emerald-800 rounded text-[10px] text-emerald-500">
              已驗證
            </div>
          </div> 
          */}

        </div>
      </div>

      {/* 真实避难场景展示（模态框） */}
      {selectedAssetScenario && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedAssetScenario(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">緊急情況預案</h3>
              <button
                onClick={() => setSelectedAssetScenario(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* 位置信息 */}
              <div className="bg-slate-800/50 rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold text-white">位置</span>
                </div>
                <div className="text-xs text-slate-300">
                  {selectedAssetScenario.location?.city || 'Unknown'}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  距離台灣：{selectedAssetScenario.route?.distance || 'Unknown'}
                </div>
              </div>
              
              {/* 到达路线 */}
              <div className="bg-slate-800/50 rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Route className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-bold text-white">到達路線</span>
                </div>
                {selectedAssetScenario.route?.steps?.map((step, idx) => (
                  <div key={idx} className="text-xs text-slate-300 mb-1">
                    {idx + 1}. {step.location} → {step.method} ({step.time})
                  </div>
                ))}
                <div className="text-xs text-emerald-400 mt-2">
                  總時間：{selectedAssetScenario.route?.totalTime || 'Unknown'}
                </div>
              </div>
              
              {/* 准备状态 */}
              <div className="bg-slate-800/50 rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold text-white">準備狀態</span>
                </div>
                <div className="text-xs text-slate-300">
                  <div>物資：{selectedAssetScenario.preparation?.supplies || 'Unknown'}</div>
                  <div>設施：{selectedAssetScenario.preparation?.facilities || 'Unknown'}</div>
                  <div className="text-emerald-400 mt-1">
                    {selectedAssetScenario.preparation?.notes || '準備就緒'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 底部导航栏 (Footer) */}
      <div className="fixed bottom-0 w-full bg-slate-950/90 backdrop-blur border-t border-slate-800 pb-safe pt-2">
        <div className="flex justify-around items-center pb-2">
          
          {/* Tab 0: 首页 */}
          <div 
            onClick={() => navigate('/')}
            className="flex flex-col items-center cursor-pointer text-slate-600 hover:text-slate-400 transition-colors"
          >
            <Radio className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-bold">首頁</span>
          </div>

          {/* Tab 1: 地堡 (当前) */}
          <div className="flex flex-col items-center cursor-pointer text-emerald-500">
            <ShieldCheck className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-bold">地堡</span>
          </div>

          {/* Tab 2: 市场 (走势) */}
          <div 
            onClick={() => navigate('/market')}
            className="flex flex-col items-center cursor-pointer text-slate-600 hover:text-slate-400 transition-colors"
          >
            <Activity className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-bold">市場</span>
          </div>

          {/* Tab 3: 任务 (拉新) */}
          <div 
            onClick={() => navigate('/agent')}
            className="flex flex-col items-center cursor-pointer text-slate-600 hover:text-slate-400 transition-colors"
          >
            <div className="relative">
              <Crosshair className="w-6 h-6" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
            </div>
            <span className="text-[10px] mt-1 font-bold">任務</span>
          </div>

          {/* Tab 4: 身份 (确权) */}
          <div 
            onClick={() => navigate('/loadout')}
            className="flex flex-col items-center cursor-pointer text-slate-600 hover:text-slate-400 transition-colors"
          >
            <div className="w-6 h-6 rounded-full border-2 border-slate-600 flex items-center justify-center">
              <div className="w-3 h-3 bg-slate-600 rounded-full"></div>
            </div>
            <span className="text-[10px] mt-1 font-bold">身份</span>
          </div>

        </div>
      </div>

    </div>
  );
};

export default BunkerApp;

