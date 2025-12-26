// 高德地图配置
export const AMAP_CONFIG = {
  // 请在此处填入您的高德地图 API Key
  apiKey: '9825256902b62fda10a1f457f80ee90b',
ipLocationApi: "https://restapi.amap.com/v3/ip",
  // 官方样式 ID
  defaultStyleId: 'amap://styles/darkblue',

};

// 加载高德地图脚本 - 使用 v1.4.15 版本
export const loadAMapScript = () => {
  return new Promise((resolve) => {
    if (window.AMap) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=1.4.15&key=${AMAP_CONFIG.apiKey}`;
    script.async = true;
    script.type = 'text/javascript';
    script.onload = () => {
      console.log('AMap v1.4.15 script loaded successfully');
      resolve();
    };
    script.onerror = () => {
      console.error('Failed to load AMap script');
      resolve();
    };
    document.head.appendChild(script);
  });
};