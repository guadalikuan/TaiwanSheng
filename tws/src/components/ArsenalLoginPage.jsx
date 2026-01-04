import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LogIn, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Loader,
  ShieldCheck,
  Package
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ArsenalLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 如果已登录且角色正确，重定向到资产入库页面
  useEffect(() => {
    if (isAuthenticated && user) {
      const allowedRoles = ['SUBMITTER', 'ADMIN'];
      if (allowedRoles.includes(user.role)) {
        const from = location.state?.from?.pathname || '/arsenal';
        navigate(from, { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, location]);

  // 验证表单
  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = '用户名不能为空';
    }
    if (!formData.password) {
      newErrors.password = '密码不能为空';
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

  // 提交登录
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await login(formData.username, formData.password);

      if (result.success) {
        // 等待一下让user状态更新，然后检查角色
        setTimeout(() => {
          // 从localStorage获取最新用户信息
          const storedUser = JSON.parse(localStorage.getItem('tws_user') || 'null');
          const currentUser = storedUser || user;
          
          const allowedRoles = ['SUBMITTER', 'ADMIN'];
          if (currentUser && allowedRoles.includes(currentUser.role)) {
            const from = location.state?.from?.pathname || '/arsenal';
            navigate(from, { replace: true });
          } else {
            setErrors({ submit: '您的账号没有访问权限。此通道仅限资产提交者和管理员使用。' });
            setSubmitting(false);
          }
        }, 200);
      } else {
        setErrors({ submit: result.message || '登录失败，请检查您的凭据' });
        setSubmitting(false);
      }
    } catch (error) {
      console.error('登录错误:', error);
      setErrors({ submit: error.message || '登录失败，请重试' });
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-mono flex items-center justify-center p-4 py-20">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <Package className="w-12 h-12 text-red-500" />
              <ShieldCheck className="w-6 h-6 text-red-400 absolute -bottom-1 -right-1 bg-slate-950 rounded-full p-0.5" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tighter">
            资产入库通道 / ARSENAL ENTRY
          </h1>
          <p className="text-slate-400 text-sm tracking-widest">
            内部专用登录系统 / INTERNAL ACCESS ONLY
          </p>
          <p className="text-red-400 text-xs mt-2">
            仅限大陆开发商和后台管理员使用
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-900/50 border border-red-900/50 rounded-lg p-6 md:p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 用户名输入 */}
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
                } rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all`}
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
                  } rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all pr-12`}
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

          {/* 提示信息 */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            <div className="bg-slate-950/50 border border-slate-800 rounded p-3 text-xs text-slate-400">
              <p className="mb-2">⚠️ 重要提示：</p>
              <ul className="list-disc list-inside space-y-1 text-slate-500">
                <li>此通道仅限已分配账号的大陆开发商和后台管理员使用</li>
                <li>账号由系统管理员统一分配，不提供公开注册</li>
                <li>如忘记密码，请联系系统管理员重置</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArsenalLoginPage;

