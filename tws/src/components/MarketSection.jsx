import React, { useState, useEffect, useMemo } from 'react';
import { Activity, ArrowUp, ArrowDown, Database, Globe, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateUniqueId } from '../utils/uniqueId';
import { getMarketData } from '../utils/api';
import { useSSE } from '../contexts/SSEContext';
import { useServerStatus } from '../contexts/ServerStatusContext';

const MarketSection = () => {
  const navigate = useNavigate();
  const { isOnline } = useServerStatus();
  const { subscribe } = useSSE(); // Restore useSSE hook
  const [rawData, setRawData] = useState([]); // 原始K线数据
  const [data, setData] = useState([]); // 当前视图的数据（聚合后的）
  const [viewMode, setViewMode] = useState('分时'); // 视图模式：分时、日K、周K、月K
  const [currentPrice, setCurrentPrice] = useState(null);
  const [priceChange24h, setPriceChange24h] = useState(0);
  const [volume24h, setVolume24h] = useState(0);
  const [marketIndex, setMarketIndex] = useState('STRONG BUY');
  const [orderBook, setOrderBook] = useState({ asks: [], bids: [] });
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [realMarketData, setRealMarketData] = useState(null); // 存储来自 DexScreener 的真实数据
  
  // 价格相关状态
  const [yesterdayClose, setYesterdayClose] = useState(null);
  const [todayHigh, setTodayHigh] = useState(null); // 今日最高
  const [todayLow, setTodayLow] = useState(null); // 今日最低
  
  // 缩放相关状态
  const [zoomLevel, setZoomLevel] = useState(1); // 缩放级别：1-10，1显示所有数据，10只显示最近10%
  const [scrollOffset, setScrollOffset] = useState(0); // 滚动偏移：0-100，控制显示的数据范围
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartOffset, setDragStartOffset] = useState(0);

  // 获取 DexScreener 实时价格数据
  useEffect(() => {
    const fetchRealPrice = async () => {
      try {
        // 使用 Token Address 获取数据，以找到流动性最好的交易对
        const tokenAddress = 'ZRGboZN3K6JZYhGe8PHDcazwKuqhgp2tTG7h8G5fKGk';
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
        const data = await response.json();
        
        if (data.pairs && data.pairs.length > 0) {
          // 按流动性排序，取最大的
          const bestPair = data.pairs.sort((a, b) => b.liquidity.usd - a.liquidity.usd)[0];
          
          console.log('DexScreener Data Fetched:', bestPair);
          setRealMarketData(bestPair);
          setCurrentPrice(parseFloat(bestPair.priceUsd));
          setPriceChange24h(parseFloat(bestPair.priceChange.h24));
          setVolume24h(parseFloat(bestPair.volume.h24));
        } else {
            console.warn('No pairs found for token:', tokenAddress);
        }
      } catch (err) {
        console.error('Failed to fetch DexScreener data:', err);
      }
    };

    fetchRealPrice();
    const interval = setInterval(fetchRealPrice, 5000); // 加快更新频率到5秒
    return () => clearInterval(interval);
  }, []);

  // 移除虚拟数据加载逻辑，仅保留真实数据相关的状态初始化
  useEffect(() => {
    // 初始状态清理
    setLoading(false);
    setRawData([]); // 清空虚拟K线
    setOrderBook({ asks: [], bids: [] }); // 清空虚拟订单簿
    setTrades([]); // 清空虚拟交易记录
  }, []);

  // 这里的 SSE 订阅逻辑也应该移除对虚拟数据的处理
  useEffect(() => {
    // 仅保留对真实数据事件的监听（如果后端有真实数据源接入）
    // 目前后端已禁用模拟数据，所以这里实际上不会收到 update
    const unsubscribe = subscribe('market', (message) => {
      // 忽略模拟数据更新
    });
    
    return unsubscribe;
  }, [subscribe]);

  // 计算可见数据（基于缩放和滚动）
  const visibleData = useMemo(() => {
    if (data.length === 0) return [];
    
    // 分时图不需要缩放，直接返回所有数据
    if (viewMode === '分时') {
      return data;
    }
    
    // K线图：根据 zoomLevel 和 scrollOffset 计算可见数据
    // zoomLevel: 1 = 显示全部，10 = 只显示最近10%
    // scrollOffset: 0 = 最旧的数据，100 = 最新的数据
    const totalLength = data.length;
    const visibleLength = Math.max(1, Math.floor(totalLength / zoomLevel));
    
    // 计算起始索引
    // scrollOffset 0 表示从最旧开始，100 表示从最新开始
    const maxStartIndex = totalLength - visibleLength;
    const startIndex = Math.floor((scrollOffset / 100) * maxStartIndex);
    const endIndex = startIndex + visibleLength;
    
    return data.slice(startIndex, endIndex);
  }, [data, zoomLevel, scrollOffset, viewMode]);

  // 计算价格范围（动态，基于可见数据）
  const getPriceRange = () => {
    const dataToUse = visibleData.length > 0 ? visibleData : data;
    if (dataToUse.length === 0) {
      return { min: currentPrice * 0.9, max: currentPrice * 1.1 };
    }
    const allPrices = dataToUse.flatMap(item => [item.high, item.low, item.open, item.close]).filter(p => p > 0);
    if (allPrices.length === 0) {
      return { min: currentPrice * 0.9, max: currentPrice * 1.1 };
    }
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const padding = (max - min) * 0.1; // 10% padding
    return { min: Math.max(0, min - padding), max: max + padding };
  };

  const priceRange = getPriceRange();
  const scale = (val) => {
    if (priceRange.max === priceRange.min) return 50; // 如果价格没有变化，居中显示
    return 100 - ((val - priceRange.min) / (priceRange.max - priceRange.min)) * 100;
  };

  // 获取价格刻度（用于左侧坐标轴）
  const getPriceTicks = (count = 5) => {
    const { min, max } = priceRange;
    if (max === min) {
      return [min];
    }
    const step = (max - min) / (count - 1);
    return Array.from({ length: count }, (_, i) => {
      const price = min + step * i;
      return parseFloat(price.toFixed(2));
    }).reverse(); // 从高到低
  };

  const priceTicks = getPriceTicks(5);

  // 生成折线图的路径数据（用于分时图）
  const generateLinePath = () => {
    if (data.length === 0) return '';
    const points = data.map((item, index) => {
      const x = data.length > 1 ? (index / (data.length - 1)) * 100 : 50;
      // 分时图使用close价格，如果是K线图也使用close
      const price = item.close || item.open || currentPrice;
      const y = scale(price);
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  // 获取周数（ISO 8601标准，周一开始）
  const getWeekNumber = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    // 设置为该周的周四（ISO 8601标准）
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    // 获取该年的第一个周四
    const week1 = new Date(d.getFullYear(), 0, 4);
    // 计算周数
    return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  // 计算动态时间标尺（根据viewMode调整）
  const getTimeLabels = () => {
    if (data.length === 0) {
      const labels = [];
      for (let i = 0; i < 5; i++) {
        if (i === 4) {
          labels.push('NOW');
        } else {
          labels.push('--');
        }
      }
      return labels;
    }

    const timestamps = data.map(item => item.timestamp).filter(ts => ts > 0);
    if (timestamps.length === 0) {
      return ['--', '--', '--', '--', 'NOW'];
    }

    const earliest = Math.min(...timestamps);
    const latest = Math.max(...timestamps);
    const now = Date.now();

    const labels = [];
    for (let i = 0; i < 5; i++) {
      const ratio = i / 4;
      const time = earliest + (latest - earliest) * ratio;
      const date = new Date(time);
      
      if (i === 4) {
        labels.push('NOW');
      } else {
        if (viewMode === '分时') {
          // 分时图显示时间
          labels.push(date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
        } else if (viewMode === '日K') {
          // 日K显示日期
          labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
        } else if (viewMode === '周K') {
          // 周K显示周
          const week = getWeekNumber(date);
          labels.push(`${date.getFullYear()}-W${String(week).padStart(2, '0')}`);
        } else if (viewMode === '月K') {
          // 月K显示年月
          labels.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
        } else {
          labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
        }
      }
    }

    return labels;
  };

  const timeLabels = getTimeLabels();

  // 数据聚合函数
  // 获取分时图数据（当天的数据）
  const getTimeSeriesData = (rawData) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    return rawData.filter(item => item.timestamp >= todayStart);
  };

  // 按天聚合K线数据
  const aggregateByDay = (rawData) => {
    if (rawData.length === 0) return [];
    
    // 如果数据都在同一天，生成模拟的历史数据
    const grouped = {};
    rawData.forEach(item => {
      const date = new Date(item.timestamp);
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(item);
    });
    
    const dayKeys = Object.keys(grouped).sort();
    
    // 如果只有一天的数据，生成过去30天的模拟数据
    if (dayKeys.length === 1 && rawData.length > 0) {
      const lastData = rawData[rawData.length - 1];
      const basePrice = lastData.close || lastData.open || currentPrice;
      const simulatedData = [];
      
      // 生成过去30天的数据
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(9, 30, 0, 0); // 设置为交易开始时间
        
        // 基于基础价格生成波动
        const variation = (Math.random() - 0.5) * 10; // ±5的波动
        const open = basePrice + variation;
        const close = open + (Math.random() - 0.5) * 8;
        const high = Math.max(open, close) + Math.random() * 5;
        const low = Math.min(open, close) - Math.random() * 5;
        
        simulatedData.push({
          id: `sim-${i}`,
          timestamp: date.getTime(),
          open: Math.max(0, open),
          close: Math.max(0, close),
          high: Math.max(0, high),
          low: Math.max(0, low),
          vol: Math.random() * 1000
        });
      }
      
      // 合并真实数据和模拟数据
      const allData = [...rawData, ...simulatedData].sort((a, b) => a.timestamp - b.timestamp);
      
      // 重新按天聚合
      const newGrouped = {};
      allData.forEach(item => {
        const date = new Date(item.timestamp);
        const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        if (!newGrouped[dayKey]) {
          newGrouped[dayKey] = [];
        }
        newGrouped[dayKey].push(item);
      });
      
      return Object.keys(newGrouped)
        .sort()
        .map(dayKey => {
          const dayData = newGrouped[dayKey];
          return {
            id: dayKey,
            timestamp: dayData[0].timestamp,
            open: dayData[0].open,
            close: dayData[dayData.length - 1].close,
            high: Math.max(...dayData.map(d => d.high)),
            low: Math.min(...dayData.map(d => d.low)),
            vol: dayData.reduce((sum, d) => sum + (d.vol || 0), 0)
          };
        });
    }
    
    // 正常情况：有多天数据
    return dayKeys.map(dayKey => {
      const dayData = grouped[dayKey];
      return {
        id: dayKey,
        timestamp: dayData[0].timestamp,
        open: dayData[0].open,
        close: dayData[dayData.length - 1].close,
        high: Math.max(...dayData.map(d => d.high)),
        low: Math.min(...dayData.map(d => d.low)),
        vol: dayData.reduce((sum, d) => sum + (d.vol || 0), 0)
      };
    });
  };

  // 按周聚合K线数据
  const aggregateByWeek = (rawData) => {
    if (rawData.length === 0) return [];
    const dayData = aggregateByDay(rawData);
    if (dayData.length === 0) return [];
    
    const grouped = {};
    dayData.forEach(item => {
      const date = new Date(item.timestamp);
      const year = date.getFullYear();
      const week = getWeekNumber(date);
      // 处理跨年情况：如果周数很大（接近52），可能是上一年的最后一周
      let weekKey = `${year}-W${String(week).padStart(2, '0')}`;
      
      // 如果周数大于52，可能是计算错误，使用年份和周数组合
      if (week > 52) {
        // 重新计算，可能是下一年的第一周
        const prevYear = year - 1;
        const prevYearDate = new Date(prevYear, 11, 31);
        const prevWeek = getWeekNumber(prevYearDate);
        if (week === 1 && date.getMonth() === 0 && date.getDate() < 7) {
          // 可能是上一年的最后一周
          weekKey = `${prevYear}-W${String(prevWeek).padStart(2, '0')}`;
        }
      }
      
      if (!grouped[weekKey]) {
        grouped[weekKey] = [];
      }
      grouped[weekKey].push(item);
    });
    
    return Object.keys(grouped)
      .sort()
      .map(weekKey => {
        const weekData = grouped[weekKey];
        return {
          id: weekKey,
          timestamp: weekData[0].timestamp,
          open: weekData[0].open,
          close: weekData[weekData.length - 1].close,
          high: Math.max(...weekData.map(d => d.high)),
          low: Math.min(...weekData.map(d => d.low)),
          vol: weekData.reduce((sum, d) => sum + (d.vol || 0), 0)
        };
      });
  };

  // 按月聚合K线数据
  const aggregateByMonth = (rawData) => {
    if (rawData.length === 0) return [];
    const dayData = aggregateByDay(rawData);
    if (dayData.length === 0) return [];
    
    const grouped = {};
    dayData.forEach(item => {
      const date = new Date(item.timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(item);
    });
    
    return Object.keys(grouped)
      .sort()
      .map(monthKey => {
        const monthData = grouped[monthKey];
        return {
          id: monthKey,
          timestamp: monthData[0].timestamp,
          open: monthData[0].open,
          close: monthData[monthData.length - 1].close,
          high: Math.max(...monthData.map(d => d.high)),
          low: Math.min(...monthData.map(d => d.low)),
          vol: monthData.reduce((sum, d) => sum + d.vol, 0)
        };
      });
  };

  // 根据viewMode更新数据
  useEffect(() => {
    if (rawData.length === 0) {
      setData([]);
      return;
    }

    let processedData = [];
    switch (viewMode) {
      case '分时':
        processedData = getTimeSeriesData(rawData);
        break;
      case '日K':
        processedData = aggregateByDay(rawData);
        break;
      case '周K':
        processedData = aggregateByWeek(rawData);
        break;
      case '月K':
        processedData = aggregateByMonth(rawData);
        break;
      default:
        processedData = rawData;
    }
    setData(processedData);
    // 切换视图时重置缩放和滚动
    setZoomLevel(1);
    setScrollOffset(0);
  }, [rawData, viewMode]);

  // 如果加载失败且有错误，显示错误信息
  if (error && !loading) {
    return (
      <div className="w-full h-full bg-slate-950 flex items-center justify-center pt-16 md:pt-20">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">⚠️ 无法加载市场数据</div>
          <div className="text-slate-400 text-sm mb-4">{error}</div>
          {retryCount > 0 && (
            <div className="text-slate-500 text-xs mb-4">已重试 {retryCount} 次</div>
          )}
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              setRetryCount(0);
              // 重新加载
              window.location.reload();
            }}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-slate-950 flex flex-col md:flex-row border-b border-slate-900 relative overflow-hidden pt-16 md:pt-20">
      <div 
        className="absolute inset-0 opacity-5 z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.3)_1px,transparent_1px)] bg-[size:40px_40px] z-0" />

      <div className="relative z-10 w-full md:w-3/4 border-r border-slate-800 flex flex-col">
        {/* 顶部价格信息栏 */}
        <div className="h-20 border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Globe className="text-cyan-500 mr-2 animate-pulse" size={20} />
                <h3 className="text-xl font-bold text-white font-mono tracking-wider">TaiOne/SOL</h3>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center bg-slate-800/50 rounded-full px-3 py-1 border border-slate-700">
                <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[10px] font-mono text-slate-300">{isOnline ? 'NETWORK ONLINE' : 'NETWORK OFFLINE'}</span>
              </div>
              <button
                onClick={() => navigate('/market')}
                className="bg-yellow-600/20 border border-yellow-600/50 text-yellow-500 hover:bg-yellow-600 hover:text-black px-4 py-1.5 rounded text-xs font-mono tracking-widest transition-all flex items-center gap-2"
              >
                <ShoppingBag size={14} />
                进入交易
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            {/* 现价 */}
            <div className="flex items-baseline space-x-2">
              <span className={`text-3xl font-mono font-bold ${priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {currentPrice > 0 ? currentPrice.toFixed(5) : '0.00000'}
                <span className="text-xs ml-1 text-slate-500">USD</span>
              </span>
              {priceChange24h >= 0 ? (
                <ArrowUp size={20} className="text-green-500" />
              ) : (
                <ArrowDown size={20} className="text-red-500" />
              )}
            </div>
            
            {/* 涨跌幅 */}
            <div className="flex flex-col">
              <span className={`text-lg font-mono font-semibold ${priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
              </span>
              <span className="text-[10px] text-slate-500 font-mono uppercase">24H Change</span>
            </div>
            
            {/* 流动性 & 市值 */}
            <div className="hidden md:flex items-center space-x-4 text-xs font-mono border-l border-slate-800 pl-6">
              <div>
                <span className="text-slate-500 block text-[8px] uppercase">Liquidity</span>
                <span className="text-cyan-400 font-bold">
                  {realMarketData?.liquidity?.usd ? `$${realMarketData.liquidity.usd.toLocaleString()}` : '--'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[8px] uppercase">FDV</span>
                <span className="text-white">
                  {realMarketData?.fdv ? `$${realMarketData.fdv.toLocaleString()}` : '--'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[8px] uppercase">24H Volume</span>
                <span className="text-white">
                  {realMarketData?.volume?.h24 ? `$${realMarketData.volume.h24.toLocaleString()}` : '--'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 选项卡栏 */}
        <div className="h-10 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between px-4">
          <div className="flex bg-slate-900/50 rounded p-1 border border-slate-800">
            <div className="px-3 py-1 text-xs font-mono text-slate-400">REAL-TIME DATA VIA DEXSCREENER</div>
          </div>
          
          {/* 缩放控制（仅在K线图模式下显示） */}
          {viewMode !== '分时' && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.5))}
                className="px-2 py-1 text-xs font-mono text-slate-400 hover:text-white hover:bg-slate-800/50 rounded"
                title="缩小"
              >
                −
              </button>
              <span className="text-xs font-mono text-slate-500 min-w-[3rem] text-center">
                {zoomLevel.toFixed(1)}x
              </span>
              <button
                onClick={() => setZoomLevel(Math.min(10, zoomLevel + 0.5))}
                className="px-2 py-1 text-xs font-mono text-slate-400 hover:text-white hover:bg-slate-800/50 rounded"
                title="放大"
              >
                +
              </button>
              <button
                onClick={() => {
                  setZoomLevel(1);
                  setScrollOffset(0);
                }}
                className="px-2 py-1 text-xs font-mono text-slate-400 hover:text-white hover:bg-slate-800/50 rounded"
                title="重置"
              >
                重置
              </button>
            </div>
          )}
        </div>

        {/* 图表区域 (DexScreener Embed) */}
        <div className="flex-1 relative flex overflow-hidden rounded-lg border border-slate-800 bg-black m-2">
          <iframe 
            src={`https://dexscreener.com/solana/${realMarketData?.pairAddress || '6q88jmgqs5kikkjjvh7xgpy2rv3c2jps9yqsgqfvkrgt'}?embed=1&theme=dark&trades=1&info=0`}
            style={{
              width: '100%',
              height: '100%',
              border: 0
            }}
            title="DexScreener Chart"
          />
        </div>

        <div className="h-8 border-t border-slate-800 bg-slate-900 flex items-center justify-between px-4 text-[10px] text-slate-500 font-mono">
          {timeLabels.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
      </div>

      <div className="relative z-10 w-full md:w-1/4 bg-slate-900/30 backdrop-blur flex flex-col font-mono">
        {/* Buy Channel Section */}
        <div className="h-2/3 flex flex-col border-b border-slate-800">
            <div className="h-10 border-b border-slate-800 flex items-center px-4 text-xs text-slate-400 uppercase tracking-wider bg-slate-900">
              <ShoppingBag size={14} className="mr-2" /> Buy TaiOneToken
            </div>
            <div className="flex-1 p-4 flex flex-col justify-center items-center space-y-4 bg-slate-900/20">
                <div className="text-center">
                    <h3 className="text-lg font-bold text-white mb-1">Trade on Raydium</h3>
                    <p className="text-xs text-slate-400">Best liquidity for TaiOneToken</p>
                </div>
                
                <a 
                    href="https://raydium.io/swap/?inputMint=sol&outputMint=ZRGboZN3K6JZYhGe8PHDcazwKuqhgp2tTG7h8G5fKGk" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-lg text-center transition-all transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
                >
                    <span>Buy Now</span>
                    <Globe size={16} />
                </a>

                <div className="text-[10px] text-slate-500 text-center max-w-[200px]">
                    Clicking will open the official Raydium Swap page with the pair pre-loaded.
                </div>
            </div>
        </div>

        {/* Market Stats Section (Moved to bottom) */}
        <div className="h-1/3 border-t border-slate-800 bg-black/20 p-2 flex flex-col">
          <div className="text-[10px] text-slate-500 mb-2 flex justify-between">
            <span>MARKET STATS</span>
            <span className="text-green-500">REAL-TIME</span>
          </div>
          <div className="space-y-2 overflow-y-auto flex-1 text-xs">
             {realMarketData ? (
                <>
                    <div className="flex justify-between">
                        <span className="text-slate-500">TXNS (24H)</span>
                        <span className="text-slate-300">
                            <span className="text-green-500">{realMarketData.txns.h24.buys}</span> / <span className="text-red-500">{realMarketData.txns.h24.sells}</span>
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">VOLUME (24H)</span>
                        <span className="text-slate-300">${realMarketData.volume.h24.toLocaleString()}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-slate-500">LIQUIDITY</span>
                        <span className="text-slate-300">${realMarketData.liquidity.usd.toLocaleString()}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-slate-500">PRICE (SOL)</span>
                        <span className="text-slate-300">{realMarketData.priceNative} SOL</span>
                    </div>
                     <div className="mt-2 text-[10px] text-slate-600 text-center">
                        Individual trades list available in main chart
                    </div>
                </>
             ) : (
                 <div className="flex items-center justify-center h-full text-slate-600">
                     Loading stats...
                 </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketSection;
