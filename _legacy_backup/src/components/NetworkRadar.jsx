import React, { useEffect, useState } from 'react';
import { Network, Activity, Radio, Zap } from 'lucide-react';
import { generateUniqueId } from '../utils/uniqueId';

// 模拟下线数据生成器
const generateNodes = (count) => {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    x: 50 + (Math.random() - 0.5) * 80, // Center bias
    y: 50 + (Math.random() - 0.5) * 80,
    status: Math.random() > 0.3 ? 'active' : 'sleeper',
    size: Math.random() > 0.7 ? 'lg' : 'sm',
    pulseDelay: Math.random() * 2 + 's'
  }));
};

const NetworkRadar = () => {
  const [nodes, setNodes] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);

  // 初始化模拟数据
  useEffect(() => {
    setNodes(generateNodes(12)); // 初始12个下线
    
    // 模拟实时新增下线 (Hook effect)
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const newNode = {
            id: generateUniqueId(),
            x: 50 + (Math.random() - 0.5) * 80,
            y: 50 + (Math.random() - 0.5) * 80,
            status: 'active',
            size: 'sm',
            pulseDelay: '0s'
        };
        setNodes(prev => [...prev.slice(-20), newNode]); // 保持数量不过多
        
        // 添加日志
        const codenames = ['ALPHA', 'GHOST', 'VIPER', 'ECHO', 'SIERRA'];
        const newLog = `[${new Date().toLocaleTimeString()}] NEW CELL DETECTED: ${codenames[Math.floor(Math.random()*codenames.length)]}_${Math.floor(Math.random()*99)}`;
        setRecentLogs(prev => [newLog, ...prev].slice(0, 4));
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="mb-8">
      <h2 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2">
        <Network className="w-4 h-4" />
        NETWORK TOPOLOGY
      </h2>

      <div className="bg-gray-900/80 border border-green-900 rounded-xl p-4 relative overflow-hidden">
        {/* 顶部数据栏 */}
        <div className="flex justify-between mb-4 text-xs relative z-10">
          <div className="text-center">
            <p className="text-gray-500">ACTIVE CELLS</p>
            <p className="text-white font-mono text-lg">42</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500">SLEEPERS</p>
            <p className="text-gray-400 font-mono text-lg">18</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500">DEPTH</p>
            <p className="text-yellow-500 font-mono text-lg">LVL 4</p>
          </div>
        </div>

        {/* 雷达扫描区 */}
        <div className="relative w-full aspect-square max-w-[280px] mx-auto mb-4">
          {/* 装饰：同心圆网格 */}
          <div className="absolute inset-0 border border-green-900/30 rounded-full"></div>
          <div className="absolute inset-[15%] border border-green-900/30 rounded-full"></div>
          <div className="absolute inset-[30%] border border-green-900/30 rounded-full"></div>
          <div className="absolute inset-[45%] border border-green-900/30 rounded-full bg-green-900/5"></div>
          
          {/* 扫描线动画 */}
          <div className="absolute inset-0 w-full h-full rounded-full animate-[spin_4s_linear_infinite] bg-gradient-to-tr from-transparent via-transparent to-green-500/20 border-r border-green-500/30 origin-center z-0"></div>

          {/* 节点 (下线) */}
          {nodes.map((node) => (
            <div
              key={node.id}
              className={`absolute rounded-full transition-all duration-500 ${
                node.status === 'active' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-gray-600'
              } ${node.size === 'lg' ? 'w-3 h-3' : 'w-1.5 h-1.5'}`}
              style={{
                top: `${node.y}%`,
                left: `${node.x}%`,
                animation: `pulse 2s infinite ${node.pulseDelay}`
              }}
            >
              {/* 连线暗示 (仅对大节点) */}
              {node.size === 'lg' && (
                <div className="absolute top-1/2 left-1/2 w-16 h-[1px] bg-green-500/20 -translate-y-1/2 -translate-x-1/2 rotate-45"></div>
              )}
            </div>
          ))}
          
          {/* 中心点 (用户自己) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,1)] z-10 border-2 border-black"></div>
        </div>

        {/* 底部战术日志 */}
        <div className="bg-black/50 rounded border border-green-900/50 p-2 font-mono text-[10px] h-24 overflow-hidden relative">
          <div className="flex items-center gap-1 text-green-500 mb-1 border-b border-green-900/50 pb-1">
             <Radio className="w-3 h-3 animate-pulse" /> LIVE FEED
          </div>
          <div className="flex flex-col gap-1">
            {recentLogs.length === 0 ? (
              <div className="text-gray-500">Awaiting signals...</div>
            ) : (
              recentLogs.map((log, i) => (
                <div key={i} className={`truncate ${i === 0 ? 'text-white' : 'text-gray-500'}`}>
                  {i === 0 && <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>}
                  {log}
                </div>
              ))
            )}
          </div>
          {/* 遮罩效果 */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/90 to-transparent pointer-events-none"></div>
        </div>

        {/* 激励徽章 */}
        <div className="absolute top-2 right-2">
          <div className="bg-yellow-900/30 border border-yellow-700/50 px-2 py-0.5 rounded text-[9px] text-yellow-500 flex items-center gap-1 animate-pulse">
            <Zap className="w-3 h-3" /> HIGH ACTIVITY
          </div>
        </div>
      </div>
    </section>
  );
};

export default NetworkRadar;

