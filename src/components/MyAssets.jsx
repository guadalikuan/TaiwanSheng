import React, { useState, useEffect } from 'react';
import { Package, CheckCircle, Clock, XCircle, AlertCircle, FileText, MapPin, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMyAssets } from '../utils/api';

const MyAssets = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, MINTING, AVAILABLE, RESERVED, LOCKED, REJECTED

  useEffect(() => {
    loadMyAssets();
  }, []);

  const loadMyAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getMyAssets();
      
      if (response && response.success) {
        setAssets(response.assets || []);
      } else {
        setError(response?.message || '加载资产列表失败');
      }
    } catch (err) {
      console.error('Error loading my assets:', err);
      setError('加载资产列表失败，请检查后端服务是否运行');
    } finally {
      setLoading(false);
    }
  };

  // 筛选资产
  const filteredAssets = assets.filter(asset => {
    if (statusFilter === 'ALL') return true;
    const status = asset.sanitized?.status || asset.raw?.status || 'UNKNOWN';
    return status === statusFilter;
  });

  // 统计信息
  const stats = {
    total: assets.length,
    minting: assets.filter(a => (a.sanitized?.status || a.raw?.status) === 'MINTING').length,
    available: assets.filter(a => (a.sanitized?.status || a.raw?.status) === 'AVAILABLE').length,
    reserved: assets.filter(a => (a.sanitized?.status || a.raw?.status) === 'RESERVED').length,
    locked: assets.filter(a => (a.sanitized?.status || a.raw?.status) === 'LOCKED').length,
    rejected: assets.filter(a => (a.sanitized?.status || a.raw?.status) === 'REJECTED').length,
  };

  // 获取状态标签
  const getStatusLabel = (status) => {
    const statusMap = {
      'MINTING': { label: '审核中', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
      'AVAILABLE': { label: '已上架', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
      'RESERVED': { label: '已预订', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Package },
      'LOCKED': { label: '已锁定', color: 'bg-red-100 text-red-800 border-red-300', icon: AlertCircle },
      'REJECTED': { label: '已拒绝', color: 'bg-gray-100 text-gray-800 border-gray-300', icon: XCircle },
    };
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800 border-gray-300', icon: FileText };
  };

  // 格式化日期
  const formatDate = (timestamp) => {
    if (!timestamp) return '未知';
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800 mx-auto"></div>
          <p className="mt-4 text-slate-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
      {/* 头部 */}
      <div className="bg-white border-b-4 border-red-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-serif font-bold text-red-900 tracking-wide flex items-center gap-2">
                <Package size={28} className="text-red-800" />
                我的资产
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                查看您提交的所有资产信息
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/arsenal')}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                资产入库
              </button>
            </div>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4">
            <div className="bg-slate-50 p-3 rounded border border-slate-200">
              <div className="text-xs text-slate-500">总数</div>
              <div className="text-xl font-bold text-slate-800">{stats.total}</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
              <div className="text-xs text-yellow-600">审核中</div>
              <div className="text-xl font-bold text-yellow-800">{stats.minting}</div>
            </div>
            <div className="bg-green-50 p-3 rounded border border-green-200">
              <div className="text-xs text-green-600">已上架</div>
              <div className="text-xl font-bold text-green-800">{stats.available}</div>
            </div>
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <div className="text-xs text-blue-600">已预订</div>
              <div className="text-xl font-bold text-blue-800">{stats.reserved}</div>
            </div>
            <div className="bg-red-50 p-3 rounded border border-red-200">
              <div className="text-xs text-red-600">已锁定</div>
              <div className="text-xl font-bold text-red-800">{stats.locked}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <div className="text-xs text-gray-600">已拒绝</div>
              <div className="text-xl font-bold text-gray-800">{stats.rejected}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* 筛选器 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { value: 'ALL', label: '全部' },
            { value: 'MINTING', label: '审核中' },
            { value: 'AVAILABLE', label: '已上架' },
            { value: 'RESERVED', label: '已预订' },
            { value: 'LOCKED', label: '已锁定' },
            { value: 'REJECTED', label: '已拒绝' }
          ].map(filter => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === filter.value
                  ? 'bg-red-800 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            <span className="font-medium">错误：</span>
            {error}
          </div>
        )}

        {/* 资产列表 */}
        {filteredAssets.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <Package size={48} className="mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600 text-lg mb-2">
              {statusFilter === 'ALL' ? '暂无资产' : `暂无${statusFilter === 'MINTING' ? '审核中' : statusFilter === 'AVAILABLE' ? '已上架' : '其他状态'}的资产`}
            </p>
            <button
              onClick={() => navigate('/arsenal')}
              className="mt-4 px-6 py-2 bg-red-800 hover:bg-red-900 text-white rounded-lg font-medium transition-colors"
            >
              提交资产
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAssets.map((asset) => {
              const raw = asset.raw;
              const sanitized = asset.sanitized;
              const status = sanitized?.status || raw?.status || 'UNKNOWN';
              const statusInfo = getStatusLabel(status);
              const StatusIcon = statusInfo.icon;

              return (
                <div
                  key={raw?.id || sanitized?.id}
                  className="bg-white rounded-lg border border-slate-200 hover:border-red-300 transition-all shadow-sm hover:shadow-md"
                >
                  <div className="p-6">
                    {/* 头部：状态和资产代号 */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-mono font-bold text-slate-800">
                            {sanitized?.codeName || sanitized?.displayId || raw?.id || '未知代号'}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded border ${statusInfo.color} flex items-center gap-1`}>
                            <StatusIcon size={12} />
                            {statusInfo.label}
                          </span>
                          {sanitized?.nftMinted && (
                            <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800 border border-purple-300">
                              NFT已铸造
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-600">
                          {raw?.projectName || sanitized?.projectName || '未知项目'}
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/asset-detail/${sanitized?.id || raw?.id}`)}
                        className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                      >
                        查看详情
                      </button>
                    </div>

                    {/* 资产信息 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                          <MapPin size={12} />
                          位置
                        </div>
                        <div className="text-sm font-medium text-slate-800">
                          {raw?.province || ''}{raw?.city || sanitized?.city || '未知'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">建筑面积</div>
                        <div className="text-sm font-medium text-slate-800">
                          {raw?.area || 0} ㎡
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">债务金额</div>
                        <div className="text-sm font-medium text-slate-800">
                          ¥{(raw?.debtAmount || 0).toLocaleString('zh-CN')} 万元
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">提交时间</div>
                        <div className="text-sm font-medium text-slate-800">
                          {formatDate(raw?.timestamp)}
                        </div>
                      </div>
                    </div>

                    {/* NFT信息 */}
                    {sanitized?.nftMinted && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-500">NFT Token ID:</span>
                          <span className="font-mono text-purple-600">{sanitized.nftTokenId}</span>
                          {sanitized.nftTxHash && (
                            <a
                              href={`https://bscscan.com/tx/${sanitized.nftTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs"
                            >
                              查看交易
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAssets;

