import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  MapPin, 
  Lock, 
  CreditCard, 
  Crosshair, 
  FileText,
  ChevronRight,
  Zap,
  Radio
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// 模拟组件：地堡主程序
const BunkerApp = () => {
  // 核心状态：生存率 (0-100)
  // 初始设置为 34% (极度危险)，诱导用户行动
  const [survivalRate, setSurvivalRate] = useState(34);
  const [userBalance, setUserBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // 模拟启动时的系统自检效果
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // 增加生存率的模拟函数 (充值/买房/做任务)
  const handleAction = (points) => {
    const newRate = Math.min(survivalRate + points, 100);
    setSurvivalRate(newRate);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-mono text-emerald-500">
        <Activity className="w-12 h-12 animate-pulse mb-4" />
        <div className="text-xs tracking-[0.2em]">正在建立安全連線...</div>
        <div className="mt-2 text-xs text-slate-500">節點：廈門_03 <span className="animate-ping">.</span></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-mono pb-20 select-none">
      
      {/* 顶部：用户信息栏 */}
      <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${survivalRate > 80 ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></div>
          <span className="text-xs text-slate-400">身份：TWS-89757</span>
        </div>
        <div className="text-xs text-gold text-yellow-500 border border-yellow-500/30 px-2 py-1 rounded">
          會員等級：0
        </div>
      </div>

      {/* 核心仪表盘：生存率 */}
      <div className="p-6 flex flex-col items-center relative overflow-hidden">
        {/* 背景装饰网格 */}
        <div className="absolute inset-0 opacity-10" 
             style={{backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-4">當前生存機率</div>
          
          {/* 环形进度条模拟 */}
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
              <circle 
                cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" 
                strokeDasharray={552} 
                strokeDashoffset={552 - (552 * survivalRate) / 100}
                className={`${survivalRate > 60 ? 'text-emerald-500' : 'text-red-600'} transition-all duration-1000 ease-out`}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className={`text-5xl font-bold ${survivalRate > 60 ? 'text-emerald-400' : 'text-red-500'}`}>
                {survivalRate}%
              </span>
              <span className={`text-xs mt-1 px-2 py-0.5 rounded ${survivalRate > 60 ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400 blink'}`}>
                {survivalRate > 60 ? '安全' : '極度危險'}
              </span>
            </div>
          </div>

          <p className="mt-4 text-xs text-center max-w-[200px] text-slate-400">
            {survivalRate > 60 
              ? "系統已穩定。維持資產以保持狀態。" 
              : "警告：您的資產不足以應對事件。請立即獲取避難所。"}
          </p>
        </div>
      </div>

      {/* 快速行动区 (Action Grid) */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => navigate('/market')}
            className="bg-red-900/20 border border-red-800 hover:bg-red-900/40 active:scale-95 transition-all p-3 rounded flex flex-col items-center group"
          >
            <ShieldCheck className="w-6 h-6 text-red-500 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold text-red-100">獲取資產</span>
            <span className="text-[10px] text-red-400 mt-1">+15% 生存率</span>
          </button>

          <button 
            onClick={() => handleAction(5)}
            className="bg-slate-800 border border-slate-700 hover:bg-slate-700 active:scale-95 transition-all p-3 rounded flex flex-col items-center group"
          >
            <Crosshair className="w-6 h-6 text-blue-400 mb-1 group-hover:rotate-90 transition-transform" />
            <span className="text-sm font-bold text-slate-200">任務行動</span>
            <span className="text-[10px] text-blue-400 mt-1">+5% 生存率</span>
          </button>
        </div>
      </div>

      {/* 资产金库 (Vault) */}
      <div className="px-4 pb-20">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-slate-400 flex items-center">
            <Lock className="w-3 h-3 mr-2" />
            資產金庫
          </h3>
          <span className="text-xs text-slate-600">透過 TWS 鏈加密</span>
        </div>

        <div className="space-y-3">
          {/* 资产卡片 1: Token */}
          <div className="bg-slate-900 border border-slate-800 rounded p-4 flex justify-between items-center shadow-lg">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center mr-3 border border-slate-700">
                <Zap className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">TWS 代幣</div>
                <div className="text-xs text-slate-500">餘額：0.00</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono text-emerald-400">+0.0%</div>
              <div className="text-[10px] text-slate-600">等待事件</div>
            </div>
          </div>

          {/* 资产卡片 2: 房产 (核心诱饵 - 缺省状态) */}
          {/* 心理学设计：红色虚线框 + 警告图标，制造"裸奔"的焦虑感 */}
          <div className="bg-red-950/10 border border-dashed border-red-900/60 rounded p-4 flex justify-between items-center group cursor-pointer hover:bg-red-950/20 transition-all">
            <div className="flex items-center opacity-80">
              <div className="w-10 h-10 bg-red-900/20 rounded-full flex items-center justify-center mr-3">
                <FileText className="w-5 h-5 text-red-600 animate-pulse" />
              </div>
              <div>
                <div className="text-sm font-bold text-red-500 group-hover:text-red-400 transition-colors">
                  未獲取避難所
                </div>
                <div className="text-xs text-red-800 group-hover:text-red-600">
                  風險等級：極度危險
                </div>
              </div>
            </div>
            <button 
              onClick={() => navigate('/market')}
              className="bg-red-700 hover:bg-red-600 text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-[0_0_10px_rgba(220,38,38,0.5)] animate-pulse"
            >
              獲取
            </button>
          </div>

          {/* 模拟已购买状态 (注释掉，供演示用) */}
          {/* 
          <div className="bg-slate-900 border-l-4 border-l-red-600 border-y border-r border-slate-800 rounded p-4 flex justify-between items-center">
            <div className="flex items-center">
              <div className="mr-3">
                <div className="text-[10px] text-slate-500 uppercase">產權編號</div>
                <div className="text-sm font-mono text-white tracking-widest">CN-FUJ-8901</div>
              </div>
            </div>
            <div className="px-2 py-1 bg-emerald-900/30 border border-emerald-800 rounded text-[10px] text-emerald-500">
              已驗證
            </div>
          </div> 
          */}

        </div>
      </div>

      {/* 底部导航栏 (Footer) */}
      <div className="fixed bottom-0 w-full bg-slate-950/90 backdrop-blur border-t border-slate-800 pb-safe pt-2">
        <div className="flex justify-around items-center pb-2">
          
          {/* Tab 0: 首页 */}
          <div 
            onClick={() => navigate('/')}
            className="flex flex-col items-center cursor-pointer text-slate-600 hover:text-slate-400 transition-colors"
          >
            <Radio className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-bold">首頁</span>
          </div>

          {/* Tab 1: 地堡 (当前) */}
          <div className="flex flex-col items-center cursor-pointer text-emerald-500">
            <ShieldCheck className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-bold">地堡</span>
          </div>

          {/* Tab 2: 市场 (走势) */}
          <div 
            onClick={() => navigate('/market')}
            className="flex flex-col items-center cursor-pointer text-slate-600 hover:text-slate-400 transition-colors"
          >
            <Activity className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-bold">市場</span>
          </div>

          {/* Tab 3: 任务 (拉新) */}
          <div 
            onClick={() => navigate('/agent')}
            className="flex flex-col items-center cursor-pointer text-slate-600 hover:text-slate-400 transition-colors"
          >
            <div className="relative">
              <Crosshair className="w-6 h-6" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
            </div>
            <span className="text-[10px] mt-1 font-bold">任務</span>
          </div>

          {/* Tab 4: 身份 (确权) */}
          <div 
            onClick={() => navigate('/loadout')}
            className="flex flex-col items-center cursor-pointer text-slate-600 hover:text-slate-400 transition-colors"
          >
            <div className="w-6 h-6 rounded-full border-2 border-slate-600 flex items-center justify-center">
              <div className="w-3 h-3 bg-slate-600 rounded-full"></div>
            </div>
            <span className="text-[10px] mt-1 font-bold">身份</span>
          </div>

        </div>
      </div>

    </div>
  );
};

export default BunkerApp;

