import fetch from 'node-fetch';

// 高德地图配置（从环境变量或配置文件读取）
const AMAP_API_KEY = process.env.AMAP_API_KEY || '9825256902b62fda10a1f457f80ee90b';
const AMAP_IP_API = 'https://restapi.amap.com/v3/ip';

/**
 * 通过高德地图API获取IP地理位置（服务端版本）
 * @param {string} ip - IP地址
 * @returns {Promise<{lat: number, lng: number, city: string, province: string, country: string} | null>}
 */
export const getIpGeolocation = async (ip) => {
  try {
    // 跳过本地IP和私有IP
    if (!ip || 
        ip === '127.0.0.1' || 
        ip === '::1' || 
        ip === 'localhost' ||
        ip.startsWith('192.168.') || 
        ip.startsWith('10.') ||
        ip.startsWith('172.16.') ||
        ip.startsWith('172.17.') ||
        ip.startsWith('172.18.') ||
        ip.startsWith('172.19.') ||
        ip.startsWith('172.20.') ||
        ip.startsWith('172.21.') ||
        ip.startsWith('172.22.') ||
        ip.startsWith('172.23.') ||
        ip.startsWith('172.24.') ||
        ip.startsWith('172.25.') ||
        ip.startsWith('172.26.') ||
        ip.startsWith('172.27.') ||
        ip.startsWith('172.28.') ||
        ip.startsWith('172.29.') ||
        ip.startsWith('172.30.') ||
        ip.startsWith('172.31.')) {
      return null;
    }

    if (!AMAP_API_KEY) {
      console.warn('高德地图 API Key 未配置');
      return null;
    }

    const response = await fetch(
      `${AMAP_IP_API}?key=${AMAP_API_KEY}&ip=${ip}`
    );
    const data = await response.json();

    if (data.status === '1' && data.info === 'OK') {
      // 优先使用 rectangle（范围）取中心点
      if (data.rectangle && typeof data.rectangle === 'string') {
        try {
          const parts = data.rectangle.split(';');
          if (parts.length === 2) {
            const [rect1, rect2] = parts;
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
          }
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

    return null;
  } catch (error) {
    console.error('IP定位请求错误:', error);
    return null;
  }
};

/**
 * 获取客户端真实IP地址
 * @param {Object} req - Express请求对象
 * @returns {string} IP地址
 */
export const getClientIp = (req) => {
  // 优先从 x-forwarded-for 获取（处理代理情况）
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for 可能包含多个IP，取第一个
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0];
  }

  // 其次从 x-real-ip 获取
  if (req.headers['x-real-ip']) {
    return req.headers['x-real-ip'];
  }

  // 从连接对象获取
  if (req.ip) {
    return req.ip;
  }

  // 从socket获取
  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress;
  }

  // 从connection获取（旧版Express）
  if (req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress;
  }

  // 默认值
  return '127.0.0.1';
};

