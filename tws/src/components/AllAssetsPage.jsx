import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, ArrowUpDown, ArrowLeft, 
  Building2, Wheat, FlaskConical, Wine, Palette, 
  Mountain, Warehouse, Ship, Cpu, Database,
  ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { getAllAssets } from '../utils/api';
import { useServerStatus } from '../contexts/ServerStatusContext';

const AllAssetsPage = () => {
  const navigate = useNavigate();
  const { isOnline } = useServerStatus();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // 筛选和搜索状态
  const [activeTab, setActiveTab] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minYield, setMinYield] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [sortBy, setSortBy] = useState('time');
  const [showFilters, setShowFilters] = useState(false);

  // 资产类型配置
  const assetTypes = [
    { id: '全部', icon: Database, color: 'text-slate-400' },
    { id: '房产', icon: Building2, color: 'text-blue-400' },
    { id: '农田', icon: Wheat, color: 'text-green-400' },
    { id: '科创', icon: FlaskConical, color: 'text-purple-400' },
    { id: '酒水', icon: Wine, color: 'text-red-400' },
    { id: '文创', icon: Palette, color: 'text-yellow-400' },
    { id: '矿产', icon: Mountain, color: 'text-orange-400' },
    { id: '仓库', icon: Warehouse, color: 'text-gray-400' },
    { id: '航船', icon: Ship, color: 'text-cyan-400' },
    { id: '芯片', icon: Cpu, color: 'text-indigo-400' },
  ];

  // 获取资产类型图标
  const getAssetTypeIcon = (type) => {
    const typeConfig = assetTypes.find(t => t.id === type);
    return typeConfig ? typeConfig.icon : Database;
  };

  // 加载资产数据
  const loadAssets = async (page = 1) => {
    if (!isOnline) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const filters = {
        type: activeTab === '全部' ? undefined : activeTab,
        status: statusFilter || undefined,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
        minYield: minYield || undefined,
        city: cityFilter || undefined,
        search: searchQuery || undefined,
        sort: sortBy,
        page,
        limit: 20
      };

      const response = await getAllAssets(filters);
      if (response && response.success && response.data) {
        setAssets(response.data.assets || []);
        setPagination(response.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  };

  // 使用debounce处理搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      loadAssets(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, statusFilter, minPrice, maxPrice, minYield, cityFilter, sortBy, isOnline]);

  // 初始加载
  useEffect(() => {
    loadAssets(1);
  }, []);

  // 处理分页
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadAssets(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 清除筛选
  const clearFilters = () => {
    setStatusFilter('');
    setMinPrice('');
    setMaxPrice('');
    setMinYield('');
    setCityFilter('');
    setSearchQuery('');
    setSortBy('time');
  };

  const hasActiveFilters = statusFilter || minPrice || maxPrice || minYield || cityFilter || searchQuery;

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-16 md:pt-20">
      {/* Header */}
      <div className="sticky top-16 md:top-20 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-mono text-sm">返回首页</span>
            </button>
            <h1 className="text-2xl md:text-3xl font-bold font-mono tracking-wider">全部资产</h1>
            <div className="w-24" />
          </div>

          {/* 搜索栏 */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
            <input
              type="text"
              placeholder="搜索资产名称、代号或城市..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* 筛选和排序栏 */}
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Filter size={16} />
              筛选
              {hasActiveFilters && <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">!</span>}
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
            >
              <option value="time">最新发布</option>
              <option value="price_asc">价格：低到高</option>
              <option value="price_desc">价格：高到低</option>
              <option value="yield_desc">收益率：高到低</option>
              <option value="yield_asc">收益率：低到高</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-mono text-sm transition-colors"
              >
                <X size={16} />
                清除筛选
              </button>
            )}
          </div>

          {/* 筛选面板 */}
          {showFilters && (
            <div className="mt-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 font-mono mb-1">状态</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">全部</option>
                    <option value="AVAILABLE">可购买</option>
                    <option value="MINTING">铸造中</option>
                    <option value="RESERVED">已预订</option>
                    <option value="LOCKED">已锁定</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-mono mb-1">最低价格 (TOT)</label>
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-mono mb-1">最高价格 (TOT)</label>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="无限制"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-mono mb-1">最低收益率 (%)</label>
                  <input
                    type="number"
                    value={minYield}
                    onChange={(e) => setMinYield(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-mono mb-1">城市</label>
                  <input
                    type="text"
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    placeholder="输入城市名称"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 资产类型选项卡 */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
          {assetTypes.map((type) => {
            const Icon = type.icon;
            const isActive = activeTab === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setActiveTab(type.id)}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-lg font-mono text-sm transition-all whitespace-nowrap
                  ${isActive 
                    ? 'bg-gold text-black border-2 border-gold' 
                    : 'bg-slate-800/50 text-slate-400 border-2 border-slate-700 hover:border-slate-600 hover:text-slate-300'
                  }
                `}
              >
                <Icon size={18} className={isActive ? 'text-black' : type.color} />
                {type.id}
              </button>
            );
          })}
        </div>

        {/* 资产列表 */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-500 font-mono">載入資產中...</div>
          </div>
        ) : assets.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-500 font-mono">暫無可用資產</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {assets.map((item, index) => {
                const Icon = getAssetTypeIcon(item.assetType);
                return (
                  <div
                    key={item.id}
                    className={`group relative bg-slate-900/50 border ${
                      item.status === 'LOCKED' ? 'border-slate-800 opacity-50' : 'border-slate-700 hover:border-gold'
                    } p-6 transition-all duration-300 hover:-translate-y-2 cursor-pointer`}
                    onClick={() => {
                      if (item.assetType === '科创') {
                        navigate(`/tech-project/${item.id}`);
                      } else {
                        navigate(`/asset-detail/${item.id}?type=${item.assetType}`);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs font-mono text-slate-500">ID: TWS-{item.id}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded ${
                          item.status === 'AVAILABLE'
                            ? 'bg-green-900 text-green-400'
                            : item.status === 'RESERVED'
                            ? 'bg-yellow-900 text-yellow-400'
                            : item.status === 'MINTING'
                            ? 'bg-blue-900 text-blue-400'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="h-24 bg-slate-800/50 mb-4 flex items-center justify-center overflow-hidden relative">
                      <Icon className="text-slate-700 opacity-20 w-16 h-16" />
                      <div className="absolute bottom-0 left-0 bg-black/60 px-2 text-[10px] text-white font-mono">
                        {item.city || 'N/A'}
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2 font-mono truncate">{item.title}</h3>
                    <div className="text-xs text-slate-400 font-mono mb-4">{item.assetType}</div>

                    <div className="grid grid-cols-2 gap-4 mb-6 border-t border-slate-800 pt-4">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">入場價格</div>
                        <div className="text-cyan-400 font-mono">{item.priceDisplay}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">預估收益</div>
                        <div className="text-gold font-mono">{item.yieldDisplay}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 分页控件 */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mb-8">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 disabled:cursor-not-allowed text-white rounded font-mono text-sm transition-colors"
                >
                  <ChevronLeft size={16} />
                  上一页
                </button>

                <div className="text-slate-400 font-mono text-sm">
                  第 {pagination.page} / {pagination.totalPages} 页
                  <span className="ml-2 text-slate-500">（共 {pagination.total} 个资产）</span>
                </div>

                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 disabled:cursor-not-allowed text-white rounded font-mono text-sm transition-colors"
                >
                  下一页
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AllAssetsPage;
