import React, { useState, useEffect } from 'react';
import { 
  Database, 
  TrendingUp, 
  MapPin, 
  DollarSign, 
  Activity,
  Filter,
  RefreshCw,
  BarChart3,
  AlertCircle,
  CheckCircle,
  XCircle,
  RotateCcw
} from 'lucide-react';
import { redeemAsset } from '../utils/api';
import { useArsenalAuth } from '../contexts/ArsenalAuthContext';

const AssetPoolManagement = () => {
  const { user } = useArsenalAuth();
  const [stats, setStats] = useState(null);
  const [assets, setAssets] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState({});
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState({
    region: '',
    status: '',
    minValue: '',
    maxValue: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');

  // 加载统计数据
  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/asset-pool/stats`);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // 加载资产列表
  const loadAssets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        )
      });

      const response = await fetch(`${API_BASE_URL}/api/asset-pool/assets?${params}`);
      const data = await response.json();
      if (data.success) {
        setAssets(data.assets);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载健康度
  const loadHealth = async () => {
    try {
      const token = localStorage.getItem('tws_token') || localStorage.getItem('arsenal_token');
      const response = await fetch(`${API_BASE_URL}/api/asset-pool/health`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      const data = await response.json();
      if (data.success) {
        setHealth(data.health);
      }
    } catch (error) {
      console.error('Error loading health:', error);
    }
  };

  useEffect(() => {
    loadStats();
    loadHealth();
  }, []);

  useEffect(() => {
    loadAssets();
  }, [currentPage, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-900/50 text-green-400';
      case 'RESERVED':
        return 'bg-yellow-900/50 text-yellow-400';
      case 'LOCKED':
        return 'bg-slate-800 text-slate-400';
      default:
        return 'bg-slate-800 text-slate-400';
    }
  };

  const getHealthStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400';
      case 'moderate':
        return 'text-yellow-400';
      case 'needs_attention':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  const formatValue = (value) => {
    if (value >= 1000000) {
      return `¥${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `¥${(value / 1000).toFixed(2)}K`;
    }
    return `¥${value.toFixed(2)}`;
  };

  const handleRedeem = async (assetId) => {
    if (!window.confirm('确定要赎回这个资产吗？赎回后资产将从资产池中移除。')) {
      return;
    }

    setRedeeming({ ...redeeming, [assetId]: true });
    setMessage('');

    try {
      const result = await redeemAsset(assetId, '开发商赎回');
      if (result.success) {
        setMessage('资产赎回成功！');
        loadAssets();
        loadStats();
      } else {
        setMessage(result.message || '赎回失败');
      }
    } catch (error) {
      setMessage('网络错误，请稍后重试');
    } finally {
      setRedeeming({ ...redeeming, [assetId]: false });
    }
  };

  const canRedeem = (asset) => {
    // 只有开发商可以赎回，且资产状态必须是AVAILABLE，未被购买
    const isDeveloper = user?.role === 'DEVELOPER' || user?.role === 'ADMIN';
    const isAvailable = asset.status === 'AVAILABLE';
    const notPurchased = !asset.purchasedBy && !asset.nftMinted;
    return isDeveloper && isAvailable && notPurchased;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black mb-2 flex items-center gap-3">
              <Database className="text-cyan-400" />
              资产池管理
            </h1>
            <p className="text-slate-400 font-mono text-sm">
              Asset Pool Management Dashboard
            </p>
          </div>
          <button
            onClick={() => {
              loadStats();
              loadAssets();
              loadHealth();
            }}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw size={16} />
            刷新
          </button>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">总资产数</span>
                <Database className="text-blue-400" size={20} />
              </div>
              <div className="text-3xl font-bold">{stats.totalAssets}</div>
              <div className="text-xs text-slate-500 mt-1">已审核通过</div>
            </div>

            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">总价值</span>
                <DollarSign className="text-green-400" size={20} />
              </div>
              <div className="text-3xl font-bold">{formatValue(stats.totalValue)}</div>
              <div className="text-xs text-slate-500 mt-1">资产池价值: {formatValue(stats.assetPoolValue)}</div>
            </div>

            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">单位数</span>
                <MapPin className="text-purple-400" size={20} />
              </div>
              <div className="text-3xl font-bold">{stats.unitCount}</div>
              <div className="text-xs text-slate-500 mt-1">地图标记数</div>
            </div>

            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">地区数</span>
                <TrendingUp className="text-yellow-400" size={20} />
              </div>
              <div className="text-3xl font-bold">{Object.keys(stats.regionStats || {}).length}</div>
              <div className="text-xs text-slate-500 mt-1">覆盖城市</div>
            </div>
          </div>
        )}

        {/* 健康度指标 */}
        {health && (
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Activity className="text-cyan-400" />
                资产池健康度
              </h2>
              <span className={`text-sm font-bold ${getHealthStatusColor(health.status)}`}>
                {health.status === 'healthy' ? '健康' : 
                 health.status === 'moderate' ? '中等' : '需要关注'}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-slate-400 text-xs mb-1">审核通过率</div>
                <div className="text-2xl font-bold">{health.metrics?.approvalRate?.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs mb-1">上链率</div>
                <div className="text-2xl font-bold">{health.metrics?.mintRate?.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs mb-1">利用率</div>
                <div className="text-2xl font-bold">{health.metrics?.utilizationRate?.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs mb-1">已上链资产</div>
                <div className="text-2xl font-bold">{health.mintedAssets}</div>
              </div>
            </div>
          </div>
        )}

        {/* 筛选器 */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={18} />
            <h2 className="text-lg font-bold">筛选条件</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">地区</label>
              <input
                type="text"
                value={filters.region}
                onChange={(e) => handleFilterChange('region', e.target.value)}
                placeholder="输入城市名称"
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">状态</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
              >
                <option value="">全部</option>
                <option value="AVAILABLE">可交易</option>
                <option value="RESERVED">已预订</option>
                <option value="LOCKED">已锁定</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">最小价值</label>
              <input
                type="number"
                value={filters.minValue}
                onChange={(e) => handleFilterChange('minValue', e.target.value)}
                placeholder="最小值"
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">最大价值</label>
              <input
                type="number"
                value={filters.maxValue}
                onChange={(e) => handleFilterChange('maxValue', e.target.value)}
                placeholder="最大值"
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* 消息提示 */}
        {message && (
          <div className={`p-3 rounded mb-4 ${
            message.includes('成功') ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'
          }`}>
            {message}
          </div>
        )}

        {/* 资产列表 */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="text-cyan-400" />
              资产列表
            </h2>
            {loading && <RefreshCw className="animate-spin" size={18} />}
          </div>

          {loading ? (
            <div className="text-center text-slate-400 py-8">加载中...</div>
          ) : assets.length === 0 ? (
            <div className="text-center text-slate-400 py-8">暂无资产</div>
          ) : (
            <>
              <div className="space-y-2">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-cyan-500 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-sm font-bold text-cyan-400">
                            {asset.codeName || asset.id}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(asset.status)}`}>
                            {asset.status}
                          </span>
                          {asset.nftMinted && (
                            <span className="px-2 py-1 rounded text-xs bg-purple-900/50 text-purple-400">
                              已上链
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-400">城市:</span>{' '}
                            <span className="text-white">{asset.city || asset.locationTag || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">价值:</span>{' '}
                            <span className="text-green-400">
                              {formatValue(asset.financials?.totalTokens || asset.tokenPrice || 0)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">类型:</span>{' '}
                            <span className="text-white">{asset.assetType || '房产'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">面积:</span>{' '}
                            <span className="text-white">{asset.area || 'N/A'}㎡</span>
                          </div>
                        </div>
                      </div>
                      {canRedeem(asset) && (
                        <button
                          onClick={() => handleRedeem(asset.id)}
                          disabled={redeeming[asset.id]}
                          className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm disabled:opacity-50"
                        >
                          <RotateCcw size={14} />
                          {redeeming[asset.id] ? '赎回中...' : '赎回'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <span className="text-slate-400">
                    第 {currentPage} / {totalPages} 页
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetPoolManagement;

