import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 预设的"剧本"库 - 机器水军语料
const SCRIPTED_MESSAGES = [
  { action: "正在查看赖皮寮...", color: "text-gray-400" },
  { action: "刚刚买入了 5,000 TWS", color: "text-tws-gold" },
  { action: "出价！由于北辰支付手续费", color: "text-tws-red" },
  { action: "嘲笑了 桃园将军府", color: "text-blue-400" },
  { action: "已生成【资产处置令】", color: "text-purple-400" },
  { action: "问候了陈局长", color: "text-green-400" },
  { action: "从 7-11 充值成功", color: "text-white" },
  { action: "溢价 10% 强行接管！", color: "text-tws-red" },
  { action: "价格突破新高！", color: "text-tws-gold" },
  { action: "霸占了豪宅！", color: "text-tws-green" },
];

export default function BarrageSystem() {
  const [messages, setMessages] = useState([]);
  
  // 模拟生成随机用户ID
  const getRandomUser = () => {
    const prefix = ['0x', 'TWS_Agent', 'Loyal_', 'Takeover_', 'CryptoGod', 'Bull_', 'Whale_'];
    const suffix = Math.floor(Math.random() * 9999);
    return `${prefix[Math.floor(Math.random() * prefix.length)]}...${suffix}`;
  };

  useEffect(() => {
    // 启动制造恐慌的定时器
    const interval = setInterval(() => {
      const randomMsg = SCRIPTED_MESSAGES[Math.floor(Math.random() * SCRIPTED_MESSAGES.length)];
      
      const newMsg = {
        id: Date.now() + Math.random(),
        user: getRandomUser(),
        action: randomMsg.action,
        color: randomMsg.color,
        timestamp: Date.now(),
      };

      // 保持屏幕上只有最新的 5 条消息，避免遮挡
      setMessages(prev => [newMsg, ...prev].slice(0, 5));
    }, 1500); // 每 1.5 秒刷新一条，节奏适中

    return () => clearInterval(interval);
  }, []);

  // 添加真实交易消息（可以从外部传入）
  const addRealMessage = (user, action) => {
    const newMsg = {
      id: Date.now(),
      user,
      action,
      color: 'text-tws-red',
      timestamp: Date.now(),
    };
    setMessages(prev => [newMsg, ...prev].slice(0, 5));
  };

  // 暴露给外部使用（通过 window）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addBarrageMessage = addRealMessage;
    }
  }, []);

  return (
    <div className="fixed bottom-20 left-4 z-10 pointer-events-none w-64 max-h-[300px] overflow-hidden">
      {/* 渐变遮罩，让顶部消息淡出 */}
      <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-tws-black to-transparent z-20 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-tws-black to-transparent z-20 pointer-events-none"></div>

      <div className="flex flex-col-reverse gap-2">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, scale: 0.9, height: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-black/80 backdrop-blur-sm border-l-2 border-tws-gold px-3 py-1 rounded-r-md shadow-lg"
            >
              <div className="flex items-center text-xs font-mono">
                <span className="text-gray-500 mr-2">
                  {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-gray-300 font-bold mr-2">{msg.user}</span>
                <span className={`${msg.color} font-bold`}>{msg.action}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

