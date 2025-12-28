import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuction } from '../hooks/useAuction';

export default function AuctionCard({ asset }) {
  const { 
    currentPrice, 
    highestBidder, 
    tauntMessage
  } = useAuction();

  const [isPulsing, setIsPulsing] = useState(false);
  const [priceDisplay, setPriceDisplay] = useState(currentPrice);

  // 监听出价成功事件，触发震动效果
  useEffect(() => {
    const handleBidSuccess = () => {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 500);
    };

    window.addEventListener('auction:bidSuccess', handleBidSuccess);
    return () => window.removeEventListener('auction:bidSuccess', handleBidSuccess);
  }, []);

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


  return (
    <div className="relative w-full">
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
        {/* 房产图片区域 - 调整高度以适应一屏 */}
        <div className="relative h-80 w-full bg-gray-800">
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
          
        </div>

        {/* 数据面板 - 简化，只显示核心信息 */}
        <div className="p-4">

          {/* 价格和持有者 */}
          <div className="flex justify-between items-end border-b border-gray-700 pb-3 mb-3">
            <div>
              <p className="text-gray-400 text-xs uppercase">Current Bid</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-tws-gold tabular-nums">
                  {priceDisplay.toLocaleString()}
                </span>
                <span className="text-lg font-bold text-tws-red">TWS</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-xs uppercase">Dominator</p>
              <p className="text-white font-mono font-bold bg-tws-dark-red px-2 py-1 rounded text-sm">
                {highestBidder}
              </p>
            </div>
          </div>

          {/* 提示文案 */}
          <p className="text-center text-xs text-gray-500 italic">
            * 溢价 10% 立即易手
          </p>
        </div>
      </div>
    </div>
  );
}

