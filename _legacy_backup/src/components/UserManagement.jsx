import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Loader, 
  AlertCircle, 
  CheckCircle, 
  Copy,
  Eye,
  EyeOff,
  Search,
  RefreshCw
} from 'lucide-react';
import { 
  getDevelopers, 
  createDeveloper, 
  updateDeveloper, 
  deleteDeveloper 
} from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { generateMnemonic } from '../utils/web3';
import { formatAddress } from '../utils/web3';

const UserManagement = ({ hideHeader = false }) => {
  const { user } = useAuth();
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMnemonic, setShowMnemonic] = useState({});
  const [newAccountMnemonic, setNewAccountMnemonic] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    mnemonic: ''
  });

  // 加载开发商账户列表
  const loadDevelopers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getDevelopers();
      if (response.success) {
        setDevelopers(response.users || []);
      } else {
        setError(response.message || '加载失败');
      }
    } catch (err) {
      setError('加载失败：' + (err.message || '网络错误'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevelopers();
  }, []);

  // 处理表单输入
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 自动生成助记符
  const handleGenerateMnemonic = () => {
    const newMnemonic = generateMnemonic();
    setFormData(prev => ({ ...prev, mnemonic: newMnemonic }));
  };

  // 复制助记符
  const handleCopyMnemonic = async (mnemonic) => {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setSuccess('助记符已复制到剪贴板');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('复制失败');
    }
  };

  // 创建账户
  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    
    // 验证
    if (!formData.username || !formData.password) {
      setError('请填写用户名和密码');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(formData.password)) {
      setError('密码必须至少8个字符，包含字母和数字');
      return;
    }

    try {
      const response = await createDeveloper(
        formData.username,
        formData.password,
        formData.mnemonic || null
      );

      if (response.success) {
        setSuccess('账户创建成功');
        setNewAccountMnemonic(response.mnemonic || '');
        // 重置表单
        setFormData({
          username: '',
          password: '',
          confirmPassword: '',
          mnemonic: ''
        });
        // 刷新列表
        await loadDevelopers();
        // 延迟关闭模态框，让用户看到助记符
        setTimeout(() => {
          setShowCreateModal(false);
          setNewAccountMnemonic('');
        }, 5000);
      } else {
        setError(response.message || '创建失败');
      }
    } catch (err) {
      setError('创建失败：' + (err.message || '网络错误'));
    }
  };

  // 编辑账户
  const handleEdit = (developer) => {
    setEditingUser(developer);
    setFormData({
      username: developer.username,
      password: '',
      confirmPassword: '',
      mnemonic: ''
    });
    setShowEditModal(true);
  };

  // 更新账户
  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (formData.password && !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(formData.password)) {
      setError('密码必须至少8个字符，包含字母和数字');
      return;
    }

    try {
      const updates = {};
      if (formData.username) updates.username = formData.username;
      if (formData.password) updates.password = formData.password;

      const response = await updateDeveloper(editingUser.address, updates);

      if (response.success) {
        setSuccess('账户更新成功');
        setShowEditModal(false);
        setEditingUser(null);
        setFormData({
          username: '',
          password: '',
          confirmPassword: '',
          mnemonic: ''
        });
        await loadDevelopers();
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(response.message || '更新失败');
      }
    } catch (err) {
      setError('更新失败：' + (err.message || '网络错误'));
    }
  };

  // 删除账户
  const handleDelete = async (address) => {
    if (!window.confirm('确定要删除这个账户吗？此操作不可恢复。')) {
      return;
    }

    setError('');
    try {
      const response = await deleteDeveloper(address);
      if (response.success) {
        setSuccess('账户已删除');
        await loadDevelopers();
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(response.message || '删除失败');
      }
    } catch (err) {
      setError('删除失败：' + (err.message || '网络错误'));
    }
  };

  // 过滤开发商账户
  const filteredDevelopers = developers.filter(dev => 
    dev.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dev.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className={`${hideHeader ? '' : 'min-h-screen bg-slate-950 text-slate-200 font-mono py-20'} px-4`}>
        <div className="max-w-7xl mx-auto">
        {/* Header - 仅在未隐藏时显示 */}
        {!hideHeader && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                  <Users className="w-8 h-8 text-cyan-400" />
                  房地产开发商账户管理
                </h1>
                <p className="text-slate-400 text-sm">
                  管理员专用 - 创建和管理房地产开发商账户
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={loadDevelopers}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <RefreshCw size={18} />
                  刷新
                </button>
                <button
                  onClick={() => {
                    setFormData({
                      username: '',
                      password: '',
                      confirmPassword: '',
                      mnemonic: ''
                    });
                    setShowCreateModal(true);
                    setError('');
                    setSuccess('');
                  }}
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus size={18} />
                  创建账户
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* 简化版头部（当隐藏完整头部时显示） */}
        {hideHeader && (
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">账户管理</h2>
              <p className="text-sm text-slate-500">创建和管理房地产开发商账户</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadDevelopers}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2 transition-colors text-sm"
              >
                <RefreshCw size={16} />
                刷新
              </button>
              <button
                onClick={() => {
                  setFormData({
                    username: '',
                    password: '',
                    confirmPassword: '',
                    mnemonic: ''
                  });
                  setShowCreateModal(true);
                  setError('');
                  setSuccess('');
                }}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center gap-2 transition-colors text-sm"
              >
                <Plus size={16} />
                创建账户
              </button>
            </div>
          </div>
        )}

        {/* 消息提示 */}
        {error && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${hideHeader ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-red-900/20 border border-red-900/50 text-red-400'}`}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}
        {success && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${hideHeader ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-green-900/20 border border-green-900/50 text-green-400'}`}>
            <CheckCircle size={18} />
            {success}
          </div>
        )}

        {/* 搜索框 */}
        <div className="relative mb-4">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${hideHeader ? 'text-slate-400' : 'text-slate-400'}`} size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索用户名或钱包地址..."
            className={`w-full pl-10 pr-4 py-2 border rounded-lg placeholder-slate-500 focus:outline-none focus:border-cyan-500 ${
              hideHeader 
                ? 'bg-white border-slate-300 text-slate-900' 
                : 'bg-slate-900 border-slate-700 text-white'
            }`}
          />
        </div>

        {/* 账户列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
            {filteredDevelopers.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                {searchTerm ? '没有找到匹配的账户' : '暂无房地产开发商账户'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800 border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">用户名</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">钱包地址</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">角色</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">创建时间</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">最后登录</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredDevelopers.map((developer) => (
                      <tr key={developer.address} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{developer.username}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-mono text-cyan-400">{formatAddress(developer.address)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-900/30 text-blue-400 rounded">
                            房地产开发商
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                          {developer.createdAt ? new Date(developer.createdAt).toLocaleString('zh-CN') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                          {developer.lastLogin ? new Date(developer.lastLogin).toLocaleString('zh-CN') : '从未登录'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(developer)}
                              className="text-cyan-400 hover:text-cyan-300 transition-colors"
                              title="编辑"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(developer.address)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              title="删除"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* 创建账户模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Plus size={24} />
              创建房地产开发商账户
            </h2>

            {newAccountMnemonic ? (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-900/20 border border-yellow-800/50 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-400 mb-2">
                    <AlertCircle size={18} />
                    <span className="font-bold">重要：请保存助记符</span>
                  </div>
                  <p className="text-sm text-slate-300 mb-3">
                    这是账户的唯一助记符，丢失后无法恢复。请妥善保存。
                  </p>
                  <div className="bg-black border border-cyan-500/50 rounded p-3 font-mono text-sm text-cyan-400 mb-2">
                    {newAccountMnemonic}
                  </div>
                  <button
                    onClick={() => handleCopyMnemonic(newAccountMnemonic)}
                    className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded flex items-center justify-center gap-2"
                  >
                    <Copy size={16} />
                    复制助记符
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewAccountMnemonic('');
                  }}
                  className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded"
                >
                  关闭
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    用户名
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    placeholder="3-20个字符"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    密码
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    placeholder="至少8个字符，包含字母和数字"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    确认密码
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-slate-300">
                      助记符（可选）
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateMnemonic}
                      className="text-xs text-cyan-400 hover:text-cyan-300"
                    >
                      自动生成
                    </button>
                  </div>
                  <textarea
                    name="mnemonic"
                    value={formData.mnemonic}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                    placeholder="留空则自动生成新的助记符"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({
                        username: '',
                        password: '',
                        confirmPassword: '',
                        mnemonic: ''
                      });
                    }}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded"
                  >
                    创建
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 编辑账户模态框 */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Edit size={24} />
              编辑账户
            </h2>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  用户名
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  新密码（留空则不修改）
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  placeholder="至少8个字符，包含字母和数字"
                />
              </div>

              {formData.password && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    确认新密码
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                    setFormData({
                      username: '',
                      password: '',
                      confirmPassword: '',
                      mnemonic: ''
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UserManagement;

