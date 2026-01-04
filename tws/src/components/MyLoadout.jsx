import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck,
  Activity,
  Crosshair,
  Radio,
  Key,
  Gavel,
  TrendingUp,
  FlaskConical,
  Building2,
  Wheat,
  Wine,
  Palette,
  Database,
  Calendar,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  Loader
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMyAssetsAll, getMyPurchasedAssets, getMyAuctions, getMyBets, getMyInvestments, getPredictionMarkets } from '../utils/api';
import { useWallet } from '@solana/wallet-adapter-react';

const MyLoadout = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState('assets'); // assets, auctions, bets, investments
  
  // 数据状态
  const [purchasedAssets, setPurchasedAssets] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [bets, setBets] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [markets, setMarkets] = useState([]); // 预测市场信息
  const [counts, setCounts] = useState({ assets: 0, auctions: 0, bets: 0, investments: 0 });
  
  // 加载状态
  const [loading, setLoading] = useState(true);
  const [loadingTab, setLoadingTab] = useState(false);

  // 获取用户地址
  const getUserAddress = () => {
    return user?.address || publicKey?.toString() || null;
  };

  // 加载所有数据
  useEffect(() => {
    const loadAllData = async () => {
      const userAddress = getUserAddress();
      if (!userAddress) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // 并行加载资产数据和预测市场信息
        const [assetsResult, marketsResult] = await Promise.all([
          getMyAssetsAll(userAddress),
          getPredictionMarkets()
        ]);
        
        if (assetsResult.success && assetsResult.data) {
          setPurchasedAssets(assetsResult.data.purchasedAssets || []);
          setAuctions(assetsResult.data.auctions || []);
          setBets(assetsResult.data.bets || []);
          setInvestments(assetsResult.data.investments || []);
          setCounts(assetsResult.data.counts || { assets: 0, auctions: 0, bets: 0, investments: 0 });
        }
        
        if (marketsResult.success && marketsResult.data) {
          setMarkets(marketsResult.data || []);
        }
      } catch (error) {
        console.error('Error loading assets:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated || publicKey) {
      loadAllData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user, publicKey]);

  // 标签页配置
  const tabs = [
    { id: 'assets', label: '资产', icon: Key, count: counts.assets },
    { id: 'auctions', label: '拍卖', icon: Gavel, count: counts.auctions },
    { id: 'bets', label: '预测', icon: TrendingUp, count: counts.bets },
    { id: 'investments', label: '投资', icon: FlaskConical, count: counts.investments },
  ];

  // 获取资产类型图标
  const getAssetTypeIcon = (assetType) => {
    switch (assetType) {
      case '房产': return Building2;
      case '农田': return Wheat;
      case '酒水': return Wine;
      case '文创': return Palette;
      case '科创': return FlaskConical;
      default: return Database;
    }
  };

  // 获取资产类型颜色
  const getAssetTypeColor = (assetType) => {
    switch (assetType) {
      case '房产': return 'text-blue-400';
      case '农田': return 'text-green-400';
      case '酒水': return 'text-red-400';
      case '文创': return 'text-yellow-400';
      case '科创': return 'text-purple-400';
      default: return 'text-slate-400';
    }
  };

  // 格式化时间
  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 格式化金额
  const formatAmount = (amount) => {
    if (!amount) return '0';
    return Number(amount).toLocaleString('zh-CN');
  };

  // 渲染资产卡片
  const renderAssetCard = (asset) => {
    const AssetIcon = getAssetTypeIcon(asset.assetType || '房产');
    const assetColor = getAssetTypeColor(asset.assetType || '房产');
    
    return (
      <div
        key={asset.id}
        className="group relative bg-slate-900/50 border border-slate-700 hover:border-gold p-6 transition-all duration-300 hover:-translate-y-2 cursor-pointer"
        onClick={() => navigate(`/asset-detail/${asset.id}?type=${asset.assetType || '房产'}`)}
      >
        <div className="flex justify-between items-start mb-4">
          <span className="text-xs font-mono text-slate-500">ID: {asset.codeName || asset.id}</span>
          <span className="text-[10px] font-bold px-2 py-1 rounded bg-yellow-900 text-yellow-400">
            RESERVED
          </span>
        </div>

        <div className="h-24 bg-slate-800/50 mb-4 flex items-center justify-center overflow-hidden relative">
          <AssetIcon className={`${assetColor} opacity-20 w-16 h-16`} />
          <div className="absolute bottom-0 left-0 bg-black/60 px-2 text-[10px] text-white font-mono">
            {asset.location || asset.city || 'N/A'}
          </div>
        </div>

        <h3 className="text-xl font-bold text-white mb-2 font-mono truncate">
          {asset.title || asset.codeName || '未命名资产'}
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4 border-t border-slate-800 pt-4">
          <div>
            <div className="text-[10px] text-slate-500 uppercase">購買價格</div>
            <div className="text-cyan-400 font-mono">{formatAmount(asset.price || asset.tokenPrice)}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">購買時間</div>
            <div className="text-slate-400 font-mono text-xs">{formatTime(asset.purchasedAt)}</div>
          </div>
        </div>

        <button
          type="button"
          className="w-full py-3 bg-slate-800 hover:bg-gold hover:text-black text-white font-mono text-sm flex items-center justify-center transition-colors border border-slate-700 hover:border-gold group-hover:shadow-[0_0_20px_rgba(251,191,36,0.3)]"
        >
          查看詳情 <ArrowRight size={14} className="ml-2" />
        </button>
      </div>
    );
  };

  // 渲染拍卖卡片
  const renderAuctionCard = (auction) => {
    const isActive = auction.status === 'active';
    
    return (
      <div
        key={auction.assetId}
        className="group relative bg-slate-900/50 border border-slate-700 hover:border-gold p-6 transition-all duration-300 hover:-translate-y-2 cursor-pointer"
        onClick={() => navigate(`/auction/${auction.assetId}`)}
      >
        <div className="flex justify-between items-start mb-4">
          <span className="text-xs font-mono text-slate-500">AUCTION #{auction.assetId}</span>
          <span
            className={`text-[10px] font-bold px-2 py-1 rounded ${
              isActive
                ? 'bg-green-900 text-green-400'
                : 'bg-slate-800 text-slate-500'
            }`}
          >
            {isActive ? 'ACTIVE' : 'COMPLETED'}
          </span>
        </div>

        <div className="h-24 bg-slate-800/50 mb-4 flex items-center justify-center overflow-hidden relative">
          <Gavel className="text-amber-700 opacity-20 w-16 h-16" />
          <div className="absolute bottom-0 left-0 bg-black/60 px-2 text-[10px] text-white font-mono">
            {auction.location || 'N/A'}
          </div>
        </div>

        <h3 className="text-xl font-bold text-white mb-2 font-mono truncate">
          {auction.assetName || `Asset #${auction.assetId}`}
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4 border-t border-slate-800 pt-4">
          <div>
            <div className="text-[10px] text-slate-500 uppercase">當前價格</div>
            <div className="text-cyan-400 font-mono">{formatAmount(auction.price)} TOT</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">擁有時間</div>
            <div className="text-slate-400 font-mono text-xs">{formatTime(auction.lastSeizedAt || auction.createdAt)}</div>
          </div>
        </div>

        <button
          type="button"
          className="w-full py-3 bg-slate-800 hover:bg-gold hover:text-black text-white font-mono text-sm flex items-center justify-center transition-colors border border-slate-700 hover:border-gold group-hover:shadow-[0_0_20px_rgba(251,191,36,0.3)]"
        >
          查看拍賣 <ArrowRight size={14} className="ml-2" />
        </button>
      </div>
    );
  };

  // 渲染预测卡片
  const renderBetCard = (bet) => {
    const isYes = bet.direction === 'YES' || bet.direction === 'Yes';
    const statusConfig = {
      PENDING: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-900', label: '待結算' },
      WON: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900', label: '已獲勝' },
      LOST: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-900', label: '已失敗' },
      REFUNDED: { icon: CheckCircle, color: 'text-slate-400', bg: 'bg-slate-800', label: '已退款' }
    };
    const status = statusConfig[bet.status] || statusConfig.PENDING;
    
    // 查找对应的市场信息
    const market = markets.find(m => m.id === Number(bet.marketId) || m.id === bet.marketId);
    const marketQuestion = market?.question || `市場 #${bet.marketId}`;

    return (
      <div
        key={bet.id}
        className="group relative bg-slate-900/50 border border-slate-700 hover:border-gold p-6 transition-all duration-300 hover:-translate-y-2 cursor-pointer"
        onClick={() => navigate(`/predict`, { state: { startMarketId: bet.marketId } })}
      >
        <div className="flex justify-between items-start mb-4">
          <span className="text-xs font-mono text-slate-500">BET #{bet.id}</span>
          <div className="flex gap-2">
            <span
              className={`text-[10px] font-bold px-2 py-1 rounded ${
                isYes ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
              }`}
            >
              {isYes ? 'YES' : 'NO'}
            </span>
            <span className={`text-[10px] font-bold px-2 py-1 rounded ${status.bg} ${status.color}`}>
              {status.label}
            </span>
          </div>
        </div>

        <div className="h-24 bg-slate-800/50 mb-4 flex items-center justify-center overflow-hidden relative">
          <TrendingUp className="text-purple-700 opacity-20 w-16 h-16" />
        </div>

        <h3 className="text-lg font-bold text-white mb-2 font-mono line-clamp-2">
          {marketQuestion}
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4 border-t border-slate-800 pt-4">
          <div>
            <div className="text-[10px] text-slate-500 uppercase">下注金額</div>
            <div className="text-cyan-400 font-mono">{formatAmount(bet.amount)} TOT</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">下注時間</div>
            <div className="text-slate-400 font-mono text-xs">{formatTime(bet.timestamp)}</div>
          </div>
        </div>

        <button
          type="button"
          className="w-full py-3 bg-slate-800 hover:bg-gold hover:text-black text-white font-mono text-sm flex items-center justify-center transition-colors border border-slate-700 hover:border-gold group-hover:shadow-[0_0_20px_rgba(251,191,36,0.3)]"
        >
          查看預測 <ArrowRight size={14} className="ml-2" />
        </button>
      </div>
    );
  };

  // 渲染投资卡片
  const renderInvestmentCard = (investment) => {
    return (
      <div
        key={investment.id}
        className="group relative bg-slate-900/50 border border-slate-700 hover:border-gold p-6 transition-all duration-300 hover:-translate-y-2 cursor-pointer"
        onClick={() => navigate(`/tech-project/${investment.projectId}`)}
      >
        <div className="flex justify-between items-start mb-4">
          <span className="text-xs font-mono text-slate-500">INV #{investment.id}</span>
          <span
            className={`text-[10px] font-bold px-2 py-1 rounded ${
              investment.status === 'CONFIRMED'
                ? 'bg-green-900 text-green-400'
                : 'bg-yellow-900 text-yellow-400'
            }`}
          >
            {investment.status === 'CONFIRMED' ? '已確認' : '待確認'}
          </span>
        </div>

        <div className="h-24 bg-slate-800/50 mb-4 flex items-center justify-center overflow-hidden relative">
          <FlaskConical className="text-purple-700 opacity-20 w-16 h-16" />
        </div>

        <h3 className="text-lg font-bold text-white mb-2 font-mono line-clamp-2">
          {investment.projectName || `項目 #${investment.projectId}`}
        </h3>
        {investment.projectCodeName && (
          <p className="text-xs text-slate-500 mb-2 font-mono">{investment.projectCodeName}</p>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4 border-t border-slate-800 pt-4">
          <div>
            <div className="text-[10px] text-slate-500 uppercase">投資金額</div>
            <div className="text-cyan-400 font-mono">{formatAmount(investment.amount)} TOT</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">投資時間</div>
            <div className="text-slate-400 font-mono text-xs">{formatTime(investment.timestamp)}</div>
          </div>
        </div>

        <button
          type="button"
          className="w-full py-3 bg-slate-800 hover:bg-gold hover:text-black text-white font-mono text-sm flex items-center justify-center transition-colors border border-slate-700 hover:border-gold group-hover:shadow-[0_0_20px_rgba(251,191,36,0.3)]"
        >
          查看項目 <ArrowRight size={14} className="ml-2" />
        </button>
      </div>
    );
  };

  // 获取当前标签的数据
  const getCurrentData = () => {
    switch (activeTab) {
      case 'assets': return purchasedAssets;
      case 'auctions': return auctions;
      case 'bets': return bets;
      case 'investments': return investments;
      default: return [];
    }
  };

  // 渲染当前标签的内容
  const renderCurrentContent = () => {
    const data = getCurrentData();

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 text-slate-500 animate-spin" />
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <Database className="w-16 h-16 mb-4 opacity-50" />
          <p className="font-mono">暫無數據</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {activeTab === 'assets' && data.map(asset => renderAssetCard(asset))}
        {activeTab === 'auctions' && data.map(auction => renderAuctionCard(auction))}
        {activeTab === 'bets' && data.map(bet => renderBetCard(bet))}
        {activeTab === 'investments' && data.map(inv => renderInvestmentCard(inv))}
      </div>
    );
  };

  // 未登录状态
  if (!isAuthenticated && !publicKey) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <Key className="w-16 h-16 mx-auto mb-4 text-slate-500 opacity-50" />
          <p className="text-slate-400 mb-4 font-mono">請先登錄以查看您的資產</p>
          <button
            onClick={() => navigate('/')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded font-mono"
          >
            前往首頁
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-mono p-4 pb-24">
      {/* 顶部标题 */}
      <div className="mb-8">
        <h1 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tighter">
          MY <span className="text-gold">ASSETS</span>
        </h1>
        <p className="text-slate-400 font-mono text-sm">
          查看您參與的拍賣、預測和各類資產購買記錄
        </p>
      </div>

      {/* 标签页导航 */}
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded text-sm font-mono transition-all whitespace-nowrap
                ${isActive
                  ? 'bg-gold text-black font-bold'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
                }
              `}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`
                  px-2 py-0.5 rounded text-xs
                  ${isActive ? 'bg-black/20' : 'bg-slate-700'}
                `}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 内容区 */}
      <div className="min-h-[400px]">
        {renderCurrentContent()}
      </div>

      {/* 底部导航栏 */}
      <div className="fixed bottom-0 left-0 right-0 w-full bg-slate-950/90 backdrop-blur border-t border-slate-800 pb-safe pt-2 z-40">
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

          {/* Tab 3: 任务 */}
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
