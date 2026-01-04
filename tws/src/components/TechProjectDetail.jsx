import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FlaskConical, ArrowLeft, Users, TrendingUp, Calendar, Shield } from 'lucide-react';
import { getTechProject, getProjectInvestors } from '../utils/api';
import TechProjectInvest from './TechProjectInvest';

const TechProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProject = async () => {
      try {
        const [projectRes, investorsRes] = await Promise.all([
          getTechProject(id),
          getProjectInvestors(id)
        ]);
        
        if (projectRes.success) {
          setProject(projectRes.project);
        }
        
        if (investorsRes.success) {
          setInvestors(investorsRes.investors || []);
        }
      } catch (error) {
        console.error('Error loading project:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadProject();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
        <div className="text-slate-400 font-mono">載入中...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">项目不存在</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  const progress = project.targetAmount > 0 
    ? Math.min((project.currentAmount / project.targetAmount) * 100, 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white"
        >
          <ArrowLeft size={20} />
          返回
        </button>

        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl font-black mb-2 flex items-center gap-3">
                <FlaskConical className="text-purple-400" />
                {project.projectName}
              </h1>
              <p className="text-slate-400 font-mono text-sm mb-4">{project.codeName}</p>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-purple-900/50 text-purple-400 rounded text-xs font-mono">
                  {project.category}
                </span>
                <span className={`px-3 py-1 rounded text-xs font-mono ${
                  project.status === 'FUNDING' ? 'bg-green-900/50 text-green-400' :
                  project.status === 'FUNDED' ? 'bg-blue-900/50 text-blue-400' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {project.status}
                </span>
              </div>
            </div>
          </div>

          <p className="text-slate-300 mb-8 leading-relaxed">{project.description}</p>

          {/* 进度条 */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-400">筹款进度</span>
              <span className="text-sm font-mono text-gold">
                {project.currentAmount.toLocaleString()} / {project.targetAmount.toLocaleString()} TaiOneToken
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-4">
              <div
                className="bg-purple-600 h-4 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-slate-500 font-mono">
              {progress.toFixed(1)}% 完成
            </div>
          </div>

          {/* 项目信息 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-800/50 p-4 rounded">
              <div className="text-xs text-slate-500 mb-1">目标金额</div>
              <div className="text-xl font-mono text-cyan-400">{project.targetAmount.toLocaleString()}</div>
              <div className="text-xs text-slate-500">TaiOneToken</div>
            </div>
            <div className="bg-slate-800/50 p-4 rounded">
              <div className="text-xs text-slate-500 mb-1">最小投资</div>
              <div className="text-xl font-mono text-gold">{project.minInvestment.toLocaleString()}</div>
              <div className="text-xs text-slate-500">TaiOneToken</div>
            </div>
            <div className="bg-slate-800/50 p-4 rounded">
              <div className="text-xs text-slate-500 mb-1">预估收益</div>
              <div className="text-xl font-mono text-green-400">{project.yield}</div>
            </div>
            <div className="bg-slate-800/50 p-4 rounded">
              <div className="text-xs text-slate-500 mb-1">项目周期</div>
              <div className="text-xl font-mono text-purple-400">{project.duration}</div>
              <div className="text-xs text-slate-500">月</div>
            </div>
          </div>

          {/* 路线图 */}
          {project.roadmap && project.roadmap.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Calendar size={20} className="text-purple-400" />
                项目路线图
              </h3>
              <ul className="space-y-2">
                {project.roadmap.map((milestone, index) => (
                  <li key={index} className="flex items-start gap-3 text-slate-300">
                    <span className="text-purple-400 font-mono">{index + 1}.</span>
                    <span>{milestone}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 知识产权 */}
          {project.ipAssets && project.ipAssets.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Shield size={20} className="text-purple-400" />
                知识产权资产
              </h3>
              <ul className="space-y-2">
                {project.ipAssets.map((ip, index) => (
                  <li key={index} className="text-slate-300">{ip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 投资组件 */}
        {project.status === 'FUNDING' && (
          <TechProjectInvest project={project} />
        )}

        {/* 投资者列表 */}
        {investors.length > 0 && (
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-8">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Users size={20} className="text-purple-400" />
              投资者列表 ({investors.length})
            </h3>
            <div className="space-y-2">
              {investors.slice(0, 10).map((investor, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-slate-800/50 rounded">
                  <span className="text-sm font-mono text-slate-400">
                    {investor.investorAddress?.slice(0, 8)}...{investor.investorAddress?.slice(-6)}
                  </span>
                  <span className="text-sm font-mono text-cyan-400">
                    {investor.amount.toLocaleString()} TaiOneToken
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TechProjectDetail;

