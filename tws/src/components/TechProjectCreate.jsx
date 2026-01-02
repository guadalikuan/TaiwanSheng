import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, ArrowLeft } from 'lucide-react';
import { createTechProject } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const TechProjectCreate = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    projectName: '',
    description: '',
    category: 'AI',
    targetAmount: '',
    minInvestment: '',
    duration: '12',
    teamInfo: '',
    roadmap: '',
    ipAssets: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // 检查认证
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">请先登录</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded"
          >
            前往登录
          </button>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const result = await createTechProject({
        ...formData,
        targetAmount: Number(formData.targetAmount),
        minInvestment: Number(formData.minInvestment),
        duration: Number(formData.duration),
        roadmap: formData.roadmap ? formData.roadmap.split('\n').filter(line => line.trim()) : [],
        ipAssets: formData.ipAssets ? formData.ipAssets.split('\n').filter(line => line.trim()) : [],
        teamInfo: formData.teamInfo ? { description: formData.teamInfo } : {}
      });
      
      if (result.success) {
        alert('项目发布成功！等待审核中...');
        navigate('/');
      } else {
        alert('发布失败：' + (result.message || '未知错误'));
      }
    } catch (error) {
      alert('发布失败：' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white"
        >
          <ArrowLeft size={20} />
          返回
        </button>

        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-8">
          <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
            <FlaskConical className="text-purple-400" />
            发布科技项目
          </h1>
          <p className="text-slate-400 mb-8">通过TWS平台进行科技项目众筹和知识产权证券化</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-mono text-slate-400 mb-2">项目名称 *</label>
              <input
                type="text"
                name="projectName"
                value={formData.projectName}
                onChange={handleChange}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-mono text-slate-400 mb-2">项目描述 *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-mono text-slate-400 mb-2">技术领域</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="AI">人工智能</option>
                  <option value="Blockchain">区块链</option>
                  <option value="Biotech">生物技术</option>
                  <option value="Energy">新能源</option>
                  <option value="Other">其他</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-mono text-slate-400 mb-2">项目周期（月）</label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  min="1"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-mono text-slate-400 mb-2">目标金额（TWSCoin） *</label>
                <input
                  type="number"
                  name="targetAmount"
                  value={formData.targetAmount}
                  onChange={handleChange}
                  required
                  min="1"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-mono text-slate-400 mb-2">最小投资额（TWSCoin） *</label>
                <input
                  type="number"
                  name="minInvestment"
                  value={formData.minInvestment}
                  onChange={handleChange}
                  required
                  min="1"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-mono text-slate-400 mb-2">团队信息</label>
              <textarea
                name="teamInfo"
                value={formData.teamInfo}
                onChange={handleChange}
                rows={3}
                placeholder="介绍项目团队背景..."
                className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-mono text-slate-400 mb-2">项目路线图（每行一个里程碑）</label>
              <textarea
                name="roadmap"
                value={formData.roadmap}
                onChange={handleChange}
                rows={4}
                placeholder="例如：&#10;Q1: 完成技术验证&#10;Q2: 开发MVP&#10;Q3: 市场测试"
                className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-mono text-slate-400 mb-2">知识产权资产（每行一个）</label>
              <textarea
                name="ipAssets"
                value={formData.ipAssets}
                onChange={handleChange}
                rows={3}
                placeholder="例如：&#10;专利：AI算法优化方法&#10;商标：项目品牌名称"
                className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-mono py-4 rounded transition-colors"
            >
              {submitting ? '发布中...' : '发布项目'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TechProjectCreate;

