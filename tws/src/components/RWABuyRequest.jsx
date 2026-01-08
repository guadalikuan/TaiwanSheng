import React, { useState, useEffect } from 'react';
import { createBuyRequest, getBuyRequests, getRecommendations } from '../utils/api';
// Note: This component should use the appropriate auth context
// For now, we'll use a simple check

const RWABuyRequest = () => {
  // const { user } = useAuth(); // TODO: Use appropriate auth context
  const [formData, setFormData] = useState({
    preferredCity: '',
    preferredDistrict: '',
    minArea: '',
    maxArea: '',
    maxPrice: '',
    urgency: 'medium'
  });
  const [buyRequests, setBuyRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadBuyRequests();
  }, []);

  const loadBuyRequests = async () => {
    try {
      const result = await getBuyRequests();
      if (result.success) {
        setBuyRequests(result.buyRequests || []);
      }
    } catch (error) {
      console.error('Error loading buy requests:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const result = await createBuyRequest({
        preferredCity: formData.preferredCity,
        preferredDistrict: formData.preferredDistrict,
        minArea: Number(formData.minArea) || 0,
        maxArea: Number(formData.maxArea) || 0,
        maxPrice: Number(formData.maxPrice) || 0,
        urgency: formData.urgency
      });

      if (result.success) {
        setMessage('购买需求创建成功！');
        setFormData({
          preferredCity: '',
          preferredDistrict: '',
          minArea: '',
          maxArea: '',
          maxPrice: '',
          urgency: 'medium'
        });
        loadBuyRequests();
      } else {
        setMessage(result.message || '创建失败');
      }
    } catch (error) {
      setMessage('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-red-500">购买需求提交</h2>

      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium mb-2">偏好城市 *</label>
          <input
            type="text"
            value={formData.preferredCity}
            onChange={(e) => setFormData({ ...formData, preferredCity: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-900 text-white"
            required
            placeholder="例如：西安"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">偏好区域</label>
          <input
            type="text"
            value={formData.preferredDistrict}
            onChange={(e) => setFormData({ ...formData, preferredDistrict: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-900 text-white"
            placeholder="例如：浐灞"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">最小面积 (㎡)</label>
            <input
              type="number"
              value={formData.minArea}
              onChange={(e) => setFormData({ ...formData, minArea: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-900 text-white"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">最大面积 (㎡)</label>
            <input
              type="number"
              value={formData.maxArea}
              onChange={(e) => setFormData({ ...formData, maxArea: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-900 text-white"
              min="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">最高价格 (TOT)</label>
          <input
            type="number"
            value={formData.maxPrice}
            onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-900 text-white"
            min="0"
            placeholder="0表示无限制"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">紧急程度</label>
          <select
            value={formData.urgency}
            onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-900 text-white"
          >
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </div>

        {message && (
          <div className={`p-3 rounded ${message.includes('成功') ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {loading ? '提交中...' : '提交购买需求'}
        </button>
      </form>

      <div>
        <h3 className="text-xl font-bold mb-4">我的购买需求</h3>
        {buyRequests.length === 0 ? (
          <p className="text-gray-400">暂无购买需求</p>
        ) : (
          <div className="space-y-2">
            {buyRequests.map((req) => (
              <div key={req.id} className="p-4 border border-gray-700 rounded bg-gray-900">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{req.preferredCity} {req.preferredDistrict}</p>
                    <p className="text-sm text-gray-400">
                      面积: {req.minArea}-{req.maxArea}㎡ | 
                      价格: {req.maxPrice > 0 ? `${req.maxPrice} TOT` : '无限制'} | 
                      紧急度: {req.urgency === 'high' ? '高' : req.urgency === 'medium' ? '中' : '低'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(req.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    req.status === 'active' ? 'bg-green-900/20 text-green-400' :
                    req.status === 'fulfilled' ? 'bg-blue-900/20 text-blue-400' :
                    'bg-gray-700 text-gray-400'
                  }`}>
                    {req.status === 'active' ? '活跃' : req.status === 'fulfilled' ? '已满足' : '已取消'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RWABuyRequest;

