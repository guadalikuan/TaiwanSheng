import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  LogIn, 
  Key, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Loader,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { validateMnemonic } from '../utils/web3';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithMnemonic, isAuthenticated } = useAuth();
  
  const [loginMode, setLoginMode] = useState('username'); // 'username' or 'mnemonic'
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    mnemonic: ''
  });
  
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 如果已登录，重定向
  useEffect(() => {
    if (isAuthenticated) {
      // 优先使用 URL 参数中的 redirect
      const urlParams = new URLSearchParams(location.search);
      const redirect = urlParams.get('redirect');
      const from = redirect || location.state?.from?.pathname || '/bunker';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

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
      } else if (!validateMnemonic(formData.mnemonic)) {
        newErrors.mnemonic = '无效的助记符格式（需要12个单词）';
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
  };

  // 提交登录
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      let result;
      if (loginMode === 'username') {
        result = await login(formData.username, formData.password);
      } else {
        result = await loginWithMnemonic(formData.mnemonic, formData.password);
      }

      if (result.success) {
        // 登录成功，跳转到目标页面或默认页面
        // 优先使用 URL 参数中的 redirect
        const urlParams = new URLSearchParams(location.search);
        const redirect = urlParams.get('redirect');
        const from = redirect || location.state?.from?.pathname || '/bunker';
        navigate(from, { replace: true });
      } else {
        setErrors({ submit: result.message || '登录失败，请检查您的凭据' });
      }
    } catch (error) {
      console.error('登录错误:', error);
      setErrors({ submit: error.message || '登录失败，请重试' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-mono flex items-center justify-center p-4 py-20">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <LogIn className="w-12 h-12 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tighter">
            身份验证 / IDENTITY VERIFICATION
          </h1>
          <p className="text-slate-400 text-sm tracking-widest">
            WEB3 DIGITAL IDENTITY SYSTEM
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 md:p-8 shadow-xl">
          {/* 登录模式切换 */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => handleModeChange('username')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                loginMode === 'username'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              disabled={submitting}
            >
              用户名登录
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('mnemonic')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                loginMode === 'mnemonic'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              disabled={submitting}
            >
              助记符登录
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 用户名或助记符输入 */}
            {loginMode === 'username' ? (
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
                  placeholder="输入用户名"
                  disabled={submitting}
                  autoComplete="username"
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {errors.username}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  助记符 / MNEMONIC PHRASE
                </label>
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
              </div>
            )}

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
                  placeholder="输入密码"
                  disabled={submitting}
                  autoComplete="current-password"
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
                  登录中...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  登录 / LOGIN
                </>
              )}
            </button>
          </form>

          {/* 注册链接 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              还没有账户？{' '}
              <Link
                to="/register"
                className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
              >
                立即注册
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

