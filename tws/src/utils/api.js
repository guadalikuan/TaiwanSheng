// API 调用工具
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');

// 请求去重缓存（避免短时间内重复请求）
const requestCache = new Map();
const CACHE_DURATION = 500; // 500ms内的重复请求会被去重，减少429错误

/**
 * 统一处理 API 响应
 * @param {Response} response - Fetch 响应对象
 * @returns {Promise<Object>}
 */
const handleResponse = async (response) => {
  // 检查响应状态
  if (!response.ok) {
    // 尝试解析错误响应
    let errorData;
    try {
      const text = await response.text();
      errorData = text ? JSON.parse(text) : { message: `HTTP ${response.status}` };
    } catch {
      errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    // 429错误特殊处理
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      return {
        success: false,
        message: errorData.message || '请求过于频繁，请稍后再试',
        error: 'RateLimitExceeded',
        status: 429,
        retryAfter: retryAfter ? parseInt(retryAfter) : null
      };
    }
    
    return { 
      success: false, 
      message: errorData.message || errorData.error || '请求失败',
      status: response.status
    };
  }

  // 检查响应体是否为空
  const text = await response.text();
  if (!text) {
    return { success: false, message: '服务器返回空响应' };
  }

  // 解析 JSON
  try {
    return JSON.parse(text);
  } catch (parseError) {
    console.error('JSON parse error:', parseError);
    return { success: false, message: '服务器响应格式错误' };
  }
};

/**
 * 带重试机制的fetch请求
 * @param {string} url - 请求URL
 * @param {Object} options - Fetch选项
 * @param {number} maxRetries - 最大重试次数（默认3次）
 * @param {number} baseDelay - 基础延迟（毫秒，默认1000ms）
 * @returns {Promise<Object>}
 */
const fetchWithRetry = async (url, options = {}, maxRetries = 3, baseDelay = 1000) => {
  // 请求去重：检查缓存中是否有相同的请求
  const cacheKey = `${url}_${JSON.stringify(options)}`;
  const cached = requestCache.get(cacheKey);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    // 返回缓存的请求结果
    return cached.promise;
  }
  
  // 创建新的请求Promise
  const requestPromise = (async () => {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const result = await handleResponse(response);
        
        // 如果是429错误且还有重试机会，进行指数退避
        if (result.status === 429 && attempt < maxRetries) {
          const retryAfter = result.retryAfter || null;
          // 对于429错误，使用更长的延迟：2s, 4s, 8s...
          const delay = retryAfter 
            ? retryAfter * 1000  // 使用服务器建议的延迟
            : Math.max(2000, baseDelay * Math.pow(2, attempt + 1)); // 指数退避：2s, 4s, 8s...
          
          console.warn(`请求过于频繁，${delay / 1000}秒后重试 (${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // 请求成功或非429错误，返回结果
        return result;
        
      } catch (error) {
        lastError = error;
        
        // 检查是否是连接被拒绝错误（服务器未运行）
        const isConnectionRefused = error.message?.includes('Failed to fetch') || 
                                   error.message?.includes('ERR_CONNECTION_REFUSED') ||
                                   error.message?.includes('NetworkError') ||
                                   error.name === 'TypeError' ||
                                   error.name === 'AbortError';
        
        // 如果是连接被拒绝，立即返回错误，不进行任何重试
        if (isConnectionRefused) {
          // 完全静默处理连接错误，不输出任何日志
          // 错误信息已通过 UI 横幅显示给用户
          
          // 立即返回错误响应，不进行重试
          return {
            success: false,
            message: '无法连接到服务器。请确保服务器正在运行（npm run dev:backend）',
            error: 'ConnectionRefusedError',
            data: null
          };
        }
        
        // 如果是其他网络错误且还有重试机会，进行指数退避
        // 注意：连接被拒绝的错误已经在上面处理，这里不会执行
        if (attempt < maxRetries && (error.name === 'TypeError' || error.name === 'AbortError')) {
          // 检查是否可能是连接被拒绝（避免在离线时输出警告）
          const mightBeConnectionRefused = error.message?.includes('Failed to fetch') || 
                                          error.message?.includes('ERR_CONNECTION_REFUSED') ||
                                          error.message?.includes('NetworkError');
          if (!mightBeConnectionRefused) {
            const delay = baseDelay * Math.pow(2, attempt);
            console.warn(`请求失败，${delay / 1000}秒后重试 (${attempt + 1}/${maxRetries}):`, error.message);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            // 可能是连接被拒绝，立即返回，不重试
            return {
              success: false,
              message: '无法连接到服务器。请确保服务器正在运行（npm run dev:backend）',
              error: 'ConnectionRefusedError',
              data: null
            };
          }
        }
        
        // 最后一次尝试失败，返回错误响应而不是抛出异常
        if (attempt === maxRetries) {
          return {
            success: false,
            message: error.message || '请求失败，请稍后重试',
            error: error.name || 'NetworkError',
            data: null
          };
        }
      }
    }
    
    // 所有重试都失败，返回错误
    return {
      success: false,
      message: lastError?.message || '请求失败，请稍后重试',
      error: lastError?.name || 'NetworkError'
    };
  })();
  
  // 缓存请求Promise
  requestCache.set(cacheKey, {
    promise: requestPromise,
    timestamp: now
  });
  
  // 清理缓存（CACHE_DURATION后）
  setTimeout(() => {
    requestCache.delete(cacheKey);
  }, CACHE_DURATION);
  
  return requestPromise;
};

/**
 * 提交资产数据
 * @param {Object} formData - 表单数据
 * @returns {Promise<Object>}
 */
export const submitAsset = async (formData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/arsenal/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit asset');
    }

    return await response.json();
  } catch (error) {
    console.error('Error submitting asset:', error);
    throw error;
  }
};

/**
 * 获取脱敏预览
 * @param {string} city - 城市
 * @param {number} area - 面积
 * @returns {Promise<Object>}
 */
export const getPreview = async (city, area) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/arsenal/preview?city=${encodeURIComponent(city)}&area=${area}`
    );

    if (!response.ok) {
      throw new Error('Failed to get preview');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting preview:', error);
    throw error;
  }
};

/**
 * 获取待审核资产列表
 * @returns {Promise<Object>}
 */
export const getPendingAssets = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/arsenal/pending`);
    
    if (!response.ok) {
      throw new Error('Failed to get pending assets');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting pending assets:', error);
    throw error;
  }
};

/**
 * 获取已审核通过的资产列表（用于前端展示）
 * @returns {Promise<Object>}
 */
export const getApprovedAssets = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/arsenal/assets`);
    
    if (!response.ok) {
      throw new Error('Failed to get approved assets');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting approved assets:', error);
    throw error;
  }
};

/**
 * 批准资产
 * @param {string} id - 资产ID
 * @param {Object} reviewData - 审核数据（可选）
 * @returns {Promise<Object>}
 */
export const approveAsset = async (id, reviewData = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/arsenal/approve/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reviewData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to approve asset');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error approving asset:', error);
    throw error;
  }
};

/**
 * 拒绝资产
 * @param {string} id - 资产ID
 * @param {Object} reviewData - 审核数据（可选）
 * @returns {Promise<Object>}
 */
export const rejectAsset = async (id, reviewData = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/arsenal/reject/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reviewData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reject asset');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error rejecting asset:', error);
    throw error;
  }
};

/**
 * 获取统计信息
 * @returns {Promise<Object>}
 */
export const getAssetStats = async () => {
  try {
    const token = localStorage.getItem('tws_token');
    const response = await fetch(`${API_BASE_URL}/api/arsenal/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to get stats');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting stats:', error);
    throw error;
  }
};

/**
 * 生成合同PDF
 * @param {string} id - 资产ID
 * @param {boolean} download - 是否下载（true）或预览（false）
 * @returns {Promise<void>}
 */
export const generateContract = async (id, download = true) => {
  try {
    const token = localStorage.getItem('tws_token');
    const endpoint = download 
      ? `${API_BASE_URL}/api/arsenal/generate-contract/${id}`
      : `${API_BASE_URL}/api/arsenal/contract/${id}`;
    
    const response = await fetch(endpoint, {
      method: download ? 'POST' : 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate contract');
    }
    
    // 获取PDF blob
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    if (download) {
      // 下载PDF
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract_${id}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // 在新窗口预览
      window.open(url, '_blank');
    }
    
    // 清理URL
    setTimeout(() => window.URL.revokeObjectURL(url), 100);
    
    return { success: true };
  } catch (error) {
    console.error('Error generating contract:', error);
    throw error;
  }
};

/**
 * 上传文件
 * @param {File} file - 要上传的文件
 * @returns {Promise<Object>}
 */
export const uploadFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('proofDocs', file); // 'proofDocs' 必须与 multer 配置的字段名一致

    const response = await fetch(`${API_BASE_URL}/api/arsenal/upload`, {
      method: 'POST',
      body: formData,
      // 当使用 FormData 时，浏览器会自动设置 Content-Type: multipart/form-data，无需手动设置
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload file');
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// --- Auth APIs ---

/**
 * 用户注册
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @param {string} mnemonic - 助记符（可选，如果不提供则自动生成）
 * @param {string} role - 角色（可选，默认为 'USER'）
 * @returns {Promise<Object>}
 */
export const registerUser = async (username, password, mnemonic = null, role = 'USER') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, mnemonic, role }),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API registerUser error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 用户登录（用户名/密码）
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Promise<Object>}
 */
export const loginUser = async (username, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API loginUser error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 使用助记符登录
 * @param {string} mnemonic - 助记符
 * @param {string} password - 密码（用于解密助记符）
 * @returns {Promise<Object>}
 */
export const loginWithMnemonic = async (mnemonic, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login-mnemonic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mnemonic, password }),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API loginWithMnemonic error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 钱包登录
 * @param {string} address - 钱包地址
 * @param {string} signature - 签名 (Base64)
 * @param {string} message - 签名消息
 * @returns {Promise<Object>}
 */
export const loginWithWallet = async (address, signature, message) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login-wallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, signature, message }),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API loginWithWallet error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 钱包注册
 * @param {string} address - 钱包地址
 * @param {string} signature - 签名 (Base64)
 * @param {string} message - 签名消息
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Promise<Object>}
 */
export const registerWithWallet = async (address, signature, message, username, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register-wallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, signature, message, username, password }),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API registerWithWallet error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

// ==================== 用户管理 API（仅管理员）====================

/**
 * 获取所有用户（仅管理员）
 * @returns {Promise<Object>}
 */
export const getAllUsers = async () => {
  try {
    const token = localStorage.getItem('tws_token');
    const response = await fetch(`${API_BASE_URL}/api/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API getAllUsers error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取所有房地产开发商账户（仅管理员）
 * @returns {Promise<Object>}
 */
export const getDevelopers = async () => {
  try {
    const token = localStorage.getItem('tws_token');
    if (!token) {
      return { success: false, message: '未登录，请先登录' };
    }
    
    const response = await fetch(`${API_BASE_URL}/api/users/developers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 404) {
        return { success: false, message: 'API路径不存在，请检查后端路由配置' };
      }
      return { 
        success: false, 
        message: errorData.message || `HTTP ${response.status}: ${response.statusText}` 
      };
    }
    
    return await handleResponse(response);
  } catch (error) {
    console.error('API getDevelopers error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 创建房地产开发商账户（仅管理员）
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @param {string} mnemonic - 助记符（可选，不提供则自动生成）
 * @returns {Promise<Object>}
 */
export const createDeveloper = async (username, password, mnemonic = null) => {
  try {
    const token = localStorage.getItem('tws_token');
    const response = await fetch(`${API_BASE_URL}/api/users/developers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ username, password, mnemonic }),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API createDeveloper error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 更新房地产开发商账户（仅管理员）
 * @param {string} address - 钱包地址
 * @param {Object} updates - 更新数据
 * @returns {Promise<Object>}
 */
export const updateDeveloper = async (address, updates) => {
  try {
    const token = localStorage.getItem('tws_token');
    const response = await fetch(`${API_BASE_URL}/api/users/developers/${address}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API updateDeveloper error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 删除房地产开发商账户（仅管理员）
 * @param {string} address - 钱包地址
 * @returns {Promise<Object>}
 */
export const deleteDeveloper = async (address) => {
  try {
    const token = localStorage.getItem('tws_token');
    const response = await fetch(`${API_BASE_URL}/api/users/developers/${address}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API deleteDeveloper error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取当前用户信息
 * @returns {Promise<Object>}
 */
/**
export const getCurrentUser = async () => {
  try {
    const token = localStorage.getItem('tws_token');
    if (!token) return { success: false, message: 'Not logged in' };

    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API getCurrentUser error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};*/

// ==================== 首页数据 API ====================

/**
 * 获取Omega屏数据
 * @returns {Promise<Object>}
 */
export const getOmegaData = async () => {
  try {
    return await fetchWithRetry(
      `${API_BASE_URL}/api/homepage/omega`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      },
      3, // 最多重试3次
      1000 // 基础延迟1秒
    );
  } catch (error) {
    console.error('API getOmegaData error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取市场实时价格
 * @returns {Promise<Object>}
 */
export const getMarketPrice = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/market/price`);
    return await handleResponse(response);
  } catch (error) {
    console.error('API getMarketPrice error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * 获取市场统计数据
 * @returns {Promise<Object>}
 */
export const getMarketStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/market/stats`);
    return await handleResponse(response);
  } catch (error) {
    console.error('API getMarketStats error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * 获取K线数据
 * @param {string} interval - 时间间隔 (1m, 5m, 15m, 1H, 4H, 1D)
 * @param {number} from - 开始时间戳
 * @param {number} to - 结束时间戳
 * @returns {Promise<Object>}
 */
export const getMarketKline = async (interval = '1H', from, to) => {
  try {
    const params = new URLSearchParams({ interval });
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    
    const response = await fetch(`${API_BASE_URL}/api/market/kline?${params.toString()}`);
    return await handleResponse(response);
  } catch (error) {
    console.error('API getMarketKline error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * 获取市场数据（兼容旧代码）
 * @deprecated 请使用 getMarketPrice, getMarketStats, getMarketKline 替代
 */
export const getMarketData = async () => {
  const [priceRes, statsRes] = await Promise.all([
    getMarketPrice(),
    getMarketStats()
  ]);
  
  return {
    success: priceRes.success && statsRes.success,
    data: {
      ...(priceRes.data || {}),
      ...(statsRes.data || {})
    }
  };
};

/**
 * 获取Map屏数据
 * @returns {Promise<Object>}
 */
export const getMapData = async () => {
  try {
    return await fetchWithRetry(
      `${API_BASE_URL}/api/homepage/map`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      },
      3, // 最多重试3次
      1000 // 基础延迟1秒
    );
  } catch (error) {
    console.error('API getMapData error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取访问记录
 * @param {Object} filters - 过滤条件 { route, ip, userId, startDate, endDate, country, limit }
 * @returns {Promise<Object>}
 */
export const getVisitLogs = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (filters.route) queryParams.append('route', filters.route);
    if (filters.ip) queryParams.append('ip', filters.ip);
    if (filters.userId) queryParams.append('userId', filters.userId);
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.country) queryParams.append('country', filters.country);
    if (filters.limit) queryParams.append('limit', filters.limit.toString());

    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/api/homepage/visit-logs${queryString ? `?${queryString}` : ''}`;

    return await fetchWithRetry(
      url,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      },
      3,
      1000
    );
  } catch (error) {
    console.error('API getVisitLogs error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 提交地图资产标注
 * @param {Object} assetData - 资产数据 { lot, location: { lat, lng }, value }
 * @returns {Promise<Object>}
 */
export const postMapAsset = async (assetData) => {
  try {
    return await fetchWithRetry(
      `${API_BASE_URL}/api/homepage/map/asset`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetData)
      },
      3, // 最多重试3次
      1000 // 基础延迟1秒
    );
  } catch (error) {
    console.error('API postMapAsset error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取首页资产列表
 * @param {string} assetType - 资产类型：房产、农田、科创、酒水、文创
 * @returns {Promise<Object>}
 */
export const getHomepageAssets = async (assetType = '房产') => {
  try {
    return await fetchWithRetry(
      `${API_BASE_URL}/api/homepage/assets?type=${encodeURIComponent(assetType)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
      3, // 最多重试3次
      1000 // 基础延迟1秒
    );
  } catch (error) {
    // 连接错误已在 fetchWithRetry 中处理，这里只处理其他错误
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取倒计时信息（开放API）
 * @returns {Promise<Object>}
 */
export const getCountdown = async () => {
  try {
    return await fetchWithRetry(
      `${API_BASE_URL}/api/open/countdown`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
      3, // 最多重试3次
      1000 // 基础延迟1秒
    );
  } catch (error) {
    console.error('API getCountdown error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 根据ID获取单个资产详情
 * @param {string|number} id - 资产ID
 * @returns {Promise<Object>}
 */
export const getAssetById = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/arsenal/assets/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API getAssetById error:', error);
    return { 
      success: false, 
      message: error.message || '网络错误，请检查服务器连接' 
    };
  }
};

/**
 * 获取首页统计信息（在线用户数等）
 * @returns {Promise<Object>}
 */
export const getHomepageStats = async () => {
  try {
    return await fetchWithRetry(
      `${API_BASE_URL}/api/homepage/stats`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      },
      2, // 最多重试2次（统计数据不需要太频繁重试）
      1500 // 基础延迟1.5秒
    );
  } catch (error) {
    console.error('API getHomepageStats error:', error);
    return { 
      success: false, 
      message: error.message || '网络错误，请检查服务器连接' 
    };
  }
};

/**
 * 一次性获取所有首页数据（可选优化）
 * @returns {Promise<Object>}
 */
export const getAllHomepageData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/homepage/all`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API getAllHomepageData error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取当前用户信息
 * @param {string} token - JWT token
 * @returns {Promise<Object>}
 */
export const getCurrentUser = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  } catch (error) {
    console.error('API getCurrentUser error:', error);
    return { success: false, message: 'Network error' };
  }
};

/**
 * 更新用户资料
 * @param {Object} profileData - 要更新的资料
 * @param {string} token - JWT token
 * @returns {Promise<Object>}
 */
export const updateUserProfile = async (profileData, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });
    return response.json();
  } catch (error) {
    console.error('API updateUserProfile error:', error);
    return { success: false, message: 'Network error' };
  }
};

/**
 * 修改密码
 * @param {string} oldPassword - 旧密码
 * @param {string} newPassword - 新密码
 * @param {string} token - JWT token
 * @returns {Promise<Object>}
 */
export const changePassword = async (oldPassword, newPassword, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    return response.json();
  } catch (error) {
    console.error('API changePassword error:', error);
    return { success: false, message: 'Network error' };
  }
};

/**
 * 生成新的助记符
 * @returns {Promise<Object>}
 */
export const generateNewMnemonic = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/generate-mnemonic`);
    return response.json();
  } catch (error) {
    console.error('API generateNewMnemonic error:', error);
    return { success: false, message: 'Network error' };
  }
};

// ==================== 拍卖相关 API ====================

/**
 * 获取拍卖信息
 * @param {number} assetId - 资产ID
 * @returns {Promise<Object>}
 */
export const getAuctionInfo = async (assetId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auction/${assetId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return handleResponse(response);
  } catch (error) {
    console.error('API getAuctionInfo error:', error);
    return { success: false, message: 'Network error' };
  }
};

/**
 * 获取拍卖列表
 * @param {string} status - 状态筛选 (active|pending|completed)
 * @returns {Promise<Object>}
 */
export const getAuctionList = async (status) => {
  try {
    const url = status 
      ? `${API_BASE_URL}/api/auction/list?status=${status}`
      : `${API_BASE_URL}/api/auction/list`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return handleResponse(response);
  } catch (error) {
    console.error('API getAuctionList error:', error);
    return { success: false, message: 'Network error' };
  }
};

/**
 * 创建新拍卖
 * @param {Object} data - 拍卖数据
 * @param {string} data.assetName - 资产名称
 * @param {string} data.description - 资产描述
 * @param {number} data.startPrice - 起拍价（TOT）
 * @param {string} data.imageUrl - 图片URL
 * @param {string} data.location - 位置
 * @param {string} data.originalOwner - 原主信息
 * @param {string} data.tauntMessage - 初始留言
 * @param {string} data.creatorAddress - 创建者地址
 * @param {string} data.txSignature - 交易签名（可选）
 * @returns {Promise<Object>}
 */
export const createAuction = async (data) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auction/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  } catch (error) {
    console.error('API createAuction error:', error);
    return { success: false, message: 'Network error' };
  }
};

/**
 * 夺取资产（10%溢价机制）
 * @param {number} assetId - 资产ID
 * @param {string} bidMessage - 出价留言
 * @param {string} userAddress - 用户钱包地址
 * @param {string} treasuryAddress - TaiOne财库地址（可选，默认使用TaiOneToken铸造地址）
 * @returns {Promise<Object>}
 */
export const seizeAuctionAsset = async (assetId, bidMessage, userAddress, treasuryAddress = null) => {
  try {
    const token = localStorage.getItem('tws_token');
    const body = {
      bidMessage,
      userAddress,
    };
    // 只有当提供了 treasuryAddress 时才添加到请求体
    if (treasuryAddress) {
      body.treasuryAddress = treasuryAddress;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/auction/${assetId}/seize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  } catch (error) {
    console.error('API seizeAuctionAsset error:', error);
    return { success: false, message: 'Network error' };
  }
};

/**
 * 获取用户 TaiOneToken 余额
 * @param {string} userAddress - 用户钱包地址
 * @returns {Promise<Object>}
 */
export const getTaiOneTokenBalanceAPI = async (userAddress) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auction/balance/${userAddress}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return handleResponse(response);
  } catch (error) {
    console.error('API getTaiOneTokenBalance error:', error);
    return { success: false, message: 'Network error' };
  }
};

/**
 * 消耗Token用于标记（祖籍或祖产）
 * @param {string} type - 类型：'origin' 或 'property'
 * @param {string} walletAddress - 用户钱包地址
 * @returns {Promise<Object>}
 */
export const consumeTokenForMarking = async (type, walletAddress) => {
  try {
    const token = localStorage.getItem('tws_token');
    const response = await fetch(`${API_BASE_URL}/api/ancestor/consume-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ walletAddress, type })
    });
    return handleResponse(response);
  } catch (error) {
    console.error('API consumeTokenForMarking error:', error);
    return { success: false, message: 'Network error' };
  }
};

/**
 * 标记祖籍
 * @param {Object} data - 祖籍数据
 * @returns {Promise<Object>}
 */
export const markAncestorOrigin = async (data) => {
  try {
    const token = localStorage.getItem('tws_token');
    const response = await fetch(`${API_BASE_URL}/api/ancestor/mark-origin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  } catch (error) {
    console.error('API markAncestorOrigin error:', error);
    return { success: false, message: 'Network error' };
  }
};

/**
 * 标记祖产
 * @param {Object} data - 祖产数据
 * @returns {Promise<Object>}
 */
export const markAncestorProperty = async (data) => {
  try {
    const token = localStorage.getItem('tws_token');
    const response = await fetch(`${API_BASE_URL}/api/ancestor/mark-property`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  } catch (error) {
    console.error('API markAncestorProperty error:', error);
    return { success: false, message: 'Network error' };
  }
};

/**
 * 获取标记列表
 * @param {string} walletAddress - 用户钱包地址
 * @param {string} type - 类型：'origin' | 'property' | undefined（全部）
 * @returns {Promise<Object>}
 */
export const getAncestorMarks = async (walletAddress, type) => {
  try {
    const token = localStorage.getItem('tws_token');
    const params = new URLSearchParams({ walletAddress });
    if (type) {
      params.append('type', type);
    }
    const response = await fetch(`${API_BASE_URL}/api/ancestor/list?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    return handleResponse(response);
  } catch (error) {
    console.error('API getAncestorMarks error:', error);
    return { success: false, message: 'Network error' };
  }
};

/**
 * 获取单个标记详情
 * @param {string} id - 标记ID
 * @returns {Promise<Object>}
 */
export const getAncestorMark = async (id) => {
  try {
    const token = localStorage.getItem('tws_token');
    const response = await fetch(`${API_BASE_URL}/api/ancestor/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    return handleResponse(response);
  } catch (error) {
    console.error('API getAncestorMark error:', error);
    return { success: false, message: 'Network error' };
  }
};

/**
 * 上传证明文件
 * @param {File} file - 要上传的文件
 * @returns {Promise<Object>}
 */
export const uploadAncestorProof = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('tws_token');
    const response = await fetch(`${API_BASE_URL}/api/ancestor/upload`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: formData
    });
    return handleResponse(response);
  } catch (error) {
    console.error('API uploadAncestorProof error:', error);
    return { success: false, message: 'Network error' };
  }
};

/**
 * 创建科技项目
 * @param {Object} projectData - 项目数据
 * @returns {Promise<Object>}
 */
export const createTechProject = async (projectData) => {
  try {
    const token = localStorage.getItem('tws_token');
    return await fetchWithRetry(
      `${API_BASE_URL}/api/tech-project/create`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(projectData)
      },
      3,
      1000
    );
  } catch (error) {
    console.error('API createTechProject error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取科技项目详情
 * @param {string} projectId - 项目ID
 * @returns {Promise<Object>}
 */
export const getTechProject = async (projectId) => {
  try {
    return await fetchWithRetry(
      `${API_BASE_URL}/api/tech-project/${projectId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
      3,
      1000
    );
  } catch (error) {
    console.error('API getTechProject error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取科技项目列表
 * @param {Object} filters - 筛选条件（status, category）
 * @returns {Promise<Object>}
 */
export const getTechProjects = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.category) params.append('category', filters.category);
    
    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/tech-project${queryString ? `?${queryString}` : ''}`;
    
    return await fetchWithRetry(
      url,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
      3,
      1000
    );
  } catch (error) {
    console.error('API getTechProjects error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 投资科技项目
 * @param {string} projectId - 项目ID
 * @param {number} amount - 投资金额（TaiOneToken）
 * @param {string} txSignature - 交易签名
 * @returns {Promise<Object>}
 */
export const investTechProject = async (projectId, amount, txSignature) => {
  try {
    const token = localStorage.getItem('tws_token');
    return await fetchWithRetry(
      `${API_BASE_URL}/api/tech-project/${projectId}/invest`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ amount, txSignature })
      },
      3,
      1000
    );
  } catch (error) {
    console.error('API investTechProject error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取项目的投资者列表
 * @param {string} projectId - 项目ID
 * @returns {Promise<Object>}
 */
export const getProjectInvestors = async (projectId) => {
  try {
    return await fetchWithRetry(
      `${API_BASE_URL}/api/tech-project/${projectId}/investors`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
      3,
      1000
    );
  } catch (error) {
    console.error('API getProjectInvestors error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取我的投资记录
 * @param {string} walletAddress - 钱包地址
 * @returns {Promise<Object>}
 */
export const getMyInvestments = async (walletAddress) => {
  try {
    const token = localStorage.getItem('tws_token');
    return await fetchWithRetry(
      `${API_BASE_URL}/api/investments/my?walletAddress=${encodeURIComponent(walletAddress)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
      },
      3,
      1000
    );
  } catch (error) {
    console.error('API getMyInvestments error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取我的所有资产数据（聚合）
 * @param {string} walletAddress - 钱包地址
 * @returns {Promise<Object>}
 */
export const getMyAssetsAll = async (walletAddress) => {
  try {
    const token = localStorage.getItem('tws_token');
    return await fetchWithRetry(
      `${API_BASE_URL}/api/my-assets/all?walletAddress=${encodeURIComponent(walletAddress)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
      },
      3,
      1000
    );
  } catch (error) {
    console.error('API getMyAssetsAll error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取我购买的资产
 * @param {string} walletAddress - 钱包地址
 * @returns {Promise<Object>}
 */
export const getMyPurchasedAssets = async (walletAddress) => {
  try {
    const token = localStorage.getItem('tws_token');
    return await fetchWithRetry(
      `${API_BASE_URL}/api/my-assets/purchased?walletAddress=${encodeURIComponent(walletAddress)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
      },
      3,
      1000
    );
  } catch (error) {
    console.error('API getMyPurchasedAssets error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取我参与的拍卖
 * @param {string} walletAddress - 钱包地址
 * @returns {Promise<Object>}
 */
export const getMyAuctions = async (walletAddress) => {
  try {
    const token = localStorage.getItem('tws_token');
    return await fetchWithRetry(
      `${API_BASE_URL}/api/my-assets/auctions?walletAddress=${encodeURIComponent(walletAddress)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
      },
      3,
      1000
    );
  } catch (error) {
    console.error('API getMyAuctions error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取我的预测下注记录
 * @param {string} walletAddress - 钱包地址
 * @returns {Promise<Object>}
 */
export const getMyBets = async (walletAddress) => {
  try {
    const token = localStorage.getItem('tws_token');
    return await fetchWithRetry(
      `${API_BASE_URL}/api/my-assets/bets?walletAddress=${encodeURIComponent(walletAddress)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
      },
      3,
      1000
    );
  } catch (error) {
    console.error('API getMyBets error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取预测市场列表
 * @returns {Promise<Object>}
 */
export const getPredictionMarkets = async () => {
  try {
    return await fetchWithRetry(
      `${API_BASE_URL}/api/prediction/markets`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      3,
      1000
    );
  } catch (error) {
    console.error('API getPredictionMarkets error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

// ==================== RWA交易API ====================

/**
 * 创建购买需求
 */
export const createBuyRequest = async (buyRequestData) => {
  try {
    const token = localStorage.getItem('tws_token');
    const response = await fetch(`${API_BASE_URL}/api/rwa-trade/buy-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(buyRequestData)
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API createBuyRequest error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取我的购买需求列表
 */
export const getBuyRequests = async () => {
  try {
    const token = localStorage.getItem('tws_token');
    const response = await fetch(`${API_BASE_URL}/api/rwa-trade/buy-requests`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API getBuyRequests error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取推荐房源
 */
export const getRecommendations = async (buyRequestId, buyRequest, limit = 10) => {
  try {
    const token = localStorage.getItem('tws_token');
    const response = await fetch(`${API_BASE_URL}/api/rwa-trade/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ buyRequestId, buyRequest, limit })
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API getRecommendations error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 锁定资产
 */
export const lockAsset = async (assetId, txSignature) => {
  try {
    const token = localStorage.getItem('tws_token');
    const response = await fetch(`${API_BASE_URL}/api/rwa-trade/lock/${assetId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ txSignature })
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API lockAsset error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 确认购买
 */
export const confirmPurchase = async (assetId, txSignature) => {
  try {
    const token = localStorage.getItem('tws_token');
    const response = await fetch(`${API_BASE_URL}/api/rwa-trade/confirm/${assetId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ txSignature })
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API confirmPurchase error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 释放锁定
 */
export const releaseLock = async (assetId) => {
  try {
    const token = localStorage.getItem('tws_token');
    const response = await fetch(`${API_BASE_URL}/api/rwa-trade/release/${assetId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API releaseLock error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取我的锁定列表
 */
export const getMyLocks = async () => {
  try {
    const token = localStorage.getItem('tws_token');
    const response = await fetch(`${API_BASE_URL}/api/rwa-trade/locks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API getMyLocks error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 创建卖单
 */
export const createSellOrder = async (orderData) => {
  try {
    const token = localStorage.getItem('tws_token');
    const response = await fetch(`${API_BASE_URL}/api/rwa-trade/sell-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(orderData)
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API createSellOrder error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 创建买单
 */
export const createBuyOrder = async (orderData) => {
  try {
    const token = localStorage.getItem('tws_token');
    const response = await fetch(`${API_BASE_URL}/api/rwa-trade/buy-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(orderData)
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API createBuyOrder error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取订单簿
 */
export const getOrderBook = async (city = null, limit = 20) => {
  try {
    const params = new URLSearchParams();
    if (city) params.append('city', city);
    params.append('limit', limit.toString());
    
    const response = await fetch(`${API_BASE_URL}/api/rwa-trade/order-book?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API getOrderBook error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取我的订单
 */
export const getMyOrders = async (orderType = null, status = null) => {
  try {
    const token = localStorage.getItem('tws_token');
    const params = new URLSearchParams();
    if (orderType) params.append('orderType', orderType);
    if (status) params.append('status', status);
    
    const response = await fetch(`${API_BASE_URL}/api/rwa-trade/orders?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API getMyOrders error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 取消订单
 */
export const cancelOrder = async (orderId) => {
  try {
    const token = localStorage.getItem('tws_token');
    const response = await fetch(`${API_BASE_URL}/api/rwa-trade/order/${orderId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API cancelOrder error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取交易历史
 */
export const getTradeHistory = async (userId = null, assetId = null, limit = 50) => {
  try {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (assetId) params.append('assetId', assetId);
    params.append('limit', limit.toString());
    
    const response = await fetch(`${API_BASE_URL}/api/rwa-trade/trades?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API getTradeHistory error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取交易统计
 */
export const getTradeStats = async (timeWindow = 24 * 60 * 60 * 1000) => {
  try {
    const params = new URLSearchParams();
    params.append('timeWindow', timeWindow.toString());
    
    const response = await fetch(`${API_BASE_URL}/api/rwa-trade/stats?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API getTradeStats error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 赎回资产
 */
export const redeemAsset = async (assetId, reason = '') => {
  try {
    const token = localStorage.getItem('arsenal_token');
    const response = await fetch(`${API_BASE_URL}/api/arsenal/redeem/${assetId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reason })
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API redeemAsset error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取赎回历史
 */
export const getRedeemHistory = async () => {
  try {
    const token = localStorage.getItem('arsenal_token');
    const response = await fetch(`${API_BASE_URL}/api/arsenal/redeem-history`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API getRedeemHistory error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

