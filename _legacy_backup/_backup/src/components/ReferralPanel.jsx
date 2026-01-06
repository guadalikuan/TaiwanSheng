import React, { useState, useEffect } from 'react';
import { Share2, Users, TrendingUp, Copy, Check } from 'lucide-react';

const ReferralPanel = () => {
  const [referralInfo, setReferralInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    loadReferralInfo();
    loadLeaderboard();
  }, []);

  const loadReferralInfo = async () => {
    try {
      const token = localStorage.getItem('tws_token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      
      const response = await fetch(`${API_BASE_URL}/api/referral/info`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await response.json();
      if (result.success) {
        setReferralInfo(result.info);
      }
    } catch (error) {
      console.error('加载推荐信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/referral/leaderboard`);
      const result = await response.json();
      if (result.success) {
        setLeaderboard(result.leaderboard);
      }
    } catch (error) {
      console.error('加载排行榜失败:', error);
    }
  };

  const copyInviteLink = () => {
    if (referralInfo?.inviteLink) {
      navigator.clipboard.writeText(referralInfo.inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-slate-600">
        加载中...
      </div>
    );
  }

  if (!referralInfo) {
    return (
      <div className="p-6 bg-slate-50 rounded-lg text-center">
        <Share2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">开始推荐</h3>
        <p className="text-slate-600 mb-4">分享您的邀请链接，获得推荐奖励</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
          生成邀请链接
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 推荐统计 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Share2 size={24} />
          我的推荐
        </h2>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-slate-600 mb-1">总收益</div>
            <div className="text-2xl font-bold text-blue-600">
              {referralInfo.totalEarnings.toFixed(2)} USDT
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-slate-600 mb-1">推荐人数</div>
            <div className="text-2xl font-bold text-green-600">
              {referralInfo.referralsCount || 0}
            </div>
          </div>
        </div>

        {/* 邀请链接 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            我的邀请链接
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={referralInfo.inviteLink}
              readOnly
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-mono text-sm"
            />
            <button
              onClick={copyInviteLink}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? '已复制' : '复制'}
            </button>
          </div>
        </div>
      </div>

      {/* 推荐排行榜 */}
      {leaderboard.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            推荐排行榜
          </h3>
          <div className="space-y-2">
            {leaderboard.map((item) => (
              <div
                key={item.userId}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    {item.rank}
                  </div>
                  <div>
                    <div className="font-medium">{item.userId.slice(0, 8)}...</div>
                    <div className="text-xs text-slate-600">
                      {item.totalReferrals} 人推荐
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">
                    {item.totalEarnings.toFixed(2)} USDT
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralPanel;


