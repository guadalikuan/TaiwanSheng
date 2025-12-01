import React, { useState } from 'react';
import { 
  Shield, 
  Key, 
  RefreshCw, 
  TrendingUp, 
  Lock, 
  Zap, 
  AlertOctagon,
  ChevronRight,
  Database,
  ShieldCheck,
  Activity,
  Crosshair,
  Radio
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MyLoadout = () => {
  const navigate = useNavigate();
  
  // 模拟用户总资产
  const [totalWorth] = useState("145,200");
  const [unclaimYield] = useState("842.50");

  // 模拟持有的资产列表
  const [myAssets] = useState([
    {
      id: 'NW-0921',
      name: 'TYPE-C SHELTER / UNIT-404',
      location: 'SECTOR-CN-NW (Shanxi Node)',
      level: 1,
      integrity: 94, // 房屋状况被包装成"完整度"
      yieldRate: '4.2%',
      isStaked: true,
      imageColor: 'bg-emerald-900/40'
    },
    {
      id: 'SW-0884',
      name: 'TYPE-A BUNKER / UNIT-102',
      location: 'SECTOR-CN-SW (Sichuan Node)',
      level: 3,
      integrity: 100,
      yieldRate: '8.5%',
      isStaked: true,
      imageColor: 'bg-amber-900/40'
    }
  ]);

  const handleUpgrade = (assetId) => {
    // 模拟升级功能
    alert(`UPGRADE INITIATED for ${assetId}. Cost: 50 TWS`);
  };

  const handleBoostYield = (assetId) => {
    // 模拟收益提升功能
    alert(`YIELD BOOST ACTIVATED for ${assetId}. Cost: 100 TWS`);
  };

  const handleClaim = () => {
    // 模拟领取收益功能
    alert(`CLAIMED ${unclaimYield} USDT`);
  };

  const handleLiquidation = () => {
    // 显示确认对话框
    const confirmed = window.confirm(
      'WARNING: Selling assets during DEFCON-3 status will result in a 30% penalty fee.\n\n' +
      'Are you sure you want to proceed with liquidation?'
    );
    if (confirmed) {
      alert('LIQUIDATION ORDER INITIATED. Assets will be returned to the Black Market.');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-mono p-4 pb-24">
      
      {/* 1. 总资产仪表盘：制造财富幻觉 */}
      <section className="mb-8 p-4 border border-gray-800 bg-gray-900/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
        <div className="flex justify-between items-end mb-2">
          <span className="text-xs text-gray-500 tracking-widest">TOTAL NET WORTH</span>
          <span className="text-xs text-emerald-500 flex items-center gap-1">
            <TrendingUp size={12} /> +12.4% (24H)
          </span>
        </div>
        <div className="text-4xl font-black text-white tracking-tighter flex items-baseline gap-2">
          {totalWorth} <span className="text-sm text-amber-500 font-normal">TWS</span>
        </div>
        
        {/* 未领取收益 - 诱导操作 */}
        <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between items-center">
          <div>
            <div className="text-xs text-gray-500 mb-1">UNCLAIMED RATIONS (YIELD)</div>
            <div className="text-xl text-emerald-400 font-bold">{unclaimYield} <span className="text-xs">USDT</span></div>
          </div>
          <button 
            onClick={handleClaim}
            className="px-4 py-2 bg-emerald-900/30 border border-emerald-600 text-emerald-400 text-xs font-bold hover:bg-emerald-800/50 transition-all flex items-center gap-2"
          >
            <RefreshCw size={12} className="animate-spin-slow" />
            CLAIM
          </button>
        </div>
      </section>

      {/* 2. 资产列表 (Inventory) */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Database size={18} className="text-amber-500"/> 
          MY LOADOUT <span className="text-xs text-gray-600">({myAssets.length})</span>
        </h2>
        <span className="text-xs text-gray-500">SYNCED</span>
      </div>

      <div className="space-y-4">
        {myAssets.map((asset) => (
          <div key={asset.id} className="bg-gray-900 border border-gray-800 hover:border-gray-600 transition-all relative group">
            
            {/* 资产状态条 */}
            <div className="h-1 w-full bg-gray-800">
              <div className={`h-full ${asset.integrity > 90 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{width: `${asset.integrity}%`}}></div>
            </div>

            <div className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${asset.imageColor} border border-white/10 flex items-center justify-center`}>
                    <Key size={16} className="text-white/70" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{asset.name}</div>
                    <div className="text-xs text-gray-500">{asset.location}</div>
                  </div>
                </div>
                {asset.isStaked && (
                  <div className="flex items-center gap-1 text-[10px] border border-amber-500/30 text-amber-500 px-2 py-1 bg-amber-900/10">
                    <Lock size={10} />
                    DEPLOYED
                  </div>
                )}
              </div>

              {/* 核心属性网格 */}
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-black/30 p-2 rounded">
                  <div className="text-[10px] text-gray-500">DEF LEVEL</div>
                  <div className="text-sm font-bold text-white">LV.{asset.level}</div>
                </div>
                <div className="bg-black/30 p-2 rounded">
                  <div className="text-[10px] text-gray-500">INTEGRITY</div>
                  <div className="text-sm font-bold text-emerald-400">{asset.integrity}%</div>
                </div>
                <div className="bg-black/30 p-2 rounded">
                  <div className="text-[10px] text-gray-500">APY</div>
                  <div className="text-sm font-bold text-amber-400">{asset.yieldRate}</div>
                </div>
              </div>

              {/* 3. 行动按钮：这是二次收割的关键 */}
              <div className="flex gap-2">
                <button 
                  onClick={() => handleUpgrade(asset.id)}
                  className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-bold border border-gray-700 flex items-center justify-center gap-2"
                >
                  <Shield size={12} />
                  UPGRADE
                </button>
                <button 
                  onClick={() => handleBoostYield(asset.id)}
                  className="flex-1 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 text-xs font-bold border border-amber-600/50 flex items-center justify-center gap-2"
                >
                  <Zap size={12} />
                  BOOST YIELD
                </button>
              </div>
            </div>

            {/* 右侧装饰箭头 */}
            <div className="absolute top-1/2 right-2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="text-gray-600" />
            </div>
          </div>
        ))}
      </div>

      {/* 4. 底部：紧急清算入口 (Paper Hand Test) */}
      <div className="mt-8 border border-red-900/30 bg-red-900/10 p-4">
        <div className="flex items-start gap-3">
          <AlertOctagon className="text-red-600 shrink-0" size={20} />
          <div>
            <h3 className="text-sm font-bold text-red-500 mb-1">EMERGENCY LIQUIDATION</h3>
            <p className="text-xs text-red-400/70 mb-3 leading-relaxed">
              Warning: Selling assets during DEFCON-3 status will result in a 30% penalty fee. Assets will be returned to the Black Market immediately.
            </p>
            <button 
              onClick={handleLiquidation}
              className="w-full py-2 border border-red-800 text-red-600 text-xs hover:bg-red-900/20 transition-colors"
            >
              INITIATE SELL ORDER (PENALTY APPLIES)
            </button>
          </div>
        </div>
      </div>

      {/* 底部导航栏 */}
      <div className="fixed bottom-0 w-full bg-slate-950/90 backdrop-blur border-t border-slate-800 pb-safe pt-2 z-40">
        <div className="flex justify-around items-center pb-2">
          
          {/* Tab 0: 首页 */}
          <div 
            onClick={() => navigate('/')}
            className="flex flex-col items-center cursor-pointer text-slate-600 hover:text-slate-400 transition-colors"
          >
            <Radio className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-bold">HOME</span>
          </div>

          {/* Tab 1: 地堡 */}
          <div 
            onClick={() => navigate('/bunker')}
            className="flex flex-col items-center cursor-pointer text-slate-600 hover:text-slate-400 transition-colors"
          >
            <ShieldCheck className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-bold">BUNKER</span>
          </div>

          {/* Tab 2: 市场 */}
          <div 
            onClick={() => navigate('/market')}
            className="flex flex-col items-center cursor-pointer text-slate-600 hover:text-slate-400 transition-colors"
          >
            <Activity className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-bold">MARKET</span>
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
            <span className="text-[10px] mt-1 font-bold">OPS</span>
          </div>

          {/* Tab 4: 身份 (确权) - 当前页面 */}
          <div className="flex flex-col items-center cursor-pointer text-emerald-500">
            <div className="w-6 h-6 rounded-full border-2 border-emerald-500 flex items-center justify-center">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
            </div>
            <span className="text-[10px] mt-1 font-bold">ID</span>
          </div>

        </div>
      </div>

    </div>
  );
};

export default MyLoadout;

