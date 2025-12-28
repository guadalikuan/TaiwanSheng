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

      // 增加消息数量，让弹幕填满整个左侧区域（大约 20 条）
      setMessages(prev => {
        const maxMessages = 20; // 增加到 20 条，让弹幕填满整个高度
        return [newMsg, ...prev].slice(0, maxMessages);
      });
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
    setMessages(prev => {
      const maxMessages = 20;
      return [newMsg, ...prev].slice(0, maxMessages);
    });
  };

  // 暴露给外部使用（通过 window）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addBarrageMessage = addRealMessage;
    }
  }, []);

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      {/* 标题 */}
      <div className="mb-4 pb-3 border-b border-gray-800 flex-shrink-0">
        <h3 className="text-sm font-bold text-tws-gold uppercase tracking-wider">
          🎯 实时动态
        </h3>
      </div>

      {/* 消息列表 - 从下往上滚动，占满剩余高度 */}
      <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">
        <div className="flex flex-col-reverse gap-2 justify-end min-h-full">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="bg-black/60 backdrop-blur-sm border-l-2 border-tws-gold px-3 py-2 rounded-r-md shadow-lg flex-shrink-0"
              >
                <div className="flex items-start gap-2 text-xs font-mono">
                  <span className="text-gray-500 text-[10px] whitespace-nowrap flex-shrink-0">
                    {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-300 font-bold mr-1">{msg.user}</span>
                    <span className={`${msg.color} font-bold break-words`}>{msg.action}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* 如果消息不足，显示占位提示 */}
          {messages.length === 0 && (
            <div className="text-center text-gray-600 text-xs py-8">
              <p>等待动态更新...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

