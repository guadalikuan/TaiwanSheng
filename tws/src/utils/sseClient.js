/**
 * SSE (Server-Sent Events) 客户端
 * 封装 EventSource 连接，提供自动重连和错误处理
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');

class SSEClient {
  constructor(url) {
    this.url = url;
    this.eventSource = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // 初始重连延迟 1 秒
    this.isConnected = false;
    this.shouldReconnect = true;
    this.reconnectTimer = null; // 重连定时器
  }

  /**
   * 连接 SSE 服务器
   */
  connect() {
    if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
      return; // 已经连接
    }

    try {
      this.eventSource = new EventSource(this.url);
      
      this.eventSource.onopen = () => {
        // 连接成功时静默处理，不输出日志
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
      };

      this.eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[SSE] 解析消息失败:', error, event.data);
        }
      };

      this.eventSource.onerror = (error) => {
        const state = this.eventSource?.readyState;
        
        // 完全静默处理连接错误，不输出任何日志
        // 错误信息已通过 UI 横幅显示给用户
        
        this.isConnected = false;
        this.emit('error', error);
        
        // 只有在连接关闭时才尝试重连（避免在连接中时重复重连）
        if (state === EventSource.CLOSED) {
          // 检查是否是连接被拒绝错误（服务器未运行）
          const isConnectionRefused = this.reconnectAttempts === 0;
          
          if (this.shouldReconnect) {
            // 如果是连接被拒绝（服务器离线），减少重连尝试
            if (isConnectionRefused) {
              // 服务器离线时，只尝试重连3次，然后停止
              const maxAttemptsForOffline = 3;
              if (this.reconnectAttempts < maxAttemptsForOffline) {
                this.scheduleReconnect();
              } else {
                // 完全静默处理，不输出日志
                this.emit('maxReconnectAttempts');
              }
            } else if (this.reconnectAttempts < this.maxReconnectAttempts) {
              // 其他错误，正常重连
              this.scheduleReconnect();
            } else {
              // 完全静默处理，不输出日志
              this.emit('maxReconnectAttempts');
            }
          }
        }
      };

    } catch (error) {
      // 完全静默处理连接创建失败，不输出日志
      this.emit('error', error);
    }
  }

  /**
   * 处理接收到的消息
   */
  handleMessage(message) {
    // 忽略系统消息（keepalive、connected 等）
    if (message.section === 'system') {
      if (message.type === 'keepalive') {
        // 心跳消息，不做处理
        return;
      }
    }

    // 触发消息事件
    this.emit('message', message);
    
    // 触发特定 section 的事件
    if (message.section) {
      this.emit(`section:${message.section}`, message);
    }
  }

  /**
   * 安排重连
   */
  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000 // 最大延迟 30 秒
    );
    
    // 完全静默处理重连，不输出日志
    
    // 清除之前的重连定时器（如果有）
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectTimer = setTimeout(() => {
      if (this.shouldReconnect) {
        this.disconnect();
        // 延迟一小段时间再连接，避免立即重连
        setTimeout(() => {
          if (this.shouldReconnect) {
            this.connect();
          }
        }, 100);
      }
    }, delay);
  }

  /**
   * 订阅事件
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * 取消订阅
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[SSE] 事件回调错误 (${event}):`, error);
        }
      });
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.shouldReconnect = false;
    
    // 清除重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch (error) {
        // 只在开发环境输出关闭错误
        if (import.meta.env.DEV) {
          console.warn('[SSE] 关闭连接时出错:', error);
        }
      }
      this.eventSource = null;
    }
    this.isConnected = false;
    // 完全静默处理断开连接，不输出日志
  }

  /**
   * 获取连接状态
   */
  getState() {
    if (!this.eventSource) return 'closed';
    return {
      '0': 'connecting',
      '1': 'open',
      '2': 'closed'
    }[this.eventSource.readyState] || 'unknown';
  }
}

// 创建全局 SSE 客户端实例
const sseClient = new SSEClient(`${API_BASE_URL}/api/sse/homepage`);

export default sseClient;

