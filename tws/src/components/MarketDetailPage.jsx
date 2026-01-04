import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, Clock, Activity } from 'lucide-react';
import { getMarketData } from '../utils/api';

const MarketDetailPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [marketData, setMarketData] = useState(null);
  const [realMarketData, setRealMarketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTradeId, setSelectedTradeId] = useState(searchParams.get('tradeId') || null);

  useEffect(() => {
    const fetchRealPrice = async () => {
      try {
        const response = await fetch('https://api.dexscreener.com/latest/dex/pairs/solana/6q88jmgqs5kikkjjvh7xgpy2rv3c2jps9yqsgqfvkrgt');
        const data = await response.json();
        if (data.pair) {
          setRealMarketData(data.pair);
        }
      } catch (err) {
        console.error('Failed to fetch DexScreener data:', err);
      }
    };

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

    fetchRealPrice();
    loadData();

    // 定期更新数据
    const interval = setInterval(() => {
      loadData();
      fetchRealPrice();
    }, 30000);
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
                <div className={`text-3xl font-bold font-mono ${
                  (realMarketData?.priceChange?.h24 || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {realMarketData ? (
                    parseFloat(realMarketData.priceUsd) < 0.01 
                      ? parseFloat(realMarketData.priceUsd).toFixed(6) 
                      : parseFloat(realMarketData.priceUsd).toFixed(2)
                  ) : (marketData.currentPrice?.toFixed(2) || '0.00')}
                  <span className="text-xs ml-1 text-slate-500">USD</span>
                </div>
                <div className={`text-sm mt-2 flex items-center gap-1 ${
                  (realMarketData?.priceChange?.h24 || marketData.priceChange24h || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {(realMarketData?.priceChange?.h24 || marketData.priceChange24h || 0) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {Math.abs(realMarketData?.priceChange?.h24 || marketData.priceChange24h || 0).toFixed(2)}% (24H)
                </div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                <div className="text-slate-500 text-xs font-mono uppercase mb-2">24H交易量</div>
                <div className="text-2xl font-bold text-white font-mono">
                  $ {(realMarketData?.volume?.h24 || marketData.volume24h || 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                <div className="text-slate-500 text-xs font-mono uppercase mb-2">流动性 (USD)</div>
                <div className="text-2xl font-bold text-cyan-400 font-mono">
                  {realMarketData?.liquidity?.usd ? `$ ${realMarketData.liquidity.usd.toLocaleString()}` : 'N/A'}
                </div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                <div className="text-slate-500 text-xs font-mono uppercase mb-2">交易对 (SOLANA)</div>
                <div className="text-2xl font-bold text-white font-mono">TWS/SOL</div>
              </div>
            </div>
          </div>
        )}

        {/* Kline Tab */}
        {activeTab === 'kline' && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 font-mono">REAL-TIME K-LINE (DEXSCREENER)</h2>
            <div className="h-[600px] relative bg-black rounded border border-slate-800 overflow-hidden">
              <iframe 
                src="https://dexscreener.com/solana/6q88jmgqs5kikkjjvh7xgpy2rv3c2jps9yqsgqfvkrgt?embed=1&theme=dark&trades=0&info=0"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 0
                }}
              />
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
