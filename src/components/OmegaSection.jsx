import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { generateUniqueId } from '../utils/uniqueId';
import { getOmegaData } from '../utils/api';
import { useSSE } from '../contexts/SSEContext';
import { useServerStatus } from '../contexts/ServerStatusContext';

const crisisEvents = [
  'DETECTED: 12 PLA Aircraft crossed median line. (-6 Hours)',
  'DETECTED: US Arms Sale Announcement. (-2 Days)',
  'MARKET: 500 new users joined from Taipei. (-1 Hour)',
  "ALERT: 'Independence' keyword spike in local news. (-12 Hours)",
  'INTEL: Offshore capital re-routed through Kinmen. (-3 Hours)',
];

const formatSegment = (value, length) => String(value).padStart(length, '0');

const OmegaSection = () => {
  const navigate = useNavigate();
  const { isOnline } = useServerStatus();
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const [premium, setPremium] = useState(142.5);
  const [logs, setLogs] = useState([]);
  const [isGlitching, setIsGlitching] = useState(false);
  const [alertMessage, setAlertMessage] = useState('⚠ SYSTEM ALERT: GEOPOLITICAL TENSION RISING');
  const [loading, setLoading] = useState(true);
  // Default to 2027-12-31 to match server-side TimeManager default
  // This prevents the "600 days" flicker on initial load
  const targetRef = useRef(new Date('2027-12-31T00:00:00.000Z').getTime());
  const glitchTimeoutRef = useRef(null);

  // 加载初始数据
  useEffect(() => {
    // 如果服务器离线，不发起请求，避免浏览器控制台显示错误
    if (!isOnline) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const response = await getOmegaData();
        if (response && response.success && response.data) {
          const data = response.data;
          if (data.etuTargetTime) {
            targetRef.current = data.etuTargetTime;
          }
          if (data.riskPremium !== undefined) {
            setPremium(data.riskPremium);
          }
          if (data.events && Array.isArray(data.events)) {
            setLogs(data.events.map(event => ({
              id: event.id || generateUniqueId(),
              text: event.text || event.message || '',
              impact: event.impact // Preserve impact field
            })));
          }
          if (data.alertMessage) {
            setAlertMessage(data.alertMessage);
          }
        } else if (response && response.success === false) {
          // 处理错误响应（如服务器离线）
          // 完全静默处理，不输出任何日志
        }
      } catch (error) {
        // 连接错误已在 api.js 中处理，完全静默
        // 只记录非连接错误
        if (error.name !== 'ConnectionRefusedError' && !error.message?.includes('无法连接到服务器')) {
          console.error('Failed to load omega data:', error);
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isOnline]);

  // 倒计时更新
  useEffect(() => {
    const interval = setInterval(() => {
      const distance = Math.max(targetRef.current - Date.now(), 0);
      setTimeLeft({
        d: Math.floor(distance / (1000 * 60 * 60 * 24)),
        h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 10);
    return () => clearInterval(interval);
  }, []);

  // 使用 SSE 接收实时更新
  const { subscribe } = useSSE();
  
  useEffect(() => {
    // 订阅 omega 数据更新
    const unsubscribe = subscribe('omega', (message) => {
      if (message.type === 'update' && message.data) {
        const data = message.data;
        
        // 更新风险溢价
        if (data.riskPremium !== undefined && data.riskPremium !== premium) {
          const oldPremium = premium;
          setPremium(data.riskPremium);
          // 如果风险溢价变化超过5%，触发glitch效果
          if (Math.abs(data.riskPremium - oldPremium) > 5) {
            setIsGlitching(true);
            if (glitchTimeoutRef.current) clearTimeout(glitchTimeoutRef.current);
            glitchTimeoutRef.current = setTimeout(() => setIsGlitching(false), 500);
          }
        }
        
        // 更新事件日志
        if (data.events && Array.isArray(data.events)) {
          const newEvents = data.events.map(event => ({
            id: event.id || generateUniqueId(),
            text: event.text || event.message || '',
            impact: event.impact // Preserve impact field
          }));
          const hadNewEvents = newEvents.length > logs.length;
          setLogs(newEvents);
          
          // 如果有新事件，触发glitch效果并调整ETU
          if (hadNewEvents) {
            setIsGlitching(true);
            // 每个新事件减少ETU目标时间（加速统一）
            // 注意：这里仅作视觉效果，实际时间由 etuTargetTime 决定
            if (glitchTimeoutRef.current) clearTimeout(glitchTimeoutRef.current);
            glitchTimeoutRef.current = setTimeout(() => setIsGlitching(false), 500);
          }
        }
        
        // 更新ETU目标时间
        if (data.etuTargetTime && data.etuTargetTime !== targetRef.current) {
          const timeDiff = data.etuTargetTime - targetRef.current;
          // 如果ETU变化超过1小时，触发glitch效果
          if (Math.abs(timeDiff) > 1000 * 60 * 60) {
            setIsGlitching(true);
            if (glitchTimeoutRef.current) clearTimeout(glitchTimeoutRef.current);
            glitchTimeoutRef.current = setTimeout(() => setIsGlitching(false), 500);
          }
          targetRef.current = data.etuTargetTime;
        }
        
        // 更新警告消息
        if (data.alertMessage) {
          setAlertMessage(data.alertMessage);
        }
      } else if (message.type === 'incremental' && message.data.type === 'event') {
        // 增量更新：新事件
        const newEvents = message.data.events.map(event => ({
          id: event.id || generateUniqueId(),
          text: event.text || event.message || '',
          impact: event.impact // Preserve impact field
        }));
        const hadNewEvents = newEvents.length > logs.length;
        setLogs(newEvents);
        
        if (hadNewEvents) {
          setIsGlitching(true);
          // 注意：这里仅作视觉效果，实际时间由 etuTargetTime 决定
          if (glitchTimeoutRef.current) clearTimeout(glitchTimeoutRef.current);
          glitchTimeoutRef.current = setTimeout(() => setIsGlitching(false), 500);
        }
      }
    });
    
    return () => {
      unsubscribe();
      if (glitchTimeoutRef.current) clearTimeout(glitchTimeoutRef.current);
    };
  }, [subscribe, premium, logs.length]);

  return (
    <div className="relative flex h-screen flex-col bg-black text-slate-100 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(248,113,113,0.08),transparent_60%)] pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* 警告栏 - 固定高度，添加顶部 padding 避开导航栏 */}
      <div className="relative w-full bg-red-900/20 border-b border-red-800 text-center py-2 z-10 shrink-0 mt-16 md:mt-20">
        <span className="text-red-500 text-xs tracking-[0.3em] font-mono">{alertMessage}</span>
      </div>

      {/* 主要内容区域 - 使用 flex-1，限制高度为按钮留出空间 */}
      <div className="relative z-10 flex flex-col items-center px-4 w-full flex-1 min-h-0 pt-6 md:pt-8 pb-8 md:pb-8 overflow-y-auto">
        <div className="flex flex-col items-center w-full h-full justify-center">
          <div className="text-center w-full max-w-[min(92vw,1200px)] py-[61.44px] md:py-[81.92px] px-4 md:px-6 border border-red-500/40 bg-black/85 rounded-3xl shadow-[0_0_120px_rgba(239,68,68,0.35)] backdrop-blur">
            <h2 className="text-gray-500 text-xs md:text-sm tracking-[0.4em] mb-3 md:mb-4 font-mono uppercase">ESTIMATED TIME TO UNIFICATION (E.T.U.)</h2>
            <div
              className={`omega-clock text-[clamp(2.88rem,7.2vw,8rem)] md:text-[clamp(3.52rem,8.8vw,10.4rem)] font-extrabold text-red-500 tracking-tight leading-none tabular-nums pulse ${
                isGlitching ? 'glitch-active' : ''
              }`}
            >
              {loading ? (
                <div className="animate-pulse text-red-500/50">LOADING...</div>
              ) : (
                `${formatSegment(timeLeft.d, 4)}:${formatSegment(timeLeft.h, 2)}:${formatSegment(timeLeft.m, 2)}:${formatSegment(timeLeft.s, 2)}`
              )}
            </div>
            <div className="flex justify-between text-[10px] md:text-xs text-red-800 mt-3 md:mt-4 px-4 md:px-8 font-mono uppercase tracking-[0.4em] md:tracking-[0.6em]">
              <span>DAYS</span>
              <span>HOURS</span>
              <span>MINS</span>
              <span>SECS</span>
            </div>

            <div className="mt-4 md:mt-5 h-14 md:h-16 overflow-hidden text-left border-t border-red-900/40 pt-2 md:pt-3 relative">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-black pointer-events-none z-20" />
              <div className="space-y-0.5 text-[10px] md:text-xs text-red-400/80 font-mono pr-2 leading-relaxed">
                {logs.length === 0 ? (
                  <div className="text-red-600/70">[STANDBY] Awaiting anomaly...</div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex justify-between items-center gap-2">
                      <div className="truncate flex-1" title={log.text}>
                        <span className="text-red-500 mr-2">[TRIGGER]</span>
                        {log.text}
                      </div>
                      <div className={`whitespace-nowrap text-[9px] font-bold ${
                        (!log.impact || log.impact === 'NEUTRAL') 
                          ? 'text-gray-500' 
                          : log.impact.startsWith('-') 
                            ? 'text-green-500' 
                            : 'text-red-500'
                      }`}>
                        {log.impact || 'NEUTRAL'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-1.5 md:mt-2 text-center">
            <p className="text-gray-400 text-[10px] md:text-xs uppercase tracking-[0.3em] md:tracking-[0.4em] font-mono">Current Risk Premium</p>
            <p className="text-2xl md:text-4xl text-white font-bold tracking-tight">
              +{premium.toFixed(1)}% <span className="text-green-500 text-base md:text-lg">▲</span>
            </p>
          </div>
        </div>
      </div>

      {/* 底部按钮区域 - 固定在第一屏底部，确保在视口内 */}
      <div className="relative z-20 w-full flex justify-center shrink-0 pb-4 md:pb-6">
        <button
          onClick={() => navigate('/bunker')}
          className="px-6 md:px-8 py-2.5 md:py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs md:text-sm tracking-widest rounded-lg shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2 animate-pulse"
        >
          <ShieldCheck size={16} className="md:w-[18px] md:h-[18px]" />
          进入地堡 / ENTER BUNKER
        </button>
      </div>
    </div>
  );
};

export default OmegaSection;

