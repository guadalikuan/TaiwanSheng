import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { 
  registerUser, 
  loginUser, 
  loginWithMnemonic, 
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
  const { disconnect, connected } = useWallet();
  const prevConnected = useRef(connected);

  // Sync logout when wallet disconnects externally
  useEffect(() => {
    // Only trigger if we were connected and now we are not (explicit disconnect)
    if (prevConnected.current && !connected) {
        const isWalletLogin = localStorage.getItem('tws_wallet_login');
        if (isWalletLogin) {
            console.log("Wallet disconnected externally, logging out...");
            localStorage.removeItem('tws_token');
            localStorage.removeItem('tws_wallet_login');
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
        }
    }
    prevConnected.current = connected;
  }, [connected]);

  // 从 localStorage 恢复 token 或钱包登录
  useEffect(() => {
    const storedToken = localStorage.getItem('tws_token');
    const walletLogin = localStorage.getItem('tws_wallet_login');
    
    if (storedToken) {
      setToken(storedToken);
      // 验证 token 并获取用户信息
      loadUser(storedToken);
    } else if (walletLogin) {
      // 恢复钱包登录状态
      loginWithWallet(walletLogin);
      setLoading(false);
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

  // 钱包登录
  const loginWithWallet = async (walletAddress) => {
    try {
      // 模拟一个用户对象，或者调用后端API验证钱包签名并创建/获取用户
      // 这里为了简化，直接在前端模拟登录状态
      const walletUser = {
        id: `wallet_${walletAddress.slice(0, 8)}`,
        username: `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`,
        walletAddress: walletAddress,
        role: 'USER', // 默认角色
        isWalletUser: true
      };
      
      setUser(walletUser);
      setIsAuthenticated(true);
      // 注意：这里没有JWT token，所以依赖后端的API可能需要修改以支持无token或钱包签名
      // 暂时存一个标记
      localStorage.setItem('tws_wallet_login', walletAddress);
      
      return { success: true, user: walletUser };
    } catch (error) {
      console.error('Wallet login error:', error);
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('tws_token');
    localStorage.removeItem('tws_wallet_login');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    disconnect().catch(err => console.error("Wallet disconnect failed:", err));
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
    loginWithWallet,
    loginWithMnemonic: loginWithMnemonicAuth,
    logout,
    updateProfile,
    changePassword: changePasswordAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

