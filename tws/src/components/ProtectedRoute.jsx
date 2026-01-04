import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader } from 'lucide-react';

/**
 * 受保护的路由组件
 * 检查用户认证状态，未认证用户重定向到登录页
 * 
 * @param {React.ReactNode} children - 要渲染的子组件
 * @param {string[]} allowedRoles - 允许访问的角色数组（可选）
 * @param {string} redirectTo - 未认证时重定向的路径（可选，默认 /login）
 */
const ProtectedRoute = ({ children, allowedRoles = [], redirectTo = '/login' }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  // 显示加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-cyan-400 mx-auto mb-4 animate-spin" />
          <p className="text-slate-400 text-sm font-mono tracking-widest">
            VERIFYING IDENTITY...
          </p>
        </div>
      </div>
    );
  }

  // 未认证，重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 如果指定了角色权限，检查用户角色
  if (allowedRoles.length > 0 && user?.role) {
    if (!allowedRoles.includes(user.role)) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900/50 border border-red-900/50 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-red-500 mb-2">访问被拒绝</h2>
            <p className="text-slate-400 mb-4">
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

export default ProtectedRoute;

