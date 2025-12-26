import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AMAP_CONFIG, loadAMapScript } from '../config/amap';
import { generateUniqueId } from '../utils/uniqueId';
import { getMapData } from '../utils/api';
import { useSSE } from '../contexts/SSEContext';
import { useServerStatus } from '../contexts/ServerStatusContext';

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
  const [blockHeight, setBlockHeight] = useState('8922104');
  const [loading, setLoading] = useState(true);

  const taiwanMapContainerRef = useRef(null);
  const mainlandMapContainerRef = useRef(null);
  const taiwanMapRef = useRef(null);
  const mainlandMapRef = useRef(null);
  const taiwanMarkersRef = useRef([]);
  const mainlandMarkersRef = useRef([]);

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

  // 首次加载高德地图脚本
  useEffect(() => {
    loadAMapScript();
  }, []);

  // 台湾地图初始化
  useEffect(() => {
    if (!taiwanMapContainerRef.current || !window.AMap) return;

    const initTaiwanMap = () => {
      try {
        // v1.4.15 不支持 pitchEnable, 使用 isHotspot 替代
        const map = new window.AMap.Map(taiwanMapContainerRef.current, {
          zoom: 8,
          center: new window.AMap.LngLat(120.9605, 23.6978),
          mapStyle: AMAP_CONFIG.mapStyle,
          resizeEnable: true,
          showLabel: true,
          rotateEnable: false,
          tiltEnable: false,
          dragEnable: true,
          zoomEnable: true,
          doubleClickZoom: true,
          keyboardEnable: true,
          isHotspot: true,
          defaultCursor: 'pointer',
        });
        taiwanMapRef.current = map;
        console.log('Taiwan map initialized successfully with v1.4.15');
      } catch (error) {
        console.error('Failed to initialize Taiwan map:', error);
      }
    };

    const timer = setTimeout(initTaiwanMap, 500);

    return () => {
      clearTimeout(timer);
      if (taiwanMapRef.current) {
        taiwanMapRef.current.destroy();
        taiwanMapRef.current = null;
      }
    };
  }, []);

  // 大陆地图初始化
  useEffect(() => {
    if (!mainlandMapContainerRef.current || !window.AMap) return;

    const initMainlandMap = () => {
      try {
        const map = new window.AMap.Map(mainlandMapContainerRef.current, {
          zoom: 6,
          center: new window.AMap.LngLat(108.9398, 34.3416),
          mapStyle: AMAP_CONFIG.mapStyle,
          resizeEnable: true,
          showLabel: true,
          rotateEnable: false,
          tiltEnable: false,
          dragEnable: true,
          zoomEnable: true,
          doubleClickZoom: true,
          keyboardEnable: true,
          isHotspot: true,
          defaultCursor: 'pointer',
        });
        mainlandMapRef.current = map;
        console.log('Mainland map initialized successfully with v1.4.15');
      } catch (error) {
        console.error('Failed to initialize mainland map:', error);
      }
    };

    const timer = setTimeout(initMainlandMap, 500);

    return () => {
      clearTimeout(timer);
      if (mainlandMapRef.current) {
        mainlandMapRef.current.destroy();
        mainlandMapRef.current = null;
      }
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
  const addMainlandMarker = (lat, lng, assetId) => {
    if (!mainlandMapRef.current || !window.AMap) return;

    const marker = new window.AMap.Marker({
      position: new window.AMap.LngLat(lng, lat),
      map: mainlandMapRef.current,
      content: '<div style="width: 16px; height: 16px; background: rgba(251, 191, 36, 0.95); border-radius: 50%; box-shadow: 0 0 12px rgba(251, 191, 36, 0.9); border: 2px solid rgba(217, 119, 6, 0.5);"></div>',
      zIndex: 100,
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
      }
    });
    
    return unsubscribe;
  }, [subscribe]);

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
            <div ref={mainlandMapContainerRef} className="w-full h-full rounded-lg overflow-hidden" />
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
            <div ref={taiwanMapContainerRef} className="w-full h-full rounded-lg overflow-hidden" />
          </div>
        </article>
      </div>
    </div>
  );
};

export default MapSection;

