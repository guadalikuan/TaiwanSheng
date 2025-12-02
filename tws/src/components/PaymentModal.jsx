import React, { useState, useEffect } from 'react';
import { X, Wallet, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { ethers } from 'ethers';

const PaymentModal = ({ isOpen, onClose, assetId, amount, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: 选择钱包, 2: 确认支付, 3: 等待确认, 4: 完成
  const [walletAddress, setWalletAddress] = useState('');
  const [provider, setProvider] = useState(null);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState('');

  // USDT合约地址（BSC主网）
  const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';
  const USDT_ABI = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)"
  ];

  // 平台收款地址
  const PLATFORM_WALLET = import.meta.env.VITE_PLATFORM_WALLET || '0x0000000000000000000000000000000000000000';

  useEffect(() => {
    if (isOpen) {
      checkWalletConnection();
    }
  }, [isOpen]);

  // 检查钱包连接
  const checkWalletConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          const provider = new ethers.BrowserProvider(window.ethereum);
          setProvider(provider);
          setStep(2);
        }
      } catch (error) {
        console.error('检查钱包连接失败:', error);
      }
    }
  };

  // 连接MetaMask
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError('请安装MetaMask钱包');
        return;
      }

      setLoading(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      setWalletAddress(address);

      const provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(provider);

      // 切换到BSC网络
      await switchToBSC();

      setStep(2);
      setError('');
    } catch (error) {
      console.error('连接钱包失败:', error);
      setError('连接钱包失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 切换到BSC网络
  const switchToBSC = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x38' }] // BSC主网
      });
    } catch (switchError) {
      // 如果网络不存在，添加网络
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x38',
            chainName: 'Binance Smart Chain',
            nativeCurrency: {
              name: 'BNB',
              symbol: 'BNB',
              decimals: 18
            },
            rpcUrls: ['https://bsc-dataseed.binance.org'],
            blockExplorerUrls: ['https://bscscan.com']
          }]
        });
      }
    }
  };

  // 创建支付订单
  const createOrder = async () => {
    try {
      const token = localStorage.getItem('tws_token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      
      const response = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          assetId,
          amount: amount.toString()
        })
      });

      const result = await response.json();
      if (result.success) {
        setOrderId(result.order.orderId);
        return result.order;
      } else {
        throw new Error(result.message || '创建订单失败');
      }
    } catch (error) {
      throw error;
    }
  };

  // 执行支付
  const executePayment = async () => {
    try {
      setLoading(true);
      setError('');

      // 创建订单
      const order = await createOrder();

      // 获取USDT合约实例
      const signer = await provider.getSigner();
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

      // 转换金额（USDT有18位小数）
      const amountWei = ethers.parseUnits(amount.toString(), 18);

      // 检查余额
      const balance = await usdtContract.balanceOf(walletAddress);
      if (balance < amountWei) {
        throw new Error('USDT余额不足');
      }

      setStep(3);

      // 执行转账
      const tx = await usdtContract.transfer(PLATFORM_WALLET, amountWei);
      setTxHash(tx.hash);

      // 等待交易确认
      const receipt = await tx.wait();

      // 验证支付
      await verifyPayment(tx.hash, order.orderId);

      setStep(4);
      if (onSuccess) {
        onSuccess(tx.hash);
      }
    } catch (error) {
      console.error('支付失败:', error);
      setError('支付失败: ' + error.message);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  // 验证支付
  const verifyPayment = async (txHash, orderId) => {
    try {
      const token = localStorage.getItem('tws_token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      
      const response = await fetch(`${API_BASE_URL}/api/payment/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          txHash,
          orderId,
          fromAddress: walletAddress,
          toAddress: PLATFORM_WALLET,
          amount: amount.toString()
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || '验证支付失败');
      }
    } catch (error) {
      console.error('验证支付失败:', error);
      throw error;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-slate-900">支付USDT</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          {step === 1 && (
            <div className="text-center">
              <Wallet className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">连接钱包</h3>
              <p className="text-slate-600 mb-6">请连接您的MetaMask钱包以继续支付</p>
              <button
                onClick={connectWallet}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    连接中...
                  </>
                ) : (
                  <>
                    <Wallet size={20} />
                    连接MetaMask
                  </>
                )}
              </button>
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-600">资产ID:</span>
                  <span className="font-mono text-sm">{assetId}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-600">支付金额:</span>
                  <span className="font-bold text-lg">{amount} USDT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">钱包地址:</span>
                  <span className="font-mono text-xs">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  返回
                </button>
                <button
                  onClick={executePayment}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    '确认支付'
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center">
              <Loader className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-semibold mb-2">等待交易确认</h3>
              <p className="text-slate-600 mb-4">交易已提交，请等待区块链确认...</p>
              {txHash && (
                <a
                  href={`https://bscscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm font-mono"
                >
                  查看交易: {txHash.slice(0, 10)}...
                </a>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">支付成功！</h3>
              <p className="text-slate-600 mb-4">您的支付已确认，资产将很快到账</p>
              {txHash && (
                <a
                  href={`https://bscscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm font-mono block mb-4"
                >
                  查看交易详情
                </a>
              )}
              <button
                onClick={onClose}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium"
              >
                完成
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;

