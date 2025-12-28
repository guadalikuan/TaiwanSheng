import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuction } from '../hooks/useAuction';
import TauntInput from './TauntInput';
import { soundManager } from '../utils/soundManager';

export default function AuctionCard({ asset }) {
  const { 
    currentPrice, 
    highestBidder, 
    tauntMessage, 
    ownershipDuration,
    startPrice,
    connected,
    isPlacingBid,
    nextBidAmount,
    userBalance,
    placeBid 
  } = useAuction();

  const [isPulsing, setIsPulsing] = useState(false);
  const [showTauntInput, setShowTauntInput] = useState(false);
  const [priceDisplay, setPriceDisplay] = useState(currentPrice);

  // 价格滚动动画效果
  useEffect(() => {
    if (priceDisplay !== currentPrice) {
      const diff = currentPrice - priceDisplay;
      const steps = 20;
      const stepSize = diff / steps;
      let current = priceDisplay;
      
      const interval = setInterval(() => {
        current += stepSize;
        if ((stepSize > 0 && current >= currentPrice) || (stepSize < 0 && current <= currentPrice)) {
          current = currentPrice;
          clearInterval(interval);
        }
        setPriceDisplay(Math.floor(current));
      }, 30);

      return () => clearInterval(interval);
    }
  }, [currentPrice, priceDisplay]);

  // 格式化持有时长
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}时${minutes.toString().padStart(2, '0')}分${secs.toString().padStart(2, '0')}秒`;
    }
    return `${minutes.toString().padStart(2, '0')}分${secs.toString().padStart(2, '0')}秒`;
  };

  // 计算涨幅
  const priceIncrease = ((currentPrice - startPrice) / startPrice) * 100;

  const handleBid = async () => {
    if (!connected) {
      alert("请先连接 Solana 钱包，获取掠夺资格！");
      return;
    }

    // 显示留言输入框
    setShowTauntInput(true);
  };

  const handleConfirmBid = async (message) => {
    setShowTauntInput(false);
    
    // 播放重锤音效
    soundManager.playHammer();
    
    // 触发震动特效
    setIsPulsing(true);
    setTimeout(() => setIsPulsing(false), 500);

    // 执行出价
    const result = await placeBid(message);
    
    if (result.success) {
      // 播放成功音效
      soundManager.playCoin();
      // 触发弹幕消息
      if (typeof window !== 'undefined' && window.addBarrageMessage) {
        window.addBarrageMessage(
          highestBidder,
          `刚刚溢价 10% 强行接管！价格 ${nextBidAmount.toLocaleString()} TWS`
        );
      }
    } else {
      alert(result.error || '出价失败，请重试');
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto mt-8">
      {/* 查封封条 - 纯CSS实现 */}
      <div className="absolute -top-4 -left-4 z-20 transform -rotate-12 bg-tws-red text-white px-4 py-1 font-bold text-lg shadow-lg border-2 border-white">
        ASSET SEIZED | 资产查封
      </div>

      {/* 溢价提示 - 动态出现 */}
      <AnimatePresence>
        {isPulsing && (
          <motion.div 
            initial={{ opacity: 0, y: 0, scale: 0.8 }}
            animate={{ opacity: 1, y: -50, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-4xl font-black text-tws-gold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pointer-events-none"
          >
            +10% DOMINANCE!
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主卡片容器 */}
      <div className={`
        relative bg-tws-card border-4 border-tws-red rounded-xl overflow-hidden shadow-[0_0_30px_rgba(211,47,47,0.4)]
        ${isPulsing ? 'animate-shake ring-4 ring-tws-gold' : ''}
      `}>
        {/* 房产图片区域 */}
        <div className="relative h-64 w-full bg-gray-800">
          {/* 资产图片占位符 */}
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            <span className="text-6xl">🏠</span>
          </div>
          
          {/* AR 瞄准镜效果 */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-4 border-tws-red rounded-full opacity-50">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-tws-red rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* 嘲讽横幅 */}
          {tauntMessage && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm border-2 border-tws-gold px-4 py-2 rounded">
              <p className="text-tws-gold font-bold text-sm">{tauntMessage}</p>
            </div>
          )}

          {/* 原主照片（打X） */}
          <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm border-2 border-tws-red p-2 rounded">
            <div className="relative">
              <div className="w-16 h-16 bg-gray-700 rounded flex items-center justify-center text-2xl">
                👤
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-tws-red text-3xl font-black">✕</span>
              </div>
            </div>
            <p className="text-xs text-white mt-1 text-center">{asset.originalOwner}</p>
          </div>
          
          {/* 实时状态覆盖层 */}
          <div className="absolute bottom-0 w-full bg-gradient-to-t from-black to-transparent p-4 pt-12">
            <h2 className="text-3xl font-black text-white italic tracking-tighter">
              {asset.name}
            </h2>
            <p className="text-tws-red font-bold text-sm uppercase tracking-widest">
              原主: <span className="line-through decoration-2">{asset.originalOwner}</span>
            </p>
          </div>
        </div>

        {/* 数据面板 */}
        <div className="p-6 space-y-6">
          {/* 价格展示 - 核心视觉点 */}
          <div className="flex justify-between items-end border-b border-gray-700 pb-4">
            <div>
              <p className="text-gray-400 text-xs uppercase">Current Bid (当前出价)</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-tws-gold tabular-nums tracking-tight">
                  {priceDisplay.toLocaleString()}
                </span>
                <span className="text-xl font-bold text-tws-red">TWS</span>
              </div>
              <p className="text-tws-green text-sm mt-1">
                较起拍价涨幅 +{priceIncrease.toFixed(1)}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-xs uppercase">Dominator (霸主)</p>
              <p className="text-white font-mono font-bold bg-tws-dark-red px-2 py-1 rounded">
                {highestBidder}
              </p>
              <p className="text-tws-gold text-xs mt-1">【临时堡主】</p>
            </div>
          </div>

          {/* 统治时长和余额 */}
          <div className="flex justify-center gap-4">
            <div className="bg-tws-dark-red/50 border border-tws-red/50 rounded-lg px-4 py-2">
              <p className="text-gray-400 text-xs uppercase">统治时长</p>
              <p className="text-tws-gold font-mono text-lg">
                已霸占：{formatDuration(ownershipDuration)}
              </p>
            </div>
            {connected && (
              <div className="bg-tws-dark-red/50 border border-tws-gold/50 rounded-lg px-4 py-2">
                <p className="text-gray-400 text-xs uppercase">我的余额</p>
                <p className="text-tws-gold font-mono text-lg">
                  {userBalance.toLocaleString()} TWS
                </p>
              </div>
            )}
          </div>

          {/* 操控按钮 - 巨大的红色按钮 */}
          <button
            onClick={handleBid}
            disabled={!connected || isPlacingBid}
            className={`
              w-full py-4 px-6 rounded-lg font-black text-2xl uppercase tracking-widest transition-all duration-100 btn-ripple
              ${connected && !isPlacingBid
                ? 'bg-tws-red hover:bg-red-600 hover:scale-[1.02] active:scale-95 text-white shadow-[0_0_20px_rgba(211,47,47,0.6)]' 
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
            `}
          >
            {isPlacingBid ? (
              '处理中...'
            ) : connected ? (
              <>
                💥 立即溢价 10% 强行接管 💥
                <div className="text-sm font-normal mt-1">
                  支付 <span className="text-tws-gold">{nextBidAmount.toLocaleString()} TWS</span>，把它抢过来！
                </div>
              </>
            ) : (
              'CONNECT TO PLUNDER'
            )}
          </button>

          {/* 心理暗示文案 */}
          <p className="text-center text-xs text-gray-500 italic">
            * 只要有人出价超过当前价格 10%，立即易手。最后一人拿走全部。
          </p>
          <p className="text-center text-xs text-gray-600 mt-2">
            当两岸统一之日，最后一位持有者将凭此 NFT 兑换该房产的【优先征用权】或等值人民币补偿。
          </p>
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

