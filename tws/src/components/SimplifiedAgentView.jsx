import React, { useState } from 'react';
import { Crosshair, Terminal, MapPin, Home, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { getTaiOneTokenBalanceAPI, consumeTokenForMarking } from '../utils/api';

const SimplifiedAgentView = () => {
  const navigate = useNavigate();
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(null);
  const [checkingBalance, setCheckingBalance] = useState(false);

  const missions = [
    { title: 'ESTABLISH UPLINK', reward: '50 TWS', active: true },
    { title: 'RECRUIT ASSET', reward: '150 TWS', active: false },
  ];

  // 检查余额
  const checkBalance = async () => {
    if (!publicKey) return;
    setCheckingBalance(true);
    try {
      const result = await getTaiOneTokenBalanceAPI(publicKey.toString());
      if (result.success) {
        const bal = parseFloat(result.data?.balance || result.balance || 0) / 1e6;
        setBalance(bal);
      }
    } catch (error) {
      console.error('检查余额失败:', error);
    } finally {
      setCheckingBalance(false);
    }
  };

  React.useEffect(() => {
    if (connected && publicKey) {
      checkBalance();
    }
  }, [connected, publicKey]);

  // 处理标记按钮点击
  const handleMarkClick = async (type) => {
    if (!connected || !publicKey) {
      alert('请先连接钱包');
      return;
    }

    // 检查余额
    if (balance === null) {
      await checkBalance();
    }

    if (balance < 100) {
      alert(`余额不足，需要至少100 TaiOneToken，当前余额：${balance?.toFixed(2) || 0}`);
      return;
    }

    setLoading(true);
    try {
      // 调用消耗Token API
      const result = await consumeTokenForMarking(type, publicKey.toString());
      
      if (!result.success) {
        throw new Error(result.message || '消耗Token失败');
      }

      // 反序列化交易
      const transaction = Transaction.from(Buffer.from(result.transaction, 'base64'));

      // 发送交易
      const signature = await sendTransaction(transaction, connection);

      // 等待确认
      await connection.confirmTransaction(signature, 'confirmed');

      // 跳转到标记页面
      if (type === 'origin') {
        navigate('/mark-origin');
      } else {
        navigate('/mark-property');
      }
    } catch (error) {
      console.error('标记失败:', error);
      alert('标记失败: ' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 pt-8 space-y-6 pb-24">
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 rounded-lg border border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center border-2 border-green-500">
            <Crosshair className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <div className="text-xs text-gray-400 font-mono">AGENT ID</div>
            <div className="text-lg font-bold text-white font-mono">GHOST-8964</div>
          </div>
        </div>
        <div className="flex justify-between text-[10px] font-mono text-gray-500 bg-black/30 p-2 rounded">
          <span>RANK: OUTPOST</span>
          <span>NETWORK: 0 NODES</span>
        </div>
      </div>

      {/* 标记按钮区域 */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-gray-400 font-mono flex items-center gap-2">
          <Terminal className="w-3 h-3" /> ANCESTOR MARKING
        </h3>
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => handleMarkClick('origin')}
            disabled={loading || !connected || (balance !== null && balance < 100)}
            className="border rounded p-4 bg-gray-900 border-red-900/50 hover:border-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-red-500" />
              <div className="text-left">
                <div className="text-sm font-mono text-white">标记大陆祖籍</div>
                <div className="text-xs font-mono text-gray-400">消耗 100 TaiOneToken</div>
              </div>
            </div>
            {loading ? (
              <Loader className="w-4 h-4 animate-spin text-gray-400" />
            ) : (
              <div className="text-xs font-mono text-yellow-500">-100 TWS</div>
            )}
          </button>
          <button
            onClick={() => handleMarkClick('property')}
            disabled={loading || !connected || (balance !== null && balance < 100)}
            className="border rounded p-4 bg-gray-900 border-red-900/50 hover:border-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-3">
              <Home className="w-5 h-5 text-red-500" />
              <div className="text-left">
                <div className="text-sm font-mono text-white">标记大陆祖产</div>
                <div className="text-xs font-mono text-gray-400">消耗 100 TaiOneToken</div>
              </div>
            </div>
            {loading ? (
              <Loader className="w-4 h-4 animate-spin text-gray-400" />
            ) : (
              <div className="text-xs font-mono text-yellow-500">-100 TWS</div>
            )}
          </button>
        </div>
        {connected && balance !== null && (
          <div className="text-xs font-mono text-gray-500 text-center">
            当前余额: {balance.toFixed(2)} TaiOneToken
          </div>
        )}
        {!connected && (
          <div className="text-xs font-mono text-gray-500 text-center">
            请先连接钱包
          </div>
        )}
      </div>

      {/* 任务列表 (简化版) */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-gray-400 font-mono flex items-center gap-2">
          <Terminal className="w-3 h-3" /> PENDING PROTOCOLS
        </h3>
        {missions.map((m, i) => (
          <div 
            key={i} 
            className={`border rounded p-3 flex justify-between items-center ${
              m.active 
                ? 'bg-gray-900 border-red-900/50' 
                : 'bg-gray-900/50 border-gray-800 opacity-50'
            }`}
          >
            <span className="text-sm font-mono text-gray-300">{m.title}</span>
            <span className="text-xs font-mono text-yellow-500">{m.reward}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimplifiedAgentView;

