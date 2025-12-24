import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, DollarSign, TrendingUp, Lock, Unlock, FileText, Calendar } from 'lucide-react';
import { getAssetById } from '../utils/api';

const AssetDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const response = await getAssetById(id);
        if (response.success && response.data) {
          setAsset(response.data);
        } else {
          setError(response.message || '无法加载资产数据');
        }
      } catch (error) {
        console.error('Failed to load asset data:', error);
        setError('网络错误，请检查服务器连接');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-500 font-mono">Loading asset data...</div>
      </div>
    );
  }

  if (!asset && !loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="text-red-500 font-mono text-lg mb-4">
          {error || 'Asset not found'}
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded font-mono text-sm"
        >
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-mono text-sm">返回首页</span>
          </button>
          <h1 className="text-2xl font-bold font-mono tracking-wider">ASSET DETAIL</h1>
          <div className="w-24" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Asset Header */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold font-mono">{asset.title}</h2>
                <span className={`px-3 py-1 rounded text-xs font-mono ${
                  asset.status === 'AVAILABLE'
                    ? 'bg-green-900/50 text-green-400'
                    : asset.status === 'RESERVED'
                    ? 'bg-yellow-900/50 text-yellow-400'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {asset.status}
                </span>
              </div>
              <p className="text-slate-400 font-mono text-sm">ID: TWS-{asset.id}</p>
            </div>
            {asset.status === 'LOCKED' ? (
              <Lock className="text-slate-500" size={24} />
            ) : (
              <Unlock className="text-green-400" size={24} />
            )}
          </div>
        </div>

        {/* Asset Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="text-cyan-400" size={24} />
              <div>
                <div className="text-slate-500 text-xs font-mono uppercase">城市</div>
                <div className="text-xl font-bold text-white font-mono">{asset.city}</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="text-yellow-400" size={24} />
              <div>
                <div className="text-slate-500 text-xs font-mono uppercase">类型</div>
                <div className="text-xl font-bold text-white font-mono">{asset.type}</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="text-green-400" size={24} />
              <div>
                <div className="text-slate-500 text-xs font-mono uppercase">入场价格</div>
                <div className="text-xl font-bold text-cyan-400 font-mono">{asset.price}</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="text-gold" size={24} />
              <div>
                <div className="text-slate-500 text-xs font-mono uppercase">预期收益率</div>
                <div className="text-xl font-bold text-gold font-mono">{asset.yield}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Level */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold mb-4 font-mono">风险等级</h3>
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded font-mono ${
              asset.risk === 'LOW'
                ? 'bg-green-900/50 text-green-400'
                : asset.risk === 'MED'
                ? 'bg-yellow-900/50 text-yellow-400'
                : 'bg-red-900/50 text-red-400'
            }`}>
              {asset.risk}
            </div>
            <div className="text-slate-400 text-sm font-mono">
              {asset.risk === 'LOW' && '低风险 - 稳定收益'}
              {asset.risk === 'MED' && '中等风险 - 平衡收益'}
              {asset.risk === 'HIGH' && '高风险 - 高收益'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          {asset.status !== 'LOCKED' && (
            <button
              onClick={() => navigate('/loadout')}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded font-mono text-sm transition-colors"
            >
              查看我的资产
            </button>
          )}
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded font-mono text-sm transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssetDetailPage;

