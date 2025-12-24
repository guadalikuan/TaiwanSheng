// 高德地图配置
export const AMAP_CONFIG = {
  // 请在此处填入您的高德地图 API Key
  apiKey: '9825256902b62fda10a1f457f80ee90b',
  
  // 地图瓦片服务配置
  tileLayer: {
    // 标准地图
    normal: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    // 卫星地图
    satellite: 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
    // 路网地图
    road: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}',
  },
  
  // 子域名配置
  subdomains: ['1', '2', '3', '4'],
  
  // 地图样式配置
  mapStyles: {
    dark: {
      // 深色主题配置
      style: 'amap://styles/dark',
      tileUrl: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}'
    },
    normal: {
      // 标准主题配置
      style: 'amap://styles/normal',
      tileUrl: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}'
    }
  }
};

// 高德地图初始化函数
export const initAMap = (containerId, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!window.AMap) {
      // 动态加载高德地图 JS API
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_CONFIG.apiKey}`;
      script.onload = () => {
        const map = new window.AMap.Map(containerId, {
          zoom: options.zoom || 10,
          center: options.center || [116.397428, 39.90923],
          viewMode: '3D',
          mapStyle: options.style || AMAP_CONFIG.mapStyles.normal.style,
          ...options
        });
        resolve(map);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    } else {
      const map = new window.AMap.Map(containerId, {
        zoom: options.zoom || 10,
        center: options.center || [116.397428, 39.90923],
        viewMode: '3D',
        mapStyle: options.style || AMAP_CONFIG.mapStyles.normal.style,
        ...options
      });
      resolve(map);
    }
  });
};

// Leaflet 与高德地图集成配置
export const AMAP_LEAFLET_CONFIG = {
  // 高德地图瓦片服务 URL
  tileUrl: AMAP_CONFIG.tileLayer.normal,
  subdomains: AMAP_CONFIG.subdomains,
  
  // 地图参数
  maxZoom: 19,
  minZoom: 3,
  
  // 版权信息
  attribution: '&copy; <a href="https://ditu.amap.com/">高德地图</a>'
};