import React, { useState, useEffect } from 'react';
import { Wallet, QrCode, CheckCircle, AlertCircle, Loader, ShoppingBag, ExternalLink, CreditCard } from 'lucide-react';
import { isWalletInstalled, connectWallet, getConnectedAddress } from '../utils/wallet.js';
import { createPurchaseOrder, getExchangeRate, submitECPayForm, pollOrderStatus } from '../utils/totPurchase.js';

// 支付方式
const PAYMENT_METHODS = {
  IBON: 'ibon',
  WECHAT: 'wechat',
  ALIPAY: 'alipay'
};

const TOTPurchaseCard = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [twdAmount, setTwdAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.IBON);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null);
  const [error, setError] = useState(null);
  const [polling, setPolling] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);

  // 检查钱包连接状态
  useEffect(() => {
    checkWalletConnection();
  }, []);

  // 获取汇率
  useEffect(() => {
    fetchExchangeRate();
    const interval = setInterval(fetchExchangeRate, 60000); // 每分钟更新一次
    return () => clearInterval(interval);
  }, []);

  // 检查钱包连接
  const checkWalletConnection = async () => {
    try {
      if (isWalletInstalled()) {
        const address = await getConnectedAddress();
        if (address) {
          setWalletAddress(address);
          setWalletConnected(true);
        }
      }
    } catch (error) {
      console.log('钱包未连接');
    }
  };

  // 连接钱包
  const handleConnectWallet = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isWalletInstalled()) {
        // 引导用户安装Phantom钱包
        const install = window.confirm(
          '未检测到Phantom钱包。\n\n是否要打开Phantom钱包下载页面？'
        );
        if (install) {
          window.open('https://phantom.app', '_blank');
        }
        return;
      }

      const { address } = await connectWallet();
      setWalletAddress(address);
      setWalletConnected(true);
    } catch (error) {
      console.error('连接钱包失败:', error);
      setError(error.message || '连接钱包失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取汇率
  const fetchExchangeRate = async () => {
    try {
      const rateData = await getExchangeRate();
      setExchangeRate(rateData);
    } catch (error) {
      console.error('获取汇率失败:', error);
    }
  };

  // 计算可获得的TOT数量
  const calculateTotAmount = () => {
    if (!twdAmount || !exchangeRate || !exchangeRate.twdToTotRate) {
      return 0;
    }
    return parseFloat(twdAmount) * exchangeRate.twdToTotRate;
  };

  // 创建订单并提交支付
  const handlePurchase = async () => {
    try {
      setLoading(true);
      setError(null);

      // 验证输入
      if (!walletAddress) {
        setError('请先连接钱包');
        return;
      }

      const amount = parseFloat(twdAmount);
      if (!amount || amount <= 0) {
        setError('请输入有效的金额');
        return;
      }

      // 创建订单
      const result = await createPurchaseOrder(amount, walletAddress, paymentMethod);
      const orderData = result.order;
      const paymentData = result.payment;

      setOrder(orderData);

      // 根据支付方式处理
      if (paymentMethod === PAYMENT_METHODS.IBON) {
        // ECPay ibon支付：提交表单
        if (paymentData.formData && paymentData.apiUrl) {
          submitECPayForm(paymentData.apiUrl, paymentData.formData);
        }
      } else if (paymentMethod === PAYMENT_METHODS.WECHAT || paymentMethod === PAYMENT_METHODS.ALIPAY) {
        // 微信/支付宝：显示二维码
        if (paymentData.qrCodeUrl || paymentData.qrCode) {
          setQrCodeUrl(paymentData.qrCodeUrl || paymentData.qrCode);
        }
      }

      // 开始轮询订单状态
      startPolling(orderData.id);
    } catch (error) {
      console.error('购买失败:', error);
      setError(error.message || '购买失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 开始轮询订单状态
  const startPolling = (orderId) => {
    setPolling(true);
    setOrderStatus('pending');

    const stopPolling = pollOrderStatus(
      orderId,
      (order) => {
        setOrderStatus(order.status);
        if (order.status === 'completed') {
          setOrder(order);
        }
      },
      (order) => {
        setPolling(false);
        setOrderStatus(order.status);
        setOrder(order);
        
        if (order.status === 'completed') {
          // 购买成功，可以显示成功提示
          setError(null);
        } else if (order.status === 'failed') {
          setError('支付失败，请重试');
        }
      },
      3000 // 每3秒轮询一次
    );
  };

  // 格式化钱包地址
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const totAmount = calculateTotAmount();

  return (
    <div className="h-full flex flex-col border-b border-slate-800">
      <div className="h-10 border-b border-slate-800 flex items-center px-4 text-xs text-slate-400 uppercase tracking-wider bg-slate-900">
        <ShoppingBag size={14} className="mr-2" />
        购买 TOT 游戏点卡
      </div>
      
      <div className="flex-1 p-4 flex flex-col justify-center items-center space-y-4 bg-slate-900/20 overflow-y-auto">
        {/* 钱包连接状态 */}
        {!walletConnected ? (
          <div className="w-full space-y-3">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-sm text-slate-400 mb-4">请先连接钱包</p>
            </div>
            <button
              onClick={handleConnectWallet}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader className="animate-spin" size={16} />
              ) : (
                <>
                  <Wallet size={16} />
                  <span>连接钱包</span>
                </>
              )}
            </button>
            {!isWalletInstalled() && (
              <p className="text-[10px] text-slate-500 text-center">
                未安装Phantom钱包？<a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">点击安装</a>
              </p>
            )}
          </div>
        ) : (
          <>
            {/* 钱包地址显示 */}
            <div className="w-full flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700">
              <div className="flex items-center space-x-2">
                <Wallet size={14} className="text-green-500" />
                <span className="text-xs text-slate-300 font-mono">{formatAddress(walletAddress)}</span>
              </div>
              <CheckCircle size={14} className="text-green-500" />
            </div>

            {/* 汇率显示 */}
            {exchangeRate && (
              <div className="w-full text-center">
                <p className="text-[10px] text-slate-500 mb-1">当前汇率</p>
                <p className="text-sm font-mono text-cyan-400">
                  1 TWD = {exchangeRate.twdToTotRate ? exchangeRate.twdToTotRate.toFixed(6) : '--'} TOT
                </p>
                <p className="text-[9px] text-slate-600 mt-1">
                  TOT价格: ${exchangeRate.totPriceUsd ? exchangeRate.totPriceUsd.toFixed(6) : '--'} USD
                </p>
              </div>
            )}

            {/* 订单状态显示 */}
            {orderStatus === 'completed' && order && (
              <div className="w-full bg-green-900/20 border border-green-700 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-sm font-bold text-green-400">购买成功！</span>
                </div>
                <p className="text-xs text-slate-300">
                  已获得 {order.totAmount?.toFixed(4) || '--'} TOT
                </p>
                {order.txHash && (
                  <a
                    href={`https://solscan.io/tx/${order.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-cyan-400 hover:underline mt-1 flex items-center space-x-1"
                  >
                    <span>查看交易</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            )}

            {orderStatus === 'processing' && (
              <div className="w-full bg-blue-900/20 border border-blue-700 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Loader className="animate-spin text-blue-400" size={16} />
                  <span className="text-sm text-blue-400">正在处理中...</span>
                </div>
              </div>
            )}

            {/* 输入金额 */}
            {!order && (
              <div className="w-full space-y-3">
                {/* 支付方式选择 */}
                <div>
                  <label className="block text-xs text-slate-400 mb-2">选择支付方式</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setPaymentMethod(PAYMENT_METHODS.IBON)}
                      className={`px-3 py-2 rounded-lg text-xs font-mono border transition-all ${
                        paymentMethod === PAYMENT_METHODS.IBON
                          ? 'bg-cyan-600 border-cyan-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      7-11 ibon
                    </button>
                    <button
                      onClick={() => setPaymentMethod(PAYMENT_METHODS.WECHAT)}
                      className={`px-3 py-2 rounded-lg text-xs font-mono border transition-all ${
                        paymentMethod === PAYMENT_METHODS.WECHAT
                          ? 'bg-green-600 border-green-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      微信
                    </button>
                    <button
                      onClick={() => setPaymentMethod(PAYMENT_METHODS.ALIPAY)}
                      className={`px-3 py-2 rounded-lg text-xs font-mono border transition-all ${
                        paymentMethod === PAYMENT_METHODS.ALIPAY
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      支付宝
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">购买金额 (TWD)</label>
                  <input
                    type="number"
                    value={twdAmount}
                    onChange={(e) => setTwdAmount(e.target.value)}
                    placeholder="输入金额"
                    min="1"
                    step="1"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* 预计获得的TOT */}
                {twdAmount && totAmount > 0 && (
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                    <p className="text-[10px] text-slate-500 mb-1">预计获得</p>
                    <p className="text-lg font-bold text-cyan-400 font-mono">
                      {totAmount.toFixed(4)} TOT
                    </p>
                  </div>
                )}

                {/* 错误提示 */}
                {error && (
                  <div className="bg-red-900/20 border border-red-700 rounded-lg p-2">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                {/* 购买按钮 */}
                <button
                  onClick={handlePurchase}
                  disabled={loading || !twdAmount || totAmount <= 0 || polling}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader className="animate-spin" size={16} />
                  ) : (
                    <>
                      <QrCode size={16} />
                      <span>生成支付二维码</span>
                    </>
                  )}
                </button>

                <p className="text-[10px] text-slate-500 text-center">
                  {paymentMethod === PAYMENT_METHODS.IBON && '点击后将跳转到支付页面，请在7-11门店使用ibon扫码支付'}
                  {paymentMethod === PAYMENT_METHODS.WECHAT && '点击后将生成微信支付二维码，请使用微信扫码支付'}
                  {paymentMethod === PAYMENT_METHODS.ALIPAY && '点击后将生成支付宝支付二维码，请使用支付宝扫码支付'}
                </p>
              </div>
            )}

            {/* 支付中状态 */}
            {order && orderStatus === 'pending' && (
              <div className="w-full space-y-3">
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <QrCode size={16} className="text-yellow-400" />
                    <span className="text-sm font-bold text-yellow-400">等待支付</span>
                  </div>
                  <p className="text-xs text-slate-300 mb-2">
                    订单号: {order.id}
                  </p>
                  
                  {/* 显示二维码（微信/支付宝） */}
                  {qrCodeUrl && (paymentMethod === PAYMENT_METHODS.WECHAT || paymentMethod === PAYMENT_METHODS.ALIPAY) && (
                    <div className="flex flex-col items-center mb-3">
                      <div className="bg-white p-2 rounded-lg mb-2">
                        <img 
                          src={
                            qrCodeUrl.startsWith('http') 
                              ? qrCodeUrl 
                              : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`
                          }
                          alt="支付二维码"
                          className="w-40 h-40"
                          onError={(e) => {
                            // 如果图片加载失败，使用备用方案
                            e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`;
                          }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 text-center">
                        {paymentMethod === PAYMENT_METHODS.WECHAT && '请使用微信扫码支付'}
                        {paymentMethod === PAYMENT_METHODS.ALIPAY && '请使用支付宝扫码支付'}
                      </p>
                    </div>
                  )}
                  
                  <p className="text-xs text-slate-400">
                    {paymentMethod === PAYMENT_METHODS.IBON && '请在7-11门店使用ibon扫码支付，支付完成后TOT将自动转入您的钱包'}
                    {paymentMethod === PAYMENT_METHODS.WECHAT && '请使用微信扫码支付，支付完成后TOT将自动转入您的钱包'}
                    {paymentMethod === PAYMENT_METHODS.ALIPAY && '请使用支付宝扫码支付，支付完成后TOT将自动转入您的钱包'}
                  </p>
                </div>
                {polling && (
                  <div className="flex items-center justify-center space-x-2 text-xs text-slate-500">
                    <Loader className="animate-spin" size={12} />
                    <span>正在检查支付状态...</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TOTPurchaseCard;

