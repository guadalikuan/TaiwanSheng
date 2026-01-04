import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { getAuctionInfo, seizeAuctionAsset, getTaiOneTokenBalanceAPI } from '../utils/api';
import { TaiOneToken_MINT, formatTaiOneTokenBalance, calculateMinBid } from '../utils/twscoin';

const AuctionPage = () => {
  const navigate = useNavigate();
  const [assetId] = useState(1); // 默认资产ID
  const [auctionInfo, setAuctionInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // 钱包相关
  const { publicKey, connected } = useWallet();
  const [walletBalance, setWalletBalance] = useState('0');
  
  // 出价相关
  const [bidMessage, setBidMessage] = useState('');
  const [isSeizing, setIsSeizing] = useState(false);
  
  // 动画相关
  const [isShaking, setIsShaking] = useState(false);
  const [showDominance, setShowDominance] = useState(false);
  const [priceChange, setPriceChange] = useState(null);
  
  // 统治时长
  const [dominationTime, setDominationTime] = useState('00分00秒');
  const dominationIntervalRef = useRef(null);
  
  // 弹幕系统
  const [barrageMessages, setBarrageMessages] = useState([]);
  
  // 操作记录
  const [operationHistory, setOperationHistory] = useState([]);
  
  // 预设弹幕剧本
  const SCRIPTED_MESSAGES = [
    { action: "正在查看资产...", color: "text-gray-400" },
    { action: "刚刚买入了 5,000 TaiOneToken", color: "text-tws-gold" },
    { action: "出价！溢价 10% 强行接管", color: "text-tws-red" },
    { action: "嘲笑了上一任房主", color: "text-blue-400" },
    { action: "已生成【资产处置令】", color: "text-purple-400" },
    { action: "从交易所充值成功", color: "text-white" },
    { action: "正在计算最低出价...", color: "text-yellow-400" },
    { action: "连接钱包准备出价", color: "text-green-400" },
  ];

  // 生成随机用户ID
  const getRandomUser = () => {
    const prefix = ['TaiOne_Agent', 'Loyal_', 'Takeover_', '0x'];
    const suffix = Math.floor(Math.random() * 9999);
    return `${prefix[Math.floor(Math.random() * prefix.length)]}...${suffix}`;
  };

  // 添加弹幕消息
  const addBarrageMessage = (user, action, color = "text-gray-400") => {
    const newMsg = {
      id: Date.now() + Math.random(),
      user,
      action,
      color
    };
    setBarrageMessages(prev => [newMsg, ...prev].slice(0, 15));
  };

  // 添加操作记录
  const addOperationRecord = (record) => {
    const newRecord = {
      id: Date.now() + Math.random(),
      ...record
    };
    setOperationHistory(prev => [newRecord, ...prev].slice(0, 15));
  };

  // 加载拍卖信息
  const loadAuctionInfo = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await getAuctionInfo(assetId);
      if (result.success) {
        const data = result.data;
        setAuctionInfo(data);
        
        // 更新价格变化动画
        if (data.price) {
          setPriceChange(data.price);
        }
        
        // 计算统治时长
        if (data.lastSeizedAt) {
          updateDominationTime(data.lastSeizedAt);
        }
      } else {
        setError(result.message || '获取拍卖信息失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('加载拍卖信息失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 加载钱包余额
  const loadWalletBalance = async (address) => {
    if (!address) return;
    try {
      const result = await getTaiOneTokenBalanceAPI(address);
      if (result.success) {
        const formattedBalance = formatTaiOneTokenBalance(
          result.data.balance || '0', 
          result.data.decimals || 6
        );
        setWalletBalance(formattedBalance);
      }
    } catch (err) {
      console.error('加载余额失败:', err);
    }
  };

  // 计算并更新统治时长
  const updateDominationTime = (lastSeizedAt) => {
    const lastSeized = new Date(lastSeizedAt);
    const now = new Date();
    const diff = Math.floor((now - lastSeized) / 1000); // 秒数
    
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    
    setDominationTime(
      `${String(minutes).padStart(2, '0')}分${String(seconds).padStart(2, '0')}秒`
    );
  };

  // 初始化加载
  useEffect(() => {
    loadAuctionInfo();
    
    // 定期刷新拍卖信息
    const interval = setInterval(() => {
      loadAuctionInfo();
      if (publicKey) {
        loadWalletBalance(publicKey.toString());
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [assetId, publicKey]);

  // 钱包连接时加载余额
  useEffect(() => {
    if (connected && publicKey) {
      loadWalletBalance(publicKey.toString());
    }
  }, [connected, publicKey]);

  // 统治时长实时更新
  useEffect(() => {
    if (auctionInfo?.lastSeizedAt) {
      // 立即更新一次
      updateDominationTime(auctionInfo.lastSeizedAt);
      
      // 每秒更新
      dominationIntervalRef.current = setInterval(() => {
        updateDominationTime(auctionInfo.lastSeizedAt);
      }, 1000);
    }
    
    return () => {
      if (dominationIntervalRef.current) {
        clearInterval(dominationIntervalRef.current);
      }
    };
  }, [auctionInfo?.lastSeizedAt]);

  // 弹幕系统自动生成
  useEffect(() => {
    const interval = setInterval(() => {
      const randomMsg = SCRIPTED_MESSAGES[Math.floor(Math.random() * SCRIPTED_MESSAGES.length)];
      addBarrageMessage(getRandomUser(), randomMsg.action, randomMsg.color);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // 夺取资产
  const handleSeize = async () => {
    if (!connected || !publicKey) {
      setError('请先连接钱包');
      return;
    }

    const walletAddress = publicKey.toString();

    if (!bidMessage.trim()) {
      setError('请输入出价留言');
      return;
    }

    if (bidMessage.length > 100) {
      setError('留言过长，最大100字符');
      return;
    }

    try {
      setIsSeizing(true);
      setError('');
      setSuccess('');

      // 计算最低出价
      const minRequiredFormatted = calculateMinBid(auctionInfo.price || '0');

      // 检查余额
      const userBalanceNum = parseFloat(walletBalance);
      const minRequiredNum = parseFloat(minRequiredFormatted);
      if (userBalanceNum < minRequiredNum) {
        const errorMsg = `余额不足！最低出价: ${minRequiredFormatted} TaiOneToken，当前余额: ${walletBalance} TaiOneToken`;
        setError(errorMsg);
        addOperationRecord({
          type: 'error',
          message: '余额不足，出价失败',
          timestamp: new Date()
        });
        setIsSeizing(false);
        return;
      }

      // 触发震动和动画
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      
      // 显示溢价提示
      setShowDominance(true);
      setTimeout(() => setShowDominance(false), 2000);

      // 调用夺取资产 API
      const result = await seizeAuctionAsset(
        assetId,
        bidMessage,
        walletAddress,
        null
      );

      if (result.success) {
        setSuccess('夺取成功！交易哈希: ' + result.data.txHash);
        setBidMessage('');
        
        // 添加弹幕消息
        addBarrageMessage(
          `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`,
          `刚刚踢走了 ${auctionInfo.owner.slice(0, 4)}...${auctionInfo.owner.slice(-4)}！溢价 10%！`,
          "text-tws-red"
        );
        
        // 添加操作记录
        addOperationRecord({
          type: 'success',
          message: `成功出价 ${getMinRequired()} TaiOneToken`,
          txHash: result.data.txHash,
          timestamp: new Date()
        });
        
        // 重新加载拍卖信息和余额
        await loadAuctionInfo();
        await loadWalletBalance(walletAddress);
      } else {
        setError(result.message || '夺取失败');
        // 添加失败记录
        addOperationRecord({
          type: 'error',
          message: result.message || '夺取失败',
          timestamp: new Date()
        });
      }
    } catch (err) {
      const errorMsg = '网络错误，请稍后重试';
      setError(errorMsg);
      addOperationRecord({
        type: 'error',
        message: '网络错误，操作失败',
        timestamp: new Date()
      });
      console.error('夺取资产失败:', err);
    } finally {
      setIsSeizing(false);
    }
  };

  // 格式化地址显示
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // 格式化价格显示
  const formatPrice = (price) => {
    if (!price) return '0.00';
    return formatTaiOneTokenBalance(price);
  };

  // 计算最低出价
  const getMinRequired = () => {
    if (!auctionInfo || !auctionInfo.price) return '0.00';
    return calculateMinBid(auctionInfo.price);
  };

  // 计算涨幅（需要起拍价，这里假设从资产信息获取或使用默认值）
  const getPriceIncrease = () => {
    if (!auctionInfo || !auctionInfo.price) return '0%';
    // 假设起拍价为 1000（实际应该从资产信息获取）
    const startPrice = 1000;
    const currentPrice = parseFloat(formatPrice(auctionInfo.price));
    const increase = ((currentPrice - startPrice) / startPrice * 100).toFixed(0);
    return `+${increase}%`;
  };

  // 瞄准镜组件
  const ReticleOverlay = () => (
    <div className="absolute inset-0 pointer-events-none">
      {/* 瞄准镜圆形边框 */}
      <svg className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(211, 47, 47, 0.6)" strokeWidth="2" strokeDasharray="5,5" />
        <circle cx="100" cy="100" r="60" fill="none" stroke="rgba(211, 47, 47, 0.4)" strokeWidth="1" />
        <line x1="100" y1="20" x2="100" y2="40" stroke="rgba(211, 47, 47, 0.8)" strokeWidth="2" />
        <line x1="100" y1="160" x2="100" y2="180" stroke="rgba(211, 47, 47, 0.8)" strokeWidth="2" />
        <line x1="20" y1="100" x2="40" y2="100" stroke="rgba(211, 47, 47, 0.8)" strokeWidth="2" />
        <line x1="160" y1="100" x2="180" y2="100" stroke="rgba(211, 47, 47, 0.8)" strokeWidth="2" />
      </svg>
      
      {/* 中心红点 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
      
      {/* 右下角原主头像（占位符） */}
      <div className="absolute bottom-4 right-4 w-16 h-16 bg-gray-800 rounded-full border-2 border-red-500 flex items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center text-white text-xs">
            {auctionInfo?.owner ? formatAddress(auctionInfo.owner) : '???'}
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">×</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-blood-trail text-white font-sans overflow-hidden relative flex">
      {/* 背景网格噪点效果 */}
      <div 
        className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(#D32F2F 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }}
      />

      {/* 左上角导航按钮组 */}
      <div className="fixed top-4 left-4 z-50 flex flex-col gap-2">
        <button
          onClick={() => navigate('/')}
          className="bg-gray-900/80 backdrop-blur-sm border-2 border-tws-red rounded-lg px-4 py-2 text-white hover:bg-gray-800 hover:border-tws-gold transition-all duration-200 flex items-center gap-2 group"
          title="返回首页"
        >
          <svg 
            className="w-5 h-5 group-hover:translate-x-[-2px] transition-transform" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-bold text-sm uppercase tracking-wider">返回</span>
        </button>
        <button
          onClick={() => navigate('/auctions')}
          className="bg-gray-900/80 backdrop-blur-sm border-2 border-tws-red rounded-lg px-4 py-2 text-white hover:bg-gray-800 hover:border-tws-gold transition-all duration-200 flex items-center gap-2 group"
          title="拍卖列表"
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <span className="font-bold text-sm uppercase tracking-wider">列表</span>
        </button>
        <button
          onClick={() => navigate('/auctions/create')}
          className="bg-tws-red hover:bg-red-700 border-2 border-tws-red rounded-lg px-4 py-2 text-white hover:border-tws-gold transition-all duration-200 flex items-center gap-2 group"
          title="创建拍卖"
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-bold text-sm uppercase tracking-wider">创建</span>
        </button>
      </div>

      {/* 左侧：弹幕系统 - 加宽 */}
      <div className="fixed left-0 top-0 h-screen z-10 pointer-events-none w-80 overflow-hidden">
        <div className="h-full flex flex-col-reverse gap-2 pb-20 pt-20">
          <AnimatePresence>
            {barrageMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="bg-black/80 backdrop-blur-sm border-l-2 border-tws-gold px-3 py-1 rounded-r-md shadow-lg"
              >
                <div className="flex items-center text-xs font-mono">
                  <span className="text-gray-500 mr-2">
                    [{new Date(msg.id).toLocaleTimeString().slice(3, 8)}]
                  </span>
                  <span className="text-gray-300 font-bold mr-2">{msg.user}</span>
                  <span className={`${msg.color} font-bold`}>{msg.action}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {/* 顶部渐变遮罩 */}
        <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
      </div>

      {/* 中间：主要内容展示区 */}
      <div className="flex-1 relative z-10 flex flex-col items-center justify-center px-4 py-2 ml-80 mr-96 overflow-hidden">
        
        {/* 顶部：通缉令式标题 */}
        <div className="text-center mb-2 animate-fade-in-down">
          <div className="flex items-center justify-center gap-4 mb-1">
            <span className="text-xs text-gray-400 font-mono">TWS-ASSET-{String(assetId).padStart(3, '0')}</span>
            <div className="relative">
              <div className="absolute -top-3 -left-3 bg-tws-red text-white px-3 py-0.5 font-bold text-xs transform -rotate-12 shadow-lg border-2 border-white glitch-active">
                ASSET SEIZED
              </div>
            </div>
          </div>
          <h1 className="text-2xl md:text-4xl font-black mb-1 text-transparent bg-clip-text bg-gradient-to-r from-tws-gold to-yellow-200 drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]">
            {auctionInfo ? '桃园·背骨将军府' : '资产处决台'}
          </h1>
          <p className="text-gray-500 text-xs italic animate-marquee">
            数学不好，房子难保。
          </p>
        </div>

        {/* 核心视觉区：被锁定的猎物 */}
        <div className={`relative w-full max-w-xl mb-2 ${isShaking ? 'animate-shake' : ''}`}>
          <div className="relative bg-tws-card border-4 border-tws-red rounded-xl overflow-hidden shadow-[0_0_30px_rgba(211,47,47,0.4)]">
            
            {/* 房产图片区域 */}
            <div className="relative h-40 w-full bg-gray-800">
              {/* 占位图片 */}
              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                <span className="text-8xl">🏠</span>
              </div>
              
              {/* 瞄准镜叠加 */}
              <ReticleOverlay />
              
              {/* 留言横幅 */}
              {auctionInfo?.tauntMessage && (
                <div className="absolute top-2 left-2 right-2">
                  <div className="bg-tws-red/20 border-2 border-tws-red rounded px-3 py-1.5">
                    <p className="text-yellow-300 italic text-xs font-bold">
                      "{auctionInfo.tauntMessage}"
                    </p>
                  </div>
                </div>
              )}
              
              {/* 资产名称覆盖层 */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2 pt-8">
                <h2 className="text-lg font-black text-white italic tracking-tighter">
                  {auctionInfo ? '桃园·背骨将军府' : '资产加载中...'}
                </h2>
                <p className="text-tws-red font-bold text-xs uppercase tracking-widest mt-0.5">
                  原主: <span className="line-through decoration-2">前台军少将 于北辰</span>
                </p>
              </div>
            </div>

            {/* 核心数据区：肾上腺素泵 */}
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-3 gap-3 border-b border-gray-700 pb-3">
                {/* 左侧：当前持有者 */}
                <div>
                  <p className="text-gray-400 text-xs uppercase mb-1">临时堡主</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-8 h-8 bg-tws-dark-red rounded-full flex items-center justify-center border-2 border-tws-gold">
                      <span className="text-xs font-bold text-tws-gold">👑</span>
                    </div>
                    <div>
                      <p className="text-white font-mono font-bold text-xs">
                        {auctionInfo ? formatAddress(auctionInfo.owner) : '---'}
                      </p>
                      <p className="text-tws-gold text-xs font-bold">临时堡主</p>
                    </div>
                  </div>
                </div>

                {/* 中间：当前身价 */}
                <div className="text-center">
                  <p className="text-gray-400 text-xs uppercase mb-1">当前身价</p>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={priceChange}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-baseline justify-center gap-1"
                    >
                      <span className="text-3xl md:text-4xl font-black text-tws-gold tabular-nums tracking-tight">
                        {auctionInfo ? formatPrice(auctionInfo.price) : '0.00'}
                      </span>
                      <span className="text-lg font-bold text-tws-red">TaiOne</span>
                    </motion.div>
                  </AnimatePresence>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <span className="text-tws-green text-xs font-bold">↑</span>
                    <span className="text-tws-green text-xs">{getPriceIncrease()}</span>
                  </div>
                </div>

                {/* 右侧：统治时长 */}
                <div className="text-right">
                  <p className="text-gray-400 text-xs uppercase mb-1">统治时长</p>
                  <p className="text-xl font-black text-tws-red font-mono">
                    {dominationTime}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">已霸占</p>
                </div>
              </div>

              {/* 溢价提示动画 */}
              <AnimatePresence>
                {showDominance && (
                  <motion.div
                    initial={{ opacity: 0, y: 0, scale: 0.8 }}
                    animate={{ opacity: 1, y: -20, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
                  >
                    <div className="text-5xl font-black text-tws-gold drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                      +10% DOMINANCE!
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 最低出价提示 */}
              <div className="bg-yellow-900/30 border border-yellow-500 rounded p-2">
                <p className="text-xs text-yellow-300">
                  💡 最低出价: <span className="font-bold">{getMinRequired()} TaiOneToken</span> (当前价格 + 10%)
                </p>
                <p className="text-xs text-yellow-400 mt-1">
                  出价后，5% 转给 TaiOne 财库，95% 转给上一任房主
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 右侧：用户操作面板 */}
      <div className="fixed right-0 top-0 h-screen w-96 z-10 bg-gray-900/95 backdrop-blur-sm border-l border-gray-700 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-tws-gold mb-4">操作面板</h2>
          
          {/* 钱包连接状态 */}
          {connected && publicKey ? (
            <div className="space-y-2">
              <div className="bg-gray-800/50 rounded p-2 text-xs">
                <p className="text-gray-400 text-xs mb-1">钱包地址</p>
                <p className="text-green-400 font-mono text-sm break-all">
                  {formatAddress(publicKey.toString())}
                </p>
              </div>
              <div className="bg-gray-800/50 rounded p-2 text-xs">
                <p className="text-gray-400 text-xs mb-1">TaiOneToken 余额</p>
                <p className="text-tws-gold font-bold text-lg">
                  {walletBalance}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-900/30 border border-yellow-500 rounded p-3 text-center">
              <p className="text-yellow-300 text-sm">请先连接钱包</p>
              <p className="text-yellow-400 text-xs mt-1">在右上角连接钱包后即可操作</p>
            </div>
          )}
        </div>

        {/* 操作区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 出价输入 */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              出价留言（可选，最大100字符）
            </label>
            <input
              type="text"
              value={bidMessage}
              onChange={(e) => setBidMessage(e.target.value)}
              placeholder="例如：210% 数学补习班"
              maxLength={100}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded border border-gray-600 focus:border-red-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {bidMessage.length}/100 字符
            </p>
          </div>

          {/* 掠夺按钮 */}
          <button
            onClick={handleSeize}
            disabled={!connected || isSeizing || !auctionInfo}
            className={`
              w-full py-4 px-6 rounded-lg font-black text-lg uppercase tracking-widest transition-all duration-100
              ${connected && !isSeizing && auctionInfo
                ? 'bg-tws-red hover:bg-red-600 hover:scale-[1.02] active:scale-95 text-white shadow-[0_0_20px_rgba(211,47,47,0.6)]'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isSeizing ? '处理中...' : connected ? '💥 立即溢价 10% 强行接管 💥' : '请先连接钱包'}
          </button>

          {/* 错误和成功提示 */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-red-900/50 border border-red-500 rounded-lg p-3"
              >
                <p className="text-red-300 text-sm">{error}</p>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-green-900/50 border border-green-500 rounded-lg p-3"
              >
                <p className="text-green-300 text-sm">{success}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 操作记录 */}
          <div className="mt-6">
            <h3 className="text-sm font-bold text-gray-400 mb-3">操作记录</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {operationHistory.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-4">暂无操作记录</p>
              ) : (
                <AnimatePresence>
                  {operationHistory.map((record) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className={`p-2 rounded text-xs border-l-2 ${
                        record.type === 'success'
                          ? 'bg-green-900/20 border-green-500'
                          : record.type === 'error'
                          ? 'bg-red-900/20 border-red-500'
                          : 'bg-gray-800/50 border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`font-bold ${
                            record.type === 'success'
                              ? 'text-green-400'
                              : record.type === 'error'
                              ? 'text-red-400'
                              : 'text-gray-300'
                          }`}>
                            {record.message}
                          </p>
                          {record.txHash && (
                            <p className="text-gray-500 text-xs mt-1 font-mono">
                              {record.txHash.slice(0, 20)}...
                            </p>
                          )}
                        </div>
                        <span className="text-gray-500 text-xs ml-2">
                          {new Date(record.timestamp).toLocaleTimeString().slice(0, 5)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>

        {/* 底部规则说明 */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/50">
          <p className="text-xs text-gray-400 mb-2">⚠️ 拍卖规则：</p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• 每次出价必须比当前价格高至少 10%</li>
            <li>• 出价成功后，5% 转给 TaiOne 财库，95% 转给上一任房主</li>
            <li>• 价格只能上涨，不能下跌</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AuctionPage;

