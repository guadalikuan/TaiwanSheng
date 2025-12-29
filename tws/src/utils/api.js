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
 * 获取Market屏数据
 * @returns {Promise<Object>}
 */
export const getMarketData = async () => {
  try {
    return await fetchWithRetry(
      `${API_BASE_URL}/api/homepage/market`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      },
      3, // 最多重试3次
      1000 // 基础延迟1秒
    );
  } catch (error) {
    console.error('API getMarketData error:', error);
    
    // 提供更详细的错误信息
    let errorMessage = '网络错误，请检查服务器连接';
    if (error.name === 'AbortError') {
      errorMessage = `请求超时，请检查服务器是否运行在 ${API_BASE_URL}`;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.toString().includes('Failed to fetch')) {
      errorMessage = `无法连接到服务器 ${API_BASE_URL}，请确保后端服务正在运行`;
    }
    
    return { 
      success: false, 
      message: errorMessage,
      error: error.name || 'NetworkError'
    };
  }
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
 * @returns {Promise<Object>}
 */
export const getHomepageAssets = async () => {
  try {
    return await fetchWithRetry(
      `${API_BASE_URL}/api/homepage/assets`,
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
 * 夺取资产（10%溢价机制）
 * @param {number} assetId - 资产ID
 * @param {string} bidMessage - 出价留言
 * @param {string} userAddress - 用户钱包地址
 * @param {string} treasuryAddress - TWS财库地址（可选，默认使用TWSCoin铸造地址）
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
 * 获取用户 TWSCoin 余额
 * @param {string} userAddress - 用户钱包地址
 * @returns {Promise<Object>}
 */
export const getTWSCoinBalanceAPI = async (userAddress) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auction/balance/${userAddress}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return handleResponse(response);
  } catch (error) {
    console.error('API getTWSCoinBalance error:', error);
    return { success: false, message: 'Network error' };
  }
};

