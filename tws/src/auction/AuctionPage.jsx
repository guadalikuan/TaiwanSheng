import React, { useState, useEffect } from 'react';
import { getAuctionInfo, seizeAuctionAsset, getTWSCoinBalanceAPI } from '../utils/api';
import { TWSCoin_MINT, formatTWSCoinBalance, calculateMinBid } from '../utils/twscoin';

const AuctionPage = () => {
  const [assetId] = useState(1); // 默认资产ID，可以从路由参数获取
  const [auctionInfo, setAuctionInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // 钱包相关状态（这些应该从钱包连接组件获取）
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletBalance, setWalletBalance] = useState('0');
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  
  // 出价相关状态
  const [bidMessage, setBidMessage] = useState('');
  const [isSeizing, setIsSeizing] = useState(false);

  // 加载拍卖信息
  const loadAuctionInfo = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await getAuctionInfo(assetId);
      if (result.success) {
        setAuctionInfo(result.data);
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
    try {
      const result = await getTWSCoinBalanceAPI(address);
      if (result.success) {
        const formattedBalance = formatTWSCoinBalance(result.data.balance || '0', result.data.decimals || 6);
        setWalletBalance(formattedBalance);
      }
    } catch (err) {
      console.error('加载余额失败:', err);
    }
  };

  // 连接钱包（这个函数应该由钱包连接组件调用）
  // 也可以通过 window 对象暴露，让外部钱包连接组件调用
  useEffect(() => {
    // 监听钱包连接事件（如果钱包连接组件通过 window 事件通知）
    const handleWalletConnected = (event) => {
      const { address } = event.detail;
      setWalletAddress(address);
      setIsWalletConnected(true);
      loadWalletBalance(address);
    };

    window.addEventListener('walletConnected', handleWalletConnected);
    
    // 检查是否已有连接的钱包（从 localStorage 或其他地方）
    const storedWallet = localStorage.getItem('solana_wallet_address');
    if (storedWallet) {
      setWalletAddress(storedWallet);
      setIsWalletConnected(true);
      loadWalletBalance(storedWallet);
    }

    return () => {
      window.removeEventListener('walletConnected', handleWalletConnected);
    };
  }, []);

  // 夺取资产
  const handleSeize = async () => {
    if (!isWalletConnected || !walletAddress) {
      setError('请先连接钱包');
      return;
    }

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

      // 检查余额（使用格式化后的余额进行比较）
      const userBalanceNum = parseFloat(walletBalance);
      const minRequiredNum = parseFloat(minRequiredFormatted);
      if (userBalanceNum < minRequiredNum) {
        setError(`余额不足！最低出价: ${minRequiredFormatted} TWSCoin，当前余额: ${walletBalance} TWSCoin`);
        setIsSeizing(false);
        return;
      }

      // 调用夺取资产 API
      // treasuryAddress 可以不传，后端会使用 TWSCoin 铸造地址
      const result = await seizeAuctionAsset(
        assetId,
        bidMessage,
        walletAddress,
        null // 使用默认的 TWSCoin 铸造地址作为财库
      );

      if (result.success) {
        setSuccess('夺取成功！交易哈希: ' + result.data.txHash);
        setBidMessage('');
        // 重新加载拍卖信息和余额
        await loadAuctionInfo();
        await loadWalletBalance(walletAddress);
      } else {
        setError(result.message || '夺取失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('夺取资产失败:', err);
    } finally {
      setIsSeizing(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadAuctionInfo();
    // 定期刷新拍卖信息
    const interval = setInterval(() => {
      loadAuctionInfo();
      if (walletAddress) {
        loadWalletBalance(walletAddress);
      }
    }, 5000); // 每5秒刷新一次

    return () => clearInterval(interval);
  }, [assetId, walletAddress]);

  // 格式化地址显示
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // 格式化价格显示
  const formatPrice = (price) => {
    return formatTWSCoinBalance(price);
  };

  // 计算最低出价
  const getMinRequired = () => {
    if (!auctionInfo || !auctionInfo.price) return '0.00';
    return calculateMinBid(auctionInfo.price);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-red-500">TWS 资产处决台</h1>
          <p className="text-gray-400">激进式溢价拍卖 - 10% 溢价机制</p>
        </div>

        {/* 钱包连接状态 */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-400">钱包状态</p>
              {isWalletConnected ? (
                <div>
                  <p className="text-green-400">已连接: {formatAddress(walletAddress)}</p>
                  <p className="text-sm text-gray-300">TWSCoin 余额: {walletBalance} TWS</p>
                </div>
              ) : (
                <p className="text-yellow-400">未连接钱包</p>
              )}
            </div>
            <div className="text-sm text-gray-400">
              {/* 这里应该放置钱包连接按钮组件 */}
              <p>请在右上角连接钱包</p>
            </div>
          </div>
        </div>

        {/* 错误和成功提示 */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-4">
            <p className="text-red-300">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-900/50 border border-green-500 rounded-lg p-4 mb-4">
            <p className="text-green-300">{success}</p>
          </div>
        )}

        {/* 拍卖信息卡片 */}
        {loading && !auctionInfo ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-400">加载中...</p>
          </div>
        ) : auctionInfo ? (
          <div className="bg-gray-800 rounded-lg p-6 mb-6 border-2 border-red-500">
            {/* 查封封条 */}
            <div className="absolute -top-4 -left-4 bg-red-600 text-white px-4 py-1 font-bold text-sm transform -rotate-12">
              ASSET SEIZED | 资产查封
            </div>

            <div className="space-y-4">
              {/* 当前价格 */}
              <div className="flex justify-between items-end border-b border-gray-700 pb-4">
                <div>
                  <p className="text-gray-400 text-sm uppercase mb-1">当前价格</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-yellow-400">
                      {formatPrice(auctionInfo.price)}
                    </span>
                    <span className="text-xl font-bold text-red-500">TWS</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm uppercase mb-1">当前房主</p>
                  <p className="text-white font-mono bg-gray-700 px-3 py-1 rounded">
                    {formatAddress(auctionInfo.owner)}
                  </p>
                </div>
              </div>

              {/* 留言 */}
              {auctionInfo.tauntMessage && (
                <div className="bg-gray-700 rounded p-3">
                  <p className="text-sm text-gray-400 mb-1">当前留言</p>
                  <p className="text-yellow-300 italic">"{auctionInfo.tauntMessage}"</p>
                </div>
              )}

              {/* 最低出价提示 */}
              <div className="bg-yellow-900/30 border border-yellow-500 rounded p-3">
                <p className="text-sm text-yellow-300">
                  💡 最低出价: <span className="font-bold">{getMinRequired()} TWS</span> (当前价格 + 10%)
                </p>
                <p className="text-xs text-yellow-400 mt-1">
                  出价后，5% 转给 TWS 财库，95% 转给上一任房主
                </p>
              </div>

              {/* 出价输入 */}
              <div className="space-y-3">
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
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-red-500 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {bidMessage.length}/100 字符
                  </p>
                </div>

                {/* 夺取按钮 */}
                <button
                  onClick={handleSeize}
                  disabled={!isWalletConnected || isSeizing}
                  className={`
                    w-full py-4 px-6 rounded-lg font-black text-xl uppercase tracking-widest transition-all
                    ${isWalletConnected && !isSeizing
                      ? 'bg-red-600 hover:bg-red-700 hover:scale-[1.02] active:scale-95 text-white shadow-[0_0_20px_rgba(220,38,38,0.6)]'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }
                  `}
                >
                  {isSeizing ? '处理中...' : isWalletConnected ? '💥 立即溢价 10% 强行接管 💥' : '请先连接钱包'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-400">拍卖信息加载失败</p>
            <button
              onClick={loadAuctionInfo}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              重试
            </button>
          </div>
        )}

        {/* 说明 */}
        <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-400">
          <p className="mb-2">⚠️ 拍卖规则：</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>每次出价必须比当前价格高至少 10%</li>
            <li>出价成功后，5% 转给 TWS 财库，95% 转给上一任房主</li>
            <li>上一任房主会获得本金 + 约 4.5% 的利润</li>
            <li>价格只能上涨，不能下跌</li>
            <li>TWSCoin 铸造地址（财库）: {TWSCoin_MINT}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AuctionPage;

