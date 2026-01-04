import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:10000';

const ServerStatusContext = createContext(null);

export const ServerStatusProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [lastCheckTime, setLastCheckTime] = useState(null);
  const [checkInterval, setCheckInterval] = useState(null);

  // 检查服务器状态
  const checkServerStatus = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2秒超时

      // 健康检查端点不在 /api 下，直接在根路径
      const healthUrl = API_BASE_URL.replace('/api', '') + '/health';
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache'
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setIsOnline(true);
        setLastCheckTime(new Date());
        return true;
      } else {
        setIsOnline(false);
        return false;
      }
    } catch (error) {
      setIsOnline(false);
      setLastCheckTime(new Date());
      return false;
    }
  }, []);

  // 初始检查
  useEffect(() => {
    setIsChecking(true);
    checkServerStatus().finally(() => {
      setIsChecking(false);
    });

    // 每30秒检查一次服务器状态
    const interval = setInterval(() => {
      checkServerStatus();
    }, 30000);

    setCheckInterval(interval);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [checkServerStatus]);

  // 手动刷新状态
  const refreshStatus = useCallback(async () => {
    setIsChecking(true);
    const result = await checkServerStatus();
    setIsChecking(false);
    return result;
  }, [checkServerStatus]);

  const value = {
    isOnline,
    isChecking,
    lastCheckTime,
    refreshStatus,
    checkServerStatus
  };

  return (
    <ServerStatusContext.Provider value={value}>
      {children}
    </ServerStatusContext.Provider>
  );
};

// 自定义 Hook
export const useServerStatus = () => {
  const context = useContext(ServerStatusContext);
  if (!context) {
    throw new Error('useServerStatus must be used within a ServerStatusProvider');
  }
  return context;
};

