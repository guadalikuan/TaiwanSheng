// API 调用工具
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:10000';

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
    // 使用资产入库独立的 token
    const token = localStorage.getItem('arsenal_token');
    if (!token) {
      return { success: false, message: '未登录，请先登录资产入库系统' };
    }

    const response = await fetch(`${API_BASE_URL}/api/arsenal/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      throw new Error(errorData.message || errorData.error || 'Failed to submit asset');
    }

    const result = await response.json();
    return result;
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
 * 获取我的资产列表（当前用户提交的所有资产）
 * @returns {Promise<Object>}
 */
export const getMyAssets = async () => {
  try {
    // 使用资产入库独立的 token（如果存在），否则使用主站点 token
    const token = localStorage.getItem('arsenal_token') || localStorage.getItem('tws_token');
    if (!token) {
      return {
        success: false,
        message: '未登录，请先登录',
        error: 'NoToken'
      };
    }
    
    const response = await fetch(`${API_BASE_URL}/api/arsenal/my-assets`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
      
      // 如果是认证错误，返回更友好的错误信息
      if (response.status === 401) {
        return {
          success: false,
          message: '登录已过期，请重新登录',
          error: 'Unauthorized'
        };
      }
      
      return {
        success: false,
        message: errorMessage,
        error: errorData.error || 'RequestFailed'
      };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting my assets:', error);
    // 如果是网络错误，返回友好的错误信息
    if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
      return {
        success: false,
        message: `无法连接到服务器 ${API_BASE_URL}，请确保后端服务正在运行`,
        error: 'NetworkError'
      };
    }
    
    return {
      success: false,
      message: error.message || '加载资产列表失败',
      error: error.name || 'UnknownError'
    };
  }
};

/**
 * 获取待审核资产列表
 * @returns {Promise<Object>}
 */
export const getPendingAssets = async () => {
  try {
    // 使用资产入库独立的 token（如果存在），否则使用主站点 token
    const token = localStorage.getItem('arsenal_token') || localStorage.getItem('tws_token');
    if (!token) {
      return {
        success: false,
        message: '未登录，请先登录',
        error: 'NoToken'
      };
    }
    
    const response = await fetch(`${API_BASE_URL}/api/arsenal/pending`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
      
      if (response.status === 401) {
        return {
          success: false,
          message: '登录已过期，请重新登录',
          error: 'Unauthorized'
        };
      }
      
      return {
        success: false,
        message: errorMessage,
        error: errorData.error || 'RequestFailed'
      };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting pending assets:', error);
    
    // 如果是网络错误，返回友好的错误信息
    if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
      return {
        success: false,
        message: `无法连接到服务器 ${API_BASE_URL}，请确保后端服务正在运行 (npm run dev:backend)`,
        error: 'NetworkError'
      };
    }
    
    return {
      success: false,
      message: error.message || '加载数据失败，请检查后端服务是否运行',
      error: error.name || 'UnknownError'
    };
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
    // 使用资产入库独立的 token（如果存在），否则使用主站点 token
    const token = localStorage.getItem('arsenal_token') || localStorage.getItem('tws_token');
    const response = await fetch(`${API_BASE_URL}/api/arsenal/approve/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(reviewData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
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
    // 使用资产入库独立的 token（如果存在），否则使用主站点 token
    const token = localStorage.getItem('arsenal_token') || localStorage.getItem('tws_token');
    const response = await fetch(`${API_BASE_URL}/api/arsenal/reject/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(reviewData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
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
    // 使用资产入库独立的 token（如果存在），否则使用主站点 token
    const token = localStorage.getItem('arsenal_token') || localStorage.getItem('tws_token');
    const response = await fetch(`${API_BASE_URL}/api/arsenal/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting stats:', error);
    return { success: false, message: error.message || '加载数据失败，请检查后端服务是否运行' };
  }
};

/**
 * 铸造 TWS Land NFT
 * @param {string} id - 资产ID
 * @param {string} mintToAddress - NFT 接收地址（可选）
 * @returns {Promise<Object>}
 */
export const mintNFT = async (id, mintToAddress = null) => {
  try {
    // 使用资产入库独立的 token（如果存在），否则使用主站点 token
    const token = localStorage.getItem('arsenal_token') || localStorage.getItem('tws_token');
    const response = await fetch(`${API_BASE_URL}/api/arsenal/mint-nft/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        mintToAddress: mintToAddress
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to mint NFT');
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error minting NFT:', error);
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
    // 使用资产入库独立的 token（如果存在），否则使用主站点 token
    const token = localStorage.getItem('arsenal_token') || localStorage.getItem('tws_token');
    
    const formData = new FormData();
    formData.append('file', file); // 'file' 必须与 multer 配置的字段名一致 (upload.single('file'))

    const response = await fetch(`${API_BASE_URL}/api/arsenal/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
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
    const url = `${API_BASE_URL}/api/auth/login`;
    console.log('[loginUser] 请求 URL:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    
    console.log('[loginUser] 响应状态:', response.status);
    return await handleResponse(response);
  } catch (error) {
    console.error('API loginUser error:', error);
    console.error('[loginUser] API_BASE_URL:', API_BASE_URL);
    
    // 提供更详细的错误信息
    let errorMessage = error.message || '网络错误，请检查服务器连接';
    
    if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
      errorMessage = `无法连接到服务器 ${API_BASE_URL}。请检查：\n1. 后端服务是否正在运行\n2. 服务器地址是否正确\n3. 网络连接是否正常`;
    }
    
    return { success: false, message: errorMessage, error: error.name || 'NetworkError' };
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
 * 钱包登录（使用签名验证）
 * @param {string} address - 钱包地址
 * @param {string} signature - 签名
 * @param {string} message - 签名的消息
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
 * 钱包注册（使用签名验证）
 * @param {string} address - 钱包地址
 * @param {string} signature - 签名
 * @param {string} message - 签名的消息
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
    if (!token) {
      return { success: false, message: 'No token provided' };
    }
    
    const url = `${API_BASE_URL}/api/auth/me`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        success: false, 
        message: `HTTP ${response.status}` 
      }));
      return errorData;
    }
    
    return await response.json();
  } catch (error) {
    console.error('API getCurrentUser error:', error);
    return { 
      success: false, 
      message: error.message || 'Network error',
      error: 'NetworkError'
    };
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

// ==================== 地堡相关 API ====================

/**
 * 获取实时风险预警
 * @returns {Promise<Object>}
 */
export const getRiskData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/bunker/risk`);
    return await handleResponse(response);
  } catch (error) {
    console.error('Error getting risk data:', error);
    return { success: false, message: 'Network error' };
  }
};

/**
 * 获取社区统计
 * @returns {Promise<Object>}
 */
export const getBunkerStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/bunker/stats`);
    return await handleResponse(response);
  } catch (error) {
    console.error('Error getting bunker stats:', error);
    return { success: false, message: 'Network error' };
  }
};

/**
 * 获取资产的真实避难场景
 * @param {string} assetId - 资产ID
 * @returns {Promise<Object>}
 */
export const getAssetScenario = async (assetId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/bunker/scenario/${assetId}`);
    return await handleResponse(response);
  } catch (error) {
    console.error('Error getting asset scenario:', error);
    return { success: false, message: 'Network error' };
  }
};

/**
 * 获取用户避险能力详情
 * @param {string} userId - 用户ID（可选）
 * @returns {Promise<Object>}
 */
export const getRefugeCapacity = async (userId) => {
  try {
    const url = userId 
      ? `${API_BASE_URL}/api/bunker/refuge-capacity?userId=${userId}`
      : `${API_BASE_URL}/api/bunker/refuge-capacity`;
    const response = await fetch(url);
    return await handleResponse(response);
  } catch (error) {
    console.error('Error getting refuge capacity:', error);
    return { success: false, message: 'Network error' };
  }
};

// ==================== TWS代币相关 API ====================

/**
 * 获取TWS代币价格
 * @param {string} riskLevel - 风险等级
 * @returns {Promise<Object>}
 */
export const getTokenPrice = async (riskLevel = 'MEDIUM') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/token/price?riskLevel=${riskLevel}`);
    return await handleResponse(response);
  } catch (error) {
    console.error('Error getting token price:', error);
    return { success: false, message: 'Network error' };
  }
};

/**
 * 创建TWS代币购买订单
 * @param {number} amount - 购买数量
 * @param {string} riskLevel - 风险等级
 * @param {string} token - JWT token
 * @returns {Promise<Object>}
 */
export const createTokenPurchaseOrder = async (amount, riskLevel = 'MEDIUM', token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/token/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ amount, riskLevel })
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error creating token purchase order:', error);
    return { success: false, message: 'Network error' };
  }
};

/**
 * 验证TWS代币购买
 * @param {string} orderId - 订单ID
 * @param {string} txHash - 交易哈希
 * @param {string} token - JWT token
 * @returns {Promise<Object>}
 */
export const verifyTokenPurchase = async (orderId, txHash, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/token/verify-purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ orderId, txHash })
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error verifying token purchase:', error);
    return { success: false, message: 'Network error' };
  }
};

/**
 * 获取用户TWS代币余额
 * @param {string} address - 用户地址
 * @returns {Promise<Object>}
 */
export const getTokenBalance = async (address) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/token/balance/${address}`);
    return await handleResponse(response);
  } catch (error) {
    console.error('Error getting token balance:', error);
    return { success: false, message: 'Network error' };
  }
};

