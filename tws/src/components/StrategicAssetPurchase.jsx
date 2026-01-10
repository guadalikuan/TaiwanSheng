import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { Loader, CheckCircle, XCircle, Shield, Zap, AlertCircle } from 'lucide-react';
import { getTaiOneTokenBalanceAPI, buyStrategicAsset } from '../utils/api';

const StrategicAssetPurchase = ({ asset, onPurchaseSuccess }) => {
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState(null); // 'building', 'signing', 'confirming', 'success', 'error'
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);

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

  useEffect(() => {
    if (connected && publicKey) {
      checkBalance();
    }
  }, [connected, publicKey]);

  // 处理购买
  const handlePurchase = async () => {
    if (!connected || !publicKey) {
      setError('请先连接钱包');
      return;
    }

    if (!asset) {
      setError('资产信息缺失');
      return;
    }

    // 检查余额
    if (balance === null) {
      await checkBalance();
    }

    const assetPrice = parseFloat(asset.price?.replace(/[^0-9.]/g, '') || asset.tokenPrice || 0);
    
    if (balance < assetPrice) {
      setError(`余额不足，需要至少 ${assetPrice} TOT，当前余额：${balance?.toFixed(2) || 0} TOT`);
      return;
    }

    setLoading(true);
    setError(null);
    setTransactionStatus('building');

    try {
      // 第一步：构建交易
      const buildResult = await buyStrategicAsset(asset.id);

      if (!buildResult.success) {
        throw new Error(buildResult.message || '构建交易失败');
      }

      if (!buildResult.transaction) {
        throw new Error('未收到交易数据');
      }

      // 第二步：反序列化交易
      setTransactionStatus('signing');
      const transaction = Transaction.from(Buffer.from(buildResult.transaction, 'base64'));

      // 第三步：发送交易（用户签名）
      const signature = await sendTransaction(transaction, connection);
      setTxHash(signature);

      // 第四步：等待确认
      setTransactionStatus('confirming');
      await connection.confirmTransaction(signature, 'confirmed');

      // 第五步：提交交易签名到后端验证
      const confirmResult = await buyStrategicAsset(asset.id, signature);

      if (!confirmResult.success) {
        throw new Error(confirmResult.message || '交易确认失败');
      }

      setTransactionStatus('success');
      
      // 刷新余额
      await checkBalance();

      // 调用成功回调
      if (onPurchaseSuccess) {
        onPurchaseSuccess(confirmResult);
      }

      // 3秒后重置状态
      setTimeout(() => {
        setTransactionStatus(null);
        setTxHash(null);
      }, 3000);
    } catch (error) {
      console.error('购买失败:', error);
      setError(error.message || '购买失败，请稍后重试');
      setTransactionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  if (!asset) {
    return null;
  }

  const assetPrice = parseFloat(asset.price?.replace(/[^0-9.]/g, '') || asset.tokenPrice || 0);
  const isInsufficient = balance !== null && balance < assetPrice;
  const strategicAssetTypes = ['矿产', '仓库', '航船', '芯片'];
  const isStrategicAsset = strategicAssetTypes.includes(asset.assetType || asset.type || '');

  if (!isStrategicAsset) {
    return null; // 非战略资产不显示此组件
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="text-cyan-400" size={24} />
        <h3 className="text-xl font-bold font-mono">战略资产购买</h3>
      </div>

      {/* 余额显示 */}
      <div className="mb-4 p-4 bg-slate-800/50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-mono text-sm">TOT余额</span>
          {checkingBalance ? (
            <Loader className="animate-spin text-cyan-400" size={16} />
          ) : (
            <span className="text-cyan-400 font-mono font-bold">
              {balance !== null ? `${balance.toFixed(2)} TOT` : '--'}
            </span>
          )}
        </div>
      </div>

      {/* 价格信息 */}
      <div className="mb-4 p-4 bg-slate-800/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 font-mono text-sm">资产价格</span>
          <span className="text-gold font-mono font-bold">{assetPrice.toLocaleString()} TOT</span>
        </div>
        {isInsufficient && (
          <div className="flex items-center gap-2 text-red-400 text-xs font-mono mt-2">
            <AlertCircle size={14} />
            <span>余额不足，需要 {assetPrice.toFixed(2)} TOT</span>
          </div>
        )}
      </div>

      {/* 交易状态 */}
      {transactionStatus && (
        <div className="mb-4 p-4 bg-slate-800/50 rounded-lg">
          {transactionStatus === 'building' && (
            <div className="flex items-center gap-2 text-yellow-400 font-mono text-sm">
              <Loader className="animate-spin" size={16} />
              <span>正在构建交易...</span>
            </div>
          )}
          {transactionStatus === 'signing' && (
            <div className="flex items-center gap-2 text-yellow-400 font-mono text-sm">
              <Loader className="animate-spin" size={16} />
              <span>请在钱包中确认交易...</span>
            </div>
          )}
          {transactionStatus === 'confirming' && (
            <div className="flex items-center gap-2 text-yellow-400 font-mono text-sm">
              <Loader className="animate-spin" size={16} />
              <span>等待链上确认...</span>
            </div>
          )}
          {transactionStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-400 font-mono text-sm">
              <CheckCircle size={16} />
              <span>购买成功！</span>
              {txHash && (
                <a
                  href={`https://solscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 underline ml-2"
                >
                  查看交易
                </a>
              )}
            </div>
          )}
          {transactionStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-400 font-mono text-sm">
              <XCircle size={16} />
              <span>交易失败</span>
            </div>
          )}
        </div>
      )}

      {/* 错误信息 */}
      {error && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-900/50 rounded-lg">
          <div className="flex items-center gap-2 text-red-400 font-mono text-sm">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 购买按钮 */}
      <button
        onClick={handlePurchase}
        disabled={loading || !connected || isInsufficient || asset.status === 'LOCKED'}
        className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-mono text-sm font-bold transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader className="animate-spin" size={16} />
            <span>处理中...</span>
          </>
        ) : !connected ? (
          <>
            <Zap size={16} />
            <span>请先连接钱包</span>
          </>
        ) : isInsufficient ? (
          <>
            <AlertCircle size={16} />
            <span>余额不足</span>
          </>
        ) : asset.status === 'LOCKED' ? (
          <>
            <XCircle size={16} />
            <span>资产已锁定</span>
          </>
        ) : (
          <>
            <Shield size={16} />
            <span>使用 TOT 购买</span>
          </>
        )}
      </button>

      {/* 提示信息 */}
      <div className="mt-4 p-3 bg-slate-800/30 rounded-lg">
        <p className="text-xs text-slate-500 font-mono">
          💡 购买将使用 Solana 链上交易，使用 TOT 作为结算货币。交易确认后，资产将立即上链记录。
        </p>
      </div>
    </div>
  );
};

export default StrategicAssetPurchase;
