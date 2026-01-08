/**
 * TOT购买工具函数
 * 封装7-11 ibon购买TOT的API调用
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');

/**
 * 获取认证token（从localStorage或context）
 */
function getAuthToken() {
  // 从localStorage获取token
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  return token;
}

/**
 * 创建购买订单
 * @param {number} twdAmount - 新台币金额
 * @param {string} walletAddress - 用户钱包地址
 * @param {string} paymentMethod - 支付方式 (ibon/wechat/alipay)
 * @returns {Promise<Object>} 订单信息
 */
export async function createPurchaseOrder(twdAmount, walletAddress, paymentMethod = 'ibon') {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('请先登录');
    }

    const response = await fetch(`${API_BASE_URL}/api/tot-purchase/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        twdAmount,
        walletAddress,
        paymentMethod
      })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || result.error || '创建订单失败');
    }

    return result;
  } catch (error) {
    console.error('创建订单失败:', error);
    throw error;
  }
}

/**
 * 查询订单状态
 * @param {string} orderId - 订单ID
 * @returns {Promise<Object>} 订单信息
 */
export async function getOrderStatus(orderId) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('请先登录');
    }

    const response = await fetch(`${API_BASE_URL}/api/tot-purchase/order/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || result.error || '查询订单失败');
    }

    return result;
  } catch (error) {
    console.error('查询订单失败:', error);
    throw error;
  }
}

/**
 * 获取当前汇率
 * @returns {Promise<Object>} 汇率信息
 */
export async function getExchangeRate() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tot-purchase/exchange-rate`, {
      method: 'GET'
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || result.error || '获取汇率失败');
    }

    return result.data;
  } catch (error) {
    console.error('获取汇率失败:', error);
    throw error;
  }
}

/**
 * 提交ECPay支付表单
 * @param {string} apiUrl - ECPay API地址
 * @param {Object} params - 支付参数
 */
export function submitECPayForm(apiUrl, params) {
  // 创建隐藏表单
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = apiUrl;
  form.style.display = 'none';

  // 添加所有参数作为隐藏输入
  Object.keys(params).forEach(key => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = params[key];
    form.appendChild(input);
  });

  // 添加到页面并提交
  document.body.appendChild(form);
  form.submit();
  
  // 注意：提交后页面会跳转到ECPay，所以不需要移除表单
}

/**
 * 轮询订单状态
 * @param {string} orderId - 订单ID
 * @param {Function} onUpdate - 状态更新回调
 * @param {Function} onComplete - 完成回调
 * @param {number} interval - 轮询间隔（毫秒）
 * @returns {Function} 停止轮询的函数
 */
export function pollOrderStatus(orderId, onUpdate, onComplete, interval = 3000) {
  let isPolling = true;
  let pollCount = 0;
  const maxPolls = 60; // 最多轮询60次（3分钟）

  const poll = async () => {
    if (!isPolling || pollCount >= maxPolls) {
      if (pollCount >= maxPolls) {
        console.warn('订单状态轮询超时');
      }
      return;
    }

    try {
      const result = await getOrderStatus(orderId);
      const order = result.order;

      if (onUpdate) {
        onUpdate(order);
      }

      // 如果订单已完成或失败，停止轮询
      if (order.status === 'completed' || order.status === 'failed' || order.status === 'expired') {
        isPolling = false;
        if (onComplete) {
          onComplete(order);
        }
        return;
      }

      pollCount++;
      
      // 继续轮询
      if (isPolling) {
        setTimeout(poll, interval);
      }
    } catch (error) {
      console.error('轮询订单状态失败:', error);
      // 即使出错也继续轮询
      pollCount++;
      if (isPolling && pollCount < maxPolls) {
        setTimeout(poll, interval);
      }
    }
  };

  // 开始轮询
  poll();

  // 返回停止函数
  return () => {
    isPolling = false;
  };
}

export default {
  createPurchaseOrder,
  getOrderStatus,
  getExchangeRate,
  submitECPayForm,
  pollOrderStatus
};

