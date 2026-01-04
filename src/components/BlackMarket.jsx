import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck,
  Home,
  MapPin,
  Square,
  DollarSign,
  Star,
  Eye,
  Calendar,
  Activity,
  Radio,
  Building2,
  TrendingUp,
  Image,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getApprovedAssets } from '../utils/api';
import { mapAssetsToMarketFormat } from '../utils/assetMapper';

const BlackMarket = () => {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // 按地区分组资产
  const groupAssetsByCity = (assetsList) => {
    const grouped = {};
    assetsList.forEach(asset => {
      const city = asset.city || 'UNKNOWN';
      if (!grouped[city]) {
        grouped[city] = [];
      }
      grouped[city].push(asset);
    });
    return grouped;
  };

  // 获取所有城市列表
  const getCityList = (assetsList) => {
    const cities = new Set();
    assetsList.forEach(asset => {
      if (asset.city) {
        cities.add(asset.city);
      }
    });
    return Array.from(cities).sort();
  };


  // 从后端加载已审核通过的资产
  useEffect(() => {
    const loadAssets = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getApprovedAssets();
        if (response.success && response.assets) {
          // 映射资产数据，确保包含城市信息
          const mappedAssets = mapAssetsToMarketFormat(response.assets);
          setAssets(mappedAssets);
        } else {
          // 如果没有数据，使用空数组
          setAssets([]);
        }
      } catch (err) {
        console.error('Error loading assets:', err);
        setError('加载资产数据失败，请检查后端服务是否运行');
        // 出错时使用空数组，不显示 mock 数据
        setAssets([]);
      } finally {
        setLoading(false);
      }
    };

    loadAssets();
  }, []);


  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 pb-20">
      {/* 顶部标题栏 */}
      <header className="mb-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Building2 className="text-blue-600" size={32} />
                优质房源市场
              </h1>
              <p className="text-gray-600">精选优质资产，投资价值可期</p>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-green-500" />
                <span>实时更新</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto">
      {/* 筛选栏 - 按地区筛选 */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2 relative z-10">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
            activeFilter === 'ALL' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          全部地区
        </button>
        {getCityList(assets).map((city) => (
          <button
            key={city}
            onClick={() => setActiveFilter(city)}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              activeFilter === city 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {city}
          </button>
        ))}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg relative z-10">
          <span className="font-medium">加载失败：</span>
          {error}
        </div>
      )}

      {/* 资产列表 (按地区分组显示) */}
      <div className="relative z-10">
        {loading ? (
          <div className="text-center py-20">
            <Activity className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">加载房源数据中...</p>
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-20">
            <Home className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-xl font-medium text-gray-700 mb-2">暂无可用房源</p>
            <p className="text-sm text-gray-500">房源审核通过后将在此显示</p>
          </div>
        ) : (() => {
          // 过滤资产
          const filteredAssets = activeFilter === 'ALL' 
            ? assets 
            : assets.filter(asset => asset.city === activeFilter);
          
          // 按地区分组
          const groupedAssets = groupAssetsByCity(filteredAssets);
          const cities = Object.keys(groupedAssets).sort();

          return cities.map((city) => (
            <div key={city} className="mb-12">
              {/* 地区标题 */}
              <div className="mb-6 pb-3 border-b border-gray-300">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <MapPin size={24} className="text-blue-600" />
                  {city}
                  <span className="text-base font-normal text-gray-500">
                    ({groupedAssets[city].length} 套房源)
                  </span>
                </h3>
              </div>
              
              {/* 该地区的资产网格 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedAssets[city].map((asset) => (
          <div key={asset.id} className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden group">
            {/* 图片占位符 */}
            <div className="h-48 bg-gradient-to-br from-blue-400 to-blue-600 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <Home size={64} className="text-white opacity-30" />
              </div>
              {asset.status === 'AVAILABLE' && (
                <div className="absolute top-3 right-3 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                  在售
                </div>
              )}
              {/* NFT 标识 */}
              {asset.original?.nftMinted && (
                <div className="absolute top-3 left-3 bg-purple-600 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 shadow-md">
                  <Image size={12} />
                  NFT
                </div>
              )}
            </div>
            
            {/* 房源信息 */}
            <div className="p-5">
              {/* 项目名称和位置 */}
              <div className="mb-3">
                <h4 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">
                  {asset.projectName || '优质房源'}
                </h4>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin size={14} className="mr-1" />
                  <span>{asset.city}{asset.district ? ` · ${asset.district}` : ''}</span>
                </div>
              </div>

              {/* 价格和面积 */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-bold text-red-600">
                    {asset.price}
                  </span>
                  <span className="text-sm text-gray-600">万元</span>
                </div>
                {asset.unitPrice > 0 && (
                  <div className="text-sm text-gray-500">
                    {asset.unitPrice.toLocaleString()} 元/㎡
                  </div>
                )}
              </div>

              {/* 房源属性 */}
              <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                <div className="flex items-center gap-2">
                  <Square size={16} className="text-gray-400" />
                  <div>
                    <div className="text-gray-500 text-xs">面积</div>
                    <div className="font-medium text-gray-900">{asset.area}㎡</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Home size={16} className="text-gray-400" />
                  <div>
                    <div className="text-gray-500 text-xs">户型</div>
                    <div className="font-medium text-gray-900">{asset.houseType || '-'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Star size={16} className="text-yellow-400 fill-yellow-400" />
                  <div>
                    <div className="text-gray-500 text-xs">评级</div>
                    <div className="font-medium text-gray-900 text-xs">{asset.stars || '★★★☆☆'}</div>
                  </div>
                </div>
              </div>

              {/* NFT 信息（如果有） */}
              {(asset.nftMinted || asset.original?.nftMinted) && (
                <div className="mb-3 pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Image size={14} className="text-purple-600" />
                    <span className="text-xs font-semibold text-purple-600">TWS Land NFT</span>
                  </div>
                  {(asset.nftTokenId || asset.original?.nftTokenId) && (
                    <div className="text-xs text-gray-600 font-mono bg-purple-50 px-2 py-1 rounded mb-1">
                      ID: {asset.nftTokenId || asset.original?.nftTokenId}
                    </div>
                  )}
                  {(asset.nftTxHash || asset.original?.nftTxHash) && (
                    <a 
                      href={`https://bscscan.com/tx/${asset.nftTxHash || asset.original?.nftTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      查看交易 <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              )}

              {/* 底部操作 */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  剩余 {asset.remaining} 套
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                  <Eye size={16} />
                  查看详情
                </button>
              </div>
            </div>
          </div>
                ))}
              </div>
            </div>
          ));
        })()}
      </div>
      </div>


      {/* 底部导航栏 */}
      <div className="fixed bottom-0 w-full bg-white backdrop-blur border-t border-gray-200 pb-safe pt-2 z-40 shadow-lg">
        <div className="flex justify-around items-center pb-2 max-w-7xl mx-auto">
          
          {/* Tab 0: 首页 */}
          <div 
            onClick={() => navigate('/')}
            className="flex flex-col items-center cursor-pointer text-gray-600 hover:text-blue-600 transition-colors"
          >
            <Radio className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-medium">首页</span>
          </div>

          {/* Tab 1: 地堡 */}
          <div 
            onClick={() => navigate('/bunker')}
            className="flex flex-col items-center cursor-pointer text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ShieldCheck className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-medium">地堡</span>
          </div>

          {/* Tab 2: 市场 (当前) */}
          <div className="flex flex-col items-center cursor-pointer text-blue-600">
            <Home className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-medium">房源</span>
          </div>

          {/* Tab 3: 任务 */}
          <div 
            onClick={() => navigate('/agent')}
            className="flex flex-col items-center cursor-pointer text-gray-600 hover:text-blue-600 transition-colors"
          >
            <TrendingUp className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-medium">任务</span>
          </div>

        </div>
      </div>

    </div>
  );
};

export default BlackMarket;

