import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import sseClient from '../utils/sseClient';
import { useServerStatus } from './ServerStatusContext';

const SSEContext = createContext(null);

/**
 * SSE Provider 组件
 * 提供全局 SSE 连接和数据管理
 */
export const SSEProvider = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState({
    market: null,
    omega: null,
    map: null,
    stats: null
  });
  
  // 使用服务器状态来控制SSE连接
  const { isOnline } = useServerStatus();
  
  // 用于去重的消息 ID 缓存
  const processedMessages = useRef(new Set());
  const MESSAGE_CACHE_SIZE = 1000; // 最多缓存 1000 条消息 ID

  /**
   * 处理接收到的消息
   */
  const handleMessage = useCallback((message) => {
    // 检查消息是否已处理（去重）
    if (processedMessages.current.has(message.id)) {
      return;
    }
    
    // 添加到已处理列表
    processedMessages.current.add(message.id);
    
    // 限制缓存大小
    if (processedMessages.current.size > MESSAGE_CACHE_SIZE) {
      const firstId = processedMessages.current.values().next().value;
      processedMessages.current.delete(firstId);
    }

    // 根据 section 更新数据
    if (message.section && message.data) {
      setData(prevData => {
        const newData = { ...prevData };
        
        if (message.type === 'incremental') {
          // 增量更新
          if (message.section === 'market' && message.data.klinePoint) {
            // K 线数据点增量
            const currentMarket = newData.market || {};
            const klineData = [...(currentMarket.klineData || [])];
            klineData.push({
              id: klineData.length,
              ...message.data.klinePoint
            });
            // 保持最多 60 个数据点
            if (klineData.length > 60) {
              klineData.shift();
            }
            newData.market = {
              ...currentMarket,
              klineData
            };
          } else if (message.section === 'map') {
            // Map 增量更新
            if (message.data.type === 'taiwanLog') {
              const currentMap = newData.map || { taiwan: {}, mainland: {} };
              const taiwanLogs = [...(currentMap.taiwan?.logs || [])];
              taiwanLogs.unshift(message.data.log);
              if (taiwanLogs.length > 6) {
                taiwanLogs.pop();
              }
              newData.map = {
                ...currentMap,
                taiwan: {
                  ...currentMap.taiwan,
                  logs: taiwanLogs,
                  nodeCount: message.data.nodeCount
                }
              };
            } else if (message.data.type === 'assetLog') {
              const currentMap = newData.map || { taiwan: {}, mainland: {} };
              const mainlandLogs = [...(currentMap.mainland?.logs || [])];
              mainlandLogs.unshift(message.data.log);
              if (mainlandLogs.length > 5) {
                mainlandLogs.pop();
              }
              newData.map = {
                ...currentMap,
                mainland: {
                  ...currentMap.mainland,
                  logs: mainlandLogs,
                  assetPoolValue: message.data.assetPoolValue,
                  unitCount: message.data.unitCount
                }
              };
            }
          } else if (message.section === 'omega' && message.data.type === 'event') {
            // Omega 事件增量
            const currentOmega = newData.omega || {};
            newData.omega = {
              ...currentOmega,
              events: message.data.events
            };
          }
        } else {
          // 全量更新
          newData[message.section] = message.data;
        }
        
        return newData;
      });
    }
  }, []);

  /**
   * 订阅特定 section 的数据
   */
  const subscribe = useCallback((section, callback) => {
    const handler = (message) => {
      if (message.section === section) {
        callback(message);
      }
    };
    
    sseClient.on('message', handler);
    
    // 返回取消订阅函数
    return () => {
      sseClient.off('message', handler);
    };
  }, []);

  useEffect(() => {
    // 连接状态监听
    const handleConnected = () => {
      setConnected(true);
    };

    const handleError = (error) => {
      // 完全静默处理连接错误，不输出任何日志
      // 错误信息已通过 UI 横幅显示给用户
      setConnected(false);
    };

    const handleMaxReconnectAttempts = () => {
      // 完全静默处理，不输出日志
      setConnected(false);
    };

    // 消息监听
    sseClient.on('connected', handleConnected);
    sseClient.on('error', handleError);
    sseClient.on('maxReconnectAttempts', handleMaxReconnectAttempts);
    sseClient.on('message', handleMessage);

    // 根据服务器状态控制SSE连接
    if (isOnline) {
      // 服务器在线时，延迟连接，等待服务器状态检查完成
      const connectTimer = setTimeout(() => {
        // 如果已经连接，不需要重新连接
        if (!sseClient.isConnected && (!sseClient.eventSource || sseClient.eventSource.readyState === EventSource.CLOSED)) {
          sseClient.shouldReconnect = true; // 允许重连
          sseClient.connect();
        }
      }, 1000); // 延迟1秒，给服务器状态检查时间

      // 清理
      return () => {
        clearTimeout(connectTimer);
        sseClient.off('connected', handleConnected);
        sseClient.off('error', handleError);
        sseClient.off('maxReconnectAttempts', handleMaxReconnectAttempts);
        sseClient.off('message', handleMessage);
      };
    } else {
      // 服务器离线时，断开连接并禁止重连
      if (sseClient.eventSource) {
        sseClient.shouldReconnect = false; // 禁止重连
        sseClient.disconnect();
      }
      setConnected(false);

      // 清理
      return () => {
        sseClient.off('connected', handleConnected);
        sseClient.off('error', handleError);
        sseClient.off('maxReconnectAttempts', handleMaxReconnectAttempts);
        sseClient.off('message', handleMessage);
      };
    }
  }, [handleMessage, isOnline]);

  const value = {
    connected,
    data,
    subscribe,
    getData: (section) => data[section] || null
  };

  return (
    <SSEContext.Provider value={value}>
      {children}
    </SSEContext.Provider>
  );
};

/**
 * 使用 SSE Context 的 Hook
 */
export const useSSE = () => {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error('useSSE must be used within SSEProvider');
  }
  return context;
};

/**
 * 订阅特定 section 数据的 Hook
 */
export const useSSESection = (section) => {
  const { data, subscribe } = useSSE();
  const [sectionData, setSectionData] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribe(section, (message) => {
      setSectionData(message.data);
    });
    return unsubscribe;
  }, [section, subscribe]);

  // 如果已有缓存数据，直接返回
  useEffect(() => {
    if (data[section]) {
      setSectionData(data[section]);
    }
  }, [section, data]);

  return sectionData;
};

