import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, Clock, Activity } from 'lucide-react';
import { getMarketData } from '../utils/api';

const MarketDetailPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTradeId, setSelectedTradeId] = useState(searchParams.get('tradeId') || null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await getMarketData();
        if (response.success && response.data) {
          setMarketData(response.data);
          if (selectedTradeId) {
            setActiveTab('trades');
          }
        }
      } catch (error) {
        console.error('Failed to load market data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // 定期更新数据
    const interval = setInterval(loadData, 1000);
    return () => clearInterval(interval);
  }, [selectedTradeId]);

  const scale = (val, min, max) => {
    return 100 - ((val - min) / (max - min)) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-500 font-mono">Loading market data...</div>
      </div>
    );
  }

  if (!marketData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-red-500 font-mono">Failed to load market data</div>
      </div>
    );
  }

  const klineData = marketData.klineData || [];
  const minPrice = klineData.length > 0 ? Math.min(...klineData.map(d => d.low)) : 90;
  const maxPrice = klineData.length > 0 ? Math.max(...klineData.map(d => d.high)) : 150;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-mono text-sm">返回首页</span>
          </button>
          <h1 className="text-2xl font-bold font-mono tracking-wider">MARKET DETAIL</h1>
          <div className="w-24" /> {/* Spacer */}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          {[
            { id: 'overview', label: '概览', icon: <BarChart3 size={16} /> },
            { id: 'kline', label: 'K线图', icon: <Activity size={16} /> },
            { id: 'orderbook', label: '订单簿', icon: <TrendingUp size={16} /> },
            { id: 'trades', label: '交易记录', icon: <Clock size={16} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-mono text-sm flex items-center gap-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                <div className="text-slate-500 text-xs font-mono uppercase mb-2">当前价格</div>
                <div className="text-3xl font-bold text-green-500 font-mono">
                  {marketData.currentPrice?.toFixed(2) || '0.00'}
                </div>
                <div className={`text-sm mt-2 flex items-center gap-1 ${
                  (marketData.priceChange24h || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {(marketData.priceChange24h || 0) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {Math.abs(marketData.priceChange24h || 0).toFixed(2)}% (24H)
                </div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                <div className="text-slate-500 text-xs font-mono uppercase mb-2">24H交易量</div>
                <div className="text-2xl font-bold text-white font-mono">
                  ¥ {(marketData.volume24h || 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                <div className="text-slate-500 text-xs font-mono uppercase mb-2">市场指数</div>
                <div className="text-2xl font-bold text-cyan-400 font-mono">
                  {marketData.marketIndex || 'N/A'}
                </div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                <div className="text-slate-500 text-xs font-mono uppercase mb-2">交易对</div>
                <div className="text-2xl font-bold text-white font-mono">TWS/CNY</div>
              </div>
            </div>
          </div>
        )}

        {/* Kline Tab */}
        {activeTab === 'kline' && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 font-mono">K线图 (60个数据点)</h2>
            <div className="h-96 relative bg-black rounded border border-slate-800 p-4">
              <svg className="w-full h-full" preserveAspectRatio="none">
                {klineData.map((item, index) => {
                  const x = (index / Math.max(klineData.length - 1, 1)) * 100;
                  const barWidth = (100 / Math.max(klineData.length, 1)) * 0.6;
                  const color = item.close > item.open ? '#10b981' : '#ef4444';
                  const openY = scale(item.open, minPrice, maxPrice);
                  const closeY = scale(item.close, minPrice, maxPrice);
                  const highY = scale(item.high, minPrice, maxPrice);
                  const lowY = scale(item.low, minPrice, maxPrice);
                  const rectY = Math.min(openY, closeY);
                  const rectHeight = Math.abs(openY - closeY);
                  return (
                    <g key={item.id || index}>
                      <line
                        x1={`${x}%`}
                        y1={`${highY}%`}
                        x2={`${x}%`}
                        y2={`${lowY}%`}
                        stroke={color}
                        strokeWidth="1"
                      />
                      <rect
                        x={`${x - barWidth / 2}%`}
                        y={`${rectY}%`}
                        width={`${barWidth}%`}
                        height={`${rectHeight}%`}
                        fill={color}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}

        {/* OrderBook Tab */}
        {activeTab === 'orderbook' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 font-mono text-red-400">卖单 (Asks)</h2>
              <div className="space-y-2">
                {marketData.orderBook?.asks?.length > 0 ? (
                  marketData.orderBook.asks.map((ask, index) => (
                    <div key={`ask-${index}`} className="flex justify-between text-sm font-mono py-2 border-b border-slate-800">
                      <span className="text-red-500">{Number(ask.price).toFixed(2)}</span>
                      <span className="text-slate-300">{Number(ask.amount).toFixed(4)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 text-sm">暂无卖单</div>
                )}
              </div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 font-mono text-green-400">买单 (Bids)</h2>
              <div className="space-y-2">
                {marketData.orderBook?.bids?.length > 0 ? (
                  marketData.orderBook.bids.map((bid, index) => (
                    <div key={`bid-${index}`} className="flex justify-between text-sm font-mono py-2 border-b border-slate-800">
                      <span className="text-green-500">{Number(bid.price).toFixed(2)}</span>
                      <span className="text-slate-300">{Number(bid.amount).toFixed(4)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 text-sm">暂无买单</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Trades Tab */}
        {activeTab === 'trades' && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 font-mono">交易记录</h2>
            <div className="space-y-2">
              {marketData.recentTrades?.length > 0 ? (
                marketData.recentTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className={`flex justify-between items-center py-3 px-4 rounded border ${
                      selectedTradeId === trade.id
                        ? 'bg-cyan-900/30 border-cyan-500'
                        : 'bg-slate-800/30 border-slate-700 hover:border-slate-600'
                    } transition-colors cursor-pointer`}
                    onClick={() => setSelectedTradeId(trade.id)}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`text-sm font-mono ${
                        trade.type === 'buy' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {trade.type === 'buy' ? '买入' : '卖出'}
                      </span>
                      <span className="text-white font-mono">{trade.price}</span>
                      <span className="text-slate-400 text-xs font-mono">{trade.amount}</span>
                    </div>
                    <div className="text-slate-500 text-xs font-mono">{trade.time}</div>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-sm">暂无交易记录</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketDetailPage;
