import React, { useState, useEffect } from 'react';
import { Activity, ArrowUp, ArrowDown, Database, Globe, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateUniqueId } from '../utils/uniqueId';
import { getMarketData } from '../utils/api';

const MarketSection = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(142.85);
  const [priceChange24h, setPriceChange24h] = useState(12.4);
  const [volume24h, setVolume24h] = useState(4291002911);
  const [marketIndex, setMarketIndex] = useState('STRONG BUY');
  const [orderBook, setOrderBook] = useState({ asks: [], bids: [] });
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  // 加载初始数据
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await getMarketData();
        if (response.success && response.data) {
          const marketData = response.data;
          
          // 转换K线数据格式
          if (marketData.klineData && Array.isArray(marketData.klineData)) {
            const formattedData = marketData.klineData.map(item => ({
              id: item.id || 0,
              open: item.open || 0,
              close: item.close || 0,
              high: item.high || 0,
              low: item.low || 0,
              vol: item.volume || item.vol || 0
            }));
            setData(formattedData);
          }
          
          if (marketData.currentPrice !== undefined) {
            setCurrentPrice(marketData.currentPrice);
          }
          if (marketData.priceChange24h !== undefined) {
            setPriceChange24h(marketData.priceChange24h);
          }
          if (marketData.volume24h !== undefined) {
            setVolume24h(marketData.volume24h);
          }
          if (marketData.marketIndex) {
            setMarketIndex(marketData.marketIndex);
          }
          if (marketData.orderBook) {
            setOrderBook(marketData.orderBook);
          }
          if (marketData.recentTrades && Array.isArray(marketData.recentTrades)) {
            setTrades(marketData.recentTrades.map(trade => ({
              id: trade.id || generateUniqueId(),
              price: trade.price,
              amount: trade.amount,
              type: trade.type,
              time: trade.time || new Date(trade.timestamp).toLocaleTimeString()
            })));
          }
        }
      } catch (error) {
        console.error('Failed to load market data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // 定期更新数据（每800ms）
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await getMarketData();
        if (response.success && response.data) {
          const marketData = response.data;
          
          // 更新价格
          if (marketData.currentPrice !== undefined) {
            setCurrentPrice(marketData.currentPrice);
          }
          
          // 更新交易记录
          if (marketData.recentTrades && Array.isArray(marketData.recentTrades)) {
            setTrades(marketData.recentTrades.map(trade => ({
              id: trade.id || generateUniqueId(),
              price: trade.price,
              amount: trade.amount,
              type: trade.type,
              time: trade.time || new Date(trade.timestamp).toLocaleTimeString()
            })));
          }
          
          // 更新订单簿
          if (marketData.orderBook) {
            setOrderBook(marketData.orderBook);
          }
        }
      } catch (error) {
        console.error('Failed to update market data:', error);
      }
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const scale = (val) => {
    const min = 90;
    const max = 150;
    return 100 - ((val - min) / (max - min)) * 100;
  };

  return (
    <div className="w-full h-full bg-slate-950 flex flex-col md:flex-row border-b border-slate-900 relative overflow-hidden pt-16 md:pt-20">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.3)_1px,transparent_1px)] bg-[size:40px_40px] z-0" />

      <div className="relative z-10 w-full md:w-3/4 border-r border-slate-800 flex flex-col">
        <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Globe className="text-cyan-500 mr-2 animate-pulse" size={20} />
              <h3 className="text-xl font-bold text-white font-mono tracking-wider">TWS/CNY</h3>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-mono font-bold text-green-500 flex items-center">
                {currentPrice.toFixed(2)}
                <ArrowUp size={16} className="ml-1" />
              </span>
              <span className="text-xs text-green-500/70 font-mono">+{priceChange24h.toFixed(1)}% (24H)</span>
            </div>
          </div>

          <div className="hidden md:flex space-x-6 text-xs font-mono text-slate-400">
            <div>
              <span className="block text-slate-600">24H VOL</span>
              <span className="text-white">¥ {volume24h.toLocaleString()}</span>
            </div>
            <div>
              <span className="block text-slate-600">INDEX</span>
              <span className="text-cyan-400">{marketIndex}</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/market')}
            className="ml-4 bg-yellow-600/20 border border-yellow-600/50 text-yellow-500 hover:bg-yellow-600 hover:text-black px-4 py-1.5 rounded text-xs font-mono tracking-widest transition-all flex items-center gap-2"
          >
            <ShoppingBag size={14} />
            进入交易
          </button>
        </div>

        <div 
          className="flex-1 relative p-4 overflow-hidden cursor-pointer hover:bg-slate-900/20 transition-colors"
          onClick={() => navigate('/market-detail')}
          title="点击查看详情"
        >
          <svg className="w-full h-full" preserveAspectRatio="none">
            <line x1="0" y1="25%" x2="100%" y2="25%" stroke="#1e293b" strokeDasharray="4" />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#1e293b" strokeDasharray="4" />
            <line x1="0" y1="75%" x2="100%" y2="75%" stroke="#1e293b" strokeDasharray="4" />
            {data.map((item, index) => {
              const x = (index / data.length) * 100;
              const barWidth = (100 / data.length) * 0.6;
              const color = item.close > item.open ? '#10b981' : '#ef4444';
              const openY = scale(item.open);
              const closeY = scale(item.close);
              const highY = scale(item.high);
              const lowY = scale(item.low);
              const rectY = Math.min(openY, closeY);
              const rectHeight = Math.abs(openY - closeY);
              return (
                <g key={item.id}>
                  <line
                    x1={`calc(${x}% + ${barWidth / 2}%)`}
                    y1={`${highY}%`}
                    x2={`calc(${x}% + ${barWidth / 2}%)`}
                    y2={`${lowY}%`}
                    stroke={color}
                    strokeWidth="1"
                  />
                  <rect x={`${x}%`} y={`${rectY}%`} width={`${barWidth}%`} height={`${rectHeight}%`} fill={color} />
                </g>
              );
            })}
            <path d="M 0 300 Q 200 280, 400 200 T 800 100" fill="none" stroke="#f59e0b" strokeWidth="2" className="opacity-50" />
          </svg>

          <div className="absolute top-[30%] left-[20%] flex flex-col items-center group cursor-pointer">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-ping absolute" />
            <div className="w-2 h-2 bg-yellow-500 rounded-full relative" />
            <div className="absolute mt-4 bg-slate-800 text-[10px] text-yellow-500 px-2 py-1 rounded border border-yellow-500/30 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              EVENT: JOINT SWORD-2024B
            </div>
          </div>
        </div>

        <div className="h-8 border-t border-slate-800 bg-slate-900 flex items-center justify-between px-4 text-[10px] text-slate-500 font-mono">
          <span>2023-Q4</span>
          <span>2024-Q1</span>
          <span>2024-Q2</span>
          <span>2024-Q3</span>
          <span>NOW</span>
        </div>
      </div>

      <div className="relative z-10 w-full md:w-1/4 bg-slate-900/30 backdrop-blur flex flex-col font-mono">
        <div className="h-10 border-b border-slate-800 flex items-center px-4 text-xs text-slate-400 uppercase tracking-wider bg-slate-900">
          <Database size={14} className="mr-2" /> Order Book
        </div>

        <div className="flex-1 overflow-hidden relative">
          <div className="absolute bottom-0 w-full px-2 py-2 space-y-1">
            {orderBook.asks && orderBook.asks.length > 0 ? (
              orderBook.asks.slice(0, 5).map((ask, index) => (
                <div 
                  key={`sell-${ask.price}-${index}`} 
                  className="flex justify-between text-xs cursor-pointer hover:bg-slate-800/50 transition-colors"
                  onClick={() => navigate('/market-detail?tab=orderbook')}
                >
                  <span className="text-red-500">{Number(ask.price).toFixed(2)}</span>
                  <span className="text-slate-500">{Number(ask.amount).toFixed(4)}</span>
                </div>
              ))
            ) : (
              <div className="text-slate-500 text-xs">No asks</div>
            )}
          </div>
        </div>

        <div className="h-12 border-t border-b border-slate-800 flex items-center justify-center bg-slate-800/30">
          <span className="text-xl font-bold text-white">{currentPrice.toFixed(2)}</span>
          <span className="text-xs ml-2 text-slate-400">≈ $19.8 USD</span>
        </div>

        <div className="flex-1 px-2 py-2 space-y-1">
            {orderBook.bids && orderBook.bids.length > 0 ? (
              orderBook.bids.slice(0, 7).map((bid, index) => (
                <div 
                  key={`buy-${bid.price}-${index}`} 
                  className="flex justify-between text-xs relative cursor-pointer hover:bg-slate-800/30 transition-colors"
                  onClick={() => navigate('/market-detail?tab=orderbook')}
                >
                  <div className="absolute right-0 top-0 bottom-0 bg-green-900/20" style={{ width: `${60 + index * 5}%` }} />
                  <span className="text-green-500 relative z-10">{Number(bid.price).toFixed(2)}</span>
                  <span className="text-slate-300 relative z-10">{Number(bid.amount).toFixed(4)}</span>
                </div>
              ))
            ) : (
              <div className="text-slate-500 text-xs">No bids</div>
            )}
        </div>

        <div className="h-1/3 border-t border-slate-800 bg-black/20 p-2">
          <div className="text-[10px] text-slate-500 mb-2 flex justify-between">
            <span>PRICE</span>
            <span>TIME</span>
          </div>
          <div className="space-y-1 overflow-hidden">
            {trades.map((trade) => (
              <div 
                key={trade.id} 
                className="flex justify-between text-[10px] animate-fade-in-down cursor-pointer hover:bg-slate-800/50 px-1 py-0.5 rounded transition-colors"
                onClick={() => navigate(`/market-detail?tab=trades&tradeId=${trade.id}`)}
              >
                <span className={trade.type === 'buy' ? 'text-green-500' : 'text-red-500'}>{trade.price}</span>
                <span className="text-slate-400">{trade.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketSection;
