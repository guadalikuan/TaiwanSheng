import React, { useState } from 'react';
import { 
  LogIn, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Loader,
  ShieldCheck
} from 'lucide-react';
import { useArsenalAuth } from '../contexts/ArsenalAuthContext';

/**
 * 资产入库独立登录组件
 * 与主站点登录完全独立
 */
const ArsenalLogin = ({ onLoginSuccess }) => {
  const { login, loginWithMnemonic, loginWithWallet, registerWithWallet, isAuthenticated } = useArsenalAuth();
  
  const [loginMode, setLoginMode] = useState('username'); // 'username', 'mnemonic', or 'wallet'
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    mnemonic: ''
  });
  
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [needsRegistration, setNeedsRegistration] = useState(false);

  // 如果已登录，通知父组件
  React.useEffect(() => {
    if (isAuthenticated && onLoginSuccess) {
      onLoginSuccess();
    }
  }, [isAuthenticated, onLoginSuccess]);

  // 验证表单
  const validateForm = () => {
    const newErrors = {};

    if (loginMode === 'username') {
      if (!formData.username.trim()) {
        newErrors.username = '用户名不能为空';
      }
      if (!formData.password) {
        newErrors.password = '密码不能为空';
      }
    } else {
      if (!formData.mnemonic.trim()) {
        newErrors.mnemonic = '助记符不能为空';
      }
      if (!formData.password) {
        newErrors.password = '密码不能为空';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理输入变化
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // 清除对应字段的错误
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // 切换登录模式
  const handleModeChange = (mode) => {
    setLoginMode(mode);
    setFormData({ username: '', password: '', mnemonic: '' });
    setErrors({});
    setWalletAddress('');
    setNeedsRegistration(false);
  };

  // 连接钱包
  const handleConnectWallet = async () => {
    try {
      setWalletConnecting(true);
      setErrors({});

      // 检查钱包是否安装
      const { isInstalled, connect, signMessage } = await import('../utils/wallet');
      
      if (!isInstalled()) {
        setErrors({ submit: '请安装 Phantom 钱包并刷新页面' });
        return;
      }

      // 连接钱包
      const address = await connect();
      setWalletAddress(address);

      // 生成登录消息
      const message = `TWS 资产入库系统登录验证\n\n地址: ${address}\n时间: ${new Date().toISOString()}\n\n点击签名以登录。`;
      
      // 请求签名
      const signature = await signMessage(message);

      // 尝试登录
      const result = await loginWithWallet(address, signature, message);

      if (result.success) {
        // 登录成功，父组件会通过 useEffect 检测到
      } else if (result.needsRegistration || result.message?.includes('未注册')) {
        // 需要注册
        setNeedsRegistration(true);
        setErrors({ submit: '该钱包地址未注册，请填写用户名和密码完成注册' });
      } else {
        setErrors({ submit: result.message || '登录失败' });
      }
    } catch (error) {
      console.error('钱包连接错误:', error);
      setErrors({ submit: error.message || '连接钱包失败，请重试' });
    } finally {
      setWalletConnecting(false);
    }
  };

  // 钱包注册
  const handleWalletRegister = async (e) => {
    e.preventDefault();
    
    if (!walletAddress) {
      setErrors({ submit: '请先连接钱包' });
      return;
    }

    if (!formData.username.trim()) {
      setErrors({ username: '用户名不能为空' });
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      setErrors({ password: '密码至少需要6个字符' });
      return;
    }

    setSubmitting(true);
    setErrors({});
    
    try {
      const { signMessage } = await import('../utils/wallet');
      const message = `TWS 资产入库系统注册验证\n\n地址: ${walletAddress}\n时间: ${new Date().toISOString()}\n\n点击签名以注册。`;
      const signature = await signMessage(message);
      
      const result = await registerWithWallet(
        walletAddress, 
        signature, 
        message, 
        formData.username, 
        formData.password
      );
      
      if (result.success) {
        // 注册成功，父组件会通过 useEffect 检测到
      } else {
        setErrors({ submit: result.message || '注册失败' });
      }
    } catch (error) {
      console.error('钱包注册错误:', error);
      setErrors({ submit: error.message || '注册失败，请重试' });
    } finally {
      setSubmitting(false);
    }
  };

  // 提交登录
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      let result;
      if (loginMode === 'username') {
        result = await login(formData.username, formData.password);
      } else {
        result = await loginWithMnemonic(formData.mnemonic, formData.password);
      }

      if (result.success) {
        // 登录成功，父组件会通过 useEffect 检测到
      } else {
        setErrors({ submit: result.message || '登录失败' });
      }
    } catch (error) {
      console.error('登录错误:', error);
      
      // 提供更详细的错误信息
      let errorMessage = error.message || '登录失败，请重试';
      
      if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        errorMessage = '无法连接到服务器，请检查：\n1. 后端服务是否正在运行\n2. 网络连接是否正常\n3. 浏览器控制台（F12）查看详细错误';
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl border border-slate-200 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <ShieldCheck className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">资产入库系统</h1>
          <p className="text-sm text-slate-600">请登录以访问资产入库功能</p>
        </div>

        {/* 登录模式切换 */}
        <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => handleModeChange('username')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              loginMode === 'username'
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            账号密码
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('mnemonic')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              loginMode === 'mnemonic'
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            助记符
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('wallet')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              loginMode === 'wallet'
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            钱包登录
          </button>
        </div>

        {/* 登录表单 */}
        <form onSubmit={loginMode === 'wallet' && needsRegistration ? handleWalletRegister : handleSubmit}>
          {loginMode === 'username' && (
            <>
              <div className="mb-4">
                <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-2">
                  用户名
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none ${
                    errors.username ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="请输入用户名"
                  disabled={submitting}
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {errors.username}
                  </p>
                )}
              </div>
            </>
          )}

          {loginMode === 'mnemonic' && (
            <div className="mb-4">
              <label htmlFor="mnemonic" className="block text-sm font-medium text-slate-700 mb-2">
                助记符
              </label>
              <textarea
                id="mnemonic"
                name="mnemonic"
                value={formData.mnemonic}
                onChange={handleChange}
                rows={3}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none ${
                  errors.mnemonic ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="请输入12个单词的助记符"
                disabled={submitting}
              />
              {errors.mnemonic && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.mnemonic}
                </p>
              )}
            </div>
          )}

          {loginMode === 'wallet' && !needsRegistration && (
            <div className="mb-4">
              <button
                type="button"
                onClick={handleConnectWallet}
                disabled={walletConnecting || submitting}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {walletConnecting ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    连接中...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    连接 Solana 钱包
                  </>
                )}
              </button>
              {walletAddress && (
                <p className="mt-2 text-sm text-slate-600 text-center">
                  已连接: {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                </p>
              )}
            </div>
          )}

          {loginMode === 'wallet' && needsRegistration && (
            <div className="mb-4">
              <label htmlFor="wallet-username" className="block text-sm font-medium text-slate-700 mb-2">
                用户名
              </label>
              <input
                type="text"
                id="wallet-username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none ${
                  errors.username ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="请设置用户名"
                disabled={submitting}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>
          )}

          {loginMode !== 'wallet' || needsRegistration ? (
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none ${
                    errors.password ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="请输入密码"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  disabled={submitting}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.password}
                </p>
              )}
            </div>
          ) : null}

          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 flex items-center gap-2">
                <AlertCircle size={16} />
                {errors.submit}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || (loginMode === 'wallet' && !needsRegistration && !walletAddress)}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                {loginMode === 'wallet' && needsRegistration ? '注册并登录' : '登录'}
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          <p>此登录系统独立于主站点</p>
          <p className="mt-1">在主站点登录不影响资产入库系统</p>
        </div>
      </div>
    </div>
  );
};

export default ArsenalLogin;

