import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  registerUser, 
  loginUser, 
  loginWithMnemonic, 
  loginWithWallet,
  registerWithWallet,
  getCurrentUser,
} from '../utils/api';

const ArsenalAuthContext = createContext(null);

export const useArsenalAuth = () => {
  const context = useContext(ArsenalAuthContext);
  if (!context) {
    throw new Error('useArsenalAuth must be used within an ArsenalAuthProvider');
  }
  return context;
};

/**
 * 资产入库独立认证上下文
 * 与主站点的认证完全独立，使用不同的 token 存储键名
 */
export const ArsenalAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // 加载用户信息
  const loadUser = useCallback(async (authToken) => {
    try {
      setLoading(true);
      console.log('[ArsenalAuth] Loading user with token:', authToken ? 'token exists' : 'no token');
      const response = await getCurrentUser(authToken);
      console.log('[ArsenalAuth] getCurrentUser response:', response);
      if (response && response.success) {
        setUser(response.user);
        setIsAuthenticated(true);
        console.log('[ArsenalAuth] User loaded successfully:', response.user?.username);
      } else {
        // Token 无效，清除
        console.log('[ArsenalAuth] Token invalid, clearing...');
        localStorage.removeItem('arsenal_token');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('[ArsenalAuth] Error loading arsenal user:', error);
      localStorage.removeItem('arsenal_token');
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
      console.log('[ArsenalAuth] Loading completed');
    }
  }, []);

  // 从 localStorage 恢复 token（使用独立的键名）
  useEffect(() => {
    const storedToken = localStorage.getItem('arsenal_token');
    if (storedToken) {
      setToken(storedToken);
      // 验证 token 并获取用户信息
      loadUser(storedToken);
    } else {
      setLoading(false);
    }
  }, [loadUser]);

  // 注册
  const register = async (username, password, mnemonic = null) => {
    try {
      const response = await registerUser(username, password, mnemonic);
      if (response.success) {
        setToken(response.token);
        setUser(response.user);
        setIsAuthenticated(true);
        // 使用独立的 token 存储键名
        localStorage.setItem('arsenal_token', response.token);
        return { success: true, mnemonic: response.mnemonic };
      } else {
        return { success: false, message: response.message || '注册失败' };
      }
    } catch (error) {
      console.error('Arsenal registration error:', error);
      return { success: false, message: error.message || '注册失败，请重试' };
    }
  };

  // 登录（用户名/密码）
  const login = async (username, password) => {
    try {
      const response = await loginUser(username, password);
      if (response.success) {
        setToken(response.token);
        setUser(response.user);
        setIsAuthenticated(true);
        // 使用独立的 token 存储键名
        localStorage.setItem('arsenal_token', response.token);
        return { success: true };
      } else {
        return { success: false, message: response.message || '登录失败' };
      }
    } catch (error) {
      console.error('Arsenal login error:', error);
      return { success: false, message: error.message || '登录失败，请重试' };
    }
  };

  // 使用助记符登录
  const loginWithMnemonicAuth = async (mnemonic, password) => {
    try {
      const response = await loginWithMnemonic(mnemonic, password);
      if (response.success) {
        setToken(response.token);
        setUser(response.user);
        setIsAuthenticated(true);
        // 使用独立的 token 存储键名
        localStorage.setItem('arsenal_token', response.token);
        return { success: true };
      } else {
        return { success: false, message: response.message || '登录失败' };
      }
    } catch (error) {
      console.error('Arsenal mnemonic login error:', error);
      return { success: false, message: error.message || '登录失败，请重试' };
    }
  };

  // 钱包登录
  const loginWithWalletAuth = async (address, signature, message) => {
    try {
      const response = await loginWithWallet(address, signature, message);
      if (response.success) {
        setToken(response.token);
        setUser(response.user);
        setIsAuthenticated(true);
        // 使用独立的 token 存储键名
        localStorage.setItem('arsenal_token', response.token);
        return { success: true };
      } else {
        return { 
          success: false, 
          message: response.message || '登录失败',
          needsRegistration: response.needsRegistration || false
        };
      }
    } catch (error) {
      console.error('Arsenal wallet login error:', error);
      return { success: false, message: error.message || '登录失败，请重试' };
    }
  };

  // 钱包注册
  const registerWithWalletAuth = async (address, signature, message, username, password) => {
    try {
      const response = await registerWithWallet(address, signature, message, username, password);
      if (response.success) {
        setToken(response.token);
        setUser(response.user);
        setIsAuthenticated(true);
        // 使用独立的 token 存储键名
        localStorage.setItem('arsenal_token', response.token);
        return { success: true };
      } else {
        return { success: false, message: response.message || '注册失败' };
      }
    } catch (error) {
      console.error('Arsenal wallet registration error:', error);
      return { success: false, message: error.message || '注册失败，请重试' };
    }
  };

  // 登出
  const logout = () => {
    localStorage.removeItem('arsenal_token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    token,
    register,
    login,
    loginWithMnemonic: loginWithMnemonicAuth,
    loginWithWallet: loginWithWalletAuth,
    registerWithWallet: registerWithWalletAuth,
    logout,
  };

  return <ArsenalAuthContext.Provider value={value}>{children}</ArsenalAuthContext.Provider>;
};

