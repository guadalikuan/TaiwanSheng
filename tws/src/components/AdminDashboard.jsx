import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Building2, Wheat, FlaskConical, Wine, Palette, TrendingUp, Users, FileText, ArrowLeft } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('assets');
  const [assets, setAssets] = useState([]);
  const [techProjects, setTechProjects] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [userActions, setUserActions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeSection]);

  const loadData = async () => {
    setLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const token = localStorage.getItem('tws_token');

      if (activeSection === 'assets') {
        const res = await fetch(`${API_BASE_URL}/api/admin/assets`, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        const data = await res.json();
        if (data.success) setAssets(data.assets || []);
      } else if (activeSection === 'techProjects') {
        const res = await fetch(`${API_BASE_URL}/api/admin/tech-projects`, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        const data = await res.json();
        if (data.success) setTechProjects(data.projects || []);
      } else if (activeSection === 'investments') {
        const res = await fetch(`${API_BASE_URL}/api/admin/investments`, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        const data = await res.json();
        if (data.success) setInvestments(data.investments || []);
      } else if (activeSection === 'userActions') {
        const res = await fetch(`${API_BASE_URL}/api/admin/user-actions`, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        const data = await res.json();
        if (data.success) setUserActions(data.actions || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white"
        >
          <ArrowLeft size={20} />
          返回
        </button>

        <h1 className="text-4xl font-black mb-8 flex items-center gap-3">
          <Settings className="text-purple-400" />
          后台数据管理
        </h1>

        {/* 导航标签 */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
          {[
            { id: 'assets', label: '资产管理', icon: Building2 },
            { id: 'techProjects', label: '科创项目', icon: FlaskConical },
            { id: 'investments', label: '投资记录', icon: TrendingUp },
            { id: 'userActions', label: '用户行为', icon: Users }
          ].map(section => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-mono text-sm transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Icon size={18} />
                {section.label}
              </button>
            );
          })}
        </div>

        {/* 内容区域 */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
          {loading ? (
            <div className="text-center text-slate-400 font-mono">載入中...</div>
          ) : activeSection === 'assets' ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">资产列表</h2>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                  批量导入
                </button>
              </div>
              <div className="space-y-2">
                {assets.slice(0, 20).map(asset => (
                  <div key={asset.id} className="bg-slate-800/50 p-4 rounded flex justify-between items-center">
                    <div>
                      <span className="font-mono text-sm">{asset.codeName || asset.id}</span>
                      <span className="ml-4 text-slate-400 text-sm">{asset.assetType || '房产'}</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      asset.status === 'AVAILABLE' ? 'bg-green-900/50 text-green-400' :
                      asset.status === 'MINTING' ? 'bg-yellow-900/50 text-yellow-400' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {asset.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : activeSection === 'techProjects' ? (
            <div>
              <h2 className="text-2xl font-bold mb-4">科创项目列表</h2>
              <div className="space-y-2">
                {techProjects.map(project => (
                  <div key={project.id} className="bg-slate-800/50 p-4 rounded flex justify-between items-center">
                    <div>
                      <span className="font-bold">{project.projectName}</span>
                      <span className="ml-4 text-slate-400 text-sm font-mono">{project.codeName}</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      project.status === 'FUNDING' ? 'bg-green-900/50 text-green-400' :
                      project.status === 'PENDING' ? 'bg-yellow-900/50 text-yellow-400' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : activeSection === 'investments' ? (
            <div>
              <h2 className="text-2xl font-bold mb-4">投资记录</h2>
              <div className="space-y-2">
                {investments.slice(0, 20).map(inv => (
                  <div key={inv.id} className="bg-slate-800/50 p-4 rounded">
                    <div className="flex justify-between">
                      <span className="font-mono text-sm">{inv.investorAddress?.slice(0, 10)}...</span>
                      <span className="text-cyan-400 font-mono">{inv.amount.toLocaleString()} TWSCoin</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(inv.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold mb-4">用户行为日志</h2>
              <div className="space-y-2">
                {userActions.slice(0, 20).map(action => (
                  <div key={action.id} className="bg-slate-800/50 p-4 rounded">
                    <div className="flex justify-between">
                      <span className="font-mono text-sm">{action.walletAddress?.slice(0, 10)}...</span>
                      <span className="text-purple-400 text-sm">{action.actionType}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(action.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

