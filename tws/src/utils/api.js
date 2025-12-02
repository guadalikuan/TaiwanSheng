// API 调用工具
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
    return { 
      success: false, 
      message: errorData.message || errorData.error || '请求失败' 
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
    const response = await fetch(`${API_BASE_URL}/api/homepage/omega`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return await handleResponse(response);
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
    const response = await fetch(`${API_BASE_URL}/api/homepage/market`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API getMarketData error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
  }
};

/**
 * 获取Map屏数据
 * @returns {Promise<Object>}
 */
export const getMapData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/homepage/map`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return await handleResponse(response);
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
    const response = await fetch(`${API_BASE_URL}/api/homepage/assets`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('API getHomepageAssets error:', error);
    return { success: false, message: error.message || '网络错误，请检查服务器连接' };
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

