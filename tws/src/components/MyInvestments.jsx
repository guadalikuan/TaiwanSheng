import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Calendar, FlaskConical } from 'lucide-react';
import { getMyInvestments } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const MyInvestments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInvestments = async () => {
      if (!user?.address) {
        setLoading(false);
        return;
      }

      try {
        const result = await getMyInvestments(user.address);
        if (result.success && result.investments) {
          setInvestments(result.investments);
        }
      } catch (error) {
        console.error('Error loading investments:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInvestments();
  }, [user]);

  if (!user) {
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

        <h1 className="text-4xl font-black mb-8 flex items-center gap-3">
          <TrendingUp className="text-purple-400" />
          我的投资
        </h1>

        {loading ? (
          <div className="text-center text-slate-400 font-mono">載入中...</div>
        ) : investments.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-8 text-center">
            <p className="text-slate-400 mb-4">暂无投资记录</p>
            <button
              onClick={() => navigate('/')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded"
            >
              浏览项目
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {investments.map((investment) => (
              <div
                key={investment.id}
                className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 hover:border-purple-500 transition-colors cursor-pointer"
                onClick={() => navigate(`/tech-project/${investment.projectId}`)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <FlaskConical className="text-purple-400" size={24} />
                    <div>
                      <h3 className="text-xl font-bold">项目 #{investment.projectId.slice(0, 8)}</h3>
                      <p className="text-sm text-slate-400 font-mono">{investment.projectId}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded text-xs font-mono ${
                    investment.status === 'CONFIRMED' ? 'bg-green-900/50 text-green-400' :
                    investment.status === 'PENDING' ? 'bg-yellow-900/50 text-yellow-400' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {investment.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">投资金额</div>
                    <div className="text-lg font-mono text-cyan-400">
                      {investment.amount.toLocaleString()} TWSCoin
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">投资时间</div>
                    <div className="text-sm font-mono text-slate-300">
                      {new Date(investment.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">交易签名</div>
                    <div className="text-xs font-mono text-slate-400 truncate">
                      {investment.txSignature?.slice(0, 16)}...
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyInvestments;

