import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buyShares, getAssetHoldings, getAssetHolders } from '../utils/api';

const RWASharePurchase = () => {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const [shares, setShares] = useState('');
  const [asset, setAsset] = useState(null);
  const [myShares, setMyShares] = useState(0);
  const [holders, setHolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pricePerShare, setPricePerShare] = useState(0);

  useEffect(() => {
    if (assetId) {
      loadAssetData();
      loadMyHoldings();
      loadHolders();
    }
  }, [assetId]);

  const loadAssetData = async () => {
    try {
      // 这里需要从资产详情API获取，暂时使用占位数据
      // TODO: 集成实际的资产详情API
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/arsenal/assets/${assetId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.asset) {
          setAsset(data.asset);
          const totalPrice = data.asset.financials?.totalTokens || data.asset.tokenPrice || 0;
          const totalShares = data.asset.totalShares || 10000;
          setPricePerShare(totalPrice / totalShares);
        }
      }
    } catch (error) {
      console.error('Error loading asset:', error);
    }
  };

  const loadMyHoldings = async () => {
    try {
      const result = await getAssetHoldings(assetId);
      if (result.success) {
        setMyShares(result.shares || 0);
      }
    } catch (error) {
      console.error('Error loading my holdings:', error);
    }
  };

  const loadHolders = async () => {
    try {
      const result = await getAssetHolders(assetId);
      if (result.success) {
        setHolders(result.holders || []);
      }
    } catch (error) {
      console.error('Error loading holders:', error);
    }
  };

  const handleBuy = async () => {
    if (!shares || Number(shares) < 0.0001) {
      setMessage('份额必须至少为0.0001');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await buyShares(assetId, Number(shares), null);
      if (result.success) {
        setMessage('份额购买成功！');
        setShares('');
        loadMyHoldings();
        loadHolders();
      } else {
        setMessage(result.message || '购买失败');
      }
    } catch (error) {
      setMessage('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    if (!shares || !pricePerShare) return 0;
    return (Number(shares) * pricePerShare).toFixed(4);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-red-500">购买份额</h2>

      {message && (
        <div className={`p-3 rounded mb-4 ${
          message.includes('成功') ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'
        }`}>
          {message}
        </div>
      )}

      {asset && (
        <div className="mb-6 p-4 border border-gray-700 rounded bg-gray-900">
          <h3 className="text-lg font-semibold mb-2">{asset.codeName || asset.id}</h3>
          <div className="text-sm text-gray-400 space-y-1">
            <p>城市: {asset.city || asset.locationTag || '未知'}</p>
            <p>总价: {asset.financials?.totalTokens || asset.tokenPrice || 0} TOT</p>
            <p>总份额: {asset.totalShares || 10000} 份</p>
            <p>单价: {pricePerShare.toFixed(4)} TOT/份</p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">我的持有</h3>
        <p className="text-2xl font-bold text-green-400">{myShares.toFixed(4)} 份</p>
        <p className="text-sm text-gray-400 mt-1">
          价值: {(myShares * pricePerShare).toFixed(2)} TOT
        </p>
      </div>

      <div className="mb-6 p-4 border border-gray-700 rounded bg-gray-900">
        <label className="block text-sm font-medium mb-2">购买份额</label>
        <input
          type="number"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          min="0.0001"
          step="0.0001"
          className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-800 text-white mb-2"
          placeholder="最小: 0.0001"
        />
        <p className="text-xs text-gray-400 mb-4">
          最小购买: 0.0001 份
        </p>

        {shares && Number(shares) >= 0.0001 && (
          <div className="p-3 bg-gray-800 rounded mb-4">
            <p className="text-sm text-gray-400">所需金额</p>
            <p className="text-xl font-bold text-green-400">{calculateTotal()} TOT</p>
          </div>
        )}

        <button
          onClick={handleBuy}
          disabled={loading || !shares || Number(shares) < 0.0001}
          className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? '购买中...' : '购买份额'}
        </button>
      </div>

      {holders.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">持有者列表</h3>
          <div className="space-y-2">
            {holders.slice(0, 10).map((holder, idx) => (
              <div key={holder.id} className="p-3 border border-gray-700 rounded bg-gray-900">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">
                    #{idx + 1} {holder.userId.substring(0, 10)}...
                  </span>
                  <span className="font-semibold">{holder.shares.toFixed(4)} 份</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RWASharePurchase;

