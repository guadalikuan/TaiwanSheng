/**
 * Jupiter API 工具函数
 * 用于获取 Solana 代币的实时价格和代币信息
 */

/**
 * 获取代币实时价格
 * @param {string} tokenAddress - 代币地址
 * @returns {Promise<Object>} 价格数据
 */
export const fetchJupiterPrice = async (tokenAddress) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

    const response = await fetch(
      `https://price.jup.ag/v3/price?ids=${tokenAddress}`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.data && data.data[tokenAddress]) {
      const tokenData = data.data[tokenAddress];
      return {
        success: true,
        price: parseFloat(tokenData.price) || 0,
        previousPrice: tokenData.previousPrice ? parseFloat(tokenData.previousPrice) : null,
        priceChange24h: tokenData.previousPrice 
          ? ((parseFloat(tokenData.price) - parseFloat(tokenData.previousPrice)) / parseFloat(tokenData.previousPrice)) * 100
          : 0,
        raw: tokenData,
      };
    }

    return {
      success: false,
      error: 'Token price data not found',
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw err;
  }
};

/**
 * 获取代币信息
 * @param {string} tokenAddress - 代币地址
 * @returns {Promise<Object>} 代币信息
 */
export const fetchJupiterTokenInfo = async (tokenAddress) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    // 注意：Jupiter 可能没有专门的 Token Info API
    // 这里可以返回价格API中的额外信息，或者使用其他数据源
    const priceData = await fetchJupiterPrice(tokenAddress);
    
    if (priceData.success) {
      return {
        success: true,
        price: priceData.price,
        priceChange24h: priceData.priceChange24h,
        // 其他信息可以从价格API获取
      };
    }

    return {
      success: false,
      error: 'Failed to fetch token info',
    };
  } catch (err) {
    throw err;
  }
};

/**
 * 批量获取多个代币价格
 * @param {string[]} tokenAddresses - 代币地址数组
 * @returns {Promise<Object>} 价格数据对象
 */
export const fetchJupiterPrices = async (tokenAddresses) => {
  try {
    const ids = tokenAddresses.join(',');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(
      `https://price.jup.ag/v3/price?ids=${ids}`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      data: data.data || {},
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw err;
  }
};

