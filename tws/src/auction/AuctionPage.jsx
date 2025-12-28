import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuctionHeader from './components/AuctionHeader';
import AuctionCard from './components/AuctionCard';
import BarrageSystem from './components/BarrageSystem';

// 资产信息（可以从后端或链上获取）
const ASSET_INFO = {
  id: 'TWS-ASSET-001',
  name: '桃园·背骨将军府',
  originalOwner: '前台军少将 于北辰',
  location: '桃园市桃园区 (战略要地)',
  imageUrl: '/images/house-demo.jpg',
  status: 'active',
};

export default function AuctionPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login?redirect=/auction');
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-tws-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-tws-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">验证身份中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // 会重定向到登录页
  }

  return (
    <div className="min-h-screen bg-blood-trail text-white font-sans selection:bg-tws-red selection:text-white relative overflow-hidden">
      {/* 背景氛围层 - 极简的网格背景，暗示数字化控制 */}
      <div 
        className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(#FFD700 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }}
      />
      
      {/* 额外的氛围效果：红色光晕 */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-tws-red/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-tws-gold/5 rounded-full blur-3xl pointer-events-none" />

      {/* 顶部导航栏 */}
      <AuctionHeader />

      {/* 主要内容区 - 强制单屏显示 */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pb-20 pt-24">
        {/* 顶部标语 - 挑衅与使命感 */}
        <div className="text-center mb-8 animate-fade-in-down">
          <div className="mb-2">
            <span className="text-sm text-gray-400 font-mono">TWS-ASSET-001</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-400 tracking-widest uppercase mb-2">
            Target Locked: <span className="text-white">Yu Bei-chen</span>
          </h2>
          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-tws-gold to-yellow-200 drop-shadow-[0_0_15px_rgba(255,215,0,0.5)] mb-2">
            ASSET LIQUIDATION
          </h1>
          <p className="text-tws-red font-bold text-lg italic mb-2">
            {ASSET_INFO.name}
          </p>
          <p className="mt-4 text-gray-500 text-sm max-w-md mx-auto">
            这是一场基于 <span className="text-tws-red font-bold">荷兰式博弈</span> 的资产重组。
            <br/>历史不会等待犹豫者。
          </p>
        </div>

        {/* 核心卡片 - 战场中心 */}
        <div className="w-full max-w-2xl transform transition-all hover:scale-[1.01]">
          <AuctionCard asset={ASSET_INFO} />
        </div>

        {/* 底部提示 - 增加紧迫感 */}
        <div className="mt-8 text-xs text-gray-600 font-mono text-center max-w-2xl">
          <p>⚠️ 警告：出价即视为签署《TWS 战后资产接收协议》</p>
          <p className="mt-1">Contract: {import.meta.env.VITE_SOLANA_NETWORK || 'devnet'} (Solana)</p>
        </div>
      </main>

      {/* 悬浮组件层 */}
      <BarrageSystem />
    </div>
  );
}

