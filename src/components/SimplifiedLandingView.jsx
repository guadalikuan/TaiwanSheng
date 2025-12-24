import React, { useState, useEffect, useRef } from 'react';
import env from '../config/env';

const formatTime = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  const h = hours % 24;
  const m = minutes % 60;
  const s = seconds % 60;
  
  return `${String(days).padStart(2, '0')}:${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const SimplifiedLandingView = () => {
  const [timeLeft, setTimeLeft] = useState('00:00:00');
  const [chartData, setChartData] = useState([]);

  // 初始化图表数据
  useEffect(() => {
    const initialData = Array.from({ length: 20 }, () => Math.random() * 80 + 20);
    setChartData(initialData);
  }, []);

  // 倒计时逻辑
  useEffect(() => {
    let targetTime = env.countdownTarget > 0 
      ? env.countdownTarget 
      : Date.now() + 1000 * 60 * 60 * 24 * 600;

    // 尝试从后端获取同步时间
    const fetchSyncTime = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/homepage/omega');
        if (response.ok) {
          const json = await response.json();
          if (json.success && json.data && json.data.etuTargetTime) {
            targetTime = json.data.etuTargetTime;
            // 立即重新计算一次以避免延迟
            const distance = Math.max(targetTime - Date.now(), 0);
            setTimeLeft(formatTime(distance));
          }
        }
      } catch (error) {
        console.warn('Failed to sync time from backend:', error);
      }
    };

    fetchSyncTime();
    
    const interval = setInterval(() => {
      const distance = Math.max(targetTime - Date.now(), 0);
      setTimeLeft(formatTime(distance));
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // 更新图表数据
  useEffect(() => {
    const interval = setInterval(() => {
      setChartData(prev => {
        const newData = [...prev.slice(1)];
        newData.push(Math.random() * 80 + 20);
        return newData;
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full p-4 pt-10">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-4xl font-black tracking-tighter text-white">
          TWS<span className="text-red-600">.Ω</span>
        </h1>
        <div className="inline-block px-2 py-0.5 border border-red-900 bg-red-900/20 text-red-500 text-[10px] font-mono tracking-widest animate-pulse">
          SYSTEM STATUS: CRITICAL
        </div>
      </div>
      
      {/* 倒计时核心 */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-6">
        <div className="text-center">
          <div className="text-gray-500 text-xs font-mono mb-2">ESTIMATED TIME REMAINING</div>
          <div className="text-6xl font-mono font-bold text-red-600 tabular-nums tracking-widest shadow-red-500/50 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]">
            {timeLeft}
          </div>
          <div className="text-red-800 text-[10px] font-mono mt-2">SYNCING WITH GEO-POLITICAL EVENTS...</div>
        </div>
        
        {/* K线图模拟 */}
        <div className="w-full h-32 bg-gray-900/50 border border-gray-800 rounded p-2 relative overflow-hidden">
          <div className="absolute inset-0 flex items-end px-2 pb-2 gap-1">
            {chartData.map((height, i) => (
              <div 
                key={i} 
                className="bg-red-600/80 w-full transition-all duration-500" 
                style={{height: `${height}%`}}
              />
            ))}
          </div>
          <div className="absolute top-2 left-2 text-[10px] text-gray-400 font-mono">TWS/USDT INDEX</div>
        </div>
      </div>
    </div>
  );
};

export default SimplifiedLandingView;

