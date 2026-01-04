import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, CheckCircle, XCircle, AlertCircle, BarChart3, FlaskConical } from 'lucide-react';
import { getPendingAssets, approveAsset, rejectAsset, getAssetStats, generateContract, getTechProjects } from '../utils/api';
import AssetComparisonCard from './AssetComparisonCard';

const CommandCenter = () => {
  const [activeTab, setActiveTab] = useState('assets'); // 'assets' 或 'techProjects'
  const [pendingAssets, setPendingAssets] = useState([]);
  const [pendingTechProjects, setPendingTechProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [error, setError] = useState(null);

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [pendingResponse, statsResponse, techProjectsResponse] = await Promise.all([
        getPendingAssets(),
        getAssetStats(),
        getTechProjects({ status: 'PENDING' })
      ]);
      
      if (pendingResponse.success) {
        setPendingAssets(pendingResponse.assets || []);
        if (pendingResponse.assets && pendingResponse.assets.length > 0 && !selectedAsset) {
          setSelectedAsset(pendingResponse.assets[0]);
        }
      }
      
      if (techProjectsResponse.success) {
        setPendingTechProjects(techProjectsResponse.projects || []);
        if (techProjectsResponse.projects && techProjectsResponse.projects.length > 0 && !selectedProject) {
          setSelectedProject(techProjectsResponse.projects[0]);
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

  // 批准资产
  const handleApprove = async (id) => {
    if (!confirm('确认批准此资产？批准后资产将上架展示。')) {
      return;
    }

    try {
      setProcessing(true);
      const response = await approveAsset(id, {
        reviewedBy: 'admin',
        reviewNotes: 'Approved by admin'
      });

      if (response.success) {
        alert('资产已批准！');
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
    const reason = prompt('请输入拒绝原因：');
    if (!reason) {
      return;
    }

    try {
      setProcessing(true);
      const response = await rejectAsset(id, {
        reviewedBy: 'admin',
        reviewNotes: reason
      });

      if (response.success) {
        alert('资产已拒绝！');
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

  // 审核科创项目
  const handleApproveTechProject = async (projectId) => {
    if (!confirm('确认批准此科技项目？批准后项目将上架展示。')) {
      return;
    }

    try {
      setProcessing(true);
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const token = localStorage.getItem('tws_token');
      
      const response = await fetch(`${API_BASE_URL}/api/admin/tech-projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ status: 'FUNDING' })
      });

      const result = await response.json();
      if (result.success) {
        alert('项目已批准！');
        await loadData();
      } else {
        alert('批准失败：' + (result.message || '未知错误'));
      }
    } catch (err) {
      console.error('Error approving tech project:', err);
      alert('批准失败：' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectTechProject = async (projectId) => {
    const reason = prompt('请输入拒绝原因：');
    if (!reason) {
      return;
    }

    try {
      setProcessing(true);
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const token = localStorage.getItem('tws_token');
      
      const response = await fetch(`${API_BASE_URL}/api/admin/tech-projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ status: 'REJECTED', reviewNotes: reason })
      });

      const result = await response.json();
      if (result.success) {
        alert('项目已拒绝！');
        await loadData();
      } else {
        alert('拒绝失败：' + (result.message || '未知错误'));
      }
    } catch (err) {
      console.error('Error rejecting tech project:', err);
      alert('拒绝失败：' + err.message);
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
                <p className="text-sm text-slate-500">Command Center - Asset Review System</p>
              </div>
            </div>
            {/* 标签页切换 */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('assets')}
                className={`px-4 py-2 rounded-lg font-mono text-sm transition-colors ${
                  activeTab === 'assets'
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                资产审核
              </button>
              <button
                onClick={() => setActiveTab('techProjects')}
                className={`px-4 py-2 rounded-lg font-mono text-sm transition-colors flex items-center gap-2 ${
                  activeTab === 'techProjects'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                <FlaskConical size={16} />
                科创项目
              </button>
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
        ) : activeTab === 'assets' ? (
          pendingAssets.length === 0 ? (
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
        )
        ) : (
          // 科创项目审核
          pendingTechProjects.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">暂无待审核科创项目</h3>
              <p className="text-slate-600">所有项目已处理完毕</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow sticky top-24">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <h2 className="text-lg font-bold text-slate-900">待审核项目</h2>
                    <p className="text-sm text-slate-500">{pendingTechProjects.length} 项待处理</p>
                  </div>
                  <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                    {pendingTechProjects.map((project) => (
                      <div
                        key={project.id}
                        onClick={() => setSelectedProject(project)}
                        className={`p-4 border-b border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors ${
                          selectedProject?.id === project.id ? 'bg-purple-50 border-l-4 border-l-purple-500' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-sm text-slate-900">{project.projectName}</p>
                            <p className="text-xs text-slate-600 mt-1">{project.codeName}</p>
                            <p className="text-xs text-slate-500 mt-1">{project.category}</p>
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
              <div className="lg:col-span-2">
                {selectedProject ? (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-2xl font-bold mb-4">{selectedProject.projectName}</h3>
                    <div className="space-y-4 mb-6">
                      <div>
                        <span className="text-sm text-slate-600">项目代号：</span>
                        <span className="font-mono">{selectedProject.codeName}</span>
                      </div>
                      <div>
                        <span className="text-sm text-slate-600">类别：</span>
                        <span>{selectedProject.category}</span>
                      </div>
                      <div>
                        <span className="text-sm text-slate-600">描述：</span>
                        <p className="text-slate-800 mt-1">{selectedProject.description}</p>
                      </div>
                      <div>
                        <span className="text-sm text-slate-600">目标金额：</span>
                        <span className="font-mono text-cyan-600">{selectedProject.targetAmount.toLocaleString()} TaiOneToken</span>
                      </div>
                      <div>
                        <span className="text-sm text-slate-600">最小投资：</span>
                        <span className="font-mono">{selectedProject.minInvestment.toLocaleString()} TaiOneToken</span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApproveTechProject(selectedProject.id)}
                        disabled={processing}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white px-4 py-2 rounded-lg font-mono"
                      >
                        <CheckCircle size={18} className="inline mr-2" />
                        批准
                      </button>
                      <button
                        onClick={() => handleRejectTechProject(selectedProject.id)}
                        disabled={processing}
                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white px-4 py-2 rounded-lg font-mono"
                      >
                        <XCircle size={18} className="inline mr-2" />
                        拒绝
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow p-12 text-center">
                    <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">请选择项目</h3>
                    <p className="text-slate-600">从左侧列表中选择一个项目进行审核</p>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default CommandCenter;
