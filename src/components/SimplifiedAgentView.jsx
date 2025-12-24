import React from 'react';
import { Crosshair, Terminal } from 'lucide-react';

const SimplifiedAgentView = () => {
  const missions = [
    { title: 'ESTABLISH UPLINK', reward: '50 TWS', active: true },
    { title: 'RECRUIT ASSET', reward: '150 TWS', active: false },
  ];

  return (
    <div className="p-4 pt-8 space-y-6 pb-24">
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 rounded-lg border border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center border-2 border-green-500">
            <Crosshair className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <div className="text-xs text-gray-400 font-mono">AGENT ID</div>
            <div className="text-lg font-bold text-white font-mono">GHOST-8964</div>
          </div>
        </div>
        <div className="flex justify-between text-[10px] font-mono text-gray-500 bg-black/30 p-2 rounded">
          <span>RANK: OUTPOST</span>
          <span>NETWORK: 0 NODES</span>
        </div>
      </div>

      {/* 任务列表 (简化版) */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-gray-400 font-mono flex items-center gap-2">
          <Terminal className="w-3 h-3" /> PENDING PROTOCOLS
        </h3>
        {missions.map((m, i) => (
          <div 
            key={i} 
            className={`border rounded p-3 flex justify-between items-center ${
              m.active 
                ? 'bg-gray-900 border-red-900/50' 
                : 'bg-gray-900/50 border-gray-800 opacity-50'
            }`}
          >
            <span className="text-sm font-mono text-gray-300">{m.title}</span>
            <span className="text-xs font-mono text-yellow-500">{m.reward}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimplifiedAgentView;

