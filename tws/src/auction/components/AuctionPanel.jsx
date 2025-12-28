import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuction } from '../hooks/useAuction';
import TauntInput from './TauntInput';
import { soundManager } from '../utils/soundManager';

// API 基础 URL
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');

export default function AuctionPanel({ asset }) {
  const { 
    currentPrice, 
    highestBidder, 
    ownershipDuration,
    startPrice,
    connected,
    isPlacingBid,
    nextBidAmount,
    userBalance,
    placeBid 
  } = useAuction();

  const [showTauntInput, setShowTauntInput] = useState(false);
  const [bidHistory, setBidHistory] = useState([]);

  // 从数据库加载出价历史
  useEffect(() => {
    const fetchBidHistory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auction/history?limit=20`);
        const result = await response.json();
        if (result.success && result.data) {
          setBidHistory(result.data);
        }
      } catch (error) {
        console.error('Error fetching bid history:', error);
      }
    };
    
    fetchBidHistory();
    
    // 每5秒刷新一次
    const interval = setInterval(fetchBidHistory, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBid = async () => {
    // 只有在已连接钱包时才会显示此按钮，所以不需要检查 connected 状态
    setShowTauntInput(true);
  };

  const handleConfirmBid = async (message) => {
    setShowTauntInput(false);
    soundManager.playHammer();
    
    const result = await placeBid(message);
    
    if (result.success) {
      soundManager.playCoin();
      // 触发震动效果事件
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auction:bidSuccess'));
        if (window.addBarrageMessage) {
          window.addBarrageMessage(
            highestBidder,
            `刚刚溢价 10% 强行接管！价格 ${nextBidAmount.toLocaleString()} TWS`
          );
        }
      }
    } else {
      alert(result.error || '出价失败，请重试');
    }
  };

  const priceIncrease = ((currentPrice - startPrice) / startPrice) * 100;

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      {/* 拍卖操作区 */}
      <div className="mb-4 pb-4 border-b border-gray-800">
        <h3 className="text-sm font-bold text-tws-gold uppercase tracking-wider mb-4">
          ⚡ 立即出价
        </h3>
        
        {/* 当前价格 */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-1">当前价格</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-tws-gold tabular-nums">
              {currentPrice.toLocaleString()}
            </span>
            <span className="text-sm font-bold text-tws-red">TWS</span>
          </div>
          <p className="text-xs text-tws-green mt-1">
            涨幅 +{priceIncrease.toFixed(1)}%
          </p>
        </div>

        {/* 下一出价 */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-1">下一出价</p>
          <p className="text-xl font-bold text-white">
            {nextBidAmount.toLocaleString()} TWS
          </p>
        </div>

        {/* 用户余额（如果已连接） */}
        {connected && (
          <div className="mb-4 p-2 bg-tws-dark-red/30 border border-tws-gold/30 rounded">
            <p className="text-xs text-gray-400 mb-1">我的余额</p>
            <p className="text-lg font-bold text-tws-gold">
              {userBalance.toLocaleString()} TWS
            </p>
          </div>
        )}

        {/* 出价按钮 */}
        {connected ? (
          <button
            onClick={handleBid}
            disabled={isPlacingBid}
            className={`
              w-full py-3 px-4 rounded-lg font-black text-lg uppercase tracking-wider transition-all duration-100
              ${isPlacingBid
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-tws-red hover:bg-red-600 hover:scale-[1.02] active:scale-95 text-white shadow-[0_0_20px_rgba(211,47,47,0.6)]'}
            `}
          >
            {isPlacingBid ? '处理中...' : '💥 立即出价'}
          </button>
        ) : (
          <div className="w-full py-3 px-4 rounded-lg bg-gray-800/50 border border-gray-700 text-center">
            <p className="text-sm text-gray-400 mb-2">
              💡 请先连接钱包
            </p>
            <p className="text-xs text-gray-500">
              点击右上角的红色按钮连接 Solana 钱包
            </p>
          </div>
        )}

        {/* 统治时长 */}
        <div className="mt-4 p-2 bg-tws-dark-red/30 border border-tws-red/30 rounded">
          <p className="text-xs text-gray-400 mb-1">统治时长</p>
          <p className="text-sm font-mono text-tws-gold">
            {formatDuration(ownershipDuration)}
          </p>
        </div>
      </div>

      {/* 拍卖记录 */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <h3 className="text-sm font-bold text-tws-gold uppercase tracking-wider mb-3 sticky top-0 bg-tws-black/80 backdrop-blur-sm pb-2">
          📜 出价记录
        </h3>
        <div className="space-y-2">
          {bidHistory.length > 0 ? (
            bidHistory.map((bid) => {
              // 格式化用户地址显示
              const displayUser = bid.user && bid.user.length > 10 
                ? `${bid.user.slice(0, 6)}...${bid.user.slice(-4)}`
                : bid.user || 'Unknown';
              
              return (
                <div
                  key={bid.id}
                  className="bg-black/40 border border-gray-800 rounded p-3 text-xs"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono text-tws-gold font-bold">{displayUser}</span>
                    <span className="text-gray-500">{bid.time}</span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white font-bold">{Number(bid.amount).toLocaleString()} TWS</span>
                    <span className="text-tws-green">+10%</span>
                  </div>
                  {bid.taunt && (
                    <p className="text-gray-400 italic text-[10px] mt-1">"{bid.taunt}"</p>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              暂无出价记录
            </div>
          )}
        </div>
      </div>

      {/* 留言输入弹窗 */}
      <AnimatePresence>
        {showTauntInput && (
          <TauntInput
            onConfirm={handleConfirmBid}
            onCancel={() => setShowTauntInput(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

