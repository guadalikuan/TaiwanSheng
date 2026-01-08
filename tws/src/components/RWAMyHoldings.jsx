import React, { useState, useEffect } from 'react';
import { getMyHoldings } from '../utils/api';
import { useNavigate } from 'react-router-dom';

const RWAMyHoldings = () => {
  const navigate = useNavigate();
  const [holdings, setHoldings] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ city: '', type: '' });

  useEffect(() => {
    loadHoldings();
  }, []);

  const loadHoldings = async () => {
    setLoading(true);
    try {
      const result = await getMyHoldings();
      if (result.success) {
        setHoldings(result.holdings || []);
        setTotalValue(result.totalValue || 0);
      }
    } catch (error) {
      console.error('Error loading holdings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHoldings = holdings.filter(holding => {
    if (filter.city && holding.asset) {
      const assetCity = holding.asset.city || holding.asset.locationTag || '';
      if (!assetCity.includes(filter.city) && !filter.city.includes(assetCity)) {
        return false;
      }
    }
    if (filter.type && holding.asset) {
      const assetType = holding.asset.assetType || '房产';
      if (assetType !== filter.type) {
        return false;
      }
    }
    return true;
  });

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-400">加载中...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-red-500">我的持有份额</h2>

      {/* 总价值统计 */}
      <div className="mb-6 p-6 border border-gray-700 rounded bg-gray-900">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-400">总持有资产</p>
            <p className="text-3xl font-bold text-green-400">{filteredHoldings.length} 项</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">总价值</p>
            <p className="text-3xl font-bold text-green-400">{totalValue.toFixed(2)} TOT</p>
          </div>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="mb-6 p-4 border border-gray-700 rounded bg-gray-900">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">城市筛选</label>
            <input
              type="text"
              value={filter.city}
              onChange={(e) => setFilter({ ...filter, city: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-800 text-white"
              placeholder="输入城市名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">资产类型</label>
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-800 text-white"
            >
              <option value="">全部</option>
              <option value="房产">房产</option>
            </select>
          </div>
        </div>
      </div>

      {/* 持有列表 */}
      {filteredHoldings.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>暂无持有资产</p>
          <button
            onClick={() => navigate('/rwa/etf')}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
          >
            去购买ETF
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHoldings.map((holding) => (
            <div
              key={holding.id}
              className="p-4 border border-gray-700 rounded bg-gray-900 hover:border-red-500 transition-colors cursor-pointer"
              onClick={() => holding.asset && navigate(`/rwa/shares/${holding.assetId}`)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">
                  {holding.asset?.codeName || holding.assetId}
                </h3>
                <span className="px-2 py-1 bg-green-900/20 text-green-400 rounded text-xs">
                  {holding.shares.toFixed(4)} 份
                </span>
              </div>

              {holding.asset && (
                <div className="space-y-1 text-sm text-gray-400 mb-3">
                  <p>城市: {holding.asset.city || holding.asset.locationTag || '未知'}</p>
                  <p>单价: {holding.pricePerShare?.toFixed(4) || '0.0000'} TOT/份</p>
                </div>
              )}

              <div className="pt-3 border-t border-gray-700">
                <p className="text-sm text-gray-400">价值</p>
                <p className="text-xl font-bold text-green-400">
                  {holding.value?.toFixed(2) || '0.00'} TOT
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RWAMyHoldings;

