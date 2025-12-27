import { AMAP_CONFIG } from '../config/amap';

/**
 * 通过高德地图 IP 定位 API 获取用户位置
 * @returns {Promise<{lat: number, lng: number, city: string, province: string} | null>}
 */
export const getIpLocation = async () => {
  try {
    const apiKey = AMAP_CONFIG.apiKey;
    if (!apiKey) {
      console.warn('高德地图 API Key 未配置');
      return null;
    }

    const response = await fetch(
      `${AMAP_CONFIG.ipLocationApi}?key=${apiKey}`
    );
    const data = await response.json();

    console.log('IP 定位响应:', data);

    if (data.status === '1' && data.info === 'OK') {
      // 优先使用 rectangle（范围）取中心点
      if (data.rectangle) {
        try {
          // rectangle 格式: "min_lng,min_lat;max_lng,max_lat"
          const [rect1, rect2] = data.rectangle.split(';');
          const [minLng, minLat] = rect1.split(',').map(Number);
          const [maxLng, maxLat] = rect2.split(',').map(Number);

          const centerLat = (minLat + maxLat) / 2;
          const centerLng = (minLng + maxLng) / 2;

          return {
            lat: centerLat,
            lng: centerLng,
            city: data.city || '未知城市',
            province: data.province || '',
            country: data.country || '中国',
            accuracy: data.accuracy || '',
          };
        } catch (e) {
          console.warn('Rectangle 解析失败，尝试直接坐标:', e);
        }
      }

      // 备选：直接使用坐标
      if (data.lat && data.lng) {
        return {
          lat: parseFloat(data.lat),
          lng: parseFloat(data.lng),
          city: data.city || '未知城市',
          province: data.province || '',
          country: data.country || '中国',
        };
      }
    }

    console.warn('IP 定位失败:', data.info || '未知错误');
    return null;
  } catch (error) {
    console.error('IP 定位请求错误:', error);
    return null;
  }
};