import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, CheckCircle, XCircle, AlertCircle, BarChart3 } from 'lucide-react';
import { getPendingAssets, approveAsset, rejectAsset, getAssetStats, generateContract } from '../utils/api';
import AssetComparisonCard from './AssetComparisonCard';
import { useAuth } from '../contexts/AuthContext';

const CommandCenter = () => {
  const { user, isAuthenticated } = useAuth();
  const [pendingAssets, setPendingAssets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [error, setError] = useState(null);

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [pendingResponse, statsResponse] = await Promise.all([
        getPendingAssets(),
        getAssetStats()
      ]);
      
      if (pendingResponse.success) {
        setPendingAssets(pendingResponse.assets || []);
        if (pendingResponse.assets && pendingResponse.assets.length > 0) {
          setSelectedAsset(pendingResponse.assets[0]);
        }
      }
      
      if (statsResponse.success) {
        setStats(statsResponse.stats);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('加载数据失败，请检查后端服务是否运行');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 批准资产（确权）
  const handleApprove = async (id) => {
    const reviewNotes = prompt('请输入审核备注（可选）：') || '已审核通过，确权完成';
    
    if (!confirm(`确认批准此资产并完成确权？\n\n批准后：\n1. 资产状态将变为 AVAILABLE（可交易）\n2. 资产将上架展示\n3. 将自动生成区块链Token（如果配置了合约）\n\n审核备注：${reviewNotes}`)) {
      return;
    }

    try {
      setProcessing(true);
      const response = await approveAsset(id, {
        reviewedBy: user?.username || user?.address || 'admin',
        reviewNotes: reviewNotes
      });

      if (response.success) {
        alert(`✅ 资产已批准并确权！\n\n资产ID: ${id}\n状态: AVAILABLE\n${response.blockchain ? `区块链: ${response.blockchain.txHash}` : ''}`);
        await loadData(); // 重新加载数据
      } else {
        alert('批准失败：' + (response.message || '未知错误'));
      }
    } catch (err) {
      console.error('Error approving asset:', err);
      alert('批准失败：' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // 拒绝资产
  const handleReject = async (id) => {
    const reason = prompt('请输入拒绝原因（必填）：');
    if (!reason || reason.trim() === '') {
      alert('拒绝原因不能为空');
      return;
    }

    if (!confirm(`确认拒绝此资产？\n\n拒绝原因：${reason}\n\n拒绝后资产状态将变为 REJECTED，不会上架展示。`)) {
      return;
    }

    try {
      setProcessing(true);
      const response = await rejectAsset(id, {
        reviewedBy: user?.username || user?.address || 'admin',
        reviewNotes: reason
      });

      if (response.success) {
        alert('❌ 资产已拒绝！');
        await loadData(); // 重新加载数据
      } else {
        alert('拒绝失败：' + (response.message || '未知错误'));
      }
    } catch (err) {
      console.error('Error rejecting asset:', err);
      alert('拒绝失败：' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // 生成合同
  const handleGenerateContract = async (id) => {
    try {
      setProcessing(true);
      await generateContract(id, true); // 下载PDF
      alert('合同已生成并下载！');
    } catch (err) {
      console.error('Error generating contract:', err);
      alert('生成合同失败：' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-600" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">总司令审核台</h1>
                <p className="text-sm text-slate-500">
                  Command Center - Asset Review & Verification System
                  {isAuthenticated && user && (
                    <span className="ml-2 text-xs text-blue-600">
                      | 审核员：{user.username || user.address?.slice(0, 8)} ({user.role})
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={loadData}
              disabled={loading || processing}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              刷新
            </button>
          </div>
        </div>
      </div>

      {/* 统计面板 */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">总资产</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">待审核</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">已批准</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">已拒绝</p>
                  <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-slate-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">已锁定</p>
                  <p className="text-2xl font-bold text-slate-600">{stats.locked}</p>
                </div>
                <Shield className="w-8 h-8 text-slate-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 主要内容区 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600">加载中...</p>
          </div>
        ) : pendingAssets.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">暂无待审核资产</h3>
            <p className="text-slate-600">所有资产已处理完毕</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：待审核列表 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow sticky top-24">
                <div className="border-b border-slate-200 px-4 py-3">
                  <h2 className="text-lg font-bold text-slate-900">待审核列表</h2>
                  <p className="text-sm text-slate-500">{pendingAssets.length} 项待处理</p>
                </div>
                <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                  {pendingAssets.map((asset) => (
                    <div
                      key={asset.sanitized?.id || asset.raw?.id}
                      onClick={() => setSelectedAsset(asset)}
                      className={`p-4 border-b border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors ${
                        selectedAsset?.sanitized?.id === asset.sanitized?.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-slate-900">
                            {asset.sanitized?.displayId || asset.sanitized?.codeName || 'N/A'}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            {asset.raw?.projectName || '未知项目'}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {asset.raw?.city} · {asset.raw?.area}m²
                          </p>
                        </div>
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                          待审核
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 右侧：选中资产详情对比 */}
            <div className="lg:col-span-2">
              {selectedAsset ? (
                <AssetComparisonCard
                  asset={selectedAsset}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onGenerateContract={handleGenerateContract}
                  isProcessing={processing}
                />
              ) : (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">请选择资产</h3>
                  <p className="text-slate-600">从左侧列表中选择一个资产进行审核</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommandCenter;
