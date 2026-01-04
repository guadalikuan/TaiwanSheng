import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getAuctionList } from '../utils/api';
import { formatTaiOneTokenBalance } from '../utils/twscoin';

const AuctionListPage = () => {
  const navigate = useNavigate();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // active, pending, completed
  const [filteredAuctions, setFilteredAuctions] = useState([]);

  useEffect(() => {
    loadAuctions();
  }, []);

  useEffect(() => {
    // 根据当前标签筛选拍卖
    const filtered = auctions.filter(auction => {
      if (activeTab === 'active') return auction.status === 'active';
      if (activeTab === 'pending') return auction.status === 'pending';
      if (activeTab === 'completed') return auction.status === 'completed';
      return true;
    });
    setFilteredAuctions(filtered);
  }, [auctions, activeTab]);

  const loadAuctions = async () => {
    try {
      setLoading(true);
      const result = await getAuctionList();
      if (result.success) {
        setAuctions(result.data || []);
      } else {
        console.error('获取拍卖列表失败:', result.error);
      }
    } catch (error) {
      console.error('加载拍卖列表错误:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-tws-red text-white';
      case 'pending':
        return 'bg-yellow-600 text-white';
      case 'completed':
        return 'bg-gray-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return '进行中';
      case 'pending':
        return '未开始';
      case 'completed':
        return '已完成';
      default:
        return status;
    }
  };

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

      {/* 顶部导航栏 */}
      <div className="relative z-10 bg-black/80 backdrop-blur-sm border-b border-tws-red p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gray-900/80 border-2 border-tws-red rounded-lg hover:bg-gray-800 hover:border-tws-gold transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              返回首页
            </button>
            <h1 className="text-2xl font-black text-tws-red">拍卖市场</h1>
          </div>
          <button
            onClick={() => navigate('/auctions/create')}
            className="px-6 py-2 bg-tws-red hover:bg-red-700 text-white font-bold rounded-lg transition-all transform hover:scale-105"
          >
            + 创建拍卖
          </button>
        </div>
      </div>

      {/* 状态标签页 */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-3 font-bold rounded-lg transition-all ${
              activeTab === 'active'
                ? 'bg-tws-red text-white border-2 border-tws-gold'
                : 'bg-gray-900/50 text-gray-400 border-2 border-gray-700 hover:border-gray-600'
            }`}
          >
            进行中 ({auctions.filter(a => a.status === 'active').length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-3 font-bold rounded-lg transition-all ${
              activeTab === 'pending'
                ? 'bg-yellow-600 text-white border-2 border-tws-gold'
                : 'bg-gray-900/50 text-gray-400 border-2 border-gray-700 hover:border-gray-600'
            }`}
          >
            未开始 ({auctions.filter(a => a.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-6 py-3 font-bold rounded-lg transition-all ${
              activeTab === 'completed'
                ? 'bg-gray-600 text-white border-2 border-tws-gold'
                : 'bg-gray-900/50 text-gray-400 border-2 border-gray-700 hover:border-gray-600'
            }`}
          >
            已完成 ({auctions.filter(a => a.status === 'completed').length})
          </button>
        </div>

        {/* 拍卖卡片网格 */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tws-red"></div>
            <p className="mt-4 text-gray-400">加载中...</p>
          </div>
        ) : filteredAuctions.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-xl">暂无{getStatusText(activeTab)}的拍卖</p>
            <button
              onClick={() => navigate('/auctions/create')}
              className="mt-4 px-6 py-2 bg-tws-red hover:bg-red-700 text-white font-bold rounded-lg transition-all"
            >
              创建第一个拍卖
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAuctions.map((auction) => (
              <motion.div
                key={auction.assetId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                className="bg-black/80 backdrop-blur-sm border-2 border-tws-red rounded-lg overflow-hidden cursor-pointer hover:border-tws-gold transition-all"
                onClick={() => navigate(`/auction/${auction.assetId}`)}
              >
                {/* 图片区域 */}
                <div className="relative h-48 bg-gray-900 overflow-hidden">
                  {auction.imageUrl ? (
                    <img
                      src={auction.imageUrl}
                      alt={auction.assetName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                      <span className="text-gray-600 text-4xl">📦</span>
                    </div>
                  )}
                  {/* 状态标签 */}
                  <div className="absolute top-2 right-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(auction.status)}`}>
                      {getStatusText(auction.status)}
                    </span>
                  </div>
                </div>

                {/* 内容区域 */}
                <div className="p-4">
                  <h3 className="text-xl font-black text-tws-red mb-2 line-clamp-1">
                    {auction.assetName || `资产 #${auction.assetId}`}
                  </h3>
                  
                  {auction.description && (
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                      {auction.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">当前价格</span>
                      <span className="text-tws-gold font-bold text-lg">
                        {formatTaiOneTokenBalance(auction.price)} TOT
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">最低出价</span>
                      <span className="text-gray-300 font-bold">
                        {formatTaiOneTokenBalance(auction.minRequired)} TOT
                      </span>
                    </div>
                    {auction.location && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-sm">位置</span>
                        <span className="text-gray-400 text-sm">{auction.location}</span>
                      </div>
                    )}
                  </div>

                  {/* 持有者信息 */}
                  <div className="pt-3 border-t border-gray-800">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-xs">当前持有者</span>
                      <span className="text-gray-400 text-xs font-mono truncate max-w-[150px]">
                        {auction.owner?.slice(0, 8)}...{auction.owner?.slice(-6)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuctionListPage;

