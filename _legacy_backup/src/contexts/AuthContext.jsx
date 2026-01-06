import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  registerUser, 
  loginUser, 
  loginWithMnemonic, 
  loginWithWallet,
  registerWithWallet,
  getCurrentUser,
  updateUserProfile,
  changePassword
} from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // 从 localStorage 恢复 token
  useEffect(() => {
    const storedToken = localStorage.getItem('tws_token');
    if (storedToken) {
      setToken(storedToken);
      // 验证 token 并获取用户信息
      loadUser(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // 加载用户信息
  const loadUser = async (authToken) => {
    try {
      const response = await getCurrentUser(authToken);
      if (response.success) {
        setUser(response.user);
        setIsAuthenticated(true);
      } else {
        // Token 无效，清除
        localStorage.removeItem('tws_token');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      localStorage.removeItem('tws_token');
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // 注册
  const register = async (username, password, mnemonic = null) => {
    try {
      const response = await registerUser(username, password, mnemonic);
      if (response.success) {
        setToken(response.token);
        setUser(response.user);
        setIsAuthenticated(true);
        localStorage.setItem('tws_token', response.token);
        return { success: true, mnemonic: response.mnemonic };
      } else {
        return { success: false, message: response.message || '注册失败' };
      }
    } catch (error) {
      console.error('Registration error:', error);
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
        localStorage.setItem('tws_token', response.token);
        return { success: true };
      } else {
        return { success: false, message: response.message || '登录失败' };
      }
    } catch (error) {
      console.error('Login error:', error);
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
        localStorage.setItem('tws_token', response.token);
        return { success: true };
      } else {
        return { success: false, message: response.message || '登录失败' };
      }
    } catch (error) {
      console.error('Mnemonic login error:', error);
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
        localStorage.setItem('tws_token', response.token);
        return { success: true };
      } else {
        return { 
          success: false, 
          message: response.message || '登录失败',
          needsRegistration: response.needsRegistration || false
        };
      }
    } catch (error) {
      console.error('Wallet login error:', error);
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
        localStorage.setItem('tws_token', response.token);
        return { success: true };
      } else {
        return { success: false, message: response.message || '注册失败' };
      }
    } catch (error) {
      console.error('Wallet registration error:', error);
      return { success: false, message: error.message || '注册失败，请重试' };
    }
  };

  // 登出
  const logout = () => {
    localStorage.removeItem('tws_token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  // 更新用户资料
  const updateProfile = async (profileData) => {
    try {
      const response = await updateUserProfile(profileData, token);
      if (response.success) {
        setUser(response.user);
        return { success: true };
      } else {
        return { success: false, message: response.message || '更新失败' };
      }
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, message: error.message || '更新失败，请重试' };
    }
  };

  // 修改密码
  const changePasswordAuth = async (oldPassword, newPassword) => {
    try {
      const response = await changePassword(oldPassword, newPassword, token);
      if (response.success) {
        return { success: true };
      } else {
        return { success: false, message: response.message || '修改密码失败' };
      }
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, message: error.message || '修改密码失败，请重试' };
    }
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
    updateProfile,
    changePassword: changePasswordAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

