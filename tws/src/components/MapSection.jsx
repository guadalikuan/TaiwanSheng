import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { generateUniqueId } from '../utils/uniqueId';
import { getMapData } from '../utils/api';
import { useSSE } from '../contexts/SSEContext';
import { useServerStatus } from '../contexts/ServerStatusContext';
import { AMAP_LEAFLET_CONFIG } from '../config/amap';


// 修复 Leaflet 默认图标路径问题，避免加载 @2x.png 文件失败
// 由于我们使用自定义 divIcon，完全禁用默认图标以避免网络请求
const transparentGif = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// 禁用默认图标的 retina 版本（@2x.png）
if (L.Icon.Default.prototype) {
  // 覆盖 _getIconUrl 方法
  if (typeof L.Icon.Default.prototype._getIconUrl === 'function') {
    L.Icon.Default.prototype._getIconUrl = function(name) {
      return transparentGif;
    };
  }
  
  // 直接设置默认选项，禁用所有图标 URL
  L.Icon.Default.mergeOptions({
    iconUrl: transparentGif,
    iconRetinaUrl: transparentGif,
    shadowUrl: transparentGif,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
    popupAnchor: [0, 0],
    shadowSize: [0, 0],
  });
}

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

/**
 * 验证并修正坐标是否在合理范围内
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 * @param {string} region - 区域类型：'mainland' 或 'taiwan'
 * @returns {Object} 修正后的坐标 {lat, lng}
 */
const validateAndFixCoordinates = (lat, lng, region = 'mainland') => {
  // 中国大陆范围：纬度 18°-54°N，经度 73°-135°E
  // 台湾范围：纬度 21.9°-25.3°N，经度 119.3°-122.0°E
  const bounds = region === 'taiwan' 
    ? { latMin: 21.9, latMax: 25.3, lngMin: 119.3, lngMax: 122.0 }
    : { latMin: 18, latMax: 54, lngMin: 73, lngMax: 135 };
  
  // 修正超出范围的坐标
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
  const taiwanIntervalRef = useRef(null);
  const mainlandIntervalRef = useRef(null);
  const mainlandTimeoutsRef = useRef([]);

  // 加载初始数据
  useEffect(() => {
    // 如果服务器离线，不发起请求，避免浏览器控制台显示错误
    if (!isOnline) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const response = await getMapData();
        if (response && response.success && response.data) {
          const mapData = response.data;
          
          if (mapData.taiwan) {
            if (mapData.taiwan.nodeCount !== undefined) {
              setTwNodeCount(mapData.taiwan.nodeCount);
            }
            if (mapData.taiwan.logs && Array.isArray(mapData.taiwan.logs)) {
              setTwLogs(mapData.taiwan.logs.map(log => ({
                id: log.id || generateUniqueId(),
                message: log.message || ''
              })));
            }
          }
          
          if (mapData.mainland) {
            if (mapData.mainland.assetPoolValue !== undefined) {
              setAssetValue(mapData.mainland.assetPoolValue);
            }
            if (mapData.mainland.unitCount !== undefined) {
              setUnitCount(mapData.mainland.unitCount);
            }
            if (mapData.mainland.logs && Array.isArray(mapData.mainland.logs)) {
              setAssetLogs(mapData.mainland.logs.map(log => ({
                id: log.id || generateUniqueId(),
                lot: log.lot || '',
                location: log.location || ''
              })));
            }
          }
          
          if (mapData.blockHeight) {
            setBlockHeight(mapData.blockHeight);
          }
        } else if (response && response.success === false) {
          // 处理错误响应（如服务器离线）
          // 完全静默处理，不输出任何日志
        }
      } catch (error) {
        // 连接错误已在 api.js 中处理，完全静默
        // 只记录非连接错误
        if (error.name !== 'ConnectionRefusedError' && !error.message?.includes('无法连接到服务器')) {
          console.error('Failed to load map data:', error);
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isOnline]);

  useEffect(() => {
    if (!taiwanMapContainerRef.current) return;
    const map = L.map(taiwanMapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: false,
      doubleClickZoom: false,
    }).setView([23.6978, 120.9605], 8);

    // 使用高德地图配置
    const taiwanTileLayer = L.tileLayer(AMAP_LEAFLET_CONFIG.tileUrl, {
      maxZoom: AMAP_LEAFLET_CONFIG.maxZoom,
      minZoom: AMAP_LEAFLET_CONFIG.minZoom,
      subdomains: AMAP_LEAFLET_CONFIG.subdomains,
      crossOrigin: true,
      detectRetina: false,
      attribution: AMAP_LEAFLET_CONFIG.attribution
    });
    
    // 添加瓦片加载错误处理，静默处理失败
    taiwanTileLayer.on('tileerror', (error, tile) => {
      // 静默处理瓦片加载错误，不显示在控制台
      // 这可以防止 110.png, 111.png 等瓦片加载失败时的错误提示
    });
    
    taiwanTileLayer.addTo(map);

    taiwanMapRef.current = map;
    const pulseIcon = L.divIcon({
      className: 'tw-pulse-icon',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    const getRandomLocation = () => {
      const city = taiwanHotspots[Math.floor(Math.random() * taiwanHotspots.length)];
      const offsetLat = (Math.random() - 0.5) * 0.04;
      const offsetLng = (Math.random() - 0.5) * 0.04;
      const rawLat = city.lat + offsetLat;
      const rawLng = city.lng + offsetLng;
      // 验证并修正坐标
      const validated = validateAndFixCoordinates(rawLat, rawLng, 'taiwan');
      return {
        lat: validated.lat,
        lng: validated.lng,
        city: city.name,
      };
    };

    // 初始化地图标记（不添加日志）
    for (let i = 0; i < 45; i += 1) {
      const loc = getRandomLocation();
      const marker = L.marker([loc.lat, loc.lng], { icon: pulseIcon, interactive: true }).addTo(map);
      marker.on('click', () => {
        const nodeId = `NODE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        navigate(`/map-node/${nodeId}`);
      });
    }

    return () => {
      clearInterval(taiwanIntervalRef.current);
      map.remove();
    };
  }, []);

  // 使用 SSE 接收实时更新
  const { subscribe } = useSSE();
  
  // 处理台湾节点数据更新的辅助函数
  const handleTaiwanLogUpdate = (log) => {
    if (!taiwanMapRef.current) return;
    
    const existingNodeIds = new Set(twLogs.map(l => l.nodeId).filter(Boolean));
    const nodeId = log.nodeId || log.id;
    if (nodeId && existingNodeIds.has(nodeId)) return; // 已存在，跳过
    
    // 使用日志中的位置信息，如果没有则使用默认位置
    let lat, lng;
    
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
    
    const finalNodeId = nodeId || `NODE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const pulseIcon = L.divIcon({
      className: 'tw-pulse-icon',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    
    const marker = L.marker([lat, lng], { icon: pulseIcon, interactive: true }).addTo(taiwanMapRef.current);
    marker.on('click', () => {
      navigate(`/map-node/${finalNodeId}`);
    });
  };
  
  useEffect(() => {
    // 订阅 map 数据更新
    const unsubscribe = subscribe('map', (message) => {
      if (message.type === 'update' && message.data) {
        // 全量更新：直接使用SSE推送的完整数据，不需要再次调用API
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
        // 增量更新：新台湾节点日志
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
  }, [subscribe, twLogs.length]);

  useEffect(() => {
    if (!mainlandMapContainerRef.current) return;
    const map = L.map(mainlandMapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      dragging: true,
    }).setView([34.3416, 108.9398], 5);

    // 使用高德地图配置
    const mainlandTileLayer = L.tileLayer(AMAP_LEAFLET_CONFIG.tileUrl, {
      maxZoom: AMAP_LEAFLET_CONFIG.maxZoom,
      minZoom: AMAP_LEAFLET_CONFIG.minZoom,
      subdomains: AMAP_LEAFLET_CONFIG.subdomains,
      crossOrigin: true,
      detectRetina: false,
      attribution: AMAP_LEAFLET_CONFIG.attribution
    });
    
    // 添加瓦片加载错误处理，静默处理失败
    mainlandTileLayer.on('tileerror', (error, tile) => {
      // 静默处理瓦片加载错误，不显示在控制台
      // 这可以防止 110.png, 111.png 等瓦片加载失败时的错误提示
    });
    
    mainlandTileLayer.addTo(map);

    mainlandMapRef.current = map;
    const beaconIcon = L.divIcon({
      className: 'mainland-beacon-icon',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    mainlandNodes.forEach((node) => {
      const marker = L.marker([node.lat, node.lng], { icon: beaconIcon, interactive: false }).addTo(map);
      marker.bindTooltip(node.name, {
        permanent: true,
        direction: 'bottom',
        className: 'map-tooltip',
      });
    });

    // spawnAsset函数已移除，现在使用真实日志数据生成标记

    // 处理资产数据更新的辅助函数
    const handleAssetLogUpdate = (log) => {
      if (!mainlandMapRef.current) return;
      
      // 使用日志中的位置信息，偏移从 0.8 度减少到 0.05 度（约5.5公里）
      let lat, lng;
      if (log.nodeLocation && log.nodeLocation.lat && log.nodeLocation.lng) {
        const rawLat = log.nodeLocation.lat + (Math.random() - 0.5) * 0.05;
        const rawLng = log.nodeLocation.lng + (Math.random() - 0.5) * 0.05;
        const validated = validateAndFixCoordinates(rawLat, rawLng, 'mainland');
        lat = validated.lat;
        lng = validated.lng;
      } else {
        const baseNode = mainlandNodes[Math.floor(Math.random() * mainlandNodes.length)];
        const rawLat = baseNode.lat + (Math.random() - 0.5) * 0.05;
        const rawLng = baseNode.lng + (Math.random() - 0.5) * 0.05;
        const validated = validateAndFixCoordinates(rawLat, rawLng, 'mainland');
        lat = validated.lat;
        lng = validated.lng;
      }
      
      const assetId = log.assetId || log.id || `ASSET-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      const point = L.circleMarker([lat, lng], {
        radius: 2,
        color: '#fbbf24',
        fillOpacity: 1,
        opacity: 0.9,
      }).addTo(mainlandMapRef.current);
      
      // 使用真实资产ID
      point.on('click', () => {
        navigate(`/map-asset/${assetId}`);
      });
      
      // 2秒后移除标记
      const timeout = setTimeout(() => {
        if (mainlandMapRef.current && mainlandMapRef.current.hasLayer(point)) {
          mainlandMapRef.current.removeLayer(point);
        }
      }, 2000);
      mainlandTimeoutsRef.current.push(timeout);
    };
    
    // 订阅 map 数据更新（资产部分）
    const unsubscribe = subscribe('map', (message) => {
      if (message.type === 'update' && message.data && message.data.mainland) {
        // 全量更新：直接使用SSE推送的完整数据，不需要再次调用API
        const mainlandData = message.data.mainland;
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
      } else if (message.type === 'incremental' && message.data.type === 'assetLog') {
        // 增量更新：新资产日志
        const log = message.data.log;
        setAssetLogs(prevLogs => {
          const formattedLog = {
            id: log.id || generateUniqueId(),
            lot: log.lot || '',
            location: log.location || '',
            assetId: log.assetId || null,
            nodeLocation: log.nodeLocation || null
          };
          return [formattedLog, ...prevLogs].slice(0, 5);
        });
        if (message.data.assetPoolValue !== undefined) {
          setAssetValue(message.data.assetPoolValue);
        }
        if (message.data.unitCount !== undefined) {
          setUnitCount(message.data.unitCount);
        }
        handleAssetLogUpdate(log);
      }
    });
    
    mainlandIntervalRef.current = { unsubscribe }; // 存储取消订阅函数

    return () => {
      if (mainlandIntervalRef.current && mainlandIntervalRef.current.unsubscribe) {
        mainlandIntervalRef.current.unsubscribe();
      }
      mainlandTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      map.remove();
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
            <span className="text-gold font-mono font-bold text-lg">{twNodeCount.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-mono block">MAINLAND ASSET POOL</span>
            <span className="text-cyan-400 font-mono font-bold text-lg">{formatAsset(assetValue)}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full h-full grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 md:px-8 py-24">
        <article className="map-panel min-h-[420px]">
          <div className="mainland-map-container h-full">
            <div className="pointer-events-none absolute top-4 left-4 bg-black/70 border border-yellow-900 px-4 py-3 rounded-lg max-w-xs text-yellow-200">
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
            <div ref={mainlandMapContainerRef} className="leaflet-wrapper absolute inset-0" />
            <div className="pointer-events-none absolute bottom-4 left-4 right-4">
              <div className="text-xs text-yellow-200 uppercase tracking-[0.3em] mb-2">Recent Asset Confirmations</div>
              <div className="bg-black/70 border border-yellow-900/40 rounded-lg p-3 h-24 overflow-hidden space-y-1 font-mono text-xs text-yellow-100">
                {assetLogs.length === 0 ? (
                  <div className="text-yellow-400/70">Bootstrapping liquidity...</div>
                ) : (
                  assetLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="flex justify-between text-[11px] cursor-pointer hover:bg-slate-800/50 px-2 py-1 rounded transition-colors"
                      onClick={() => {
                        const assetId = log.assetId || log.lot || log.id;
                        navigate(`/map-asset/${assetId}`);
                      }}
                    >
                      <span className="text-yellow-500">Lot-{log.lot}</span>
                      <span className="text-slate-400">{log.location}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </article>

        <article className="map-panel min-h-[420px]">
          <div className="tw-map-container h-full">
            <div className="tw-scan-line" />
            <div className="pointer-events-none absolute top-4 left-4 bg-black/70 border border-green-900 px-4 py-3 rounded-lg max-w-xs">
              <div className="text-[10px] text-slate-500 tracking-[0.3em] uppercase">Operational Area: Taiwan</div>
              <div className="text-2xl font-bold text-red-500 tracking-[0.3em] mt-1">Zone Coverage</div>
              <div className="flex justify-between text-green-400 text-xs border-b border-white/10 pb-2 mt-2 font-mono">
                <span>Active Nodes</span>
                <span className="text-base font-bold">{twNodeCount.toLocaleString()}</span>
              </div>
            </div>
            <div ref={taiwanMapContainerRef} className="leaflet-wrapper absolute inset-0" />
            <div className="pointer-events-none absolute bottom-4 left-4 right-4">
              <div className="text-xs text-red-400 uppercase tracking-[0.3em] mb-2">Live Connect Feed</div>
              <div className="bg-black/60 border border-red-900/40 rounded-lg p-3 h-28 overflow-hidden space-y-1 font-mono text-xs text-slate-400">
                {twLogs.length === 0 ? (
                  <div className="text-red-500/80">Awaiting signals...</div>
                ) : (
                  twLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="text-[11px] cursor-pointer hover:bg-slate-800/50 px-2 py-1 rounded transition-colors"
                      onClick={() => {
                        // 使用真实节点ID导航
                        const nodeId = log.nodeId || log.id;
                        if (nodeId) {
                          navigate(`/map-node/${nodeId}`);
                        }
                      }}
                    >
                      <span className="text-green-500 mr-2">[CONNECT]</span>
                      {log.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

export default MapSection;

