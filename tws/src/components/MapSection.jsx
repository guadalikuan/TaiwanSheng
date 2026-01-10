import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Home, Loader, Shield, Users, Clock, Package, Phone, Target, Rocket, Church, Sparkles, CandlestickChart, Lamp, Route, Flag, Mail, Building } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { AMAP_CONFIG, loadAMapScript } from '../config/amap';
import { generateUniqueId } from '../utils/uniqueId';
import { getMapData, getHomepageAssets, getVisitLogs, getTaiOneTokenBalanceAPI, consumeTokenForMarking, consumeTokenForAction, recordMapAction } from '../utils/api';
import { useSSE } from '../contexts/SSEContext';
import { useServerStatus } from '../contexts/ServerStatusContext';
import { getIpLocation } from '../utils/ipLocation';
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

// 台湾导弹数据配置
const MISSILE_DATA = [
  {
    id: 'hf2e',
    name: '雄风-2E巡航导弹',
    range: 1000, // 公里
    color: '#ef4444', // 红色
    strokeColor: '#dc2626',
    fillOpacity: 0.15,
    strokeOpacity: 0.6,
    strokeWeight: 2
  },
  {
    id: 'hf2e-er',
    name: '雄风-2E增程型',
    range: 1200, // 公里
    color: '#f97316', // 橙色
    strokeColor: '#ea580c',
    fillOpacity: 0.12,
    strokeOpacity: 0.5,
    strokeWeight: 2
  },
  {
    id: 'qintian',
    name: '擎天远程超音速巡航导弹',
    range: 2000, // 公里
    color: '#eab308', // 黄色
    strokeColor: '#ca8a04',
    fillOpacity: 0.1,
    strokeOpacity: 0.5,
    strokeWeight: 2
  },
  {
    id: 'yunfeng',
    name: '云峰弹道导弹',
    range: 2000, // 公里
    color: '#fbbf24', // 浅黄色
    strokeColor: '#f59e0b',
    fillOpacity: 0.08,
    strokeOpacity: 0.4,
    strokeWeight: 2
  }
];

// 台湾导弹发射基地位置（台北附近）
const TAIWAN_LAUNCH_SITE = {
  lat: 25.033,
  lng: 121.5654,
  name: 'Taipei Launch Site'
};

// 解放军对台军演区域数据（2010年以来）
// 坐标基于GCJ-02坐标系（高德地图），围绕台湾岛（21.9°N-25.3°N, 119.3°E-122.0°E）
const PLA_EXERCISE_DATA = [
  {
    id: 'exercise_2022_08',
    name: '2022年8月环台军演',
    date: '2022-08-02',
    dateEnd: '2022-08-10',
    description: '多兵种联合战备警巡和实战化演练',
    // 六个演习区域（围绕台湾岛，使用GCJ-02坐标系）
    areas: [
      // 区域1：台湾海峡北部（靠近台北）
      [
        [119.3, 25.3],
        [120.3, 25.3],
        [120.3, 24.6],
        [119.3, 24.6]
      ],
      // 区域2：台湾海峡中部（距离台湾本岛约9.5公里）
      [
        [119.8, 24.4],
        [120.8, 24.4],
        [120.8, 23.7],
        [119.8, 23.7]
      ],
      // 区域3：台湾海峡南部（靠近高雄）
      [
        [119.5, 23.3],
        [120.5, 23.3],
        [120.5, 22.6],
        [119.5, 22.6]
      ],
      // 区域4：东海区域（台湾东北）
      [
        [121.2, 25.0],
        [122.2, 25.0],
        [122.2, 24.3],
        [121.2, 24.3]
      ],
      // 区域5：巴士海峡（台湾东南）
      [
        [120.2, 21.8],
        [121.2, 21.8],
        [121.2, 21.0],
        [120.2, 21.0]
      ],
      // 区域6：菲律宾海（台湾东部）
      [
        [121.5, 22.8],
        [122.8, 22.8],
        [122.8, 21.8],
        [121.5, 21.8]
      ]
    ],
    color: '#ef4444', // 红色
    strokeColor: '#dc2626',
    fillOpacity: 0.15,
    strokeOpacity: 0.7,
    strokeWeight: 2
  },
  {
    id: 'exercise_2025_04',
    name: '2025年4月环台军演',
    date: '2025-04-01',
    dateEnd: '2025-04-02',
    description: '海峡雷霆-2025A',
    areas: [
      // 台湾海峡中部
      [
        [119.5, 24.6],
        [121.0, 24.6],
        [121.0, 23.3],
        [119.5, 23.3]
      ],
      // 台湾海峡南部
      [
        [119.3, 23.0],
        [120.8, 23.0],
        [120.8, 21.8],
        [119.3, 21.8]
      ]
    ],
    color: '#f97316', // 橙色
    strokeColor: '#ea580c',
    fillOpacity: 0.12,
    strokeOpacity: 0.6,
    strokeWeight: 2
  },
  {
    id: 'exercise_2025_12',
    name: '2025年12月环台军演',
    date: '2025-12-29',
    dateEnd: '2025-12-31',
    description: '正义使命-2025',
    areas: [
      // 台湾海峡
      [
        [119.0, 25.0],
        [121.3, 25.0],
        [121.3, 22.3],
        [119.0, 22.3]
      ],
      // 南海区域（靠近台湾西南）
      [
        [118.8, 21.8],
        [120.3, 21.8],
        [120.3, 20.8],
        [118.8, 20.8]
      ],
      // 巴士海峡
      [
        [119.8, 21.3],
        [121.3, 21.3],
        [121.3, 20.6],
        [119.8, 20.6]
      ],
      // 菲律宾海
      [
        [121.3, 23.3],
        [123.3, 23.3],
        [123.3, 21.3],
        [121.3, 21.3]
      ],
      // 东海区域
      [
        [121.3, 25.8],
        [122.8, 25.8],
        [122.8, 24.3],
        [121.3, 24.3]
      ]
    ],
    color: '#eab308', // 黄色
    strokeColor: '#ca8a04',
    fillOpacity: 0.1,
    strokeOpacity: 0.5,
    strokeWeight: 2
  },
  {
    id: 'exercise_2019_07',
    name: '2019年7月东南海双军演',
    date: '2019-07-28',
    dateEnd: '2019-07-30',
    description: '舟山群岛、东山岛海域',
    areas: [
      // 舟山群岛附近（东海，远离台湾但相关）
      [
        [121.0, 30.3],
        [123.0, 30.3],
        [123.0, 29.3],
        [121.0, 29.3]
      ],
      // 东山岛附近（台湾海峡南部，靠近福建）
      [
        [117.0, 23.6],
        [118.5, 23.6],
        [118.5, 22.8],
        [117.0, 22.8]
      ]
    ],
    color: '#3b82f6', // 蓝色
    strokeColor: '#2563eb',
    fillOpacity: 0.12,
    strokeOpacity: 0.6,
    strokeWeight: 2
  },
  {
    id: 'exercise_2016_07',
    name: '2016年7月南海军演',
    date: '2016-07-05',
    dateEnd: '2016-07-11',
    description: '南海大规模军演',
    areas: [
      // 南海区域（大范围，包含台湾西南）
      [
        [108.0, 20.0],
        [120.0, 20.0],
        [120.0, 12.0],
        [108.0, 12.0]
      ]
    ],
    color: '#8b5cf6', // 紫色
    strokeColor: '#7c3aed',
    fillOpacity: 0.08,
    strokeOpacity: 0.5,
    strokeWeight: 2
  }
];

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
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const [twNodeCount, setTwNodeCount] = useState(12458);
  const [twLogs, setTwLogs] = useState([]);
  const [assetValue, setAssetValue] = useState(1425000000);
  const [unitCount, setUnitCount] = useState(42109);
  const [assetLogs, setAssetLogs] = useState([]);
  const [walletLogs, setWalletLogs] = useState([]);
  const [blockHeight, setBlockHeight] = useState('8922104');
  const [loading, setLoading] = useState(true);
  const [markLoading, setMarkLoading] = useState(false);
  const [balance, setBalance] = useState(null);

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
  const missileRangeCirclesRef = useRef([]); // 导弹射程覆盖圆形
  const [missileVisibility, setMissileVisibility] = useState(
    MISSILE_DATA.reduce((acc, missile) => {
      acc[missile.id] = true; // 默认全部显示
      return acc;
    }, {})
  );
  const exercisePolygonsRef = useRef([]); // 军演区域多边形
  const [exerciseVisibility, setExerciseVisibility] = useState(
    PLA_EXERCISE_DATA.reduce((acc, exercise) => {
      acc[exercise.id] = true; // 默认全部显示
      return acc;
    }, {})
  );

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

  // 检查余额
  const checkBalance = async () => {
    if (!publicKey) return;
    try {
      const result = await getTaiOneTokenBalanceAPI(publicKey.toString());
      if (result.success) {
        const bal = parseFloat(result.data?.balance || result.balance || 0) / 1e6;
        setBalance(bal);
      }
    } catch (error) {
      console.error('检查余额失败:', error);
    }
  };

  React.useEffect(() => {
    if (connected && publicKey) {
      checkBalance();
    }
  }, [connected, publicKey]);

  // 统一处理功能按钮点击
  const handleActionClick = async (actionType, totAmount) => {
    if (!connected || !publicKey) {
      alert('请先连接钱包');
      return;
    }

    if (balance === null) {
      await checkBalance();
    }

    if (balance < totAmount) {
      alert(`余额不足，需要至少${totAmount} TOT，当前余额：${balance?.toFixed(2) || 0}`);
      return;
    }

    setMarkLoading(true);
    try {
      // 根据功能类型处理
      if (['origin', 'property', 'refuge', 'relative', 'memory', 'resource', 'contact', 'future'].includes(actionType)) {
        // 原有标记功能，使用原有API
        const result = await consumeTokenForMarking(actionType, publicKey.toString());
        
        if (!result.success) {
          throw new Error(result.message || '消耗Token失败');
        }

        const transaction = Transaction.from(Buffer.from(result.transaction, 'base64'));
        const signature = await sendTransaction(transaction, connection);
        await connection.confirmTransaction(signature, 'confirmed');

        // 导航到统一标记页面
        navigate(`/mark/${actionType}`);
      } else {
        // 新功能，使用新的API
        const result = await consumeTokenForAction(publicKey.toString(), actionType, totAmount, actionType);
        
        if (!result.success) {
          throw new Error(result.message || '消耗Token失败');
        }

        // 如果有交易，需要用户签名
        if (result.transaction) {
          const transaction = Transaction.from(Buffer.from(result.transaction, 'base64'));
          const signature = await sendTransaction(transaction, connection);
          await connection.confirmTransaction(signature, 'confirmed');
        }

        // 根据功能类型执行不同操作
        await handleNewAction(actionType);
      }
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败: ' + (error.message || '未知错误'));
    } finally {
      setMarkLoading(false);
    }
  };

  // 处理新功能的具体操作
  const handleNewAction = async (actionType) => {
    switch (actionType) {
      case 'lantern_release':
        // 放飞孔明灯 - 直接在地图上释放
        handleReleaseLantern();
        break;
      case 'temple_renovation':
        // 修缮妈祖庙 - 导航到地图选择页面
        navigate('/map-action/temple-renovation');
        break;
      case 'ancestor_worship':
        // 祭拜祖先 - 导航到地图选择页面
        navigate('/map-action/ancestor-worship');
        break;
      case 'light_hometown':
        // 点亮家乡灯火 - 导航到地图选择页面
        navigate('/map-action/light-hometown');
        break;
      case 'evacuation_route':
        // 标记安全撤离路线 - 导航到路线绘制页面
        navigate('/map-action/evacuation-route');
        break;
      case 'pledge_return':
        // 宣誓回归祖国 - 导航到宣誓页面
        navigate('/map-action/pledge-return');
        break;
      case 'send_letter':
        // 寄送家书 - 导航到家书编辑页面
        navigate('/map-action/send-letter');
        break;
      case 'ancestral_hall':
        // 标记家族祠堂 - 导航到地图选择页面
        navigate('/map-action/ancestral-hall');
        break;
      default:
        console.warn('未知的功能类型:', actionType);
    }
  };

  // 放飞孔明灯处理函数
  const handleReleaseLantern = () => {
    if (!taiwanLanternOverlayRef.current) {
      alert('地图未准备好，请稍后再试');
      return;
    }

    // 获取用户位置或使用随机位置
    const getRandomTaiwanPosition = () => {
      const hotspot = taiwanHotspots[Math.floor(Math.random() * taiwanHotspots.length)];
      return {
        lng: hotspot.lng + (Math.random() - 0.5) * 0.1,
        lat: hotspot.lat + (Math.random() - 0.5) * 0.1
      };
    };

    const position = getRandomTaiwanPosition();
    const wish = WISHES[Math.floor(Math.random() * WISHES.length)];
    
    // 释放孔明灯
    taiwanLanternOverlayRef.current.releaseLanternFromGeo(position.lng, position.lat, wish);
    
    // 记录操作
    recordMapAction('lantern_release', {
      walletAddress: publicKey.toString(),
      location: position,
      wish: wish,
      timestamp: Date.now()
    }).catch(err => console.error('记录孔明灯释放失败:', err));

    alert('孔明灯已放飞，愿你的愿望成真！');
  };

  // 功能类型配置（16个功能，两排）
  const markTypes = [
    // 第一排（8个）
    { type: 'origin', label: '标记大陆祖籍', icon: MapPin, color: 'red', totAmount: 100, isNew: false },
    { type: 'property', label: '标记大陆祖产', icon: Home, color: 'red', totAmount: 100, isNew: false },
    { type: 'refuge', label: '标记避难所', icon: Shield, color: 'orange', totAmount: 100, isNew: false },
    { type: 'relative', label: '标记亲属位置', icon: Users, color: 'blue', totAmount: 100, isNew: false },
    { type: 'temple_renovation', label: '修缮大陆妈祖庙', icon: Church, color: 'purple', totAmount: 150, isNew: true },
    { type: 'lantern_release', label: '放飞孔明灯', icon: Sparkles, color: 'yellow', totAmount: 100, isNew: true },
    { type: 'ancestor_worship', label: '祭拜祖先', icon: CandlestickChart, color: 'orange', totAmount: 200, isNew: true },
    { type: 'light_hometown', label: '点亮家乡灯火', icon: Lamp, color: 'yellow', totAmount: 150, isNew: true },
    // 第二排（8个）
    { type: 'memory', label: '标记历史记忆', icon: Clock, color: 'purple', totAmount: 100, isNew: false },
    { type: 'resource', label: '标记资源点', icon: Package, color: 'green', totAmount: 100, isNew: false },
    { type: 'contact', label: '标记联络节点', icon: Phone, color: 'cyan', totAmount: 100, isNew: false },
    { type: 'future', label: '标记未来规划', icon: Target, color: 'yellow', totAmount: 100, isNew: false },
    { type: 'evacuation_route', label: '标记安全撤离路线', icon: Route, color: 'green', totAmount: 250, isNew: true },
    { type: 'pledge_return', label: '宣誓回归祖国', icon: Flag, color: 'red', totAmount: 300, isNew: true },
    { type: 'send_letter', label: '寄送家书', icon: Mail, color: 'blue', totAmount: 150, isNew: true },
    { type: 'ancestral_hall', label: '标记家族祠堂', icon: Building, color: 'purple', totAmount: 200, isNew: true }
  ];

  // 绘制导弹射程覆盖范围
  const drawMissileRangeCircles = () => {
    if (!mainlandMapRef.current || !window.AMap) {
      console.log('地图未初始化，延迟重试绘制导弹射程');
      setTimeout(drawMissileRangeCircles, 1000);
      return;
    }

    console.log('开始绘制导弹射程覆盖范围，可见性状态:', missileVisibility);

    // 清除旧的圆形（添加安全检查）
    if (missileRangeCirclesRef.current && missileRangeCirclesRef.current.length > 0) {
      missileRangeCirclesRef.current.forEach((item) => {
        try {
          if (item && item.circle) {
            item.circle.setMap(null);
          }
        } catch (e) {
          console.warn('Failed to remove missile circle:', e);
        }
      });
    }
    missileRangeCirclesRef.current = [];

    // 为每种导弹绘制射程圆
    MISSILE_DATA.forEach((missile, index) => {
      // 检查是否应该显示
      if (!missileVisibility[missile.id]) {
        console.log(`跳过 ${missile.name}，当前不可见`);
        return;
      }

      try {
        // 将公里转换为米（高德地图Circle使用米作为半径单位）
        const radiusInMeters = missile.range * 1000;

        console.log(`绘制 ${missile.name}，半径: ${radiusInMeters}米，中心: [${TAIWAN_LAUNCH_SITE.lng}, ${TAIWAN_LAUNCH_SITE.lat}]`);

        // 创建圆形覆盖区域 - 使用 AMap.LngLat 对象
        const circle = new window.AMap.Circle({
          center: new window.AMap.LngLat(TAIWAN_LAUNCH_SITE.lng, TAIWAN_LAUNCH_SITE.lat),
          radius: radiusInMeters,
          fillColor: missile.color,
          fillOpacity: missile.fillOpacity,
          strokeColor: missile.strokeColor,
          strokeOpacity: missile.strokeOpacity,
          strokeWeight: missile.strokeWeight,
          strokeStyle: 'dashed', // 使用虚线边框，符合军事标绘标准
          zIndex: 50 + index, // 确保不同圆形的层级
          cursor: 'default'
        });

        // 添加到地图
        circle.setMap(mainlandMapRef.current);
        missileRangeCirclesRef.current.push({ circle, missileId: missile.id });

        console.log(`成功绘制 ${missile.name} 的射程覆盖范围`);

        // 添加信息窗口（可选，显示导弹信息）
        circle.on('click', () => {
          const infoWindow = new window.AMap.InfoWindow({
            content: `
              <div style="padding: 8px; font-family: monospace; color: #fff; background: rgba(0,0,0,0.8); border: 1px solid ${missile.color};">
                <div style="font-weight: bold; margin-bottom: 4px; color: ${missile.color};">
                  ${missile.name}
                </div>
                <div style="font-size: 12px;">
                  射程: <span style="color: ${missile.color};">${missile.range} 公里</span>
                </div>
              </div>
            `,
            offset: new window.AMap.Pixel(0, -10)
          });
          infoWindow.open(mainlandMapRef.current, new window.AMap.LngLat(TAIWAN_LAUNCH_SITE.lng, TAIWAN_LAUNCH_SITE.lat));
        });

      } catch (error) {
        console.error(`Failed to draw missile range circle for ${missile.name}:`, error);
      }
    });

    console.log(`已绘制 ${missileRangeCirclesRef.current.length} 个导弹射程覆盖范围`);
  };

  // 切换导弹覆盖范围的显示/隐藏
  const toggleMissileVisibility = (missileId) => {
    console.log('切换导弹可见性:', missileId, '当前状态:', missileVisibility[missileId]);
    setMissileVisibility(prev => {
      const newVisibility = {
        ...prev,
        [missileId]: !prev[missileId]
      };
      console.log('新的可见性状态:', newVisibility);
      return newVisibility;
    });
  };

  // 绘制军演区域
  const drawExercisePolygons = () => {
    if (!taiwanMapRef.current || !window.AMap) {
      console.log('台湾地图未初始化，延迟重试绘制军演区域');
      setTimeout(drawExercisePolygons, 1000);
      return;
    }

    console.log('开始绘制军演区域，可见性状态:', exerciseVisibility);

    // 清除旧的多边形（添加安全检查）
    if (exercisePolygonsRef.current && exercisePolygonsRef.current.length > 0) {
      exercisePolygonsRef.current.forEach((item) => {
        try {
          if (item && item.polygon) {
            item.polygon.setMap(null);
          }
        } catch (e) {
          console.warn('Failed to remove exercise polygon:', e);
        }
      });
    }
    exercisePolygonsRef.current = [];

    // 为每次军演绘制区域
    PLA_EXERCISE_DATA.forEach((exercise, exerciseIndex) => {
      // 检查是否应该显示
      if (!exerciseVisibility[exercise.id]) {
        console.log(`跳过 ${exercise.name}，当前不可见`);
        return;
      }

      // 为每个演习区域绘制多边形
      exercise.areas.forEach((area, areaIndex) => {
        try {
          // 将坐标转换为 AMap.LngLat 对象数组
          const path = area.map(coord => new window.AMap.LngLat(coord[0], coord[1]));

          console.log(`绘制 ${exercise.name} 区域 ${areaIndex + 1}，坐标点数量: ${path.length}`);

          // 创建多边形（符合军事标绘标准：虚线边框）
          const polygon = new window.AMap.Polygon({
            path: path,
            fillColor: exercise.color,
            fillOpacity: exercise.fillOpacity,
            strokeColor: exercise.strokeColor,
            strokeOpacity: exercise.strokeOpacity,
            strokeWeight: exercise.strokeWeight,
            strokeStyle: 'dashed', // 虚线边框，符合军事标绘标准
            zIndex: 30 + exerciseIndex * 10 + areaIndex, // 确保不同多边形的层级
            cursor: 'default'
          });

          // 添加到地图
          polygon.setMap(taiwanMapRef.current);
          exercisePolygonsRef.current.push({ polygon, exerciseId: exercise.id, areaIndex });

          console.log(`成功绘制 ${exercise.name} 区域 ${areaIndex + 1}`);

          // 添加信息窗口（显示演习信息）
          polygon.on('click', () => {
            const infoWindow = new window.AMap.InfoWindow({
              content: `
                <div style="padding: 10px; font-family: monospace; color: #fff; background: rgba(0,0,0,0.9); border: 2px solid ${exercise.color}; min-width: 200px;">
                  <div style="font-weight: bold; margin-bottom: 6px; color: ${exercise.color}; font-size: 14px;">
                    ${exercise.name}
                  </div>
                  <div style="font-size: 11px; margin-bottom: 4px; color: #ccc;">
                    代号: ${exercise.description}
                  </div>
                  <div style="font-size: 11px; margin-bottom: 4px; color: #aaa;">
                    时间: ${exercise.date} 至 ${exercise.dateEnd}
                  </div>
                  <div style="font-size: 10px; color: #888; margin-top: 6px; border-top: 1px solid #444; padding-top: 4px;">
                    区域 ${areaIndex + 1} / ${exercise.areas.length}
                  </div>
                </div>
              `,
              offset: new window.AMap.Pixel(0, -10)
            });
            // 计算多边形中心点
            const centerLng = area.reduce((sum, coord) => sum + coord[0], 0) / area.length;
            const centerLat = area.reduce((sum, coord) => sum + coord[1], 0) / area.length;
            infoWindow.open(taiwanMapRef.current, new window.AMap.LngLat(centerLng, centerLat));
          });

        } catch (error) {
          console.error(`Failed to draw exercise polygon for ${exercise.name} area ${areaIndex + 1}:`, error);
        }
      });
    });

    console.log(`已绘制 ${exercisePolygonsRef.current.length} 个军演区域`);
  };

  // 切换军演区域的显示/隐藏
  const toggleExerciseVisibility = (exerciseId) => {
    console.log('切换军演可见性:', exerciseId, '当前状态:', exerciseVisibility[exerciseId]);
    setExerciseVisibility(prev => {
      const newVisibility = {
        ...prev,
        [exerciseId]: !prev[exerciseId]
      };
      console.log('新的可见性状态:', newVisibility);
      return newVisibility;
    });
  };

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

        // 在地图加载完成后绘制军演区域
        if (taiwanMap && taiwanMap.on) {
          taiwanMap.on('complete', () => {
            console.log('taiwan map complete event fired');
            setTimeout(() => {
              console.log('准备绘制军演区域');
              drawExercisePolygons();
            }, 1500);
          });
        }
        // 备用延迟绘制
        setTimeout(() => {
          if (taiwanMapRef.current) {
            console.log('备用：准备绘制军演区域');
            drawExercisePolygons();
          }
        }, 2500);
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
              // 绘制导弹射程覆盖范围 - 确保地图完全准备好
              console.log('准备绘制导弹射程覆盖范围');
              drawMissileRangeCircles();
            }, 1500); // 增加延迟确保地图完全加载
          });
        }
        // 备用：短延迟后再次尝试（防止 complete 事件未触发）
        setTimeout(() => {
          if (mainlandMapRef.current && !userMarkerRef.current) {
            try { addUserLocationMarker(); } catch (e) { console.warn('delayed addUserLocationMarker failed:', e); }
          }
          // 备用：延迟加载安全屋
          loadSafehouses();
          // 备用：绘制导弹射程覆盖范围
          console.log('备用：准备绘制导弹射程覆盖范围');
          drawMissileRangeCircles();
        }, 2500); // 增加延迟

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
      // 清理导弹射程圆形
      missileRangeCirclesRef.current.forEach(({ circle }) => {
        try { circle.setMap(null); } catch (e) {}
      });
      missileRangeCirclesRef.current = [];
      // 清理军演区域多边形
      exercisePolygonsRef.current.forEach(({ polygon }) => {
        try { polygon.setMap(null); } catch (e) {}
      });
      exercisePolygonsRef.current = [];
    };
  }, []);

  // 当导弹可见性改变时重新绘制
  useEffect(() => {
    if (mainlandMapRef.current && window.AMap) {
      console.log('导弹可见性变化，重新绘制');
      drawMissileRangeCircles();
    } else {
      console.log('地图未准备好，等待初始化');
    }
  }, [missileVisibility]);

  // 当军演可见性改变时重新绘制
  useEffect(() => {
    if (taiwanMapRef.current && window.AMap) {
      console.log('军演可见性变化，重新绘制');
      drawExercisePolygons();
    } else {
      console.log('台湾地图未准备好，等待初始化');
    }
  }, [exerciseVisibility]);

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
    <div className="w-full h-full bg-slate-950 relative overflow-hidden flex flex-col" style={{ paddingTop: '4rem' }}>
      <div className="absolute top-16 md:top-20 left-0 w-full h-16 z-20 bg-gradient-to-b from-slate-900 to-transparent flex justify-between items-center px-8 border-b border-slate-800/50">
        <div className="flex items-center space-x-4">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
          <span className="text-xs font-mono text-red-400 tracking-widest">你的标记将挽救生命</span>
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

      <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-2 gap-4 px-4 md:px-8 pt-16 pb-2" style={{ minHeight: 0 }}>
        <article className="map-panel" style={{ height: '100%', minHeight: 0 }}>
          <div className="mainland-map-container" style={{ height: '100%', position: 'relative' }}>
            {/* 导弹射程覆盖图例 */}
            <div className="pointer-events-auto absolute top-4 right-4 bg-black/90 border border-red-900 px-4 py-3 rounded-lg max-w-xs z-10">
              <div className="text-[10px] tracking-[0.2em] uppercase text-red-600 mb-3 font-mono font-bold">导弹射程覆盖</div>
              {MISSILE_DATA.map((missile, index) => {
                const isVisible = missileVisibility[missile.id];
                return (
                  <div 
                    key={missile.id}
                    onClick={() => toggleMissileVisibility(missile.id)}
                    className="flex items-center gap-2 mb-2 text-xs cursor-pointer hover:bg-red-900/30 px-2 py-1 rounded transition-colors"
                  >
                    <div 
                      className="w-4 h-4 rounded-full border-2 flex-shrink-0"
                      style={{
                        backgroundColor: isVisible ? `${missile.color}${Math.round(missile.fillOpacity * 255).toString(16).padStart(2, '0')}` : 'transparent',
                        borderColor: isVisible ? missile.strokeColor : '#666',
                        borderStyle: 'dashed',
                        opacity: isVisible ? 1 : 0.4
                      }}
                    />
                    <div className="flex-1 font-mono text-white">
                      <div className={`text-[10px] ${isVisible ? '' : 'line-through opacity-50'}`}>{missile.name}</div>
                      <div className={`text-[9px] ${isVisible ? 'text-gray-400' : 'text-gray-600'}`}>{missile.range}km</div>
                    </div>
                    <div className="text-[8px] text-gray-500">
                      {isVisible ? '●' : '○'}
                    </div>
                  </div>
                );
              })}
              <div className="text-[8px] text-gray-600 mt-2 pt-2 border-t border-gray-800 font-mono">
                点击切换显示/隐藏
              </div>
            </div>
            <div ref={mainlandMapContainerRef} className="amap-container w-full h-full rounded-lg overflow-hidden" style={{ height: '100%' }} />
          </div>
        </article>

        <article className="map-panel" style={{ height: '100%', minHeight: 0 }}>
          <div className="tw-map-container" style={{ height: '100%', position: 'relative' }}>
            <div className="tw-scan-line" />
            
            {/* 军演区域图例 */}
            <div className="pointer-events-auto absolute top-4 right-4 bg-black/90 border border-blue-900 px-4 py-3 rounded-lg max-w-xs z-10 max-h-[60vh] overflow-y-auto">
              <div className="text-[10px] tracking-[0.2em] uppercase text-blue-600 mb-3 font-mono font-bold">解放军对台军演区域</div>
              {PLA_EXERCISE_DATA.map((exercise, index) => {
                const isVisible = exerciseVisibility[exercise.id];
                return (
                  <div 
                    key={exercise.id}
                    onClick={() => toggleExerciseVisibility(exercise.id)}
                    className="flex items-center gap-2 mb-2 text-xs cursor-pointer hover:bg-blue-900/30 px-2 py-1 rounded transition-colors"
                  >
                    <div 
                      className="w-4 h-4 rounded border-2 flex-shrink-0"
                      style={{
                        backgroundColor: isVisible ? `${exercise.color}${Math.round(exercise.fillOpacity * 255).toString(16).padStart(2, '0')}` : 'transparent',
                        borderColor: isVisible ? exercise.strokeColor : '#666',
                        borderStyle: 'dashed',
                        opacity: isVisible ? 1 : 0.4
                      }}
                    />
                    <div className="flex-1 font-mono text-white">
                      <div className={`text-[10px] ${isVisible ? '' : 'line-through opacity-50'}`}>{exercise.name}</div>
                      <div className={`text-[9px] ${isVisible ? 'text-gray-400' : 'text-gray-600'}`}>{exercise.description}</div>
                      <div className={`text-[8px] ${isVisible ? 'text-gray-500' : 'text-gray-700'}`}>{exercise.date}</div>
                    </div>
                    <div className="text-[8px] text-gray-500">
                      {isVisible ? '●' : '○'}
                    </div>
                  </div>
                );
              })}
              <div className="text-[8px] text-gray-600 mt-2 pt-2 border-t border-gray-800 font-mono">
                点击切换显示/隐藏
              </div>
            </div>
            <div ref={taiwanMapContainerRef} className="amap-container w-full h-full rounded-lg overflow-hidden relative" style={{ height: '100%' }}>
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

      {/* 功能按钮区域 - 两排布局，分别与地图对齐 */}
      <div className="w-full px-4 md:px-8 pb-4 z-20 flex-shrink-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 左侧按钮组 - 与左侧地图对齐 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {markTypes.slice(0, 8).map(({ type, label, icon: Icon, color, totAmount, isNew }) => {
              const colorClasses = {
                red: 'bg-red-900/80 hover:bg-red-800 border-red-700',
                orange: 'bg-orange-900/80 hover:bg-orange-800 border-orange-700',
                blue: 'bg-blue-900/80 hover:bg-blue-800 border-blue-700',
                purple: 'bg-purple-900/80 hover:bg-purple-800 border-purple-700',
                green: 'bg-green-900/80 hover:bg-green-800 border-green-700',
                cyan: 'bg-cyan-900/80 hover:bg-cyan-800 border-cyan-700',
                yellow: 'bg-yellow-900/80 hover:bg-yellow-800 border-yellow-700'
              };
              
              return (
                <button
                  key={type}
                  onClick={() => handleActionClick(type, totAmount)}
                  disabled={markLoading || !connected}
                  className={`${colorClasses[color]} border text-white px-3 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-mono text-xs shadow-lg relative`}
                  title={label}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left truncate">{label}</span>
                  <span className="text-yellow-400 text-[10px] flex-shrink-0">-{totAmount}</span>
                  {isNew && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                  {markLoading && <Loader className="w-3 h-3 animate-spin absolute top-1 right-1" />}
                </button>
              );
            })}
          </div>

          {/* 右侧按钮组 - 与右侧地图对齐 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {markTypes.slice(8, 16).map(({ type, label, icon: Icon, color, totAmount, isNew }) => {
              const colorClasses = {
                red: 'bg-red-900/80 hover:bg-red-800 border-red-700',
                orange: 'bg-orange-900/80 hover:bg-orange-800 border-orange-700',
                blue: 'bg-blue-900/80 hover:bg-blue-800 border-blue-700',
                purple: 'bg-purple-900/80 hover:bg-purple-800 border-purple-700',
                green: 'bg-green-900/80 hover:bg-green-800 border-green-700',
                cyan: 'bg-cyan-900/80 hover:bg-cyan-800 border-cyan-700',
                yellow: 'bg-yellow-900/80 hover:bg-yellow-800 border-yellow-700'
              };
              
              return (
                <button
                  key={type}
                  onClick={() => handleActionClick(type, totAmount)}
                  disabled={markLoading || !connected}
                  className={`${colorClasses[color]} border text-white px-3 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-mono text-xs shadow-lg relative`}
                  title={label}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left truncate">{label}</span>
                  <span className="text-yellow-400 text-[10px] flex-shrink-0">-{totAmount}</span>
                  {isNew && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                  {markLoading && <Loader className="w-3 h-3 animate-spin absolute top-1 right-1" />}
                </button>
              );
            })}
          </div>
        </div>
        {!connected && (
          <div className="text-center text-xs font-mono text-slate-500 mt-3">
            请先连接钱包以使用功能
          </div>
        )}
      </div>
    </div>
  );
};

export default MapSection;

