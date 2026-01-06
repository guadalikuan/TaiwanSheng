import React, { useState, useEffect } from 'react';
import { Radio, ShoppingBag, Users, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SimplifiedLandingView from './SimplifiedLandingView';
import SimplifiedMarketView from './SimplifiedMarketView';
import SimplifiedAgentView from './SimplifiedAgentView';
import NavButton from './NavButton';

const TWSApp = () => {
  const navigate = useNavigate();
  const [view, setView] = useState('landing'); // landing, market, agent
  const [loading, setLoading] = useState(true);

  // 模拟系统启动效果
  useEffect(() => {
    setTimeout(() => setLoading(false), 2000);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-t-red-600 border-r-red-600 border-b-transparent border-l-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-red-600 font-mono text-xs tracking-widest animate-pulse">
            ESTABLISHING SECURE UPLINK...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-gray-300 font-sans selection:bg-red-900 selection:text-white flex flex-col">
      
      {/* 顶部状态条 */}
      <div className="fixed top-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent z-50 opacity-50"></div>
      
      {/* 返回完整版按钮 */}
      <button
        onClick={() => navigate('/')}
        className="fixed top-2 right-2 z-50 bg-black/80 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 px-3 py-1.5 rounded text-xs font-mono tracking-widest transition-all flex items-center gap-2"
      >
        <ExternalLink size={12} />
        完整版
      </button>

      {/* 主视图区域 */}
      <main className="flex-1 overflow-y-auto scrollbar-hide">
        {view === 'landing' && <SimplifiedLandingView />}
        {view === 'market' && <SimplifiedMarketView />}
        {view === 'agent' && <SimplifiedAgentView />}
      </main>

      {/* 底部战术导航栏 */}
      <nav className="fixed bottom-0 w-full bg-black/90 backdrop-blur-md border-t border-gray-800 pb-safe pt-2 z-40">
        <div className="flex justify-around items-center h-16 px-2">
          
          <NavButton 
            icon={<Radio className="w-5 h-5" />} 
            label="UPLINK" 
            active={view === 'landing'} 
            onClick={() => setView('landing')} 
          />
          
          <NavButton 
            icon={<ShoppingBag className="w-5 h-5" />} 
            label="ASSETS" 
            active={view === 'market'} 
            onClick={() => setView('market')} 
          />
          
          <NavButton 
            icon={<Users className="w-5 h-5" />} 
            label="AGENTS" 
            active={view === 'agent'} 
            onClick={() => setView('agent')} 
          />

        </div>
      </nav>
    </div>
  );
};

export default TWSApp;

