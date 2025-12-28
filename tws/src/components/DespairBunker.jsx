import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const DespairBunker = () => {
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: '50%', y: '50%' });
  const [lightSize, setLightSize] = useState(150);
  const [stats, setStats] = useState({ water: 100, power: 100, sanity: 100 });
  const [currentPrice, setCurrentPrice] = useState(50);
  const [inflationActive, setInflationActive] = useState(true);
  const [soldOut, setSoldOut] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [twsGateActive, setTwsGateActive] = useState(false);
  const [instructionVisible, setInstructionVisible] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [hasDied, setHasDied] = useState(false);
  const [showDeathScreen, setShowDeathScreen] = useState(false);
  
  const rootRef = useRef(null);
  const flickerIntervalRef = useRef(null);
  const statsIntervalRef = useRef(null);
  const inflationIntervalRef = useRef(null);
  const chatIntervalRef = useRef(null);

  // 检查是否已经死过
  useEffect(() => {
    const diedBefore = localStorage.getItem('bunker_died');
    if (diedBefore === 'true') {
      setHasDied(true);
    }
  }, []);

  // 鼠标移动控制手电筒
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: `${e.clientX}px`, y: `${e.clientY}px` });
    };

    const handleTouchMove = (e) => {
      const touch = e.touches[0];
      setMousePos({ x: `${touch.clientX}px`, y: `${touch.clientY}px` });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleTouchMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // 手电筒闪烁效果
  useEffect(() => {
    flickerIntervalRef.current = setInterval(() => {
      const baseSize = 150;
      const flicker = Math.random() * 20 - 10;
      setLightSize(baseSize + flicker);
    }, 100);

    return () => {
      if (flickerIntervalRef.current) clearInterval(flickerIntervalRef.current);
    };
  }, []);

  // 初始提示消失
  useEffect(() => {
    const timer = setTimeout(() => {
      setInstructionVisible(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // 资源衰减系统
  useEffect(() => {
    statsIntervalRef.current = setInterval(() => {
      setStats(prev => {
        const newStats = {
          water: Math.max(0, prev.water - Math.random() * 0.5),
          power: Math.max(0, prev.power - Math.random() * 0.2),
          sanity: Math.max(0, prev.sanity - Math.random() * 0.8)
        };

        // 理智归零时触发死亡
        if (newStats.sanity <= 0 && prev.sanity > 0) {
          localStorage.setItem('bunker_died', 'true');
          setShowDeathScreen(true);
        }

        return newStats;
      });
    }, 500);

    return () => {
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    };
  }, []);

  // 恶性通胀系统
  useEffect(() => {
    if (!inflationActive) return;

    inflationIntervalRef.current = setInterval(() => {
      setCurrentPrice(prev => {
        const growthFactor = 1 + (Math.random() * 0.4 + 0.1);
        const newPrice = Math.floor(prev * growthFactor);
        
        if (newPrice > 100000000) {
          setInflationActive(false);
          return prev;
        }
        
        return newPrice;
      });
    }, 1500);

    return () => {
      if (inflationIntervalRef.current) clearInterval(inflationIntervalRef.current);
    };
  }, [inflationActive]);

  // 聊天室消息
  useEffect(() => {
    const chatScripts = [
      { name: "张阿姨(3F)", text: "谁家有退烧药？我家孩子烧到40度了！求求你们！", type: "normal" },
      { name: "李伟", text: "我有药，拿两根金条来换。不讲价。", type: "normal" },
      { name: "[系统]", text: "警告：该区域电力供应将在 10 分钟后完全切断。", type: "sys" },
      { name: "匿名", text: "大家别开门！外面有人假装警察抢劫！", type: "normal" },
      { name: "CryptoKing", text: "我有渠道送人去安全区，只要 5000 USDT，私聊速转！", type: "scam" },
      { name: "陈先生", text: "我的银行卡怎么刷不出来了？你们的能用吗？", type: "normal" },
      { name: "[系统]", text: "检测到非法闯入... 气密门已封锁。", type: "sys" },
      { name: "绝望者", text: "都在骗人... 根本没有救援...", type: "normal" },
      { name: "王小明(12楼)", text: "我有抗生素，谁有水？拿金条换！", type: "normal" },
      { name: "李阿姨(管理员)", text: "大家不要慌，政府说物资马上到...", type: "normal" },
      { name: "匿名用户", text: "别听楼上的！里长早就带着物资跑了！", type: "normal" },
      { name: "诈骗者", text: "我这边有地下通道名额，转我 1000 USDT，先到先得！", type: "scam" },
    ];

    const addMessage = () => {
      const script = chatScripts[Math.floor(Math.random() * chatScripts.length)];
      setChatMessages(prev => {
        const newMessages = [...prev, script];
        // 只保留最近5条
        return newMessages.slice(-5);
      });
    };

    const scheduleNext = () => {
      const delay = Math.random() * 3000 + 2000;
      chatIntervalRef.current = setTimeout(() => {
        addMessage();
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => {
      if (chatIntervalRef.current) clearTimeout(chatIntervalRef.current);
    };
  }, []);

  // TWS门激活逻辑
  useEffect(() => {
    if (stats.sanity < 50) {
      setTwsGateActive(true);
    }
  }, [stats.sanity]);

  // 购买尝试
  const handlePurchase = () => {
    if (soldOut) return;

    setSoldOut(true);
    setInflationActive(false);
    
    // 扣除理智
    setStats(prev => ({
      ...prev,
      sanity: Math.max(0, prev.sanity - 20)
    }));

    // 显示错误提示
    setInstructionVisible(true);
    setTimeout(() => setInstructionVisible(false), 3000);
  };

  // TWS门点击
  const handleTwsGateClick = () => {
    setIsScanning(true);
    
    setTimeout(() => {
      // 全屏白光
      const whiteout = document.createElement('div');
      whiteout.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: white;
        z-index: 99999;
        opacity: 0;
        transition: opacity 2s;
      `;
      document.body.appendChild(whiteout);
      
      requestAnimationFrame(() => {
        whiteout.style.opacity = '1';
      });

      setTimeout(() => {
        // 跳转到市场页面或TWS购买页面
        navigate('/market');
      }, 2000);
    }, 1500);
  };

  // 重置游戏
  const handleReset = () => {
    setShowDeathScreen(false);
    setHasDied(false);
    setStats({ water: 100, power: 100, sanity: 100 });
    setCurrentPrice(50);
    setSoldOut(false);
    setInflationActive(true);
    setChatMessages([]);
    setTwsGateActive(false);
    setInstructionVisible(true);
    setIsScanning(false);
    localStorage.removeItem('bunker_died');
  };

  // 如果显示死亡屏幕
  if (showDeathScreen) {
    return (
      <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center font-mono z-50">
        <div className="text-center p-8">
          <div className="text-4xl mb-4 text-red-500">⚠</div>
          <div className="text-2xl mb-4">你已经死过一次了</div>
          <div className="text-lg mb-8 text-gray-400">还要再试吗？</div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded transition-colors"
            >
              重新开始
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={rootRef}
      className="fixed inset-0 overflow-hidden bg-black font-mono cursor-none"
      style={{
        '--x': mousePos.x,
        '--y': mousePos.y,
        '--light-size': `${lightSize}px`,
      }}
    >
      {/* Phase 1: 混凝土墙壁背景 */}
      <div 
        id="bunker-wall"
        className="absolute inset-0 z-[1]"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, rgba(0,0,0,0.6) 0%, transparent 20%),
            radial-gradient(circle at 80% 80%, rgba(0,0,0,0.5) 0%, transparent 30%),
            repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 11px),
            linear-gradient(to bottom, #434343, #2a2a2a)
          `
        }}
      >
        {/* 墙上的划痕字迹 */}
        <div className="absolute top-[20%] left-[30%] text-white opacity-10 font-bold text-2xl transform -rotate-[5deg] pointer-events-none select-none mix-blend-overlay">
          NO SIGNAL
        </div>
        <div className="absolute top-[60%] left-[70%] text-white opacity-10 font-bold text-2xl transform rotate-[10deg] pointer-events-none select-none mix-blend-overlay">
          WATER?
        </div>
        <div className="absolute top-[40%] left-[10%] text-white opacity-[0.05] font-bold text-6xl pointer-events-none select-none mix-blend-overlay">
          TWS
        </div>
        <div className="absolute bottom-[10%] right-[20%] text-red-900 opacity-30 font-bold text-xl pointer-events-none select-none mix-blend-overlay">
          DON'T OPEN
        </div>
      </div>

      {/* Phase 2: 生存HUD */}
      <div 
        className={`absolute top-5 left-5 z-[5] text-green-500 font-mono text-sm bg-[rgba(0,20,0,0.8)] border border-green-500 p-2.5 w-[200px] ${
          stats.sanity < 30 ? 'text-red-500 border-red-500' : ''
        }`}
        style={{ textShadow: '0 0 5px #0f0' }}
      >
        <div className="flex justify-between mb-1">
          <span>WATER</span>
          <div className="w-[100px] bg-[#003300] h-2.5 mt-1">
            <div 
              className={`h-full transition-all duration-500 ${
                stats.water < 30 ? 'bg-red-500 shadow-[0_0_5px_#f00]' : 'bg-green-500'
              }`}
              style={{ width: `${Math.max(0, stats.water)}%` }}
            />
          </div>
        </div>
        <div className="flex justify-between mb-1">
          <span>POWER</span>
          <div className="w-[100px] bg-[#003300] h-2.5 mt-1">
            <div 
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${Math.max(0, stats.power)}%` }}
            />
          </div>
        </div>
        <div className="flex justify-between mb-1">
          <span>SANITY</span>
          <div className="w-[100px] bg-[#003300] h-2.5 mt-1">
            <div 
              className={`h-full transition-all duration-500 ${
                stats.sanity < 30 ? 'bg-red-500 shadow-[0_0_5px_#f00]' : 'bg-green-500'
              }`}
              style={{ width: `${Math.max(0, stats.sanity)}%` }}
            />
          </div>
        </div>
        <div className="mt-2.5 text-[10px] opacity-70">
          BUNKER STATUS: CRITICAL
        </div>
      </div>

      {/* Phase 2: 恶性通胀贩卖机 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[250px] h-[350px] bg-[#111] border-2 border-[#555] rounded z-[2] p-5 flex flex-col items-center">
        <div 
          className="w-full h-20 mb-5 border border-[#333] flex justify-center items-center text-right text-2xl font-bold text-cyan-500 overflow-hidden"
          style={{ 
            textShadow: '0 0 5px cyan',
            background: '#000',
            color: currentPrice > 100000000 ? 'red' : 'cyan'
          }}
        >
          {currentPrice > 100000000 ? 'SYSTEM CRASH' : 'TWD MARKET'}
        </div>
        <div 
          className="w-[100px] h-[120px] bg-[#222] mb-2.5 rounded relative"
          style={{
            backgroundImage: `
              linear-gradient(to bottom, transparent 60%, #a60 60%),
              radial-gradient(circle at 50% 40%, #fff 20px, transparent 21%)
            `
          }}
        >
          {soldOut && (
            <div className="absolute inset-0 bg-black/80 text-red-500 flex justify-center items-center text-3xl transform -rotate-[15deg] border-2 border-red-500">
              售罄
            </div>
          )}
          <div className="absolute bottom-1 w-full text-center text-white text-xs">
            统一面
          </div>
        </div>
        <div className="bg-[#300] text-red-500 p-1 text-xl border border-red-500 w-full text-center">
          NT$ <span>{currentPrice > 100000000 ? 'ERROR' : currentPrice.toLocaleString()}</span>
        </div>
        <div className="mt-2.5 text-[#555] text-xs">
          [点击购买]
        </div>
        <button
          onClick={handlePurchase}
          className="mt-2 px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-xs rounded transition-colors cursor-pointer"
          disabled={soldOut}
        >
          购买
        </button>
      </div>

      {/* Phase 3: 诈骗聊天室 */}
      <div className="absolute bottom-5 right-5 w-[280px] h-[200px] bg-black/90 border border-[#444] text-gray-300 text-xs font-sans z-[5] flex flex-col overflow-hidden">
        <div className="bg-[#222] p-1 border-b border-[#444] font-bold text-gray-400">
          ● 区域广播: 第7防空区
        </div>
        <div className="flex-1 overflow-y-hidden p-2.5 flex flex-col justify-end">
          {chatMessages.map((msg, idx) => (
            <div 
              key={idx}
              className="mb-2 leading-snug opacity-0 animate-slideIn"
            >
              {msg.type === 'sys' ? (
                <span className="text-yellow-500 italic">
                  {msg.name}: {msg.text}
                </span>
              ) : msg.type === 'scam' ? (
                <>
                  <span className="text-red-500 font-bold">{msg.name}</span>: {msg.text}
                </>
              ) : (
                <>
                  <span className="text-blue-400 font-bold">{msg.name}</span>: {msg.text}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Phase 3: TWS救赎之门 */}
      <div
        className={`absolute top-[10%] right-[15%] w-[120px] h-[200px] border-4 ${
          twsGateActive ? 'border-green-500 shadow-[0_0_30px_#0f0]' : 'border-[#333]'
        } bg-black z-[2] flex justify-center items-center overflow-hidden cursor-pointer transition-all duration-500`}
        onMouseEnter={() => setTwsGateActive(true)}
        onMouseLeave={() => {
          if (stats.sanity >= 50) setTwsGateActive(false);
        }}
        onClick={handleTwsGateClick}
      >
        <div 
          className={`w-full h-full flex flex-col justify-center items-center text-green-500 text-center transition-opacity duration-500 ${
            twsGateActive ? 'opacity-100' : 'opacity-30'
          }`}
          style={{
            background: twsGateActive 
              ? 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, 0.4) 2px, rgba(0, 255, 0, 0.4) 4px)'
              : 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, 0.1) 2px, rgba(0, 255, 0, 0.1) 4px)'
          }}
        >
          <div className="text-3xl font-bold" style={{ textShadow: '0 0 10px #0f0' }}>
            {isScanning ? 'SCANNING...' : 'TWS'}
          </div>
          <div className="text-xs mt-1">CITIZENS ONLY</div>
          <div className="text-xs mt-5 text-white bg-green-500 px-1 py-0.5">ENTER</div>
        </div>
      </div>

      {/* 警报脉冲 */}
      <div 
        className="absolute inset-0 z-[5] pointer-events-none animate-redPulse"
      />

      {/* 黑暗遮罩（手电筒效果） */}
      <div
        id="darkness"
        className="absolute inset-0 z-[10] pointer-events-none animate-flicker"
        style={{
          background: `radial-gradient(
            circle var(--light-size) at var(--x) var(--y),
            transparent 0%,
            rgba(0,0,0,0.8) 40%,
            rgba(0,0,0,1) 70%
          )`
        }}
      />

      {/* UI层：初始提示 */}
      {instructionVisible && (
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[20] text-center text-lg pointer-events-none ${
          soldOut ? 'text-red-500' : 'text-white'
        }`}>
          {soldOut ? (
            <>
              交易失败：法币已失效<br />
              资产冻结中...
            </>
          ) : (
            <>
              SYSTEM FAILURE...<br />
              [ 使用鼠标寻找物资 ]
            </>
          )}
        </div>
      )}

      {/* CSS动画定义 - 手电筒闪烁效果需要复杂的径向渐变动画 */}
      <style>{`
        @keyframes flicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
            background: radial-gradient(
              circle var(--light-size) at var(--x) var(--y),
              transparent 0%,
              rgba(0,0,0,0.9) 35%,
              black 60%
            );
          }
          20%, 24%, 55% {
            background: radial-gradient(
              circle calc(var(--light-size) * 0.8) at var(--x) var(--y),
              rgba(0,0,0,0.2) 0%,
              rgba(0,0,0,0.95) 20%,
              black 100%
            );
          }
        }
      `}</style>
    </div>
  );
};

export default DespairBunker;

