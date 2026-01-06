import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Activity, Clock, Radio, Users } from 'lucide-react';
import { getMapData } from '../utils/api';

const MapNodeDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [mapData, setMapData] = useState(null);
  const [nodeInfo, setNodeInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await getMapData();
        if (response.success && response.data) {
          setMapData(response.data);
          
          // 从日志中查找节点信息
          if (response.data.taiwan?.logs) {
            const node = response.data.taiwan.logs.find(log => 
              log.nodeId === id || log.id === id || log.message?.includes(id)
            );
            if (node) {
              setNodeInfo({
                id: node.nodeId || node.id,
                message: node.message,
                timestamp: node.timestamp,
                city: node.city,
                location: node.location,
                status: node.status || 'active',
                connectionType: node.connectionType || 'direct'
              });
            } else {
              // 如果没有找到，使用第一个日志作为示例
              const firstLog = response.data.taiwan.logs[0];
              if (firstLog) {
                setNodeInfo({
                  id: id || firstLog.nodeId || firstLog.id,
                  message: firstLog.message,
                  timestamp: firstLog.timestamp,
                  city: firstLog.city || 'Unknown',
                  location: firstLog.location || { lat: 25.033, lng: 121.5654 },
                  status: 'active',
                  connectionType: 'direct'
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
        <div className="text-slate-500 font-mono">Loading node data...</div>
      </div>
    );
  }

  if (!nodeInfo && !mapData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-red-500 font-mono">Node not found</div>
      </div>
    );
  }

  const nodeLogs = mapData?.taiwan?.logs || [];
  const nodeCount = mapData?.taiwan?.nodeCount || 0;

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
          <h1 className="text-2xl font-bold font-mono tracking-wider">NODE DETAIL</h1>
          <div className="w-24" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {nodeInfo ? (
          <>
            {/* Node Info Card */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold font-mono mb-2">{nodeInfo.id}</h2>
                  <p className="text-slate-400 font-mono text-sm">{nodeInfo.message}</p>
                </div>
                <div className={`px-3 py-1 rounded text-xs font-mono ${
                  nodeInfo.status === 'active' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                }`}>
                  {nodeInfo.status.toUpperCase()}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="flex items-center gap-3">
                  <MapPin className="text-cyan-400" size={20} />
                  <div>
                    <div className="text-slate-500 text-xs font-mono uppercase">位置</div>
                    <div className="text-white font-mono">{nodeInfo.city || 'Unknown'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Radio className="text-green-400" size={20} />
                  <div>
                    <div className="text-slate-500 text-xs font-mono uppercase">连接类型</div>
                    <div className="text-white font-mono">{nodeInfo.connectionType || 'direct'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="text-yellow-400" size={20} />
                  <div>
                    <div className="text-slate-500 text-xs font-mono uppercase">连接时间</div>
                    <div className="text-white font-mono text-sm">
                      {nodeInfo.timestamp ? new Date(nodeInfo.timestamp).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {nodeInfo.location && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <div className="text-slate-500 text-xs font-mono uppercase mb-2">坐标</div>
                  <div className="text-white font-mono text-sm">
                    Lat: {nodeInfo.location.lat?.toFixed(4)}, Lng: {nodeInfo.location.lng?.toFixed(4)}
                  </div>
                </div>
              )}
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="text-cyan-400" size={24} />
                  <div>
                    <div className="text-slate-500 text-xs font-mono uppercase">总节点数</div>
                    <div className="text-3xl font-bold text-white font-mono">{nodeCount.toLocaleString()}</div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Activity className="text-green-400" size={24} />
                  <div>
                    <div className="text-slate-500 text-xs font-mono uppercase">活跃连接</div>
                    <div className="text-3xl font-bold text-white font-mono">{nodeLogs.length}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Connection History */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4 font-mono flex items-center gap-2">
                <Activity size={20} />
                连接历史
              </h3>
              <div className="space-y-2">
                {nodeLogs.length > 0 ? (
                  nodeLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded border ${
                        log.id === nodeInfo.id
                          ? 'bg-cyan-900/30 border-cyan-500'
                          : 'bg-slate-800/30 border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-white font-mono text-sm">{log.message}</div>
                          {log.timestamp && (
                            <div className="text-slate-500 text-xs font-mono mt-1">
                              {new Date(log.timestamp).toLocaleString()}
                            </div>
                          )}
                        </div>
                        {log.nodeId && (
                          <div className="text-cyan-400 text-xs font-mono">{log.nodeId}</div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 text-sm">暂无连接历史</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 text-center">
            <div className="text-slate-500 font-mono">节点信息未找到</div>
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

export default MapNodeDetailPage;

