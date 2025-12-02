import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const ChanganLetter = () => {
  const [startReading, setStartReading] = useState(false);
  const navigate = useNavigate();

  // 模拟翻开书页的延迟
  useEffect(() => {
    setTimeout(() => {
      setStartReading(true);
    }, 1000);
  }, []);

  // 诗一般的文案 - 繁体竖排
  const content = [
    { type: 'title', text: '長安家書' },
    { type: 'spacer' },
    { type: 'body', text: '乙巳年 · 孟夏' },
    { type: 'spacer' },
    { type: 'body', text: '夫 樹 高 千 尺 ， 葉 落 歸 根 。' },
    { type: 'body', text: '人 行 萬 里 ， 魂 繫 故 土 。' },
    { type: 'spacer' },
    { type: 'body', text: '君 居 海 隅 ， 隔 水 相 望 ；' },
    { type: 'body', text: '我 守 秦 川 ， 佇 立 眺 遠 。' },
    { type: 'spacer' },
    { type: 'body', text: '七 十 餘 載 ， 骨 肉 離 散 ，' },
    { type: 'body', text: '一 灣 淺 水 ， 竟 成 天 塹 。' },
    { type: 'body', text: '然 風 雲 變 幻 ， 世 事 難 料 ，' },
    { type: 'body', text: '危 牆 之 下 ， 焉 有 完 卵 ？' },
    { type: 'spacer' },
    { type: 'body', text: '今 長 安 古 都 ， 廣 廈 千 間 ，' },
    { type: 'body', text: '非 為 賈 貿 ， 實 乃 築 巢 。' },
    { type: 'body', text: '置 一 瓦 於 龍 脈 ， 則 心 有 所 安 ；' },
    { type: 'body', text: '留 一 徑 於 故 鄉 ， 則 退 有 可 守 。' },
    { type: 'spacer' },
    { type: 'body', text: '莫 待 驚 雷 乍 響 ， 方 悔 未 備 舟 楫 。' },
    { type: 'body', text: '此 非 買 賣 ， 乃 血 脈 之 召 喚 。' },
    { type: 'body', text: '願 君 歸 來 ， 共 敘 桑 麻 。' },
    { type: 'spacer' },
    { type: 'end', text: '天 河 計 畫 · 守 望 者 敬 上' },
  ];

  // 动画变体
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.5, // 每一句出来的间隔
        delayChildren: 1.5,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, filter: 'blur(5px)' },
    visible: { 
      opacity: 1, 
      y: 0, 
      filter: 'blur(0px)',
      transition: { duration: 1.5, ease: "easeOut" } 
    },
  };

  // 印章独立动画，确保可见性
  const sealVariants = {
    hidden: { opacity: 0, scale: 0.8, filter: 'blur(5px)' },
    visible: { 
      opacity: 1, 
      scale: 1, 
      filter: 'blur(0px)',
      transition: { 
        duration: 1.5, 
        ease: "easeOut",
        delay: 3 // 在文字动画开始后3秒显示印章
      } 
    },
  };

  // 处理印章点击
  const handleSealClick = () => {
    // 可选：添加过渡效果
    // 跳转到地堡页面
    setTimeout(() => {
      navigate('/bunker');
    }, 300);
  };

  return (
    <div className="relative w-full h-screen bg-[#f0e6d2] overflow-hidden flex flex-row-reverse font-serif">
      {/* --- 背景纹理层 --- */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ 
             backgroundImage: `url("https://www.transparenttextures.com/patterns/rice-paper-2.png")`,
             filter: 'sepia(0.3)'
           }} 
      />
      
      {/* --- 线装书右侧装订条 (Binding Spine) --- */}
      <div className="relative h-full w-12 bg-[#2c3e50] shadow-2xl flex flex-col items-center justify-around z-20 border-l-2 border-gray-600">
        {/* 模拟白线装订 */}
        {[...Array(6)].map((_, i) => (
          <div key={i} className="w-full h-[2px] bg-gray-300 opacity-60 relative">
             <div className="absolute left-[-4px] top-[-3px] w-2 h-2 rounded-full bg-gray-200 shadow-sm"></div>
          </div>
        ))}
        <div className="writing-vertical-rl text-gray-400 text-xs tracking-[0.5em] opacity-50 font-mono py-10">
          天河檔案 · 絕密
        </div>
      </div>

      {/* --- 主要内容区域 (可横向滚动) --- */}
      <div className="flex-1 h-full overflow-x-auto overflow-y-hidden relative custom-scrollbar">
        
        {/* 内页容器：模拟宣纸朱丝栏 */}
        <div className="min-w-[150vw] h-full relative px-10 py-12 flex flex-row-reverse items-start">
          
          {/* 朱丝栏背景线 (Red Guidelines) */}
          <div className="absolute inset-0 flex flex-row-reverse pointer-events-none z-0 px-10">
             {[...Array(20)].map((_, i) => (
               <div key={i} className="h-full w-[1px] bg-red-800 opacity-10 mx-8"></div>
             ))}
             <div className="absolute top-10 left-0 right-0 h-[1px] bg-red-800 opacity-20"></div>
             <div className="absolute bottom-10 left-0 right-0 h-[1px] bg-red-800 opacity-20"></div>
          </div>

          {/* 文字内容 */}
          <motion.div 
            className="flex flex-row-reverse gap-16 h-full z-10 pt-8"
            variants={containerVariants}
            initial="hidden"
            animate={startReading ? "visible" : "hidden"}
          >
            {content.map((item, index) => {
              if (item.type === 'spacer') return <div key={index} className="w-2" />;
              
              const isTitle = item.type === 'title';
              const isEnd = item.type === 'end';
              
              return (
                <motion.div 
                  key={index} 
                  variants={itemVariants}
                  className={`writing-vertical-rl text-stone-800 leading-loose tracking-widest cursor-default select-none
                    ${isTitle ? 'text-5xl font-bold pt-12 text-stone-900 drop-shadow-sm' : 'text-2xl font-medium'}
                    ${isEnd ? 'pt-40 text-stone-600 text-xl' : ''}
                  `}
                  style={{ fontFamily: '"Noto Serif TC", "Songti TC", serif' }}
                >
                  {item.text}
                </motion.div>
              );
            })}

            {/* --- 红色印章 (The Seal) --- */}
            <motion.div 
              variants={sealVariants}
              initial="hidden"
              animate={startReading ? "visible" : "hidden"}
              className="self-end mb-20 mr-8 relative group cursor-pointer z-50"
              onClick={handleSealClick}
              style={{ 
                minWidth: '96px',
                minHeight: '96px'
              }}
            >
              <div className="w-24 h-24 border-4 border-red-800 rounded-lg flex items-center justify-center opacity-100 rotate-[-5deg] hover:opacity-100 hover:rotate-0 transition-all duration-500 shadow-lg bg-red-50 mix-blend-normal">
                <div className="grid grid-cols-2 gap-1 p-2">
                  <span className="text-red-900 text-3xl font-bold font-serif leading-none">安</span>
                  <span className="text-red-900 text-3xl font-bold font-serif leading-none">天</span>
                  <span className="text-red-900 text-3xl font-bold font-serif leading-none">居</span>
                  <span className="text-red-900 text-3xl font-bold font-serif leading-none">河</span>
                </div>
              </div>
              <div className="absolute -bottom-8 left-0 right-0 text-center text-xs text-red-900/70 tracking-widest opacity-100 group-hover:opacity-100 transition-opacity">
                點擊入庫
              </div>
            </motion.div>

          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ChanganLetter;


