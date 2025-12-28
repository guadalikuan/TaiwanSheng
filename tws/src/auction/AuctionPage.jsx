import AuctionHeader from './components/AuctionHeader';
import AuctionCard from './components/AuctionCard';
import BarrageSystem from './components/BarrageSystem';
import AuctionPanel from './components/AuctionPanel';

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
  // 移除登录检查，允许游客直接访问

  return (
    <div className="h-screen bg-blood-trail text-white font-sans selection:bg-tws-red selection:text-white relative overflow-hidden flex flex-col">
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

      {/* 三栏主内容区 - 强制一屏显示 */}
      <main className="flex-1 relative z-10 flex overflow-hidden pt-16">
        {/* 左侧：弹幕系统 */}
        <div className="w-80 border-r border-gray-800/50 flex-shrink-0">
          <BarrageSystem />
        </div>

        {/* 中间：拍品展示 */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
          <div className="w-full max-w-2xl">
            <AuctionCard asset={ASSET_INFO} />
          </div>
        </div>

        {/* 右侧：拍卖操作和记录 */}
        <div className="w-96 border-l border-gray-800/50 flex-shrink-0 overflow-hidden">
          <AuctionPanel asset={ASSET_INFO} />
        </div>
      </main>
    </div>
  );
}

