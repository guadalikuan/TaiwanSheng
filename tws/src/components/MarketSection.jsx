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
  const [rawData, setRawData] = useState([]); // 原始K线数据
  const [data, setData] = useState([]); // 当前视图的数据（聚合后的）
  const [viewMode, setViewMode] = useState('分时'); // 视图模式：分时、日K、周K、月K
  const [currentPrice, setCurrentPrice] = useState(142.85);
  const [priceChange24h, setPriceChange24h] = useState(12.4);
  const [volume24h, setVolume24h] = useState(4291002911);
  const [marketIndex, setMarketIndex] = useState('STRONG BUY');
  const [orderBook, setOrderBook] = useState({ asks: [], bids: [] });
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // 价格相关状态
  const [yesterdayClose, setYesterdayClose] = useState(null); // 昨收价
  const [todayHigh, setTodayHigh] = useState(null); // 今日最高
  const [todayLow, setTodayLow] = useState(null); // 今日最低
  
  // 缩放相关状态
  const [zoomLevel, setZoomLevel] = useState(1); // 缩放级别：1-10，1显示所有数据，10只显示最近10%
  const [scrollOffset, setScrollOffset] = useState(0); // 滚动偏移：0-100，控制显示的数据范围
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartOffset, setDragStartOffset] = useState(0);

  // 加载初始数据（带重试机制）
  useEffect(() => {
    // 如果服务器离线，不发起请求，避免浏览器控制台显示错误
    if (!isOnline) {
      setLoading(false);
      return;
    }

    const loadData = async (retry = 0) => {
      try {
        setError(null);
        const response = await getMarketData();
        
        if (response && response.success && response.data) {
          const marketData = response.data;
          
          // 转换K线数据格式
          if (marketData.klineData && Array.isArray(marketData.klineData) && marketData.klineData.length > 0) {
            const formattedData = marketData.klineData
              .filter(item => item && (item.open !== undefined || item.close !== undefined))
              .map(item => ({
                id: item.id || 0,
                timestamp: item.timestamp || Date.now(),
                open: typeof item.open === 'number' ? item.open : parseFloat(item.open) || 0,
                close: typeof item.close === 'number' ? item.close : parseFloat(item.close) || 0,
                high: typeof item.high === 'number' ? item.high : parseFloat(item.high) || 0,
                low: typeof item.low === 'number' ? item.low : parseFloat(item.low) || 0,
                vol: typeof item.volume === 'number' ? item.volume : (typeof item.vol === 'number' ? item.vol : parseFloat(item.volume || item.vol) || 0)
              }))
              .filter(item => item.open > 0 || item.close > 0)
              .sort((a, b) => a.timestamp - b.timestamp); // 按时间排序
            setRawData(formattedData);
            
            // 计算昨收价（使用第一个数据点的open作为昨收，或使用当前价格的95%作为模拟值）
            if (formattedData.length > 0) {
              const firstDataPoint = formattedData[0];
              setYesterdayClose(firstDataPoint.open || currentPrice * 0.95);
            } else {
              setYesterdayClose(currentPrice * 0.95);
            }
            
            // 计算今日最高最低（从今天的数据中）
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStart = today.getTime();
            const todayData = formattedData.filter(item => item.timestamp >= todayStart);
            if (todayData.length > 0) {
              const highs = todayData.map(d => d.high).filter(h => h > 0);
              const lows = todayData.map(d => d.low).filter(l => l > 0);
              if (highs.length > 0) setTodayHigh(Math.max(...highs));
              if (lows.length > 0) setTodayLow(Math.min(...lows));
            }
          } else {
            // 如果K线数据为空，设置为空数组
            setRawData([]);
            setYesterdayClose(currentPrice * 0.95);
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
          
          setRetryCount(0); // 重置重试计数
        } else {
          // 处理错误响应
          if (response && response.success === false) {
            // 服务器返回的错误响应（如 ConnectionRefusedError）
            const errorMessage = response.message || '无法加载市场数据';
            setError(errorMessage);
            
            // 如果是连接错误，不进行重试
            if (response.error === 'ConnectionRefusedError') {
              // 完全静默处理，不输出任何日志
              return; // 立即返回，不进行重试
            }
          } else {
            // 响应格式不正确，只在开发环境输出
            if (import.meta.env.DEV) {
              console.warn('Market data response format unexpected:', response);
            }
          }
          
          // 只有在非连接错误时才进行重试
          if (retry < 2 && (!response || response.error !== 'ConnectionRefusedError')) {
            setTimeout(() => loadData(retry + 1), 2000 * (retry + 1));
            setRetryCount(retry + 1);
          } else {
            setError('无法加载市场数据，请检查服务器连接');
          }
        }
      } catch (error) {
        // 如果是连接错误，完全静默处理，不设置错误，不输出日志
        if (error.name === 'ConnectionRefusedError' || error.message?.includes('无法连接到服务器')) {
          // 完全静默处理，不设置错误，不输出日志
          return;
        }
        // 只记录非连接错误
        console.error('Failed to load market data:', error);
        const errorMessage = error.message || '网络错误，请检查服务器连接';
        setError(errorMessage);
        
        // 重试机制：最多重试3次
        if (retry < 3) {
          console.log(`Retrying market data load (${retry + 1}/3)...`);
          setTimeout(() => loadData(retry + 1), 2000 * (retry + 1));
          setRetryCount(retry + 1);
        }
      } finally {
        if (retry === 0 || retry >= 3) {
          setLoading(false);
        }
      }
    };
    loadData();
  }, [isOnline]);

  // 使用 SSE 接收实时更新
  const { subscribe, getData } = useSSE();
  
  // 处理市场数据更新的辅助函数
  const updateMarketDataFromSSE = (marketData) => {
    // 更新价格
    if (marketData.currentPrice !== undefined) {
      setCurrentPrice(marketData.currentPrice);
    }
    
    // 更新K线数据
    if (marketData.klineData && Array.isArray(marketData.klineData) && marketData.klineData.length > 0) {
      const formattedData = marketData.klineData
        .filter(item => item && (item.open !== undefined || item.close !== undefined))
        .map(item => ({
          id: item.id || 0,
          timestamp: item.timestamp || Date.now(),
          open: typeof item.open === 'number' ? item.open : parseFloat(item.open) || 0,
          close: typeof item.close === 'number' ? item.close : parseFloat(item.close) || 0,
          high: typeof item.high === 'number' ? item.high : parseFloat(item.high) || 0,
          low: typeof item.low === 'number' ? item.low : parseFloat(item.low) || 0,
          vol: typeof item.volume === 'number' ? item.volume : (typeof item.vol === 'number' ? item.vol : parseFloat(item.volume || item.vol) || 0)
        }))
        .filter(item => item.open > 0 || item.close > 0)
        .sort((a, b) => a.timestamp - b.timestamp);
      setRawData(formattedData);
      
      // 更新今日最高最低
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();
      const todayData = formattedData.filter(item => item.timestamp >= todayStart);
      if (todayData.length > 0) {
        const highs = todayData.map(d => d.high).filter(h => h > 0);
        const lows = todayData.map(d => d.low).filter(l => l > 0);
        if (highs.length > 0) setTodayHigh(Math.max(...highs));
        if (lows.length > 0) setTodayLow(Math.min(...lows));
      }
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
    
    // 更新24小时变化和成交量
    if (marketData.priceChange24h !== undefined) {
      setPriceChange24h(marketData.priceChange24h);
    }
    if (marketData.volume24h !== undefined) {
      setVolume24h(marketData.volume24h);
    }
    if (marketData.marketIndex) {
      setMarketIndex(marketData.marketIndex);
    }
  };
  
  useEffect(() => {
    // 订阅 market 数据更新
    const unsubscribe = subscribe('market', (message) => {
      if (message.type === 'update' && message.data) {
        // 全量更新：直接使用SSE推送的完整数据，不需要再次调用API
        updateMarketDataFromSSE(message.data);
      } else if (message.type === 'incremental' && message.data.klinePoint) {
        // 增量更新：K线数据点
        const klinePoint = message.data.klinePoint;
        setRawData(prevData => {
          const newData = [...prevData, {
            id: prevData.length,
            timestamp: klinePoint.timestamp || Date.now(),
            open: klinePoint.open || 0,
            close: klinePoint.close || 0,
            high: klinePoint.high || 0,
            low: klinePoint.low || 0,
            vol: klinePoint.volume || 0
          }].filter(item => item.open > 0 || item.close > 0)
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-60); // 保持最多60个数据点
          
          // 更新今日最高最低
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayStart = today.getTime();
          const todayData = newData.filter(item => item.timestamp >= todayStart);
          if (todayData.length > 0) {
            const highs = todayData.map(d => d.high).filter(h => h > 0);
            const lows = todayData.map(d => d.low).filter(l => l > 0);
            if (highs.length > 0) setTodayHigh(Math.max(...highs));
            if (lows.length > 0) setTodayLow(Math.min(...lows));
          }
          
          return newData;
        });
      }
      
      // 更新价格相关数据
      if (message.data.currentPrice !== undefined) {
        setCurrentPrice(message.data.currentPrice);
      }
      if (message.data.priceChange24h !== undefined) {
        setPriceChange24h(message.data.priceChange24h);
      }
      if (message.data.volume24h !== undefined) {
        setVolume24h(message.data.volume24h);
      }
      if (message.data.orderBook) {
        setOrderBook(message.data.orderBook);
      }
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
                <h3 className="text-xl font-bold text-white font-mono tracking-wider">TWS/CNY</h3>
              </div>
            </div>
            <button
              onClick={() => navigate('/market')}
              className="bg-yellow-600/20 border border-yellow-600/50 text-yellow-500 hover:bg-yellow-600 hover:text-black px-4 py-1.5 rounded text-xs font-mono tracking-widest transition-all flex items-center gap-2"
            >
              <ShoppingBag size={14} />
              进入交易
            </button>
          </div>
          
          <div className="flex items-center space-x-6">
            {/* 现价 */}
            <div className="flex items-baseline space-x-2">
              <span className={`text-3xl font-mono font-bold ${currentPrice >= (yesterdayClose || currentPrice) ? 'text-green-500' : 'text-red-500'}`}>
                {currentPrice.toFixed(2)}
              </span>
              {currentPrice >= (yesterdayClose || currentPrice) ? (
                <ArrowUp size={20} className="text-green-500" />
              ) : (
                <ArrowDown size={20} className="text-red-500" />
              )}
            </div>
            
            {/* 涨跌幅 */}
            {yesterdayClose && (
              <div className="flex flex-col">
                <span className={`text-lg font-mono font-semibold ${currentPrice >= yesterdayClose ? 'text-green-500' : 'text-red-500'}`}>
                  {currentPrice >= yesterdayClose ? '+' : ''}{(currentPrice - yesterdayClose).toFixed(2)}
                </span>
                <span className={`text-sm font-mono ${currentPrice >= yesterdayClose ? 'text-green-500/70' : 'text-red-500/70'}`}>
                  {currentPrice >= yesterdayClose ? '+' : ''}{((currentPrice - yesterdayClose) / yesterdayClose * 100).toFixed(2)}%
                </span>
              </div>
            )}
            
            {/* 昨收、最高、最低 */}
            <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
              <div>
                <span className="text-slate-500">昨收</span>
                <span className="ml-2 text-white">{yesterdayClose ? yesterdayClose.toFixed(2) : '--'}</span>
              </div>
              <div>
                <span className="text-slate-500">最高</span>
                <span className="ml-2 text-red-400">{todayHigh ? todayHigh.toFixed(2) : currentPrice.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-500">最低</span>
                <span className="ml-2 text-green-400">{todayLow ? todayLow.toFixed(2) : currentPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 选项卡栏 */}
        <div className="h-10 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between px-4">
          <div className="flex space-x-1">
            {['分时', '日K', '周K', '月K'].map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setViewMode(mode);
                  // 切换视图时重置缩放和滚动
                  if (mode === '分时') {
                    setZoomLevel(1);
                    setScrollOffset(0);
                  }
                }}
                className={`px-4 py-1.5 text-xs font-mono rounded transition-all ${
                  viewMode === mode
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {mode}
              </button>
            ))}
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

        {/* 图表区域 */}
        <div className="flex-1 relative flex overflow-hidden">
          {/* 左侧价格坐标轴 */}
          <div className="w-16 border-r border-slate-800 bg-slate-900/30 relative">
            {priceTicks.map((price, index) => {
              // 价格从高到低，所以第一个是最高的，对应y=0
              const yPercent = (index / Math.max(1, priceTicks.length - 1)) * 100;
              return (
                <div
                  key={index}
                  className="absolute left-0 right-0 px-2 text-right"
                  style={{ top: `${yPercent}%`, transform: 'translateY(-50%)' }}
                >
                  <span className="text-[10px] font-mono text-slate-400">{price.toFixed(2)}</span>
                </div>
              );
            })}
          </div>

          {/* 主图表区域 */}
          <div 
            className="flex-1 relative p-2 overflow-hidden cursor-grab active:cursor-grabbing hover:bg-slate-900/20 transition-colors"
            onMouseDown={(e) => {
              if (viewMode !== '分时') {
                setIsDragging(true);
                setDragStartX(e.clientX);
                setDragStartOffset(scrollOffset);
              }
            }}
            onMouseMove={(e) => {
              if (isDragging && viewMode !== '分时') {
                const deltaX = e.clientX - dragStartX;
                const chartWidth = e.currentTarget.offsetWidth;
                const deltaPercent = (deltaX / chartWidth) * 100;
                const newOffset = Math.max(0, Math.min(100, dragStartOffset - deltaPercent));
                setScrollOffset(newOffset);
              }
            }}
            onMouseUp={() => {
              setIsDragging(false);
            }}
            onMouseLeave={() => {
              setIsDragging(false);
            }}
            onWheel={(e) => {
              if (viewMode !== '分时') {
                e.preventDefault();
                const delta = e.deltaY > 0 ? 1 : -1;
                const newZoom = Math.max(1, Math.min(10, zoomLevel + delta * 0.5));
                setZoomLevel(newZoom);
                // 调整滚动位置以保持当前视图中心
                if (newZoom > zoomLevel) {
                  // 放大时，稍微向右滚动
                  setScrollOffset(Math.min(100, scrollOffset + 5));
                }
              }
            }}
            title={viewMode === '分时' ? '点击查看详情' : '滚轮缩放，拖拽滚动'}
          >
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              {/* 网格线（对应价格刻度） */}
              {priceTicks.map((_, index) => {
                const y = (index / Math.max(1, priceTicks.length - 1)) * 100;
                return (
                  <line
                    key={index}
                    x1="0"
                    y1={y}
                    x2="100"
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="2"
                    strokeWidth="0.5"
                  />
                );
              })}
              
              {visibleData.length > 0 ? (
                <>
                  {viewMode === '分时' ? (
                    /* 分时图：折线图 */
                    <>
                      <path
                        d={generateLinePath()}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="0.3"
                        className="opacity-90"
                      />
                      {/* 填充区域（可选） */}
                      <path
                        d={`${generateLinePath()} L 100,100 L 0,100 Z`}
                        fill="url(#gradient)"
                        opacity="0.1"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </>
                  ) : (
                    /* K线图：蜡烛图 */
                    <>
                      {visibleData.map((item, index) => {
                        const x = visibleData.length > 1 ? (index / (visibleData.length - 1)) * 100 : 50;
                        const barWidth = visibleData.length > 0 ? (100 / visibleData.length) * 0.8 : 2;
                        const color = item.close >= item.open ? '#10b981' : '#ef4444';
                        const openY = scale(item.open);
                        const closeY = scale(item.close);
                        const highY = scale(item.high);
                        const lowY = scale(item.low);
                        const rectY = Math.min(openY, closeY);
                        const rectHeight = Math.abs(openY - closeY) || 0.5;
                        
                        return (
                          <g key={`${item.id}-${index}`}>
                            {/* 上下影线 */}
                            <line
                              x1={x}
                              y1={highY}
                              x2={x}
                              y2={lowY}
                              stroke={color}
                              strokeWidth="0.4"
                            />
                            {/* K线实体 */}
                            <rect
                              x={Math.max(0, x - barWidth / 2)}
                              y={rectY}
                              width={barWidth}
                              height={rectHeight}
                              fill={color}
                            />
                          </g>
                        );
                      })}
                    </>
                  )}
                </>
              ) : (
                /* 无数据提示 */
                <text
                  x="50"
                  y="50"
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="3"
                  className="font-mono"
                >
                  暂无数据
                </text>
              )}
            </svg>
          </div>
        </div>

        <div className="h-8 border-t border-slate-800 bg-slate-900 flex items-center justify-between px-4 text-[10px] text-slate-500 font-mono">
          {timeLabels.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
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
          {trades.map((trade, index) => (
              <div 
                key={`${trade.id}-${index}`} 
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
