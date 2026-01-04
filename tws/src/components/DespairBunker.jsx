import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const DespairBunker = () => {
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: '50%', y: '50%' });
  const [lightSize, setLightSize] = useState(250);
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
  
  // 新增state：散落的台币、物资箱、日记、出口标志等
  const [scatteredMoney, setScatteredMoney] = useState([]);
  const [supplyBoxes, setSupplyBoxes] = useState([]);
  const [diaryNotes, setDiaryNotes] = useState([]);
  const [exitSigns, setExitSigns] = useState([]);
  const [distantVoices, setDistantVoices] = useState([]);
  const [explosionActive, setExplosionActive] = useState(false);
  const [noticeBoardText, setNoticeBoardText] = useState("物资即将到达，请耐心等待...");
  const [noticeBoardOpacity, setNoticeBoardOpacity] = useState(1);
  const [radioNews, setRadioNews] = useState(0);
  const [selectedDiary, setSelectedDiary] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  
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
      const baseSize = 250;
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

  // 初始化散落的台币 - 使用百分比定位
  useEffect(() => {
    const generateRandomPosition = (existingItems, minDistance = 8) => {
      // 使用百分比，确保在 10%-90% 范围内，留出边距
      let attempts = 0;
      let pos;
      do {
        pos = {
          x: Math.random() * 80 + 10, // 10% 到 90%
          y: Math.random() * 80 + 10, // 10% 到 90%
          rotation: Math.random() * 360 - 180,
          id: Date.now() + Math.random()
        };
        attempts++;
      } while (
        attempts < 50 && 
        existingItems.some(item => {
          const dist = Math.sqrt(Math.pow(item.x - pos.x, 2) + Math.pow(item.y - pos.y, 2));
          return dist < minDistance;
        })
      );
      return pos;
    };

    const money = [];
    for (let i = 0; i < 6; i++) {
      money.push(generateRandomPosition(money));
    }
    setScatteredMoney(money);
  }, []);

  // 初始化物资箱 - 使用百分比定位
  useEffect(() => {
    const boxes = [
      { id: 1, x: 15, y: 65, opened: false }, // 使用百分比
      { id: 2, x: 75, y: 35, opened: false },
      { id: 3, x: 25, y: 80, opened: false },
    ];
    setSupplyBoxes(boxes);
  }, []);

  // 初始化日记纸条 - 使用百分比定位
  useEffect(() => {
    const notes = [
      { 
        id: 1, 
        x: 20,  // 百分比
        y: 45,
        preview: "第3天...",
        content: "第3天，水没了，大家都在互相欺骗...没有人愿意分享，法币已经变成废纸。"
      },
      { 
        id: 2, 
        x: 70, 
        y: 60,
        preview: "只有TWS...",
        content: "只有TWS能救我们，但已经太晚了...那些提前准备的人早就离开了。"
      },
      { 
        id: 3, 
        x: 50, 
        y: 75,
        preview: "法币变成...",
        content: "法币变成废纸，我们都被骗了...政府承诺的救援永远不会来。"
      },
    ];
    setDiaryNotes(notes);
  }, []);

  // 初始化紧急出口标志 - 使用百分比定位
  useEffect(() => {
    const signs = [
      { id: 1, x: 10, y: 30 }, // 百分比
      { id: 2, x: 85, y: 70 },
    ];
    setExitSigns(signs);
  }, []);

  // 公告板文字逐渐消失
  useEffect(() => {
    const interval = setInterval(() => {
      setNoticeBoardOpacity(prev => Math.max(0, prev - 0.02));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // 收音机新闻循环
  useEffect(() => {
    const news = [
      "政府承诺物资即将到达...",
      "救援队在路上，请保持耐心...",
      "银行系统正在恢复中...",
      "请相信政府，一切都会好起来..."
    ];
    const interval = setInterval(() => {
      setRadioNews(prev => (prev + 1) % news.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // 随机触发爆炸/震动效果
  useEffect(() => {
    const triggerExplosion = () => {
      setExplosionActive(true);
      setStats(prev => ({
        ...prev,
        sanity: Math.max(0, prev.sanity - 5)
      }));
      setTimeout(() => setExplosionActive(false), 1000);
      
      const nextDelay = Math.random() * 30000 + 30000; // 30-60秒
      setTimeout(triggerExplosion, nextDelay);
    };
    
    const initialDelay = Math.random() * 30000 + 10000; // 10-40秒后首次触发
    const timeout = setTimeout(triggerExplosion, initialDelay);
    return () => clearTimeout(timeout);
  }, []);

  // 远处传来的声音文字
  useEffect(() => {
    const voices = ["救命...", "水...", "食物...", "不要开门...", "他们在外面..."];
    const addVoice = () => {
      const voice = voices[Math.floor(Math.random() * voices.length)];
      const side = Math.random() > 0.5 ? 'left' : 'right';
      const id = Date.now();
      setDistantVoices(prev => [...prev, { id, text: voice, side }]);
      
      setTimeout(() => {
        setDistantVoices(prev => prev.filter(v => v.id !== id));
      }, 3000);
      
      const nextDelay = Math.random() * 20000 + 20000; // 20-40秒
      setTimeout(addVoice, nextDelay);
    };
    
    const initialDelay = Math.random() * 20000 + 10000;
    const timeout = setTimeout(addVoice, initialDelay);
    return () => clearTimeout(timeout);
  }, []);

  // 光照检测函数 - 适配百分比定位
  const isIlluminated = (itemXPercent, itemYPercent) => {
    if (typeof window === 'undefined') return false;
    const width = window.innerWidth || 1920;
    const height = window.innerHeight || 1080;
    
    // 将百分比转换为像素
    const itemX = (itemXPercent / 100) * width;
    const itemY = (itemYPercent / 100) * height;
    
    const mouseX = parseInt(mousePos.x) || width / 2;
    const mouseY = parseInt(mousePos.y) || height / 2;
    
    const distance = Math.sqrt(
      Math.pow(itemX - mouseX, 2) + Math.pow(itemY - mouseY, 2)
    );
    return distance < lightSize / 2;
  };

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
        // 直接跳转到首页
        navigate('/');
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
    setSelectedDiary(null);
    setHoveredItem(null);
    localStorage.removeItem('bunker_died');
  };

  // 处理台币点击
  const handleMoneyClick = (moneyId) => {
    setStats(prev => ({
      ...prev,
      sanity: Math.max(0, prev.sanity - 3)
    }));
    setInstructionVisible(true);
    setTimeout(() => setInstructionVisible(false), 2000);
  };

  // 处理物资箱点击
  const handleBoxClick = (boxId) => {
    setSupplyBoxes(prev => prev.map(box => 
      box.id === boxId ? { ...box, opened: true } : box
    ));
    setStats(prev => ({
      ...prev,
      sanity: Math.max(0, prev.sanity - 5)
    }));
  };

  // 处理日记点击
  const handleDiaryClick = (note) => {
    setSelectedDiary(note);
  };

  // 处理出口标志点击
  const handleExitClick = () => {
    setInstructionVisible(true);
    setTimeout(() => setInstructionVisible(false), 3000);
  };

  // 处理ATM点击
  const handleATMClick = () => {
    setInstructionVisible(true);
    setTimeout(() => setInstructionVisible(false), 3000);
  };

  // 处理公告板点击
  const handleNoticeClick = () => {
    setInstructionVisible(true);
    setTimeout(() => setInstructionVisible(false), 2000);
  };

  // 处理聊天室诈骗消息点击
  const handleScamClick = () => {
    setStats(prev => ({
      ...prev,
      sanity: Math.max(0, prev.sanity - 30)
    }));
    setInstructionVisible(true);
    setTimeout(() => setInstructionVisible(false), 3000);
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
        
        {/* 新增涂鸦/血字 */}
        <div className="absolute top-[30%] right-[10%] text-red-600 opacity-20 font-bold text-xl transform rotate-[5deg] pointer-events-none select-none mix-blend-overlay animate-pulse">
          不要相信任何人
        </div>
        <div className="absolute top-[50%] left-[5%] text-green-400 opacity-15 font-bold text-2xl transform -rotate-[3deg] pointer-events-none select-none mix-blend-overlay">
          TWS是唯一出路
        </div>
        <div className="absolute bottom-[30%] left-[15%] text-yellow-500 opacity-25 font-bold text-lg transform rotate-[8deg] pointer-events-none select-none mix-blend-overlay">
          法币=废纸
        </div>
        <div className="absolute top-[70%] right-[25%] text-white opacity-15 font-bold text-sm transform -rotate-[2deg] pointer-events-none select-none mix-blend-overlay">
          第7天，我们还在等...
        </div>
      </div>

      {/* 废弃的ATM机 */}
      <div 
        className="absolute bottom-[10%] left-[5%] w-[180px] h-[220px] bg-[#333] border-2 border-[#555] rounded z-[3] p-3 cursor-pointer"
        onClick={handleATMClick}
        onMouseEnter={() => setHoveredItem('atm')}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <div className="w-full h-[120px] bg-black border border-[#666] mb-2 flex items-center justify-center relative overflow-hidden">
          <div className="text-red-500 text-xs font-mono animate-pulse">
            系统维护中
          </div>
          {Math.random() > 0.7 && (
            <div className="absolute inset-0 bg-red-500/30 animate-ping" />
          )}
        </div>
        <div className="h-[60px] bg-[#222] rounded flex items-center justify-center">
          <div className="w-[40px] h-[40px] bg-[#444] rounded-full"></div>
        </div>
        {hoveredItem === 'atm' && (
          <div className="absolute -top-8 left-0 bg-black/90 text-white text-xs p-2 rounded whitespace-nowrap">
            点击查看账户状态
          </div>
        )}
      </div>

      {/* 破损的公告板 */}
      <div 
        className="absolute top-[15%] left-[25%] w-[200px] bg-[#8B4513] border-4 border-[#654321] rounded z-[3] p-3 cursor-pointer shadow-lg"
        onClick={handleNoticeClick}
        style={{ opacity: noticeBoardOpacity }}
      >
        <div className="bg-[#D2691E] text-white text-xs p-2 rounded mb-2 font-bold">
          政府公告
        </div>
        <div className="text-white text-[10px] leading-tight">
          {noticeBoardText}
        </div>
        <div className="mt-2 flex gap-1">
          <div className="w-2 h-2 bg-[#654321] rounded-full"></div>
          <div className="w-2 h-2 bg-[#654321] rounded-full"></div>
          <div className="w-2 h-2 bg-[#654321] rounded-full"></div>
        </div>
      </div>

      {/* 散落的台币 */}
      {scatteredMoney.map((money) => {
        const illuminated = isIlluminated(money.x, money.y);
        return (
          <div
            key={money.id}
            className="absolute z-[3] cursor-pointer transition-all duration-300"
            style={{
              left: `${money.x}%`,
              top: `${money.y}%`,
              transform: `translate(-50%, -50%) rotate(${money.rotation}deg) ${hoveredItem === `money-${money.id}` ? 'translateY(-5px)' : ''}`,
              opacity: illuminated ? 1 : 0.3
            }}
            onClick={() => handleMoneyClick(money.id)}
            onMouseEnter={() => setHoveredItem(`money-${money.id}`)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <div 
              className="w-[80px] h-[40px] bg-gradient-to-r from-blue-600 to-blue-800 border-2 border-blue-900 rounded relative shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #1e40af 100%)'
              }}
            >
              <div className="text-white text-[8px] font-bold text-center mt-1">NT$ 1000</div>
              <div className="text-white text-[6px] text-center mt-0.5 opacity-70">已失效</div>
            </div>
            {hoveredItem === `money-${money.id}` && (
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs p-1 rounded whitespace-nowrap">
                法币已崩溃
              </div>
            )}
          </div>
        );
      })}

      {/* 空的物资箱 */}
      {supplyBoxes.map((box) => {
        const illuminated = isIlluminated(box.x, box.y);
        return (
          <div
            key={box.id}
            className="absolute z-[3] cursor-pointer transition-all duration-300"
            style={{
              left: `${box.x}%`,
              top: `${box.y}%`,
              transform: `translate(-50%, -50%) ${box.opened ? 'scale(1.1) rotate(15deg)' : 'scale(1)'}`,
              opacity: illuminated ? 1 : 0.3
            }}
            onClick={() => handleBoxClick(box.id)}
            onMouseEnter={() => setHoveredItem(`box-${box.id}`)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <div 
              className="w-[100px] h-[80px] bg-gradient-to-br from-[#8B4513] to-[#654321] border-2 border-[#3e2723] rounded shadow-lg relative"
              style={{
                background: 'linear-gradient(135deg, #8B4513 0%, #654321 50%, #5D4037 100%)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.5)'
              }}
            >
              {box.opened ? (
                <div className="w-full h-full flex items-center justify-center text-red-500 text-xs font-bold">
                  什么都没有
                </div>
              ) : (
                <>
                  <div className="absolute top-1 left-1 right-1 h-1 bg-[#3e2723]"></div>
                  <div className="absolute bottom-1 left-1 right-1 h-1 bg-[#3e2723]"></div>
                  {hoveredItem === `box-${box.id}` && (
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs p-1 rounded whitespace-nowrap">
                      已清空
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* 散落的日记/纸条 */}
      {diaryNotes.map((note) => {
        const illuminated = isIlluminated(note.x, note.y);
        const rotation = (note.id * 13) % 20 - 10; // 使用id生成固定旋转角度
        return (
          <div
            key={note.id}
            className="absolute z-[3] cursor-pointer transition-all duration-300"
            style={{
              left: `${note.x}%`,
              top: `${note.y}%`,
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              opacity: illuminated ? 1 : 0.3
            }}
            onClick={() => handleDiaryClick(note)}
            onMouseEnter={() => setHoveredItem(`diary-${note.id}`)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <div 
              className="w-[60px] h-[80px] bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-300 rounded shadow-lg p-1"
              style={{
                background: 'linear-gradient(135deg, #fef9e7 0%, #fef3c7 100%)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
            >
              <div className="text-[8px] text-gray-800 leading-tight font-serif">
                {note.preview}
              </div>
            </div>
            {hoveredItem === `diary-${note.id}` && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs p-1 rounded whitespace-nowrap">
                点击阅读
              </div>
            )}
          </div>
        );
      })}

      {/* 日记弹窗 */}
      {selectedDiary && (
        <div 
          className="fixed inset-0 bg-black/80 z-[30] flex items-center justify-center"
          onClick={() => setSelectedDiary(null)}
        >
          <div 
            className="bg-yellow-50 w-[400px] max-w-[90vw] p-6 rounded shadow-2xl border-2 border-yellow-300 cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-gray-800 font-serif text-sm leading-relaxed mb-4">
              {selectedDiary.content}
            </div>
            <button
              onClick={() => setSelectedDiary(null)}
              className="w-full py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 废弃的收音机 */}
      <div 
        className="absolute bottom-[25%] left-[50%] transform -translate-x-1/2 w-[200px] h-[120px] bg-black border-2 border-[#444] rounded z-[3] p-3"
      >
        <div className="w-full h-[60px] bg-[#111] border border-[#333] mb-2 flex items-center justify-center relative overflow-hidden">
          <div className="text-green-400 text-[10px] font-mono animate-pulse">
            {["政府承诺物资即将到达...", "救援队在路上，请保持耐心...", "银行系统正在恢复中...", "请相信政府，一切都会好起来..."][radioNews]}
          </div>
          <div className="absolute inset-0 bg-green-500/10 animate-ping" style={{ animationDuration: '2s' }}></div>
        </div>
        <div className="flex justify-between items-center">
          <div className="w-[30px] h-[30px] bg-[#333] rounded-full border border-[#555]"></div>
          <div className="w-[20px] h-[20px] bg-[#333] rounded-full border border-[#555]"></div>
          <div className="w-[60px] h-[8px] bg-[#333] border border-[#555] rounded"></div>
        </div>
        <div className="absolute top-2 right-2 w-[4px] h-[40px] bg-[#555]"></div>
      </div>

      {/* 闪烁的紧急出口标志 */}
      {exitSigns.map((sign) => (
        <div
          key={sign.id}
          className="absolute z-[3] cursor-pointer animate-pulse"
          style={{
            left: `${sign.x}%`,
            top: `${sign.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
          onClick={handleExitClick}
          onMouseEnter={() => setHoveredItem(`exit-${sign.id}`)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <div className="w-[80px] h-[40px] bg-green-600 border-2 border-green-800 rounded flex items-center justify-center shadow-lg">
            <div className="text-white font-bold text-sm">EXIT</div>
          </div>
          {hoveredItem === `exit-${sign.id}` && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs p-1 rounded whitespace-nowrap">
              门已封锁，需要TWS认证
            </div>
          )}
        </div>
      ))}

      {/* 破损的监控屏幕 */}
      <div 
        className="absolute top-[5%] right-[5%] w-[150px] h-[100px] bg-[#111] border-2 border-[#333] rounded z-[3] p-2"
      >
        <div className="w-full h-full bg-black border border-[#333] relative overflow-hidden">
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              background: 'linear-gradient(45deg, #1a1a1a 25%, transparent 25%, transparent 75%, #1a1a1a 75%, #1a1a1a), linear-gradient(45deg, #1a1a1a 25%, transparent 25%, transparent 75%, #1a1a1a 75%, #1a1a1a)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 10px 10px'
            }}
          ></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-red-500 text-[8px] font-mono animate-pulse">
              {Math.random() > 0.5 ? '信号中断' : '监控离线'}
            </div>
          </div>
          {Math.random() > 0.7 && (
            <div className="absolute inset-0 bg-red-500/20 animate-ping" style={{ animationDuration: '1s' }}></div>
          )}
        </div>
      </div>

      {/* 远处传来的声音文字 */}
      {distantVoices.map((voice) => (
        <div
          key={voice.id}
          className={`absolute z-[6] text-red-400 text-lg font-bold pointer-events-none animate-[slideInFromEdge_3s_ease-out] ${
            voice.side === 'left' ? 'left-0' : 'right-0'
          }`}
          style={{
            top: `${Math.random() * 60 + 20}%`,
            animation: voice.side === 'left' 
              ? 'slideInFromLeft 3s ease-out forwards' 
              : 'slideInFromRight 3s ease-out forwards'
          }}
        >
          {voice.text}
        </div>
      ))}

      {/* 爆炸/震动效果 */}
      {explosionActive && (
        <>
          <div 
            className="fixed inset-0 bg-red-500/30 z-[25] animate-ping"
            style={{ animationDuration: '0.5s' }}
          ></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[26] text-red-500 text-2xl font-bold pointer-events-none">
            远处传来爆炸声...
          </div>
        </>
      )}

      {/* Phase 2: 生存HUD */}
      <div 
        className={`absolute top-5 left-5 z-[5] text-green-500 font-mono text-sm bg-[rgba(0,20,0,0.8)] border border-green-500 p-2.5 w-[220px] ${
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
        <div className="flex justify-between mb-1 mt-2">
          <span>TEMP</span>
          <div className="w-[100px] bg-[#003300] h-2.5 mt-1">
            <div 
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${Math.max(0, 100 - (100 - stats.water) * 0.5)}%` }}
            />
          </div>
        </div>
        <div className="mt-2.5 text-[10px] opacity-70">
          BUNKER STATUS: CRITICAL
        </div>
        <div className="mt-1 text-[9px] text-red-400">
          预计存活: {Math.floor(stats.sanity / 10)}小时
        </div>
      </div>

      {/* 贩卖机周围的垃圾 */}
      <div className="absolute top-[45%] left-[48%] transform -translate-x-1/2 -translate-y-1/2 z-[1]">
        <div className="absolute w-[20px] h-[30px] bg-[#444] rounded-sm opacity-60" style={{ left: '-60px', top: '80px', transform: 'rotate(15deg)' }}></div>
        <div className="absolute w-[25px] h-[25px] bg-[#555] rounded-full opacity-60" style={{ left: '-40px', top: '100px', transform: 'rotate(-10deg)' }}></div>
        <div className="absolute w-[30px] h-[20px] bg-[#333] rounded-sm opacity-60" style={{ left: '60px', top: '90px', transform: 'rotate(-20deg)' }}></div>
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
              className={`mb-2 leading-snug opacity-0 animate-slideIn ${
                msg.type === 'scam' ? 'cursor-pointer hover:bg-red-900/30 rounded p-1' : ''
              }`}
              onClick={() => msg.type === 'scam' && handleScamClick()}
            >
              {msg.type === 'sys' ? (
                <span className="text-yellow-500 italic">
                  {msg.name}: {msg.text}
                </span>
              ) : msg.type === 'scam' ? (
                <>
                  <span className="text-red-500 font-bold">{msg.name}</span>: {msg.text}
                  <span className="text-red-400 text-[10px] ml-1">[点击查看]</span>
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
          ) : hoveredItem === 'atm' ? (
            <>
              您的账户已被冻结<br />
              请联系TWS资产认证
            </>
          ) : hoveredItem?.startsWith('exit') ? (
            <>
              门已封锁<br />
              需要TWS认证
            </>
          ) : hoveredItem?.startsWith('money') ? (
            <>
              法币已崩溃，无法使用
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
        
        @keyframes slideInFromLeft {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translate(0, 0); }
          10%, 30%, 50%, 70%, 90% { transform: translate(-2px, -2px); }
          20%, 40%, 60%, 80% { transform: translate(2px, 2px); }
        }
      `}</style>
      
      {/* 震动效果 */}
      {explosionActive && (
        <style>{`
          body {
            animation: shake 0.5s;
          }
        `}</style>
      )}
    </div>
  );
};

export default DespairBunker;

