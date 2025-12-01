import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Package, Calendar, CheckCircle } from 'lucide-react';
import { getMapData } from '../utils/api';

const MapAssetDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [mapData, setMapData] = useState(null);
  const [assetInfo, setAssetInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await getMapData();
        if (response.success && response.data) {
          setMapData(response.data);
          
          // 从资产日志中查找资产信息
          if (response.data.mainland?.logs) {
            const asset = response.data.mainland.logs.find(log => 
              log.assetId === id || log.id === id || log.lot === id
            );
            if (asset) {
              setAssetInfo({
                id: asset.assetId || asset.id,
                lot: asset.lot,
                location: asset.location,
                timestamp: asset.timestamp,
                nodeName: asset.nodeName,
                nodeLocation: asset.nodeLocation,
                value: asset.value,
                status: asset.status || 'confirmed'
              });
            } else {
              // 如果没有找到，使用第一个日志作为示例
              const firstLog = response.data.mainland.logs[0];
              if (firstLog) {
                setAssetInfo({
                  id: id || firstLog.assetId || firstLog.id,
                  lot: firstLog.lot,
                  location: firstLog.location,
                  timestamp: firstLog.timestamp,
                  nodeName: firstLog.nodeName || 'Unknown',
                  nodeLocation: firstLog.nodeLocation || { lat: 34.3416, lng: 108.9398 },
                  value: firstLog.value || 0,
                  status: 'confirmed'
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to load map data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // 定期更新数据
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-500 font-mono">Loading asset data...</div>
      </div>
    );
  }

  if (!assetInfo && !mapData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-red-500 font-mono">Asset not found</div>
      </div>
    );
  }

  const assetLogs = mapData?.mainland?.logs || [];
  const assetPoolValue = mapData?.mainland?.assetPoolValue || 0;
  const unitCount = mapData?.mainland?.unitCount || 0;

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
          <h1 className="text-2xl font-bold font-mono tracking-wider">MAP ASSET DETAIL</h1>
          <div className="w-24" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {assetInfo ? (
          <>
            {/* Asset Info Card */}
            <div className="bg-slate-900/50 border border-yellow-800 rounded-lg p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold font-mono mb-2">Lot-{assetInfo.lot}</h2>
                  <p className="text-yellow-400 font-mono text-sm">{assetInfo.nodeName}</p>
                </div>
                <div className={`px-3 py-1 rounded text-xs font-mono flex items-center gap-2 ${
                  assetInfo.status === 'confirmed' ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'
                }`}>
                  <CheckCircle size={12} />
                  {assetInfo.status.toUpperCase()}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="flex items-center gap-3">
                  <MapPin className="text-cyan-400" size={20} />
                  <div>
                    <div className="text-slate-500 text-xs font-mono uppercase">位置</div>
                    <div className="text-white font-mono">{assetInfo.location}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Package className="text-yellow-400" size={20} />
                  <div>
                    <div className="text-slate-500 text-xs font-mono uppercase">资产价值</div>
                    <div className="text-white font-mono">¥ {(assetInfo.value || 0).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="text-green-400" size={20} />
                  <div>
                    <div className="text-slate-500 text-xs font-mono uppercase">确认时间</div>
                    <div className="text-white font-mono text-sm">
                      {assetInfo.timestamp ? new Date(assetInfo.timestamp).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {assetInfo.nodeLocation && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <div className="text-slate-500 text-xs font-mono uppercase mb-2">节点坐标</div>
                  <div className="text-white font-mono text-sm">
                    Lat: {assetInfo.nodeLocation.lat?.toFixed(4)}, Lng: {assetInfo.nodeLocation.lng?.toFixed(4)}
                  </div>
                </div>
              )}
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Package className="text-yellow-400" size={24} />
                  <div>
                    <div className="text-slate-500 text-xs font-mono uppercase">资产池总价值</div>
                    <div className="text-3xl font-bold text-yellow-400 font-mono">
                      ¥ {(assetPoolValue / 100000000).toFixed(3)} B
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="text-green-400" size={24} />
                  <div>
                    <div className="text-slate-500 text-xs font-mono uppercase">已确认单位</div>
                    <div className="text-3xl font-bold text-white font-mono">{unitCount.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Asset Confirmation History */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4 font-mono flex items-center gap-2">
                <CheckCircle size={20} />
                资产确认历史
              </h3>
              <div className="space-y-2">
                {assetLogs.length > 0 ? (
                  assetLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded border ${
                        log.id === assetInfo.id
                          ? 'bg-yellow-900/30 border-yellow-500'
                          : 'bg-slate-800/30 border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-white font-mono text-sm">
                            <span className="text-yellow-500">Lot-{log.lot}</span> - {log.location}
                          </div>
                          {log.timestamp && (
                            <div className="text-slate-500 text-xs font-mono mt-1">
                              {new Date(log.timestamp).toLocaleString()}
                            </div>
                          )}
                        </div>
                        {log.assetId && (
                          <div className="text-yellow-400 text-xs font-mono">{log.assetId}</div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 text-sm">暂无确认历史</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 text-center">
            <div className="text-slate-500 font-mono">资产信息未找到</div>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded font-mono text-sm"
            >
              返回首页
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapAssetDetailPage;

