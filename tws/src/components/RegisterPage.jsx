import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Key, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Wallet,
  Loader
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { generateMnemonic, validateMnemonic, getAddressFromMnemonic, formatAddress } from '../utils/web3';
import { generateNewMnemonic } from '../utils/api';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    mnemonic: '',
    mnemonicMode: 'auto' // 'auto' or 'manual'
  });
  
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [mnemonicCopied, setMnemonicCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [generatedMnemonic, setGeneratedMnemonic] = useState('');

  // 如果已登录，重定向
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/bunker');
    }
  }, [isAuthenticated, navigate]);

  // 自动生成助记符
  useEffect(() => {
    if (formData.mnemonicMode === 'auto') {
      const newMnemonic = generateMnemonic();
      setGeneratedMnemonic(newMnemonic);
      setFormData(prev => ({ ...prev, mnemonic: newMnemonic }));
    }
  }, [formData.mnemonicMode]);

  // 当助记符改变时，计算钱包地址
  useEffect(() => {
    if (formData.mnemonic && validateMnemonic(formData.mnemonic)) {
      try {
        const address = getAddressFromMnemonic(formData.mnemonic);
        setWalletAddress(address);
      } catch (error) {
        setWalletAddress('');
      }
    } else {
      setWalletAddress('');
    }
  }, [formData.mnemonic]);

  // 验证表单
  const validateForm = () => {
    const newErrors = {};

    // 用户名验证
    if (!formData.username.trim()) {
      newErrors.username = '用户名不能为空';
    } else if (formData.username.length < 3) {
      newErrors.username = '用户名至少需要3个字符';
    } else if (formData.username.length > 20) {
      newErrors.username = '用户名不能超过20个字符';
    }

    // 密码验证
    if (!formData.password) {
      newErrors.password = '密码不能为空';
    } else if (formData.password.length < 6) {
      newErrors.password = '密码至少需要6个字符';
    }

    // 确认密码验证
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致';
    }

    // 助记符验证
    if (!formData.mnemonic.trim()) {
      newErrors.mnemonic = '助记符不能为空';
    } else if (!validateMnemonic(formData.mnemonic)) {
      newErrors.mnemonic = '无效的助记符格式（需要12个单词）';
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

  // 切换助记符模式
  const handleMnemonicModeChange = (mode) => {
    setFormData(prev => ({ ...prev, mnemonicMode: mode, mnemonic: '' }));
    setGeneratedMnemonic('');
    setWalletAddress('');
  };

  // 重新生成助记符
  const handleRegenerateMnemonic = () => {
    const newMnemonic = generateMnemonic();
    setGeneratedMnemonic(newMnemonic);
    setFormData(prev => ({ ...prev, mnemonic: newMnemonic }));
  };

  // 复制助记符
  const handleCopyMnemonic = async () => {
    try {
      await navigator.clipboard.writeText(formData.mnemonic);
      setMnemonicCopied(true);
      setTimeout(() => setMnemonicCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
      alert('复制失败，请手动复制');
    }
  };

  // 提交注册
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await register(
        formData.username,
        formData.password,
        formData.mnemonic
      );

      if (result.success) {
        setRegistrationSuccess(true);
        // 3秒后跳转到地堡页面
        setTimeout(() => {
          navigate('/bunker');
        }, 3000);
      } else {
        setErrors({ submit: result.message || '注册失败，请重试' });
      }
    } catch (error) {
      console.error('注册错误:', error);
      setErrors({ submit: error.message || '注册失败，请重试' });
    } finally {
      setSubmitting(false);
    }
  };

  // 如果注册成功，显示成功页面
  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 font-mono flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/50 border border-cyan-500/30 rounded-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">注册成功</h2>
          <p className="text-slate-400 mb-6">正在跳转到地堡...</p>
          <div className="flex items-center justify-center">
            <Loader className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-mono flex items-center justify-center p-4 py-20">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <ShieldCheck className="w-12 h-12 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tighter">
            身份注册 / IDENTITY REGISTRATION
          </h1>
          <p className="text-slate-400 text-sm tracking-widest">
            WEB3 DIGITAL IDENTITY SYSTEM
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 md:p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 用户名 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                用户名 / USERNAME
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-slate-950 border ${
                  errors.username ? 'border-red-500' : 'border-slate-700'
                } rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all`}
                placeholder="输入用户名（3-20个字符）"
                disabled={submitting}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.username}
                </p>
              )}
            </div>

            {/* 密码 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                密码 / PASSWORD
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-slate-950 border ${
                    errors.password ? 'border-red-500' : 'border-slate-700'
                  } rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all pr-12`}
                  placeholder="输入密码（至少6个字符）"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.password}
                </p>
              )}
            </div>

            {/* 确认密码 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                确认密码 / CONFIRM PASSWORD
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-slate-950 border ${
                    errors.confirmPassword ? 'border-red-500' : 'border-slate-700'
                  } rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all pr-12`}
                  placeholder="再次输入密码"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* 助记符模式选择 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                助记符 / MNEMONIC PHRASE
              </label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => handleMnemonicModeChange('auto')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.mnemonicMode === 'auto'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                  disabled={submitting}
                >
                  自动生成
                </button>
                <button
                  type="button"
                  onClick={() => handleMnemonicModeChange('manual')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.mnemonicMode === 'manual'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                  disabled={submitting}
                >
                  手动输入
                </button>
              </div>

              {/* 助记符输入/显示区域 */}
              {formData.mnemonicMode === 'auto' ? (
                <div className="bg-slate-950 border border-cyan-500/30 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs text-slate-400">生成的助记符（请安全保存）</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRegenerateMnemonic}
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                      disabled={submitting}
                    >
                      重新生成
                    </button>
                  </div>
                  <div className="relative">
                    <textarea
                      name="mnemonic"
                      value={formData.mnemonic}
                      onChange={handleChange}
                      readOnly={formData.mnemonicMode === 'auto'}
                      className={`w-full px-4 py-3 bg-black border ${
                        errors.mnemonic ? 'border-red-500' : 'border-cyan-500/50'
                      } rounded-lg text-white font-mono text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none`}
                      rows={3}
                      placeholder="助记符将自动生成..."
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      onClick={handleCopyMnemonic}
                      className="absolute top-3 right-3 text-slate-400 hover:text-cyan-400 transition-colors"
                      title="复制助记符"
                    >
                      {mnemonicCopied ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.mnemonic && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.mnemonic}
                    </p>
                  )}
                  {/* 钱包地址显示 */}
                  {walletAddress && (
                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                        <Wallet className="w-4 h-4" />
                        <span>钱包地址 / WALLET ADDRESS</span>
                      </div>
                      <p className="text-cyan-400 font-mono text-sm break-all">
                        {walletAddress}
                      </p>
                      <p className="text-slate-500 text-xs mt-1">
                        格式化: {formatAddress(walletAddress)}
                      </p>
                    </div>
                  )}
                  {/* 安全提示 */}
                  <div className="mt-3 p-3 bg-red-900/20 border border-red-900/50 rounded text-xs text-red-400">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    <strong>重要：</strong>请妥善保管您的助记符。丢失助记符将无法恢复账户。
                  </div>
                </div>
              ) : (
                <div>
                  <textarea
                    name="mnemonic"
                    value={formData.mnemonic}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-slate-950 border ${
                      errors.mnemonic ? 'border-red-500' : 'border-slate-700'
                    } rounded-lg text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none`}
                    rows={3}
                    placeholder="输入12个单词的助记符（用空格分隔）"
                    disabled={submitting}
                  />
                  {errors.mnemonic && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.mnemonic}
                    </p>
                  )}
                  {/* 钱包地址显示 */}
                  {walletAddress && (
                    <div className="mt-3 p-3 bg-slate-950 border border-cyan-500/30 rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                        <Wallet className="w-4 h-4" />
                        <span>钱包地址 / WALLET ADDRESS</span>
                      </div>
                      <p className="text-cyan-400 font-mono text-sm break-all">
                        {walletAddress}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 提交错误 */}
            {errors.submit && (
              <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-sm text-red-400 flex items-center gap-2">
                <AlertCircle size={16} />
                {errors.submit}
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-4 bg-red-900/20 border border-red-900/50 text-red-500 hover:bg-red-600 hover:text-white font-bold text-sm tracking-widest rounded-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  注册中...
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  注册 / REGISTER
                </>
              )}
            </button>
          </form>

          {/* 登录链接 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              已有账户？{' '}
              <Link
                to="/login"
                className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
              >
                立即登录
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

