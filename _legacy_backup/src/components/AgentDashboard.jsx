import React, { useState } from 'react';
import { Copy, Shield, Award, TrendingUp, Lock, UserPlus } from 'lucide-react';

// 模拟特工数据 (Mock Agent Data)
const agentData = {
  codename: "SHADOW_WOLF",
  clearanceLevel: 3, // 1-5
  rankTitle: "STATION CHIEF (站长)",
  referralCode: "TWS-8821-X",
  totalBounty: "12,450.00", // USDT
  pendingBounty: "850.00",
  nextLevelProgress: 75, // Percentage
  nextLevelReward: "Comm. Rate +2%",
};

const AgentDashboard = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`JOIN TWS | SECURE FREQUENCY: ${agentData.referralCode} | https://tws.io/join/${agentData.referralCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      {/* 背景噪点/扫描线效果 */}
      <div className="fixed inset-0 pointer-events-none opacity-10 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]"></div>
      
      {/* 头部：特工档案 */}
      <header className="mb-8 border-b border-green-900/50 pb-4">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-xl font-bold tracking-tighter text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-500" />
            AGENT PROFILE
          </h1>
          <span className="text-xs bg-green-900/30 px-2 py-1 rounded border border-green-800 animate-pulse">
            STATUS: ACTIVE
          </span>
        </div>
        
        <div className="bg-gray-900/50 p-4 rounded-lg border border-green-800 backdrop-blur-sm">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-xs text-gray-500">CODENAME</p>
              <p className="text-lg font-bold text-white tracking-widest">{agentData.codename}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">CURRENT RANK</p>
              <p className="text-yellow-500 font-bold flex items-center gap-1 justify-end">
                <Award className="w-4 h-4" /> {agentData.rankTitle}
              </p>
            </div>
          </div>

          {/* 晋升进度条 */}
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">PROMOTION PROGRESS</span>
              <span className="text-white">{agentData.nextLevelProgress}%</span>
            </div>
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-green-600 to-yellow-500 h-full" 
                style={{ width: `${agentData.nextLevelProgress}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              NEXT UNLOCK: <span className="text-yellow-400">{agentData.nextLevelReward}</span>
            </p>
          </div>
        </div>
      </header>

      {/* 核心指标：赏金 (Bounty) */}
      <section className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-900/50 p-4 rounded-lg border border-green-800/50">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <Lock className="w-3 h-3" /> TOTAL SECURED
          </div>
          <div className="text-2xl font-bold text-white">
            ${agentData.totalBounty}
          </div>
          <div className="text-[10px] text-green-600 mt-1 flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" /> +12% this week
          </div>
        </div>

        <div className="bg-gray-900/50 p-4 rounded-lg border border-dashed border-yellow-800/50 relative overflow-hidden">
          {/* 待结算动效 */}
          <div className="absolute -right-4 -top-4 bg-yellow-600/20 w-16 h-16 rounded-full blur-xl animate-pulse"></div>
          
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1 relative z-10">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-ping"></span>
            PENDING
          </div>
          <div className="text-2xl font-bold text-yellow-500 relative z-10">
            ${agentData.pendingBounty}
          </div>
          <div className="text-[10px] text-gray-500 mt-1 relative z-10">
            Release upon unification
          </div>
        </div>
      </section>

      {/* 邀请码区域 (The Weapon) */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          RECRUITMENT FREQUENCY
        </h2>
        
        <div 
          onClick={handleCopy}
          className="relative group cursor-pointer active:scale-95 transition-all duration-150"
        >
          <div className="absolute inset-0 bg-green-500/10 blur-md group-hover:bg-green-500/20 transition-all"></div>
          <div className="bg-black border border-green-500 p-4 rounded-lg flex justify-between items-center relative z-10">
            <div>
              <p className="text-xs text-gray-500 mb-1">SECURE LINK</p>
              <p className="text-white font-mono tracking-widest text-lg">
                {agentData.referralCode}
              </p>
            </div>
            <div className={`p-2 rounded-full ${copied ? 'bg-green-500 text-black' : 'bg-gray-800 text-green-500'}`}>
              <Copy className="w-5 h-5" />
            </div>
          </div>
          
          {copied && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 text-xs text-black bg-green-500 px-2 py-1 rounded font-bold">
              COPIED TO CLIPBOARD
            </div>
          )}
        </div>
        
        <p className="text-[10px] text-center text-gray-600 mt-3">
          WARNING: DO NOT SHARE VIA UNENCRYPTED CHANNELS.
        </p>
      </section>
    </div>
  );
};

export default AgentDashboard;

