import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { createAuction, getTaiOneTokenBalanceAPI } from '../utils/api';
import { formatTaiOneTokenBalance } from '../utils/twscoin';
import { Hammer, Wallet } from 'lucide-react';

const AuctionCreatePage = () => {
  const navigate = useNavigate();
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [formData, setFormData] = useState({
    assetName: '',
    description: '',
    startPrice: '',
    imageUrl: '',
    location: '',
    originalOwner: '',
    tauntMessage: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [walletBalance, setWalletBalance] = useState('0');
  const [loadingBalance, setLoadingBalance] = useState(false);

  const CREATE_FEE = 200; // 创建费用：200 TOT

  useEffect(() => {
    if (connected && publicKey) {
      loadBalance();
    }
  }, [connected, publicKey]);

  const loadBalance = async () => {
    if (!publicKey) return;
    try {
      setLoadingBalance(true);
      const result = await getTaiOneTokenBalanceAPI(publicKey.toString());
      if (result.success) {
        setWalletBalance(result.data.balance || '0');
      }
    } catch (error) {
      console.error('加载余额失败:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const validateForm = () => {
    if (!formData.assetName.trim()) {
      setError('资产名称不能为空');
      return false;
    }
    if (!formData.startPrice || parseFloat(formData.startPrice) <= 0) {
      setError('起拍价必须大于0');
      return false;
    }
    if (!connected || !publicKey) {
      setError('请先连接钱包');
      return false;
    }
    
    // 检查余额
    const balance = parseFloat(formatTaiOneTokenBalance(walletBalance));
    const startPrice = parseFloat(formData.startPrice);
    const required = CREATE_FEE + startPrice;
    
    if (balance < required) {
      setError(`余额不足，需要 ${required} TOT（创建费 ${CREATE_FEE} TOT + 起拍价 ${startPrice} TOT）`);
      return false;
    }

    // 验证图片URL格式（如果提供）
    if (formData.imageUrl && !isValidUrl(formData.imageUrl)) {
      setError('图片URL格式不正确');
      return false;
    }

    return true;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await createAuction({
        ...formData,
        startPrice: parseFloat(formData.startPrice),
        creatorAddress: publicKey.toString()
      });

      if (result.success) {
        // 创建成功，跳转到新创建的拍卖详情页
        navigate(`/auction/${result.data.assetId}`);
      } else {
        setError(result.error || result.message || '创建失败');
      }
    } catch (error) {
      console.error('创建拍卖错误:', error);
      setError('创建失败：' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const balance = parseFloat(formatTaiOneTokenBalance(walletBalance));
  const startPrice = parseFloat(formData.startPrice) || 0;
  const required = CREATE_FEE + startPrice;
  const hasEnoughBalance = balance >= required;

  return (
    <div className="min-h-screen bg-blood-trail text-white font-sans">
      {/* 背景网格噪点效果 */}
      <div 
        className="fixed inset-0 z-0 opacity-10 pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(#D32F2F 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto p-8">
        {/* 顶部导航栏 */}
        <div className="mb-6 flex items-center justify-between">
          {/* 返回按钮 */}
          <button
            onClick={() => navigate('/auctions')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回列表
          </button>

          {/* 右上角钱包连接按钮/地址 */}
          {connected && publicKey ? (
            <div className="flex items-center gap-3 bg-gray-900/80 backdrop-blur-sm border-2 border-tws-red rounded-lg px-4 py-2">
              <Wallet className="w-4 h-4 text-tws-gold" />
              <div className="flex flex-col items-end">
                <span className="text-xs text-gray-400 font-mono">已连接</span>
                <span className="text-sm text-tws-gold font-mono font-bold">
                  {publicKey.toString().slice(0, 6)}...{publicKey.toString().slice(-4)}
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setVisible(true)}
              className="flex items-center gap-2 bg-tws-red hover:bg-red-700 border-2 border-tws-red rounded-lg px-4 py-2 text-white font-bold transition-all"
            >
              <Wallet className="w-4 h-4" />
              <span className="text-sm">连接钱包</span>
            </button>
          )}
        </div>

        {/* 主表单区域 */}
        <div className="bg-black/80 backdrop-blur-sm border-2 border-tws-red rounded-lg p-8">
          <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
            <Hammer className="text-tws-red" />
            创建新拍卖
          </h1>
          <p className="text-gray-400 mb-8">花费 {CREATE_FEE} TOT 创建新的拍卖资产</p>

          {/* 钱包状态 */}
          {!connected ? (
            <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
              <p className="text-yellow-400">请先连接钱包</p>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">钱包余额</span>
                <span className="text-tws-gold font-bold text-lg">
                  {loadingBalance ? '加载中...' : `${balance.toFixed(2)} TOT`}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">所需金额</span>
                <span className={hasEnoughBalance ? 'text-green-400' : 'text-red-400'}>
                  {required.toFixed(2)} TOT
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 资产名称 */}
            <div>
              <label className="block text-sm font-mono text-gray-400 mb-2">
                资产名称 <span className="text-tws-red">*</span>
              </label>
              <input
                type="text"
                name="assetName"
                value={formData.assetName}
                onChange={handleChange}
                required
                placeholder="例如：桃园·背骨将军府"
                className="w-full bg-gray-900 border-2 border-gray-700 rounded px-4 py-3 text-white focus:border-tws-red focus:outline-none"
              />
            </div>

            {/* 资产描述 */}
            <div>
              <label className="block text-sm font-mono text-gray-400 mb-2">资产描述</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                placeholder="描述这个资产的特点、历史等..."
                className="w-full bg-gray-900 border-2 border-gray-700 rounded px-4 py-3 text-white focus:border-tws-red focus:outline-none resize-none"
              />
            </div>

            {/* 起拍价 */}
            <div>
              <label className="block text-sm font-mono text-gray-400 mb-2">
                起拍价 (TOT) <span className="text-tws-red">*</span>
              </label>
              <input
                type="number"
                name="startPrice"
                value={formData.startPrice}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="例如：1000"
                className="w-full bg-gray-900 border-2 border-gray-700 rounded px-4 py-3 text-white focus:border-tws-red focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                起拍价：{startPrice.toFixed(2)} TOT + 创建费：{CREATE_FEE} TOT = 总计：{required.toFixed(2)} TOT
              </p>
            </div>

            {/* 图片URL */}
            <div>
              <label className="block text-sm font-mono text-gray-400 mb-2">图片URL</label>
              <input
                type="url"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                placeholder="https://example.com/image.jpg"
                className="w-full bg-gray-900 border-2 border-gray-700 rounded px-4 py-3 text-white focus:border-tws-red focus:outline-none"
              />
            </div>

            {/* 位置 */}
            <div>
              <label className="block text-sm font-mono text-gray-400 mb-2">位置</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="例如：桃园市桃园区"
                className="w-full bg-gray-900 border-2 border-gray-700 rounded px-4 py-3 text-white focus:border-tws-red focus:outline-none"
              />
            </div>

            {/* 原主信息 */}
            <div>
              <label className="block text-sm font-mono text-gray-400 mb-2">原主信息</label>
              <input
                type="text"
                name="originalOwner"
                value={formData.originalOwner}
                onChange={handleChange}
                placeholder="例如：前台军少将 于北辰"
                className="w-full bg-gray-900 border-2 border-gray-700 rounded px-4 py-3 text-white focus:border-tws-red focus:outline-none"
              />
            </div>

            {/* 初始留言 */}
            <div>
              <label className="block text-sm font-mono text-gray-400 mb-2">初始留言</label>
              <input
                type="text"
                name="tauntMessage"
                value={formData.tauntMessage}
                onChange={handleChange}
                maxLength={100}
                placeholder="例如：此房产已被TaiOne接管"
                className="w-full bg-gray-900 border-2 border-gray-700 rounded px-4 py-3 text-white focus:border-tws-red focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                {formData.tauntMessage.length}/100 字符
              </p>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="p-4 bg-red-900/30 border border-red-600 rounded-lg">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {/* 提交按钮 */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/auctions')}
                className="flex-1 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg transition-all"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting || !connected || !hasEnoughBalance}
                className="flex-1 px-6 py-3 bg-tws-red hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all"
              >
                {submitting ? '创建中...' : `创建拍卖 (${required.toFixed(2)} TOT)`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuctionCreatePage;

