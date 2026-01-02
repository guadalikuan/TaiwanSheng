import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { ArrowRight, Wallet } from 'lucide-react';
import { investTechProject, getTWSCoinBalanceAPI } from '../utils/api';
import { investInTechProject } from '../utils/web3';

const TechProjectInvest = ({ project }) => {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(true);

  useEffect(() => {
    const loadBalance = async () => {
      if (publicKey) {
        try {
          setLoadingBalance(true);
          const result = await getTWSCoinBalanceAPI(publicKey.toString());
          if (result.success && result.balance) {
            setBalance(parseFloat(result.balance) / 1e6); // 转换为可读格式
          }
        } catch (error) {
          console.error('Error loading balance:', error);
        } finally {
          setLoadingBalance(false);
        }
      }
    };
    loadBalance();
  }, [publicKey]);

  const handleInvest = async () => {
    if (!publicKey) {
      alert('请先连接钱包');
      return;
    }

    const investAmount = parseFloat(amount);
    if (!investAmount || investAmount <= 0) {
      alert('请输入有效的投资金额');
      return;
    }

    if (investAmount < project.minInvestment) {
      alert(`最小投资额为 ${project.minInvestment} TWSCoin`);
      return;
    }

    if (investAmount > balance) {
      alert('余额不足');
      return;
    }

    try {
      setLoading(true);
      
      // 构建并签名交易
      const txSignature = await investInTechProject(
        project.id,
        investAmount,
        publicKey.toString(),
        sendTransaction,
        connection
      );

      if (!txSignature) {
        throw new Error('交易签名失败');
      }

      // 提交投资
      const result = await investTechProject(project.id, investAmount, txSignature);

      if (result.success) {
        alert('投资成功！');
        window.location.reload();
      } else {
        alert('投资失败：' + (result.message || '未知错误'));
      }
    } catch (error) {
      console.error('Investment error:', error);
      alert('投资失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-8">
        <div className="text-center">
          <Wallet className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">请先连接钱包进行投资</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-8">
      <h3 className="text-2xl font-bold mb-6">投资项目</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-mono text-slate-400 mb-2">
            投资金额 (TWSCoin)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={project.minInvestment}
            max={balance}
            step="0.01"
            className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
            placeholder={`最小: ${project.minInvestment} TWSCoin`}
          />
          <div className="mt-2 text-xs text-slate-500">
            可用余额: {loadingBalance ? '加载中...' : `${balance.toLocaleString()} TWSCoin`}
          </div>
        </div>

        <div className="bg-slate-800/50 p-4 rounded">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">投资金额</span>
            <span className="font-mono text-white">{amount || '0'} TWSCoin</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">预估收益</span>
            <span className="font-mono text-gold">
              {amount ? ((parseFloat(amount) * parseFloat(project.yield.replace('%', '')) / 100).toFixed(2)) : '0'} TWSCoin/年
            </span>
          </div>
        </div>

        <button
          onClick={handleInvest}
          disabled={loading || !amount || parseFloat(amount) < project.minInvestment || parseFloat(amount) > balance}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-mono py-4 rounded transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            '处理中...'
          ) : (
            <>
              确认投资 <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default TechProjectInvest;

