import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, RefreshCw, CheckCircle, XCircle, AlertCircle, BarChart3, Package, FileText, LogOut } from 'lucide-react';
import { getPendingAssets, approveAsset, rejectAsset, getAssetStats, getMyAssets } from '../utils/api';
import AssetComparisonCard from './AssetComparisonCard';
import { useAuth } from '../contexts/AuthContext';

const CommandCenter = ({ hideHeader = false }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [pendingAssets, setPendingAssets] = useState([]);
  const [allAssets, setAllAssets] = useState([]); // 所有资产（用于筛选）
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null); // null=待审核, 'ALL'=全部, 'MINTING'=待审核, 'AVAILABLE'=已批准, 'REJECTED'=已拒绝, 'LOCKED'=已锁定
  
  // 判断是否为开发商（仅查看模式，无审核权限）
  const isDeveloper = user?.role === 'DEVELOPER';
  // 判断是否有审核权限（管理员和审核员）
  const canReview = user?.role === 'ADMIN' || user?.role === 'REVIEWER';

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (isDeveloper) {
        // 开发商：加载所有资产（表格格式）
        try {
          const response = await getMyAssets();
          if (response && response.success) {
            setPendingAssets(response.assets || []);
          } else {
            const errorMsg = response?.message || response?.error || '加载资产列表失败';
            console.error('getMyAssets error:', response);
            setError(errorMsg);
          }
        } catch (err) {
          console.error('getMyAssets exception:', err);
          setError(err.message || '加载资产列表失败：' + (err.toString() || '未知错误'));
        }
      } else {
        // 管理员/审核员：加载所有资产和统计信息
        const promises = [getMyAssets(), getAssetStats()];
        
        const responses = await Promise.all(promises);
        const assetsResponse = responses[0];
        const statsResponse = responses[1];
        
        if (assetsResponse && assetsResponse.success) {
          const assets = assetsResponse.assets || [];
          setAllAssets(assets); // 保存所有资产
          
          // 根据当前筛选器显示资产
          let filteredAssets = assets;
          if (statusFilter === null || statusFilter === 'MINTING' || statusFilter === 'PENDING') {
            // 默认显示待审核资产
            filteredAssets = assets.filter(asset => {
              const status = asset.sanitized?.status || asset.raw?.status || 'UNKNOWN';
              return status === 'MINTING';
            });
          } else if (statusFilter !== 'ALL') {
            filteredAssets = assets.filter(asset => {
              const status = asset.sanitized?.status || asset.raw?.status || 'UNKNOWN';
              return status === statusFilter;
            });
          }
          
          setPendingAssets(filteredAssets);
          if (filteredAssets.length > 0) {
            setSelectedAsset(filteredAssets[0]);
          }
        } else if (assetsResponse && !assetsResponse.success) {
          setError(assetsResponse.message || '加载资产失败');
        }
        
        if (statsResponse && statsResponse.success) {
          setStats(statsResponse.stats);
        } else if (statsResponse && !statsResponse.success) {
          console.warn('加载统计数据失败:', statsResponse?.message);
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      // 提供更详细的错误信息
      let errorMessage = '加载数据失败';
      if (err.message) {
        errorMessage += ': ' + err.message;
      } else if (err.toString && err.toString() !== '[object Object]') {
        errorMessage += ': ' + err.toString();
      }
      
      // 检查是否是网络错误
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        errorMessage = '无法连接到后端服务器，请检查：\n1. 后端服务是否正在运行 (npm run dev:backend)\n2. 后端服务地址是否正确 (http://localhost:3001)';
      } else if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        errorMessage = '认证失败，请重新登录';
      } else if (err.message?.includes('403') || err.message?.includes('Forbidden')) {
        errorMessage = '权限不足，无法访问此资源';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []); // 只在组件加载时加载数据

  // 处理状态筛选
  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    
    // 如果 allAssets 还没有加载，先加载数据
    if (allAssets.length === 0 && !isDeveloper) {
      loadData().then(() => {
        // 加载完成后应用筛选（使用 setTimeout 确保状态已更新）
        setTimeout(() => handleStatusFilter(status), 100);
      });
      return;
    }
    
    // 根据筛选器过滤资产
    let filtered = [];
    if (status === null || status === 'MINTING' || status === 'PENDING') {
      // 待审核：筛选 MINTING 状态的资产
      filtered = allAssets.filter(asset => {
        const assetStatus = asset.sanitized?.status || asset.raw?.status || 'UNKNOWN';
        return assetStatus === 'MINTING';
      });
    } else if (status === 'ALL') {
      // 全部：显示所有资产
      filtered = allAssets;
    } else {
      // 其他状态：筛选对应状态的资产
      filtered = allAssets.filter(asset => {
        const assetStatus = asset.sanitized?.status || asset.raw?.status || 'UNKNOWN';
        return assetStatus === status;
      });
    }
    
    setPendingAssets(filtered);
    setSelectedAsset(filtered.length > 0 ? filtered[0] : null);
  };

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

  // 铸造 NFT
  const handleMintNFT = async (id) => {
    if (!confirm(`确认铸造 TWS Land NFT？\n\n铸造后：\n1. 资产将进入资产池\n2. 将在区块链上生成 NFT Token\n3. NFT 可用于交易和转让\n\n注意：此操作不可逆`)) {
      return;
    }

    try {
      setProcessing(true);
      const token = localStorage.getItem('tws_token');
      const response = await fetch(`${process.env.VITE_API_URL || 'http://localhost:3001'}/api/arsenal/mint-nft/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      const result = await response.json();
      
      if (result.success) {
        let message = '✅ NFT 铸造成功！\n\n';
        message += `资产ID: ${id}\n`;
        if (result.nft?.tokenId) {
          message += `NFT Token ID: ${result.nft.tokenId}\n`;
          message += `交易哈希: ${result.nft.txHash}\n`;
          message += `接收地址: ${result.nft.toAddress}\n`;
          message += `区块号: ${result.nft.blockNumber}\n`;
        } else {
          message += `状态: ${result.nft?.message || '已进入资产池'}\n`;
        }
        alert(message);
        await loadData(); // 重新加载数据
      } else {
        alert('NFT 铸造失败：' + (result.message || '未知错误'));
      }
    } catch (err) {
      console.error('Error minting NFT:', err);
      alert('NFT 铸造失败：' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className={hideHeader ? '' : 'min-h-screen bg-slate-100'}>
      {/* 顶部导航栏 - 仅在未隐藏时显示 */}
      {!hideHeader && (
        <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-red-600" />
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {isDeveloper ? '所有资产列表' : '总司令审核台'}
                  </h1>
                  <p className="text-sm text-slate-500">
                    {isDeveloper 
                      ? '查看您提交的所有资产信息' 
                      : 'Command Center - Asset Review & Verification System'
                    }
                    {isAuthenticated && user && (
                      <span className="ml-2 text-xs text-blue-600">
                        | {isDeveloper ? '开发商' : '审核员'}：{user.username || user.address?.slice(0, 8)} ({user.role})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={loadData}
                  disabled={loading || processing}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                  刷新
                </button>
                <button
                  onClick={() => {
                    if (confirm('确定要退出登录吗？')) {
                      logout();
                      navigate('/login');
                    }
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                  title="退出登录"
                >
                  <LogOut size={18} />
                  <span className="hidden sm:inline">退出</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 统计面板 */}
      {stats && !isDeveloper && !hideHeader && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <button
              onClick={() => handleStatusFilter('ALL')}
              className={`bg-white rounded-lg shadow p-4 border-l-4 border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer text-left ${
                statusFilter === 'ALL' ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">总资产</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-500" />
              </div>
            </button>
            <button
              onClick={() => handleStatusFilter('MINTING')}
              className={`bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500 hover:bg-yellow-50 transition-colors cursor-pointer text-left ${
                statusFilter === null || statusFilter === 'MINTING' ? 'ring-2 ring-yellow-500' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">待审核</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-500" />
              </div>
            </button>
            <button
              onClick={() => handleStatusFilter('AVAILABLE')}
              className={`bg-white rounded-lg shadow p-4 border-l-4 border-green-500 hover:bg-green-50 transition-colors cursor-pointer text-left ${
                statusFilter === 'AVAILABLE' ? 'ring-2 ring-green-500' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">已批准</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </button>
            <button
              onClick={() => handleStatusFilter('REJECTED')}
              className={`bg-white rounded-lg shadow p-4 border-l-4 border-red-500 hover:bg-red-50 transition-colors cursor-pointer text-left ${
                statusFilter === 'REJECTED' ? 'ring-2 ring-red-500' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">已拒绝</p>
                  <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </button>
            <button
              onClick={() => handleStatusFilter('LOCKED')}
              className={`bg-white rounded-lg shadow p-4 border-l-4 border-slate-500 hover:bg-slate-50 transition-colors cursor-pointer text-left ${
                statusFilter === 'LOCKED' ? 'ring-2 ring-slate-500' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">已锁定</p>
                  <p className="text-2xl font-bold text-slate-600">{stats.locked}</p>
                </div>
                <Shield className="w-8 h-8 text-slate-500" />
              </div>
            </button>
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
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {isDeveloper ? '暂无资产' : '暂无待审核资产'}
            </h3>
            <p className="text-slate-600">
              {isDeveloper 
                ? '您提交的所有资产已处理完毕' 
                : '所有资产已处理完毕'
              }
            </p>
          </div>
        ) : isDeveloper ? (
          // 开发商：表格格式显示所有资产
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">资产列表</h2>
                <p className="text-sm text-slate-500 mt-1">共 {pendingAssets.length} 项资产</p>
              </div>
              <button
                onClick={() => navigate('/arsenal')}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <Package size={16} />
                资产入库
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">项目名称</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">楼号/房号</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">面积 (m²)</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">市场备案价 (元)</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">双方结算底价 (元)/分成比例</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">备注 (抵押/在建，是否需脱敏)</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">状态</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {pendingAssets.map((asset) => {
                    const raw = asset.raw;
                    const sanitized = asset.sanitized;
                    const status = sanitized?.status || raw?.status || 'UNKNOWN';
                    const statusColors = {
                      'MINTING': 'bg-yellow-100 text-yellow-800',
                      'AVAILABLE': 'bg-green-100 text-green-800',
                      'RESERVED': 'bg-blue-100 text-blue-800',
                      'LOCKED': 'bg-red-100 text-red-800',
                      'REJECTED': 'bg-gray-100 text-gray-800',
                    };
                    const statusLabels = {
                      'MINTING': '审核中',
                      'AVAILABLE': '已上架',
                      'RESERVED': '已预订',
                      'LOCKED': '已锁定',
                      'REJECTED': '已拒绝',
                    };
                    return (
                      <tr key={raw?.id || sanitized?.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-900">{raw?.projectName || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{raw?.roomNumber || raw?.address || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{raw?.area || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {raw?.marketValuation ? `¥${(raw.marketValuation * 10000).toLocaleString('zh-CN')}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {raw?.debtAmount ? `¥${(raw.debtAmount * 10000).toLocaleString('zh-CN')}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {raw?.proofDocs?.length > 0 ? '已上传证明文件' : '-'}
                          {sanitized ? ' | 需脱敏' : ''}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 ${statusColors[status] || 'bg-gray-100 text-gray-800'} text-xs font-semibold rounded`}>
                            {statusLabels[status] || status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：待审核列表 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow sticky top-24">
                <div className="border-b border-slate-200 px-4 py-3">
                  <h2 className="text-lg font-bold text-slate-900">
                    {statusFilter === 'ALL' ? '所有资产' :
                     statusFilter === 'AVAILABLE' ? '已批准资产' :
                     statusFilter === 'REJECTED' ? '已拒绝资产' :
                     statusFilter === 'LOCKED' ? '已锁定资产' :
                     '待审核列表'}
                  </h2>
                  <p className="text-sm text-slate-500">{pendingAssets.length} 项</p>
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
                  onApprove={canReview ? handleApprove : null}
                  onReject={canReview ? handleReject : null}
                  onMintNFT={canReview ? handleMintNFT : null}
                  isProcessing={processing}
                  canReview={canReview}
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
