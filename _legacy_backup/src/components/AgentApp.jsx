import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Activity, Crosshair, Radio } from 'lucide-react';
import AgentDashboard from './AgentDashboard';
import NetworkRadar from './NetworkRadar';
import MissionLog from './MissionLog';

const AgentApp = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono p-4 pb-24 relative overflow-hidden">
      {/* 背景噪点/扫描线效果 */}
      <div className="fixed inset-0 pointer-events-none opacity-10 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]"></div>
      
      {/* 整合三个子组件 */}
      <AgentDashboard />
      <NetworkRadar />
      <MissionLog />

      {/* 底部导航栏 */}
      <div className="fixed bottom-0 w-full bg-slate-950/90 backdrop-blur border-t border-slate-800 pb-safe pt-2 z-40">
        <div className="flex justify-around items-center pb-2">
          
          {/* Tab 0: 首页 */}
          <div 
            onClick={() => navigate('/')}
            className="flex flex-col items-center cursor-pointer text-slate-600 hover:text-slate-400 transition-colors"
          >
            <Radio className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-bold">HOME</span>
          </div>

          {/* Tab 1: 地堡 */}
          <div 
            onClick={() => navigate('/bunker')}
            className="flex flex-col items-center cursor-pointer text-slate-600 hover:text-slate-400 transition-colors"
          >
            <ShieldCheck className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-bold">BUNKER</span>
          </div>

          {/* Tab 2: 市场 */}
          <div 
            onClick={() => navigate('/market')}
            className="flex flex-col items-center cursor-pointer text-slate-600 hover:text-slate-400 transition-colors"
          >
            <Activity className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-bold">MARKET</span>
          </div>

          {/* Tab 3: 任务 (拉新) - 当前页面 */}
          <div className="flex flex-col items-center cursor-pointer text-emerald-500">
            <div className="relative">
              <Crosshair className="w-6 h-6" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
            </div>
            <span className="text-[10px] mt-1 font-bold">OPS</span>
          </div>

          {/* Tab 4: 身份 (确权) */}
          <div 
            onClick={() => navigate('/loadout')}
            className="flex flex-col items-center cursor-pointer text-slate-600 hover:text-slate-400 transition-colors"
          >
            <div className="w-6 h-6 rounded-full border-2 border-slate-600 flex items-center justify-center">
              <div className="w-3 h-3 bg-slate-600 rounded-full"></div>
            </div>
            <span className="text-[10px] mt-1 font-bold">ID</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AgentApp;

