// ============================================
// 文件: src/components/LeaderboardPage.jsx
// 排行榜页面组件
// ============================================

import React, { useState, useEffect } from 'react';
import { Trophy, Medal, TrendingUp, TrendingDown, Minus, Loader, RefreshCw, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { getLeaderboard, getUserRanking, getJackpotHistory } from '../utils/api';
import { useServerStatus } from '../contexts/ServerStatusContext';
import KlineChart from './KlineChart';

// 排行榜类型配置
const LEADERBOARD_TYPES = [
  {
    id: 'balance',
    name: '持币数',
    icon: Trophy,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-600/20',
    borderColor: 'border-yellow-600/50',
  },
  {
    id: 'transactions',
    name: '交易数',
    icon: TrendingUp,
    color: 'text-blue-400',
    bgColor: 'bg-blue-600/20',
    borderColor: 'border-blue-600/50',
  },
  {
    id: 'jackpot-wins',
    name: '获奖数',
    icon: Medal,
    color: 'text-purple-400',
    bgColor: 'bg-purple-600/20',
    borderColor: 'border-purple-600/50',
  },
  {
    id: 'asset-value',
    name: '资产持有量',
    icon: Trophy,
    color: 'text-green-400',
    bgColor: 'bg-green-600/20',
    borderColor: 'border-green-600/50',
  },
  {
    id: 'tax-paid',
    name: '累计缴税',
    icon: TrendingUp,
    color: 'text-red-400',
    bgColor: 'bg-red-600/20',
    borderColor: 'border-red-600/50',
  },
  {
    id: 'consumption',
    name: '累计消费',
    icon: TrendingDown,
    color: 'text-orange-400',
    bgColor: 'bg-orange-600/20',
    borderColor: 'border-orange-600/50',
  },
  {
    id: 'referral-earnings',
    name: '推荐收益',
    icon: Trophy,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-600/20',
    borderColor: 'border-cyan-600/50',
  },
  {
    id: 'holding-time',
    name: '持币时间',
    icon: Trophy,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-600/20',
    borderColor: 'border-indigo-600/50',
  },
];

// 时间维度配置
const LEADERBOARD_PERIODS = [
  {
    id: 'all',
    name: '总排行',
    icon: Trophy,
    color: 'text-gold',
    bgColor: 'bg-gold/20',
    borderColor: 'border-gold/50',
  },
  {
    id: 'month',
    name: '月排行',
    icon: Calendar,
    color: 'text-blue-400',
    bgColor: 'bg-blue-600/20',
    borderColor: 'border-blue-600/50',
  },
  {
    id: 'week',
    name: '周排行',
    icon: Calendar,
    color: 'text-green-400',
    bgColor: 'bg-green-600/20',
    borderColor: 'border-green-600/50',
  },
  {
    id: 'day',
    name: '日排行',
    icon: Calendar,
    color: 'text-purple-400',
    bgColor: 'bg-purple-600/20',
    borderColor: 'border-purple-600/50',
  },
];

const LeaderboardPage = () => {
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const { isOnline } = useServerStatus();
  const [activeType, setActiveType] = useState('balance');
  const [activePeriod, setActivePeriod] = useState('all');
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRanking, setUserRanking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [jackpotHistory, setJackpotHistory] = useState([]);
  const [jackpotLoading, setJackpotLoading] = useState(true);

  // 加载排行榜数据
  const loadLeaderboard = async (type = activeType, period = activePeriod) => {
    if (!isOnline) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getLeaderboard(type, period, 100);
      if (response && response.success) {
        setLeaderboard(response.data || []);
        setLastUpdate(new Date());
        
        // 如果用户已连接钱包，获取用户排名
        if (publicKey) {
          const userRankResponse = await getUserRanking(publicKey.toString(), type, period);
          if (userRankResponse && userRankResponse.success && userRankResponse.found) {
            setUserRanking(userRankResponse.data);
          } else {
            setUserRanking(null);
          }
        }
      } else {
        setError(response?.message || '获取排行榜失败');
        setLeaderboard([]);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      setError('网络错误，请检查服务器连接');
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和类型/时间维度切换时重新加载
  useEffect(() => {
    loadLeaderboard();
  }, [activeType, activePeriod, isOnline]);

  // 加载奖池历史数据
  const loadJackpotHistory = async () => {
    if (!isOnline) {
      setJackpotLoading(false);
      return;
    }

    setJackpotLoading(true);
    try {
      const response = await getJackpotHistory(200);
      if (response && response.success && response.data && response.data.length > 0) {
        setJackpotHistory(response.data);
      } else {
        setJackpotHistory([]); // 没有数据，不显示图表
      }
    } catch (error) {
      console.error('Failed to load jackpot history:', error);
      setJackpotHistory([]);
    } finally {
      setJackpotLoading(false);
    }
  };

  useEffect(() => {
    loadJackpotHistory();
    // 每30秒刷新一次
    const interval = setInterval(loadJackpotHistory, 30000);
    return () => clearInterval(interval);
  }, [isOnline]);

  // 获取排名徽章样式
  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-black text-lg">
          🥇
        </div>
      );
    } else if (rank === 2) {
      return (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-black font-black text-lg">
          🥈
        </div>
      );
    } else if (rank === 3) {
      return (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-black font-black text-lg">
          🥉
        </div>
      );
    } else {
      return (
        <div className="w-10 h-10 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center text-slate-300 font-mono text-sm">
          {rank}
        </div>
      );
    }
  };

  // 缩短地址显示
  const shortenAddress = (address) => {
    if (!address) return '';
    if (address.length <= 10) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const activeTypeConfig = LEADERBOARD_TYPES.find(t => t.id === activeType);

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* 导航栏 */}
      <nav className="bg-slate-900/50 border-b border-slate-800 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-white font-mono text-sm transition-colors"
          >
            ← 返回首页
          </button>
          <h1 className="text-2xl font-black tracking-tighter">LEADERBOARD</h1>
          <div className="w-20" /> {/* 占位符，保持居中 */}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* 排行榜类型切换 */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {LEADERBOARD_TYPES.map((type) => {
              const Icon = type.icon;
              const isActive = activeType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setActiveType(type.id)}
                  className={`
                    flex items-center gap-2 px-6 py-3 rounded-lg font-mono text-sm transition-all whitespace-nowrap
                    ${isActive 
                      ? `${type.bgColor} ${type.color} border-2 ${type.borderColor}` 
                      : 'bg-slate-800/50 text-slate-400 border-2 border-slate-700 hover:border-slate-600 hover:text-slate-300'
                    }
                  `}
                >
                  <Icon size={18} />
                  {type.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 时间维度切换 */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {LEADERBOARD_PERIODS.map((period) => {
              const Icon = period.icon;
              const isActive = activePeriod === period.id;
              // 持币时间排行榜不支持日/周/月排行
              const isDisabled = activeType === 'holding-time' && period.id !== 'all';
              return (
                <button
                  key={period.id}
                  onClick={() => !isDisabled && setActivePeriod(period.id)}
                  disabled={isDisabled}
                  className={`
                    flex items-center gap-2 px-6 py-3 rounded-lg font-mono text-sm transition-all whitespace-nowrap
                    ${isDisabled
                      ? 'bg-slate-800/30 text-slate-600 border-2 border-slate-800 cursor-not-allowed'
                      : isActive 
                        ? `${period.bgColor} ${period.color} border-2 ${period.borderColor}` 
                        : 'bg-slate-800/50 text-slate-400 border-2 border-slate-700 hover:border-slate-600 hover:text-slate-300'
                    }
                  `}
                  title={isDisabled ? '持币时间排行榜不支持日/周/月排行' : ''}
                >
                  <Icon size={18} />
                  {period.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 刷新按钮和更新时间 */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-slate-400 font-mono text-sm">
            {lastUpdate && `最后更新: ${lastUpdate.toLocaleTimeString()}`}
          </div>
          <button
            onClick={() => loadLeaderboard()}
            disabled={loading || !isOnline}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>

        {/* 排行榜内容 */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader className="animate-spin text-gold" size={32} />
            <span className="ml-4 text-slate-400 font-mono">加载中...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-red-400 font-mono">{error}</div>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-500 font-mono">暂无排行榜数据</div>
          </div>
        ) : (
          <>
            {/* 排行榜列表 */}
            <div className="space-y-3 mb-8">
              {leaderboard.map((item) => {
                const isCurrentUser = publicKey && item.address.toLowerCase() === publicKey.toString().toLowerCase();
                return (
                  <div
                    key={`${item.address}-${item.rank}`}
                    className={`
                      flex items-center gap-4 p-4 rounded-lg border transition-all
                      ${isCurrentUser
                        ? 'bg-gold/10 border-gold'
                        : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
                      }
                    `}
                  >
                    {/* 排名 */}
                    <div className="flex-shrink-0">
                      {getRankBadge(item.rank)}
                    </div>

                    {/* 用户地址 */}
                    <div className="flex-1 min-w-0">
                      <div className={`
                        font-mono text-sm
                        ${isCurrentUser ? 'text-gold font-bold' : 'text-slate-300'}
                      `}>
                        {shortenAddress(item.address)}
                      </div>
                      {isCurrentUser && (
                        <div className="text-xs text-gold/70 mt-1">（您）</div>
                      )}
                    </div>

                    {/* 数值 */}
                    <div className="flex-shrink-0 text-right">
                      <div className="text-lg font-mono font-bold text-white">
                        {item.displayValue || item.value}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 用户排名卡片（如果不在Top 100） */}
            {publicKey && userRanking && userRanking.rank > 100 && (
              <div className="mt-8 p-6 bg-gold/10 border-2 border-gold rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-gold font-mono text-sm mb-2">您的排名</div>
                    <div className="text-2xl font-black text-gold">#{userRanking.rank}</div>
                    <div className="text-slate-400 font-mono text-sm mt-2">
                      {shortenAddress(userRanking.address)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-400 font-mono text-sm mb-2">数值</div>
                    <div className="text-xl font-mono font-bold text-gold">
                      {userRanking.displayValue || userRanking.value}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* 奖池余额K线图 */}
        {jackpotHistory.length > 0 && (
          <div className="mt-8 p-6 bg-slate-900/50 border border-slate-700 rounded-lg">
            <h3 className="text-xl font-black text-white mb-4">奖池余额变化</h3>
            <div className="h-96 w-full">
              <KlineChart
                data={jackpotHistory}
                viewMode="分时"
                currentPrice={jackpotHistory.length > 0 ? jackpotHistory[jackpotHistory.length - 1].close : 0}
                width={800}
                height={384}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
