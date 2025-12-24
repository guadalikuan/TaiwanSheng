import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldCheck,
  Crosshair, 
  Lock, 
  AlertTriangle, 
  Wifi, 
  Box, 
  Activity,
  MapPin,
  Zap,
  Radio
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getApprovedAssets } from '../utils/api';
import { mapAssetsToMarketFormat } from '../utils/assetMapper';

const BlackMarket = () => {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [isMinting, setIsMinting] = useState(false);
  const [serverTime, setServerTime] = useState(new Date().toLocaleTimeString());
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // 模拟服务器时间跳动
  useEffect(() => {
    const timer = setInterval(() => {
      setServerTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 从后端加载已审核通过的资产
  useEffect(() => {
    const loadAssets = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getApprovedAssets();
        if (response.success && response.assets) {
          const mappedAssets = mapAssetsToMarketFormat(response.assets);
          setAssets(mappedAssets);
        } else {
          // 如果没有数据，使用空数组
          setAssets([]);
        }
      } catch (err) {
        console.error('Error loading assets:', err);
        setError('加载资产数据失败，请检查后端服务是否运行');
        // 出错时使用空数组，不显示 mock 数据
        setAssets([]);
      } finally {
        setLoading(false);
      }
    };

    loadAssets();
  }, []);

  const handleMint = () => {
    setIsMinting(true);
    // 模拟铸造过程
    setTimeout(() => {
      setIsMinting(false);
      alert("ALLOCATION SECURED. ASSET ID: " + Math.floor(Math.random() * 99999));
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-black text-gray-300 font-mono p-4 pb-20 relative overflow-hidden">
      
      {/* 背景网格线 - 营造军事地图感 */}
      <div className="absolute inset-0 pointer-events-none opacity-10" 
           style={{backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px'}}>
      </div>

      {/* 顶部状态栏 */}
      <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4 relative z-10">
        <div className="flex items-center gap-2 text-red-500 animate-pulse">
          <Wifi size={16} />
          <span className="text-xs font-bold tracking-widest">LINK: ENCRYPTED</span>
        </div>
        <div className="text-xs text-gray-500">{serverTime} // ZONE: UTC+8</div>
      </header>

      {/* 核心功能：盲盒铸造 (The Gacha) */}
      <section className="mb-10 relative z-10">
        <div className="border border-amber-500/30 bg-amber-900/10 p-6 rounded-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 bg-amber-500 text-black text-xs px-2 py-1 font-bold">
            RECOMMENDED STRATEGY
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-2xl text-amber-500 font-bold mb-2 flex items-center gap-2">
                <Box /> RANDOM ALLOCATION
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                System will automatically assign optimal shelter based on current war-game simulations. 
                <br/>
                <span className="text-red-500 text-xs uppercase">Warning: High demand detected from Taipei Node.</span>
              </p>
              <div className="flex gap-4 text-xs font-bold text-amber-700">
                <span>PROBABILITY:</span>
                <span>S-TIER: 2%</span>
                <span>A-TIER: 18%</span>
                <span>B-TIER: 80%</span>
              </div>
            </div>

            <button 
              onClick={handleMint}
              disabled={isMinting}
              className={`
                px-8 py-6 bg-amber-600 hover:bg-amber-500 text-black font-black text-xl tracking-widest 
                border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]
                transition-all active:scale-95 flex items-center gap-3
                ${isMinting ? 'opacity-50 cursor-wait' : ''}
              `}
            >
              {isMinting ? (
                <>Running Protocol...</>
              ) : (
                <>
                  <Zap className="animate-bounce" />
                  SECURE NOW <br/> <span className="text-sm font-normal">100 USDT</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* 筛选栏 */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 relative z-10 no-scrollbar">
        {['ALL', 'NORTH-WEST', 'SOUTH-WEST', 'CENTRAL', 'COASTAL(RISKY)'].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-1 text-xs border transition-colors whitespace-nowrap ${
              activeFilter === filter 
                ? 'bg-gray-800 border-gray-500 text-white' 
                : 'border-gray-800 text-gray-600 hover:border-gray-600'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-800 text-red-400 text-sm relative z-10">
          <AlertTriangle size={16} className="inline mr-2" />
          {error}
        </div>
      )}

      {/* 资产列表 (The Black Market) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
        {loading ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Activity className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>加载资产数据中...</p>
          </div>
        ) : assets.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Box className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">暂无可用资产</p>
            <p className="text-sm">资产审核通过后将在此显示</p>
          </div>
        ) : (
          assets.map((asset) => (
          <div key={asset.id} className="bg-gray-900/80 border border-gray-800 hover:border-gray-600 transition-colors p-4 group">
            {/* 头部信息 */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">UNIT ID: {asset.id}</div>
                <div className="text-emerald-400 font-bold text-sm flex items-center gap-2">
                  <Shield size={14} />
                  {asset.sector}
                </div>
              </div>
              <div className={`text-xs px-2 py-0.5 border ${
                asset.status === 'CRITICAL' || asset.status === 'ALMOST GONE'
                  ? 'border-red-900 text-red-500 bg-red-900/20 animate-pulse'
                  : 'border-emerald-900 text-emerald-500'
              }`}>
                {asset.status}
              </div>
            </div>

            {/* 伪装成参数的房屋属性 */}
            <div className="grid grid-cols-2 gap-2 mb-4 text-xs border-t border-b border-gray-800 py-3">
              <div className="text-gray-500">CLASS</div>
              <div className="text-right text-gray-300">{asset.type}</div>
              
              <div className="text-gray-500">STRAT DEPTH</div>
              <div className="text-right text-gray-300">{asset.depth}</div>
              
              <div className="text-gray-500">DEFENSE RATING</div>
              <div className="text-right text-emerald-500">{asset.defense}</div>
            </div>

            {/* 焦虑进度条 */}
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">REMAINING CAPACITY</span>
                <span className="text-red-500">{asset.capacity}%</span>
              </div>
              <div className="w-full h-1 bg-gray-800">
                <div 
                  className="h-full bg-red-600" 
                  style={{width: `${asset.capacity}%`}}
                ></div>
              </div>
            </div>

            {/* 底部操作 */}
            <div className="flex justify-between items-center mt-auto">
              <div className="text-lg font-mono text-amber-500">
                {asset.price} <span className="text-xs text-gray-600">TWS</span>
              </div>
              <button className="p-2 border border-gray-700 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors group-hover:border-amber-500/50">
                <Crosshair size={20} />
              </button>
            </div>
          </div>
          ))
        )}
      </div>

      {/* 底部浮动通知 */}
      <div className="fixed bottom-4 left-4 right-4 bg-gray-900 border border-gray-800 p-3 flex items-center gap-3 text-xs z-50 shadow-2xl">
        <AlertTriangle size={14} className="text-amber-500" />
        <div className="flex-1 overflow-hidden">
          <div className="animate-marquee whitespace-nowrap text-gray-400">
            WARNING: INFLATION DETECTED IN SECTOR-CN-SW. ASSET VALUE +12% IN LAST HOUR.  ///  USER 0x77...2a JUST SECURED TYPE-A BUNKER.
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

          {/* Tab 2: 市场 (当前) */}
          <div className="flex flex-col items-center cursor-pointer text-emerald-500">
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

          {/* Tab 4: 身份 (确权) */}
          <div 
            onClick={() => navigate('/loadout')}
            className="flex flex-col items-center cursor-pointer text-slate-600 hover:text-slate-400 transition-colors"
          >
            <div className="w-6 h-6 rounded-full border-2 border-slate-600 flex items-center justify-center">
              <div className="w-3 h-3 bg-slate-600 rounded-full"></div>
            </div>
            <span className="text-[10px] mt-1 font-bold">ID</span>
          </div>

        </div>
      </div>

    </div>
  );
};

export default BlackMarket;

