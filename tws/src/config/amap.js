// 高德地图配置
export const AMAP_CONFIG = {
  // 请在此处填入您的高德地图 API Key
  apiKey: '9825256902b62fda10a1f457f80ee90b',
  
  // JSAPI 1.4.15 的 mapStyle 格式 - 使用正确的字符串数组格式
  mapStyle: [
    'amap://styles/normal',  // 先使用正常样式作为基础
    {
      featureType: 'land',
      elementType: 'geometry',
      stylers: {
        color: '#1a1a2e'
      }
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: {
        color: '#16213e'
      }
    },
    {
      featureType: 'building',
      elementType: 'geometry',
      stylers: {
        color: '#0f3460'
      }
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: {
        color: '#2d3e50'
      }
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: {
        color: '#34495e'
      }
    },
    {
      featureType: 'text',
      elementType: 'labels.text.fill',
      stylers: {
        color: '#cbd5e1'
      }
    },
    {
      featureType: 'administrative',
      elementType: 'geometry.stroke',
      stylers: {
        color: '#34495e'
      }
    },
    {
      featureType: 'poi',
      elementType: 'geometry',
      stylers: {
        color: '#0f3460'
      }
    }
  ]
};

// 加载高德地图脚本 - 使用 v1.4.15 版本
export const loadAMapScript = () => {
  return new Promise((resolve) => {
    if (window.AMap) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    // 明确指定 v1.4.15 版本
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