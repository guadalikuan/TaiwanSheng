/**
 * 高德地图 API 封装工具
 * 提供 POI 搜索、地理编码、逆地理编码等功能
 */

const AMAP_API_KEY = import.meta.env.VITE_AMAP_API_KEY;

/**
 * 检查高德地图 API Key 是否已配置
 * @returns {boolean}
 */
export const isAmapConfigured = () => {
  return !!(AMAP_API_KEY && AMAP_API_KEY.trim().length > 0);
};

/**
 * 高德地图 POI 关键词搜索
 * @param {string} keywords - 搜索关键词（如："信达辰樾府"）
 * @param {string} city - 城市名称（可选，用于限制搜索范围）
 * @param {number} limit - 返回结果数量限制（默认 10）
 * @returns {Promise<Array>} 返回搜索结果数组
 */
export const searchAmapPOI = async (keywords, city = '', limit = 10) => {
  if (!isAmapConfigured()) {
    throw new Error('高德地图 API Key 未配置');
  }

  try {
    const cityParam = city ? `&city=${encodeURIComponent(city)}` : '';
    const url = `https://restapi.amap.com/v3/place/text?key=${AMAP_API_KEY}&keywords=${encodeURIComponent(keywords)}${cityParam}&offset=${limit}&page=1&extensions=all&output=json`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === '1' && data.info === 'OK' && data.pois) {
      // 转换高德地图返回格式为统一格式
      return data.pois.map(poi => ({
        name: poi.name || '',
        address: poi.address || poi.pname + poi.cityname + poi.adname || '',
        location: poi.location ? poi.location.split(',').map(Number) : null,
        lat: poi.location ? parseFloat(poi.location.split(',')[1]) : null,
        lng: poi.location ? parseFloat(poi.location.split(',')[0]) : null,
        province: poi.pname || '',
        city: poi.cityname || '',
        district: poi.adname || '',
        type: poi.type || '',
        typecode: poi.typecode || '',
        // 高德地图特有字段
        _amap: true,
        _displayName: `${poi.name}${poi.address ? ' - ' + poi.address : ''}`,
      }));
    } else {
      throw new Error(data.info || '高德地图搜索失败');
    }
  } catch (error) {
    console.error('高德地图 POI 搜索错误:', error);
    throw error;
  }
};

/**
 * 高德地图逆地理编码（坐标 -> 地址）
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 * @returns {Promise<Object>} 返回地址信息
 */
export const reverseGeocodeAmap = async (lat, lng) => {
  if (!isAmapConfigured()) {
    throw new Error('高德地图 API Key 未配置');
  }

  try {
    const url = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_API_KEY}&location=${lng},${lat}&radius=1000&extensions=all&output=json`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === '1' && data.info === 'OK' && data.regeocode) {
      const addressComponent = data.regeocode.addressComponent || {};
      const formattedAddress = data.regeocode.formatted_address || '';
      
      return {
        address: formattedAddress,
        province: addressComponent.province || '',
        city: addressComponent.city || addressComponent.citycode || '',
        district: addressComponent.district || '',
        street: addressComponent.street || '',
        streetNumber: addressComponent.streetNumber || '',
        // 详细地址拼接
        fullAddress: [
          addressComponent.province,
          addressComponent.city,
          addressComponent.district,
          addressComponent.township,
          addressComponent.street,
          addressComponent.streetNumber,
        ].filter(Boolean).join(''),
        // 高德地图特有字段
        _amap: true,
      };
    } else {
      throw new Error(data.info || '高德地图逆地理编码失败');
    }
  } catch (error) {
    console.error('高德地图逆地理编码错误:', error);
    throw error;
  }
};

/**
 * 高德地图地理编码（地址 -> 坐标）
 * @param {string} address - 地址字符串
 * @param {string} city - 城市名称（可选，用于提高准确性）
 * @returns {Promise<Object>} 返回坐标信息
 */
export const geocodeAmap = async (address, city = '') => {
  if (!isAmapConfigured()) {
    throw new Error('高德地图 API Key 未配置');
  }

  try {
    const cityParam = city ? `&city=${encodeURIComponent(city)}` : '';
    const url = `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_API_KEY}&address=${encodeURIComponent(address)}${cityParam}&output=json`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === '1' && data.info === 'OK' && data.geocodes && data.geocodes.length > 0) {
      const geocode = data.geocodes[0];
      const location = geocode.location ? geocode.location.split(',').map(Number) : null;
      
      return {
        lat: location ? location[1] : null,
        lng: location ? location[0] : null,
        formattedAddress: geocode.formatted_address || address,
        province: geocode.province || '',
        city: geocode.city || '',
        district: geocode.district || '',
        // 高德地图特有字段
        _amap: true,
      };
    } else {
      throw new Error(data.info || '高德地图地理编码失败');
    }
  } catch (error) {
    console.error('高德地图地理编码错误:', error);
    throw error;
  }
};

