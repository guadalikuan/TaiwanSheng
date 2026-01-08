import React, { useState, useEffect } from 'react';
import { getRecommendations, lockAsset } from '../utils/api';
import { useNavigate } from 'react-router-dom';

const RWARecommendations = ({ buyRequestId, buyRequest }) => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (buyRequestId || buyRequest) {
      loadRecommendations();
    }
  }, [buyRequestId, buyRequest]);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const result = await getRecommendations(buyRequestId, buyRequest, 10);
      if (result.success) {
        setRecommendations(result.recommendations || []);
      } else {
        setMessage(result.message || '获取推荐失败');
      }
    } catch (error) {
      setMessage('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleLock = async (assetId) => {
    if (!window.confirm('确定要锁定这个资产吗？锁定需要支付锁定费用。')) {
      return;
    }

    try {
      const result = await lockAsset(assetId, null); // TODO: Add txSignature from wallet
      if (result.success) {
        setMessage('资产锁定成功！');
        navigate(`/rwa-purchase/${assetId}`);
      } else {
        setMessage(result.message || '锁定失败');
      }
    } catch (error) {
      setMessage('网络错误，请稍后重试');
    }
  };

  if (loading) {
    return <div className="p-6 text-center">加载中...</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-red-500">推荐房源</h2>

      {message && (
        <div className={`p-3 rounded mb-4 ${
          message.includes('成功') ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'
        }`}>
          {message}
        </div>
      )}

      {recommendations.length === 0 ? (
        <p className="text-gray-400">暂无推荐房源</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((asset) => (
            <div key={asset.id} className="p-4 border border-gray-700 rounded bg-gray-900">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{asset.codeName || asset.id}</h3>
                <span className="px-2 py-1 bg-red-900/20 text-red-400 rounded text-xs">
                  匹配度 {asset.matchScore || 0}%
                </span>
              </div>

              <div className="space-y-1 text-sm text-gray-400 mb-4">
                <p>城市: {asset.city || asset.locationTag || '未知'}</p>
                <p>面积: {asset.area || 0}㎡</p>
                <p>价格: {asset.financials?.totalTokens || asset.tokenPrice || 0} TOT</p>
              </div>

              {asset.reasons && asset.reasons.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">推荐理由:</p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    {asset.reasons.map((reason, idx) => (
                      <li key={idx}>• {reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => handleLock(asset.id)}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
              >
                锁定资产
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RWARecommendations;

