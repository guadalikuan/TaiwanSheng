import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AMAP_CONFIG, loadAMapScript } from '../config/amap';
import { generateUniqueId } from '../utils/uniqueId';
import { getMapData, getHomepageAssets, getVisitLogs } from '../utils/api';
import { useSSE } from '../contexts/SSEContext';
import { useServerStatus } from '../contexts/ServerStatusContext';
import { getIpLocation } from '../utils/ipLocation';
import MapNewTagsBox from './MapNewTagsBox';
import MapNewWalletsBox from './MapNewWalletsBox';
import MapLanternOverlay from './MapLanternOverlay';
import { WISHES } from './LanternCanvas';

const taiwanHotspots = [
  { name: 'Taipei (Xinyi)', lat: 25.033, lng: 121.5654 },
  { name: 'New Taipei', lat: 25.012, lng: 121.4654 },
  { name: 'Taichung', lat: 24.1477, lng: 120.6736 },
  { name: 'Kaohsiung', lat: 22.6273, lng: 120.3014 },
  { name: 'Tainan', lat: 22.9997, lng: 120.227 },
  { name: 'Hsinchu (Science Park)', lat: 24.8138, lng: 120.9675 },
  { name: 'Taoyuan (Airport)', lat: 25.0724, lng: 121.2272 },
];

const mainlandNodes = [
  { name: "SHAANXI (Qinling Base)", lat: 33.87, lng: 110.15 },
  { name: "XI'AN (Urban Reserve)", lat: 34.3416, lng: 108.9398 },
  { name: 'FUJIAN (Coastal Front)', lat: 26.0745, lng: 119.2965 },
  { name: 'HORGOS (Tax Haven)', lat: 44.2144, lng: 80.4085 },
  { name: 'GUANGDONG (Inventory)', lat: 23.1291, lng: 113.2644 },
  { name: 'SICHUAN (Backup)', lat: 30.5728, lng: 104.0668 },
];

const formatAsset = (value) => `¥ ${(value / 100000000).toFixed(3)} B`;

const validateAndFixCoordinates = (lat, lng, region = 'mainland') => {
  const bounds = region === 'taiwan' 
    ? { latMin: 21.9, latMax: 25.3, lngMin: 119.3, lngMax: 122.0 }
    : { latMin: 18, latMax: 54, lngMin: 73, lngMax: 135 };
  
  let fixedLat = lat;
  let fixedLng = lng;
  
  if (fixedLat < bounds.latMin) fixedLat = bounds.latMin;
  if (fixedLat > bounds.latMax) fixedLat = bounds.latMax;
  if (fixedLng < bounds.lngMin) fixedLng = bounds.lngMin;
  if (fixedLng > bounds.lngMax) fixedLng = bounds.lngMax;
  
  return { lat: fixedLat, lng: fixedLng };
};

const MapSection = () => {
  const navigate = useNavigate();
  const { isOnline } = useServerStatus();
  const [twNodeCount, setTwNodeCount] = useState(12458);
  const [twLogs, setTwLogs] = useState([]);
  const [assetValue, setAssetValue] = useState(1425000000);
  const [unitCount, setUnitCount] = useState(42109);
  const [assetLogs, setAssetLogs] = useState([]);
  const [walletLogs, setWalletLogs] = useState([]);
  const [blockHeight, setBlockHeight] = useState('8922104');
  const [loading, setLoading] = useState(true);

  const taiwanMapContainerRef = useRef(null);
  const mainlandMapContainerRef = useRef(null);
  const taiwanMapRef = useRef(null);
  const mainlandMapRef = useRef(null); // AMap.Map 实例
  const userMarkerRef = useRef(null);
  const taiwanMarkersRef = useRef([]);
  const mainlandMarkersRef = useRef([]);
  const walletMarkersRef = useRef([]);
  const visitMarkersRef = useRef([]); // 访问记录标记
  const visitClustererRef = useRef(null); // MarkerClusterer实例
  const taiwanLanternOverlayRef = useRef(null);

  // 加载初始数据
  useEffect(() => {
    if (!isOnline) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const response = await getMapData();
        if (response?.success && response.data) {
          const mapData = response.data;
          if (mapData.taiwan) {
            setTwNodeCount(mapData.taiwan.nodeCount || 0);
            setTwLogs((mapData.taiwan.logs || []).map(log => ({
              id: log.id || generateUniqueId(),
              message: log.message || ''
            })));
            const walletLogsData = (mapData.taiwan.walletLogs || []).map(log => ({
              id: log.id || generateUniqueId(),
              address: log.address || '',
              location: log.location || null,
              city: log.city || null,
              timestamp: log.timestamp || Date.now()
            }));
            setWalletLogs(walletLogsData);
            
            // 为已有的钱包日志添加地图标记（延迟执行，确保地图已初始化）
            setTimeout(() => {
              walletLogsData.forEach(log => {
                if (log.location || log.city) {
                  handleWalletLogUpdate(log);
                }
              });
            }, 1500);
          }
          if (mapData.mainland) {
            setAssetValue(mapData.mainland.assetPoolValue || 0);
            setUnitCount(mapData.mainland.unitCount || 0);
            setAssetLogs((mapData.mainland.logs || []).map(log => ({
              id: log.id || generateUniqueId(),
              lot: log.lot || '',
              location: log.location || ''
            })));
          }
          if (mapData.blockHeight) {
            setBlockHeight(mapData.blockHeight);
          }
        }
      } catch (error) {
        console.error('Failed to load map data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isOnline]);

  // 加载安全屋列表并在地图上显示标记
  const loadSafehouses = async () => {
    if (!mainlandMapRef.current || !window.AMap) {
      // 如果地图还没初始化，延迟重试
      setTimeout(loadSafehouses, 1000);
      return;
    }

    try {
      const response = await getHomepageAssets();
      if (response?.success && response.data && Array.isArray(response.data)) {
        // 清除旧标记
        mainlandMarkersRef.current.forEach(marker => {
          try {
            marker.setMap(null);
          } catch (e) {
            console.warn('Failed to remove old marker:', e);
          }
        });
        mainlandMarkersRef.current = [];

        // 为每个安全屋添加地图标记
        response.data.forEach((asset, index) => {
          // 尝试从 asset 中提取位置信息
          let lat, lng, assetId, assetName;
          
          // 检查不同的数据结构
          if (asset.location && asset.location.lat && asset.location.lng) {
            lat = asset.location.lat;
            lng = asset.location.lng;
          } else if (asset.lat && asset.lng) {
            lat = asset.lat;
            lng = asset.lng;
          } else if (asset.nodeLocation && asset.nodeLocation.lat && asset.nodeLocation.lng) {
            lat = asset.nodeLocation.lat;
            lng = asset.nodeLocation.lng;
          } else {
            // 如果没有位置信息，使用预定义的节点位置
            const nodeIndex = index % mainlandNodes.length;
            const node = mainlandNodes[nodeIndex];
            lat = node.lat + (Math.random() - 0.5) * 0.1;
            lng = node.lng + (Math.random() - 0.5) * 0.1;
          }

          // 验证并修正坐标
          const validated = validateAndFixCoordinates(lat, lng, 'mainland');
          lat = validated.lat;
          lng = validated.lng;

          assetId = asset.id || asset.assetId || `asset-${index}`;
          assetName = asset.name || asset.lot || asset.title || `Safehouse ${index + 1}`;

          // 添加标记
          addMainlandMarker(lat, lng, assetId, assetName);
        });

        console.log(`已加载 ${response.data.length} 个安全屋标记`);
      }
    } catch (error) {
      console.error('Failed to load safehouses:', error);
    }
  };

  // 确保按顺序执行
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      await loadAMapScript();
      if (!mounted || !window.AMap) return;

      try {
        const taiwanMap = new window.AMap.Map(taiwanMapContainerRef.current, {
          zoom: 8,
          center: [120.9605, 23.6978],
          // 直接使用官方 styleId（不要调用 setMapStyle）
          mapStyle: AMAP_CONFIG.defaultStyleId || 'amap://styles/darkblue',
          resizeEnable: true,
          showLabel: true,
          dragEnable: true,
          doubleClickZoom: true,
          keyboardEnable: true,
        });
        taiwanMapRef.current = taiwanMap;
        console.log('Taiwan map initialized with official dark style');
      } catch (e) {
        console.error('Failed to initialize Taiwan map:', e);
      }

      try {
        const mainlandMap = new window.AMap.Map(mainlandMapContainerRef.current, {
          zoom: 6,
          center: [108.9398, 34.3416],
          mapStyle: AMAP_CONFIG.defaultStyleId || 'amap://styles/darkblue',
          resizeEnable: true,
          showLabel: true,
          dragEnable: true,
          doubleClickZoom: true,
          keyboardEnable: true,
        });
        mainlandMapRef.current = mainlandMap;
        console.log('Mainland map initialized with official dark style');

        // 在地图加载完成后再尝试添加用户位置标记，并做延迟重试以提高兼容性
        if (mainlandMap && mainlandMap.on) {
          mainlandMap.on('complete', () => {
            console.log('mainland map complete event fired');
            try { addUserLocationMarker(); } catch (e) { console.warn('addUserLocationMarker error on complete:', e); }
            // 加载安全屋列表
            setTimeout(() => {
              loadSafehouses();
            }, 1000);
          });
        }
        // 备用：短延迟后再次尝试（防止 complete 事件未触发）
        setTimeout(() => {
          if (mainlandMapRef.current && !userMarkerRef.current) {
            try { addUserLocationMarker(); } catch (e) { console.warn('delayed addUserLocationMarker failed:', e); }
          }
          // 备用：延迟加载安全屋
          loadSafehouses();
        }, 2000);

        // 加载访问记录（延迟执行，确保台湾地图已初始化）
        setTimeout(() => {
          loadVisitLogs();
        }, 3000);
      } catch (e) {
        console.error('Failed to initialize mainland map:', e);
      }
    };

    init();

    return () => {
      mounted = false;
      if (taiwanMapRef.current) {
        taiwanMapRef.current.destroy();
        taiwanMapRef.current = null;
      }
      if (mainlandMapRef.current) {
        mainlandMapRef.current.destroy();
        mainlandMapRef.current = null;
      }
      // 清理标记
      taiwanMarkersRef.current.forEach(marker => {
        try { marker.setMap(null); } catch (e) {}
      });
      mainlandMarkersRef.current.forEach(marker => {
        try { marker.setMap(null); } catch (e) {}
      });
      walletMarkersRef.current.forEach(marker => {
        try { marker.setMap(null); } catch (e) {}
      });
      visitMarkersRef.current.forEach(marker => {
        try { marker.setMap(null); } catch (e) {}
      });
      if (visitClustererRef.current) {
        try {
          if (typeof visitClustererRef.current.clearMarkers === 'function') {
            visitClustererRef.current.clearMarkers();
          } else if (typeof visitClustererRef.current.clear === 'function') {
            visitClustererRef.current.clear();
          }
        } catch (e) {}
        visitClustererRef.current = null;
      }
      taiwanMarkersRef.current = [];
      mainlandMarkersRef.current = [];
      walletMarkersRef.current = [];
      visitMarkersRef.current = [];
    };
  }, []);

  // 添加台湾地图标记 - v1.4.15 版本
  const addTaiwanMarker = (lat, lng, nodeId) => {
    if (!taiwanMapRef.current || !window.AMap) return;

    const marker = new window.AMap.Marker({
      position: new window.AMap.LngLat(lng, lat),
      map: taiwanMapRef.current,
      content: '<div style="width: 14px; height: 14px; background: rgba(248, 113, 113, 0.95); border-radius: 50%; box-shadow: 0 0 12px rgba(248, 113, 113, 0.9); border: 2px solid rgba(239, 68, 68, 0.5);"></div>',
      zIndex: 100,
    });

    marker.on('click', () => {
      navigate(`/map-node/${nodeId}`);
    });

    taiwanMarkersRef.current.push(marker);
  };

  // 添加大陆地图标记 - v1.4.15 版本
  const addMainlandMarker = (lat, lng, assetId, assetName = null) => {
    if (!mainlandMapRef.current || !window.AMap) return;

    const marker = new window.AMap.Marker({
      position: new window.AMap.LngLat(lng, lat),
      map: mainlandMapRef.current,
      content: '<div style="width: 16px; height: 16px; background: rgba(251, 191, 36, 0.95); border-radius: 50%; box-shadow: 0 0 12px rgba(251, 191, 36, 0.9); border: 2px solid rgba(217, 119, 6, 0.5);"></div>',
      zIndex: 100,
      title: assetName || `Asset ${assetId}`,
    });

    marker.on('click', () => {
      navigate(`/map-asset/${assetId}`);
    });

    mainlandMarkersRef.current.push(marker);
  };

  // SSE 实时更新处理
  const { subscribe } = useSSE();
  
  const handleTaiwanLogUpdate = (log) => {
    if (!taiwanMapRef.current) return;
    
    let lat, lng;
    const nodeId = log.nodeId || log.id || `NODE-${generateUniqueId()}`;
    
    if (log.location && log.location.lat && log.location.lng) {
      const validated = validateAndFixCoordinates(log.location.lat, log.location.lng, 'taiwan');
      lat = validated.lat;
      lng = validated.lng;
    } else if (log.city) {
      const cityData = taiwanHotspots.find(c => c.name.includes(log.city));
      if (cityData) {
        const rawLat = cityData.lat + (Math.random() - 0.5) * 0.04;
        const rawLng = cityData.lng + (Math.random() - 0.5) * 0.04;
        const validated = validateAndFixCoordinates(rawLat, rawLng, 'taiwan');
        lat = validated.lat;
        lng = validated.lng;
      } else {
        const city = taiwanHotspots[Math.floor(Math.random() * taiwanHotspots.length)];
        const rawLat = city.lat + (Math.random() - 0.5) * 0.04;
        const rawLng = city.lng + (Math.random() - 0.5) * 0.04;
        const validated = validateAndFixCoordinates(rawLat, rawLng, 'taiwan');
        lat = validated.lat;
        lng = validated.lng;
      }
    } else {
      const city = taiwanHotspots[Math.floor(Math.random() * taiwanHotspots.length)];
      const rawLat = city.lat + (Math.random() - 0.5) * 0.04;
      const rawLng = city.lng + (Math.random() - 0.5) * 0.04;
      const validated = validateAndFixCoordinates(rawLat, rawLng, 'taiwan');
      lat = validated.lat;
      lng = validated.lng;
    }
    
    addTaiwanMarker(lat, lng, nodeId);
  };

  useEffect(() => {
    const unsubscribe = subscribe('map', (message) => {
      if (message.type === 'update' && message.data) {
        const mapData = message.data;
        if (mapData.taiwan) {
          const taiwanData = mapData.taiwan;
          if (taiwanData.nodeCount !== undefined) {
            setTwNodeCount(taiwanData.nodeCount);
          }
          if (taiwanData.logs && Array.isArray(taiwanData.logs)) {
            const formattedLogs = taiwanData.logs.map(log => ({
              id: log.id || generateUniqueId(),
              message: log.message || '',
              nodeId: log.nodeId || log.id,
              location: log.location || null,
              city: log.city || null
            }));
            setTwLogs(formattedLogs);
          }
          if (taiwanData.walletLogs && Array.isArray(taiwanData.walletLogs)) {
            setWalletLogs(taiwanData.walletLogs.map(log => ({
              id: log.id || generateUniqueId(),
              address: log.address || '',
              location: log.location || null,
              city: log.city || null,
              timestamp: log.timestamp || Date.now()
            })));
          }
        }
        if (mapData.mainland) {
          const mainlandData = mapData.mainland;
          if (mainlandData.assetPoolValue !== undefined) {
            setAssetValue(mainlandData.assetPoolValue);
          }
          if (mainlandData.unitCount !== undefined) {
            setUnitCount(mainlandData.unitCount);
          }
          if (mainlandData.logs && Array.isArray(mainlandData.logs)) {
            setAssetLogs(mainlandData.logs.map(log => ({
              id: log.id || generateUniqueId(),
              lot: log.lot || '',
              location: log.location || '',
              assetId: log.assetId || null,
              nodeLocation: log.nodeLocation || null
            })));
          }
        }
      } else if (message.type === 'incremental' && message.data.type === 'taiwanLog') {
        const log = message.data.log;
        setTwLogs(prevLogs => {
          const formattedLog = {
            id: log.id || generateUniqueId(),
            message: log.message || '',
            nodeId: log.nodeId || log.id,
            location: log.location || null,
            city: log.city || null
          };
          return [formattedLog, ...prevLogs].slice(0, 6);
        });
        if (message.data.nodeCount !== undefined) {
          setTwNodeCount(message.data.nodeCount);
        }
        handleTaiwanLogUpdate(log);
      } else if (message.type === 'incremental' && message.data.type === 'walletLog') {
        const log = message.data.log;
        setWalletLogs(prevLogs => {
          const formattedLog = {
            id: log.id || generateUniqueId(),
            address: log.address || '',
            location: log.location || null,
            city: log.city || null,
            timestamp: log.timestamp || Date.now()
          };
          return [formattedLog, ...prevLogs].slice(0, 6);
        });
        // 添加钱包标记到地图
        handleWalletLogUpdate(log);
      } else if (message.type === 'incremental' && message.data.type === 'assetLog') {
        const log = message.data.log;
        setAssetLogs(prevLogs => {
          const formattedLog = {
            id: log.id || generateUniqueId(),
            lot: log.lot || '',
            location: log.location || '',
            assetId: log.assetId || null,
            nodeLocation: log.nodeLocation || null,
            timestamp: log.timestamp || Date.now()
          };
          return [formattedLog, ...prevLogs].slice(0, 5);
        });
        if (message.data.assetPoolValue !== undefined) {
          setAssetValue(message.data.assetPoolValue);
        }
        if (message.data.unitCount !== undefined) {
          setUnitCount(message.data.unitCount);
        }
      }
    });
    
    return unsubscribe;
  }, [subscribe]);

  // 添加钱包连接标记（使用高德地图IP定位API）
  const handleWalletLogUpdate = async (log) => {
    if (!taiwanMapRef.current || !window.AMap) return;
    
    let lat, lng;
    
    // 如果日志中已有位置信息，直接使用
    if (log.location && log.location.lat && log.location.lng) {
      const validated = validateAndFixCoordinates(log.location.lat, log.location.lng, 'taiwan');
      lat = validated.lat;
      lng = validated.lng;
    } else if (log.city) {
      // 根据城市名称查找位置
      const cityData = taiwanHotspots.find(c => c.name.includes(log.city));
      if (cityData) {
        const rawLat = cityData.lat + (Math.random() - 0.5) * 0.04;
        const rawLng = cityData.lng + (Math.random() - 0.5) * 0.04;
        const validated = validateAndFixCoordinates(rawLat, rawLng, 'taiwan');
        lat = validated.lat;
        lng = validated.lng;
      } else {
        // 如果找不到城市，使用随机台湾位置
        const city = taiwanHotspots[Math.floor(Math.random() * taiwanHotspots.length)];
        const rawLat = city.lat + (Math.random() - 0.5) * 0.04;
        const rawLng = city.lng + (Math.random() - 0.5) * 0.04;
        const validated = validateAndFixCoordinates(rawLat, rawLng, 'taiwan');
        lat = validated.lat;
        lng = validated.lng;
      }
    } else {
      // 如果没有位置信息，尝试使用高德地图IP定位API
      try {
        const loc = await getIpLocation();
        if (loc && loc.lat && loc.lng) {
          // 如果定位成功，验证并修正坐标
          const validated = validateAndFixCoordinates(Number(loc.lat), Number(loc.lng), 'taiwan');
          lat = validated.lat;
          lng = validated.lng;
        } else {
          // 定位失败，使用随机台湾位置
          const city = taiwanHotspots[Math.floor(Math.random() * taiwanHotspots.length)];
          const rawLat = city.lat + (Math.random() - 0.5) * 0.04;
          const rawLng = city.lng + (Math.random() - 0.5) * 0.04;
          const validated = validateAndFixCoordinates(rawLat, rawLng, 'taiwan');
          lat = validated.lat;
          lng = validated.lng;
        }
      } catch (error) {
        console.warn('IP定位失败，使用默认位置:', error);
        // 定位失败，使用随机台湾位置
        const city = taiwanHotspots[Math.floor(Math.random() * taiwanHotspots.length)];
        const rawLat = city.lat + (Math.random() - 0.5) * 0.04;
        const rawLng = city.lng + (Math.random() - 0.5) * 0.04;
        const validated = validateAndFixCoordinates(rawLat, rawLng, 'taiwan');
        lat = validated.lat;
        lng = validated.lng;
      }
    }
    
    // 添加钱包标记到地图
    addWalletMarker(lat, lng, log.address || log.id);
    
    // 释放孔明灯（从IP地理位置）
    if (taiwanLanternOverlayRef.current) {
      const wish = WISHES[Math.floor(Math.random() * WISHES.length)];
      taiwanLanternOverlayRef.current.releaseLanternFromGeo(lng, lat, wish);
    }
  };

  // 添加钱包标记到台湾地图（带水波动画效果）
  const addWalletMarker = (lat, lng, walletId) => {
    if (!taiwanMapRef.current || !window.AMap) return;

    // 创建水波动画效果的HTML
    const html = `
      <div class="wallet-location-green-wrapper" style="z-index:1100;pointer-events:auto;">
        <div class="wallet-location-green"></div>
      </div>
    `;

    const marker = new window.AMap.Marker({
      content: html,
      position: new window.AMap.LngLat(lng, lat),
      offset: new window.AMap.Pixel(-20, -20), // 居中
      zIndex: 1100,
    });

    marker.on('click', () => {
      // 可以导航到钱包详情页面
      console.log('Wallet clicked:', walletId);
    });

    marker.setMap(taiwanMapRef.current);
    walletMarkersRef.current.push(marker);

    // 限制标记数量，只保留最近20个
    if (walletMarkersRef.current.length > 20) {
      const oldMarker = walletMarkersRef.current.shift();
      try {
        oldMarker.setMap(null);
      } catch (e) {
        console.warn('Failed to remove old wallet marker:', e);
      }
    }
  };

  // 添加访问记录标记到台湾地图（青色脉冲点）
  const addVisitMarker = (lat, lng, visitId) => {
    if (!taiwanMapRef.current || !window.AMap) return;

    // 创建青色脉冲点动画效果的HTML
    const html = `
      <div class="visit-location-cyan-wrapper" style="z-index:1050;pointer-events:auto;">
        <div class="visit-location-cyan"></div>
      </div>
    `;

    const marker = new window.AMap.Marker({
      content: html,
      position: new window.AMap.LngLat(lng, lat),
      offset: new window.AMap.Pixel(-12, -12), // 居中
      zIndex: 1050,
    });

    marker.on('click', () => {
      console.log('Visit marker clicked:', visitId);
    });

    marker.setMap(taiwanMapRef.current);
    visitMarkersRef.current.push(marker);
  };

  // 创建访问记录标记（不直接添加到地图）
  const createVisitMarker = (lat, lng, visitId) => {
    if (!window.AMap) return null;

    // 创建青色脉冲点动画效果的HTML
    const html = `
      <div class="visit-location-cyan-wrapper" style="z-index:1050;pointer-events:auto;">
        <div class="visit-location-cyan"></div>
      </div>
    `;

    const marker = new window.AMap.Marker({
      content: html,
      position: new window.AMap.LngLat(lng, lat),
      offset: new window.AMap.Pixel(-12, -12), // 居中
      zIndex: 1050,
    });

    marker.on('click', () => {
      console.log('Visit marker clicked:', visitId);
    });

    return marker;
  };

  // 使用高性能方式加载大量访问记录（批量渲染）
  const loadVisitLogsWithClusterer = async (visitsWithLocation) => {
    if (!taiwanMapRef.current || !window.AMap) return;

    try {
      // 清除旧的聚合器
      if (visitClustererRef.current) {
        try {
          if (typeof visitClustererRef.current.clearMarkers === 'function') {
            visitClustererRef.current.clearMarkers();
          } else if (typeof visitClustererRef.current.clear === 'function') {
            visitClustererRef.current.clear();
          }
        } catch (e) {
          console.warn('Failed to clear clusterer:', e);
        }
        visitClustererRef.current = null;
      }

      // 清除旧的普通标记
      visitMarkersRef.current.forEach(marker => {
        try {
          marker.setMap(null);
        } catch (e) {
          console.warn('Failed to remove old visit marker:', e);
        }
      });
      visitMarkersRef.current = [];

      // 创建标记数组
      const markers = [];
      visitsWithLocation.forEach(visit => {
        const lat = visit.location.lat;
        const lng = visit.location.lng;
        // 验证坐标（使用mainland范围，因为现在显示所有地区）
        const validated = validateAndFixCoordinates(lat, lng, 'mainland');
        const marker = createVisitMarker(validated.lat, validated.lng, visit.id);
        if (marker) {
          markers.push(marker);
        }
      });

      // 尝试使用MarkerClusterer（如果可用）
      // 高德地图v1.4.15可能不直接支持，需要加载插件
      // 这里使用批量添加的方式，使用requestAnimationFrame分批渲染以提高性能
      if (markers.length > 0) {
        // 使用批量添加，但分批渲染以避免阻塞
        const batchSize = 100; // 每批处理100个标记
        let currentIndex = 0;

        const addBatch = () => {
          const endIndex = Math.min(currentIndex + batchSize, markers.length);
          for (let i = currentIndex; i < endIndex; i++) {
            markers[i].setMap(taiwanMapRef.current);
            visitMarkersRef.current.push(markers[i]);
          }
          currentIndex = endIndex;

          if (currentIndex < markers.length) {
            // 使用requestAnimationFrame继续下一批
            requestAnimationFrame(addBatch);
          } else {
            console.log(`已加载 ${markers.length} 个访问记录标记（批量模式）`);
          }
        };

        // 开始批量添加
        requestAnimationFrame(addBatch);
      }
    } catch (error) {
      console.error('Failed to load visit logs with clusterer:', error);
      // 回退到普通模式（分批）
      console.log('回退到普通模式（分批）');
      const batchSize = 100;
      for (let i = 0; i < Math.min(visitsWithLocation.length, 1000); i += batchSize) {
        const batch = visitsWithLocation.slice(i, i + batchSize);
        setTimeout(() => {
          batch.forEach(visit => {
            const lat = visit.location.lat;
            const lng = visit.location.lng;
            const validated = validateAndFixCoordinates(lat, lng, 'mainland');
            addVisitMarker(validated.lat, validated.lng, visit.id);
          });
        }, i / batchSize * 50); // 每批间隔50ms
      }
    }
  };

  // 加载访问记录并在地图上显示
  const loadVisitLogs = async () => {
    if (!taiwanMapRef.current || !window.AMap) {
      // 如果地图还没初始化，延迟重试
      setTimeout(loadVisitLogs, 1000);
      return;
    }

    try {
      const response = await getVisitLogs({ limit: 10000 }); // 增加限制以获取更多记录
      if (response?.success && response.data && Array.isArray(response.data)) {
        // 过滤出有位置信息的访问记录
        const visitsWithLocation = response.data.filter(visit => 
          visit.location && visit.location.lat && visit.location.lng
        );

        console.log(`已获取 ${visitsWithLocation.length} 个有位置信息的访问记录`);

        // 根据数量选择显示方式
        if (visitsWithLocation.length < 100) {
          // 少量标记：使用普通Marker
          // 清除旧标记和聚合器
          if (visitClustererRef.current) {
            visitClustererRef.current.clearMarkers();
            visitClustererRef.current = null;
          }
          visitMarkersRef.current.forEach(marker => {
            try {
              marker.setMap(null);
            } catch (e) {
              console.warn('Failed to remove old visit marker:', e);
            }
          });
          visitMarkersRef.current = [];

          // 为每个访问记录添加地图标记
          visitsWithLocation.forEach(visit => {
            const lat = visit.location.lat;
            const lng = visit.location.lng;
            // 验证坐标（使用mainland范围，因为现在显示所有地区）
            const validated = validateAndFixCoordinates(lat, lng, 'mainland');
            addVisitMarker(validated.lat, validated.lng, visit.id);
          });

          console.log(`已加载 ${visitsWithLocation.length} 个访问记录标记（普通模式）`);
        } else {
          // 大量标记：使用MarkerClusterer聚合
          loadVisitLogsWithClusterer(visitsWithLocation);
        }
      }
    } catch (error) {
      console.error('Failed to load visit logs:', error);
    }
  };

  // 添加/更新用户位置（使用 AMap API，而非 Leaflet）
  const addUserLocationMarker = async () => {
    try {
      console.log('addUserLocationMarker start');
      const loc = await getIpLocation();
      console.log('getIpLocation result:', loc);
      if (!loc) return;

      // 验证并修正坐标（沿用项目内 validateAndFixCoordinates）
      const { lat, lng } = validateAndFixCoordinates(Number(loc.lat), Number(loc.lng), 'mainland');
      const map = mainlandMapRef.current;
      console.log('validated coords', { lat, lng, mapExists: !!map, hasAMap: !!window.AMap });
      if (!map || !window.AMap) return;

      // 移除旧标记
      if (userMarkerRef.current) {
        try { userMarkerRef.current.setMap(null); } catch (e) {}
        userMarkerRef.current = null;
      }

      // 使用 AMap.Marker 并用自定义 DOM 内容（蓝色渐变圆点）
      const html = `<div class="user-location-blue-wrapper" style="z-index:1300;pointer-events:auto;"><div class="user-location-blue"></div></div>`;
      const marker = new window.AMap.Marker({
        content: html,
        position: new window.AMap.LngLat(Number(lng), Number(lat)),
        offset: new window.AMap.Pixel(-11, -11), // 居中
        zIndex: 1200,
      });
      marker.setMap(map);
      userMarkerRef.current = marker;
      console.log('user marker added at', { lat, lng });
      // 调试：把地图中心移动到定位点并提升缩放以确保可见（确认后可删除）
      try {
        const pos = marker.getPosition();
        map.setCenter(pos);
        const currentZoom = map.getZoom ? map.getZoom() : 6;
        map.setZoom(Math.max(currentZoom, 6));
        console.log('map centered to marker', pos);
      } catch (e) { console.warn('center marker failed', e); }
    } catch (err) {
      console.error('添加用户位置失败', err);
    }
  };

  // 注意：不要依赖 ref.current 作为 useEffect 依赖（不会触发重跑）。
  // 地图初始化处已经在 mainlandMap.on('complete') 与延迟重试中调用 addUserLocationMarker。
  // 若需其它触发逻辑，请在地图创建回调中显式调用 addUserLocationMarker()。
   
   // 组件卸载清理
   useEffect(() => {
     return () => {
       if (userMarkerRef.current) {
         try { userMarkerRef.current.setMap(null); } catch (e) {}
         userMarkerRef.current = null;
       }
     };
   }, []);

  return (
    <div className="w-full h-full bg-slate-950 relative overflow-hidden flex flex-col pt-16 md:pt-20">
      <div className="absolute top-16 md:top-20 left-0 w-full h-16 z-20 bg-gradient-to-b from-slate-900 to-transparent flex justify-between items-center px-8 border-b border-slate-800/50">
        <div className="flex items-center space-x-4">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
          <span className="text-xs font-mono text-red-400 tracking-widest">LIVE GEO-INTEL FEED // SATELLITE LINK: ACTIVE</span>
        </div>
        <div className="flex space-x-6 text-right">
          <div>
            <span className="text-[10px] text-slate-500 font-mono block">TAIWAN NODES</span>
            <span className="text-yellow-400 font-mono font-bold text-lg">{twNodeCount.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-mono block">MAINLAND ASSET POOL</span>
            <span className="text-cyan-400 font-mono font-bold text-lg">{formatAsset(assetValue)}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full h-full grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 md:px-8 py-24">
        <article className="map-panel min-h-[420px]">
          <div className="mainland-map-container h-full relative">
            <div className="pointer-events-none absolute top-4 left-4 bg-black/70 border border-yellow-900 px-4 py-3 rounded-lg max-w-xs text-yellow-200 z-10">
              <div className="text-[10px] tracking-[0.3em] uppercase text-yellow-600">Safe Haven Inventory</div>
              <div className="text-3xl font-bold text-yellow-300 mt-1">{formatAsset(assetValue)}</div>
              <div className="grid grid-cols-2 gap-4 text-xs border-t border-yellow-900 mt-3 pt-2 font-mono text-slate-200">
                <div>
                  <p className="text-yellow-700 uppercase text-[10px]">Units Secured</p>
                  <p className="text-xl text-white font-bold">{unitCount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-yellow-700 uppercase text-[10px]">Block Height</p>
                  <p className="text-white font-bold">#{blockHeight}</p>
                </div>
              </div>
            </div>
            <div className="absolute bottom-4 right-4 z-10 pointer-events-auto">
              <MapNewTagsBox assetLogs={assetLogs} assetValue={assetValue} unitCount={unitCount} />
            </div>
            <div ref={mainlandMapContainerRef} className="amap-container w-full h-full rounded-lg overflow-hidden" />
          </div>
        </article>

        <article className="map-panel min-h-[420px]">
          <div className="tw-map-container h-full relative">
            <div className="tw-scan-line" />
            <div className="pointer-events-none absolute top-4 left-4 bg-black/70 border border-green-900 px-4 py-3 rounded-lg max-w-xs z-10">
              <div className="text-[10px] text-slate-500 tracking-[0.3em] uppercase">Operational Area: Taiwan</div>
              <div className="text-2xl font-bold text-red-500 tracking-[0.3em] mt-1">Zone Coverage</div>
              <div className="flex justify-between text-green-400 text-xs border-b border-white/10 pb-2 mt-2 font-mono">
                <span>Active Nodes</span>
                <span className="text-base font-bold">{twNodeCount.toLocaleString()}</span>
              </div>
            </div>
            <div className="absolute bottom-4 right-4 z-10 pointer-events-auto">
              <MapNewWalletsBox walletLogs={walletLogs} />
            </div>
            <div ref={taiwanMapContainerRef} className="amap-container w-full h-full rounded-lg overflow-hidden relative">
              {taiwanMapRef.current && (
                <MapLanternOverlay
                  ref={taiwanLanternOverlayRef}
                  mapRef={taiwanMapRef}
                  mapContainerRef={taiwanMapContainerRef}
                />
              )}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

export default MapSection;

