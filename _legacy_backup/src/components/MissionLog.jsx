import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, Lock, Share2, UploadCloud, Radio, Terminal } from 'lucide-react';

const MissionLog = () => {
  // 模拟任务状态
  const [missions, setMissions] = useState([
    { 
      id: 1, 
      title: 'ESTABLISH UPLINK', 
      desc: 'Sync daily bio-metrics to central server.', 
      reward: '+50 TWS', 
      status: 'pending',
      icon: <Radio className="w-4 h-4" />,
      action: 'CONNECT'
    },
    { 
      id: 2, 
      title: 'DEPLOY PSY-OPS', 
      desc: 'Spread the protocol to 3 new targets.', 
      reward: '+150 TWS', 
      status: 'locked',
      icon: <Share2 className="w-4 h-4" />,
      action: 'DEPLOY'
    },
    { 
      id: 3, 
      title: 'UPLOAD FIELD INTEL', 
      desc: 'Submit geo-tagged visual data of key assets.', 
      reward: '+500 TWS', 
      status: 'locked',
      icon: <UploadCloud className="w-4 h-4" />,
      action: 'UPLOAD'
    }
  ]);

  const [consoleLogs, setConsoleLogs] = useState(['> SYSTEM READY...']);

  // 模拟执行任务
  const handleExecute = (id) => {
    // 添加日志
    setConsoleLogs(prev => [`> EXECUTING PROTOCOL ${id}...`, ...prev]);
    
    setTimeout(() => {
        setMissions(prev => prev.map(m => {
            if (m.id === id) return { ...m, status: 'completed' };
            if (m.id === id + 1) return { ...m, status: 'pending' }; // 解锁下一个
            return m;
        }));
        setConsoleLogs(prev => [`> SUCCESS: PROTOCOL ${id} COMPLETE. REWARD ALLOCATED.`, ...prev]);
    }, 1500);
  };

  return (
    <section className="mb-20">
      
      {/* 标题与状态栏 */}
      <div className="flex justify-between items-end mb-4">
        <h2 className="text-sm font-bold text-gray-400 flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          DAILY PROTOCOLS
        </h2>
        <div className="flex items-center gap-1 bg-red-900/20 border border-red-900/50 px-2 py-0.5 rounded">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
            <span className="text-[10px] font-mono text-red-400 tracking-wider">DEFCON 3</span>
        </div>
      </div>

      {/* 任务列表容器 */}
      <div className="space-y-3">
        {missions.map((mission) => (
          <div 
            key={mission.id}
            className={`relative border rounded-lg p-4 transition-all duration-300 ${
                mission.status === 'completed' 
                    ? 'bg-green-900/10 border-green-900/30 opacity-60' 
                    : mission.status === 'locked'
                        ? 'bg-gray-900/50 border-gray-800 grayscale opacity-50'
                        : 'bg-gray-900 border-red-900/50 shadow-[0_0_15px_rgba(220,38,38,0.1)]'
            }`}
          >
            {/* 锁定的遮罩 */}
            {mission.status === 'locked' && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20 backdrop-blur-[1px]">
                    <Lock className="w-6 h-6 text-gray-500" />
                </div>
            )}

            <div className="flex justify-between items-start">
                <div className="flex gap-3">
                    {/* 图标框 */}
                    <div className={`w-10 h-10 rounded flex items-center justify-center border ${
                        mission.status === 'completed' ? 'bg-green-900/20 border-green-500/30 text-green-500' : 'bg-black border-gray-700 text-gray-300'
                    }`}>
                        {mission.status === 'completed' ? <CheckCircle className="w-5 h-5" /> : mission.icon}
                    </div>
                    
                    {/* 文字内容 */}
                    <div>
                        <h3 className={`text-sm font-bold font-mono ${mission.status === 'completed' ? 'text-green-500 line-through' : 'text-white'}`}>
                            {mission.title}
                        </h3>
                        <p className="text-[10px] text-gray-500 mt-1 max-w-[180px]">{mission.desc}</p>
                    </div>
                </div>

                {/* 奖励与按钮 */}
                <div className="flex flex-col items-end gap-2">
                    <span className="text-[10px] font-mono text-yellow-500 bg-yellow-900/10 px-1.5 py-0.5 rounded border border-yellow-900/30">
                        {mission.reward}
                    </span>
                    
                    {mission.status === 'pending' && (
                        <button 
                            onClick={() => handleExecute(mission.id)}
                            className="bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-[0_0_10px_rgba(220,38,38,0.5)] active:scale-95 transition-transform flex items-center gap-1"
                        >
                            {mission.action}
                        </button>
                    )}
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* 底部控制台日志 (增强黑客氛围) */}
      <div className="mt-6 bg-black p-3 rounded font-mono text-[10px] text-green-500/80 border-t border-green-900/50 h-24 overflow-hidden">
        {consoleLogs.map((log, index) => (
            <div key={index} className="opacity-80 mb-1">{log}</div>
        ))}
      </div>

    </section>
  );
};

export default MissionLog;

