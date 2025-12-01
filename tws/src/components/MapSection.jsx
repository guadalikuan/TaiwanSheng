import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { generateUniqueId } from '../utils/uniqueId';
import { getMapData } from '../utils/api';

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

const MapSection = () => {
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
    const loadData = async () => {
      try {
        const response = await getMapData();
        if (response.success && response.data) {
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
        }
      } catch (error) {
        console.error('Failed to load map data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!taiwanMapContainerRef.current) return;
    const map = L.map(taiwanMapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: false,
      doubleClickZoom: false,
    }).setView([23.6978, 120.9605], 8);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      crossOrigin: true,
    }).addTo(map);

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
      return {
        lat: city.lat + offsetLat,
        lng: city.lng + offsetLng,
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

  // 定期更新台湾节点数据（每800ms）
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await getMapData();
        if (response.success && response.data && response.data.taiwan) {
          const taiwanData = response.data.taiwan;
          
          if (taiwanData.nodeCount !== undefined) {
            setTwNodeCount(taiwanData.nodeCount);
          }
          
          if (taiwanData.logs && Array.isArray(taiwanData.logs)) {
            setTwLogs(taiwanData.logs.map(log => ({
              id: log.id || generateUniqueId(),
              message: log.message || ''
            })));
          }
          
          // 如果有新节点，在地图上添加标记
          if (taiwanData.logs && taiwanData.logs.length > twLogs.length && taiwanMapRef.current) {
            const city = taiwanHotspots[Math.floor(Math.random() * taiwanHotspots.length)];
            const offsetLat = (Math.random() - 0.5) * 0.04;
            const offsetLng = (Math.random() - 0.5) * 0.04;
            const pulseIcon = L.divIcon({
              className: 'tw-pulse-icon',
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            });
            const marker = L.marker([city.lat + offsetLat, city.lng + offsetLng], { icon: pulseIcon, interactive: true }).addTo(taiwanMapRef.current);
            const latestLog = taiwanData.logs[0];
            if (latestLog && latestLog.nodeId) {
              marker.on('click', () => {
                navigate(`/map-node/${latestLog.nodeId}`);
              });
            }
          }
        }
      } catch (error) {
        console.error('Failed to update taiwan data:', error);
      }
    }, 800);
    
    return () => clearInterval(interval);
  }, [twLogs.length]);

  useEffect(() => {
    if (!mainlandMapContainerRef.current) return;
    const map = L.map(mainlandMapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      dragging: true,
    }).setView([34.3416, 108.9398], 5);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      subdomains: 'abcd',
      crossOrigin: true,
    }).addTo(map);

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

    const spawnAsset = () => {
      const baseNode = mainlandNodes[Math.floor(Math.random() * mainlandNodes.length)];
      const offsetLat = (Math.random() - 0.5) * 0.8;
      const offsetLng = (Math.random() - 0.5) * 0.8;
      const point = L.circleMarker([baseNode.lat + offsetLat, baseNode.lng + offsetLng], {
        radius: 2,
        color: '#fbbf24',
        fillOpacity: 1,
        opacity: 0.9,
      }).addTo(map);
      
      // 添加点击事件
      point.on('click', () => {
        const assetId = `ASSET-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        navigate(`/map-asset/${assetId}`);
      });

      const timeout = setTimeout(() => {
        if (map.hasLayer(point)) {
          map.removeLayer(point);
        }
      }, 2000);
      mainlandTimeoutsRef.current.push(timeout);
    };

    // 定期更新资产数据（每600ms）
    const assetUpdateInterval = setInterval(async () => {
      try {
        const response = await getMapData();
        if (response.success && response.data && response.data.mainland) {
          const mainlandData = response.data.mainland;
          
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
              location: log.location || ''
            })));
            
            // 如果有新资产，在地图上添加标记
            if (mainlandData.logs.length > assetLogs.length) {
              spawnAsset();
            }
          }
        }
      } catch (error) {
        console.error('Failed to update mainland data:', error);
      }
    }, 600);
    
    mainlandIntervalRef.current = assetUpdateInterval;

    return () => {
      clearInterval(mainlandIntervalRef.current);
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
                        const nodeId = log.nodeId || log.id;
                        navigate(`/map-node/${nodeId}`);
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

