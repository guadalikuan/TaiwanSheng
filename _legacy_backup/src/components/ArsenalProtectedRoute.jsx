import React from 'react';
import { useArsenalAuth } from '../contexts/ArsenalAuthContext';
import { Loader } from 'lucide-react';
import ArsenalLogin from './ArsenalLogin';

/**
 * 资产入库受保护的路由组件
 * 使用独立的认证系统，与主站点认证完全分离
 * 
 * @param {React.ReactNode} children - 要渲染的子组件
 * @param {string[]} allowedRoles - 允许访问的角色数组（可选）
 */
const ArsenalProtectedRoute = ({ children, allowedRoles = [] }) => {
  // React Hooks 必须在组件顶层调用，不能在 try-catch 中
  // 如果 useArsenalAuth 抛出错误，React 会捕获并显示错误信息
  const { isAuthenticated, loading, user } = useArsenalAuth();
  
  // 添加调试日志
  React.useEffect(() => {
    console.log('[ArsenalProtectedRoute] Render:', { 
      isAuthenticated, 
      loading, 
      hasUser: !!user,
      userRole: user?.role 
    });
  }, [isAuthenticated, loading, user]);

  // 显示加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-red-600 mx-auto mb-4 animate-spin" />
          <p className="text-slate-600 text-sm font-medium">
            验证身份中...
          </p>
        </div>
      </div>
    );
  }

  // 未认证，显示登录界面
  if (!isAuthenticated) {
    return <ArsenalLogin onLoginSuccess={() => {}} />;
  }
  
  // 如果已认证但用户信息还未加载，显示加载状态
  if (isAuthenticated && !user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-red-600 mx-auto mb-4 animate-spin" />
          <p className="text-slate-600 text-sm font-medium">
            加载用户信息中...
          </p>
        </div>
      </div>
    );
  }

  // 如果指定了角色权限，检查用户角色
  // ADMIN 角色拥有所有权限，自动允许访问
  if (allowedRoles.length > 0 && user?.role) {
    // 管理员拥有所有权限
    if (user.role === 'ADMIN') {
      // ADMIN 可以访问所有页面，直接通过
    } else if (!allowedRoles.includes(user.role)) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-red-200 rounded-lg p-8 text-center shadow-lg">
            <h2 className="text-2xl font-bold text-red-600 mb-2">访问被拒绝</h2>
            <p className="text-slate-600 mb-4">
              您没有权限访问此页面。需要以下角色之一：{allowedRoles.join(', ')}
            </p>
            <p className="text-slate-500 text-sm">
              当前角色：{user.role}
            </p>
          </div>
        </div>
      );
    }
  }

  // 已认证且权限足够，渲染子组件
  return children;
};

export default ArsenalProtectedRoute;

