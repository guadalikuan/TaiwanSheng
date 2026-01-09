import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, Target, Zap, Loader, ArrowLeft } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { AMAP_CONFIG, loadAMapScript } from '../config/amap';
import { getTaiOneTokenBalanceAPI, postMissileLaunch, getMissileLaunchHistory, consumeTokenForMissileLaunch } from '../utils/api';
import { useServerStatus } from '../contexts/ServerStatusContext';

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

const MissileLaunchPage = () => {
  const navigate = useNavigate();
  const { isOnline } = useServerStatus();
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState(null);
  const [selectedMissile, setSelectedMissile] = useState(null);
  const [targetPosition, setTargetPosition] = useState(null);
  const [launchHistory, setLaunchHistory] = useState([]);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchStats, setLaunchStats] = useState({ totalLaunches: 0, successRate: 0, maxDistance: 0 });
  const [missileVisibility, setMissileVisibility] = useState(
    MISSILE_DATA.reduce((acc, missile) => {
      acc[missile.id] = true; // 默认全部显示
      return acc;
    }, {})
  );

  const mainlandMapContainerRef = useRef(null);
  const mainlandMapRef = useRef(null);
  const targetMarkerRef = useRef(null);
  const trajectoryPolylineRef = useRef(null);
  const missileIconRef = useRef(null);
  const explosionMarkerRef = useRef(null);
  const missileRangeCirclesRef = useRef([]);

  // 计算两点间距离（大圆距离公式，单位：公里）
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // 地球半径（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

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

  // 处理地图点击（导弹发射目标选择）
  const handleMapClickForMissileLaunch = (e) => {
    if (!selectedMissile) {
      return; // 未选择导弹时不处理
    }

    const clickLng = e.lnglat.getLng();
    const clickLat = e.lnglat.getLat();

    // 计算距离
    const distance = calculateDistance(
      TAIWAN_LAUNCH_SITE.lat,
      TAIWAN_LAUNCH_SITE.lng,
      clickLat,
      clickLng
    );

    // 验证射程
    if (distance > selectedMissile.range) {
      alert(`目标距离 ${distance.toFixed(0)}km，超出 ${selectedMissile.name} 的射程（${selectedMissile.range}km）`);
      return;
    }

    // 设置目标位置
    setTargetPosition({
      lat: clickLat,
      lng: clickLng,
      distance: distance
    });

    // 在地图上标记目标
    markTargetOnMap(clickLat, clickLng);
  };

  // 在地图上标记目标位置
  const markTargetOnMap = (lat, lng) => {
    if (!mainlandMapRef.current || !window.AMap) return;

    // 清除旧标记
    if (targetMarkerRef.current) {
      targetMarkerRef.current.setMap(null);
    }

    // 创建目标标记（红色十字）
    const marker = new window.AMap.Marker({
      position: new window.AMap.LngLat(lng, lat),
      content: `
        <div style="
          width: 30px;
          height: 30px;
          position: relative;
          transform: translate(-50%, -50%);
        ">
          <div style="
            position: absolute;
            top: 50%;
            left: 0;
            width: 100%;
            height: 3px;
            background: #ef4444;
            transform: translateY(-50%);
            box-shadow: 0 0 10px #ef4444;
          "></div>
          <div style="
            position: absolute;
            left: 50%;
            top: 0;
            width: 3px;
            height: 100%;
            background: #ef4444;
            transform: translateX(-50%);
            box-shadow: 0 0 10px #ef4444;
          "></div>
        </div>
      `,
      zIndex: 1000,
      offset: new window.AMap.Pixel(0, 0)
    });

    marker.setMap(mainlandMapRef.current);
    targetMarkerRef.current = marker;
  };

  // 计算弧形路径（大圆路径）
  const calculateArcPath = (start, end, numPoints = 50) => {
    const points = [];
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const lat = start[1] + (end[1] - start[1]) * t;
      const lng = start[0] + (end[0] - start[0]) * t;
      // 添加弧形高度（模拟弹道）
      const arcHeight = Math.sin(t * Math.PI) * 0.5; // 0.5度弧形
      points.push([lng, lat + arcHeight]);
    }
    return points;
  };

  // 绘制导弹轨迹动画
  const drawMissileTrajectory = (startPoint, endPoint, missileId) => {
    if (!mainlandMapRef.current || !window.AMap) return;

    const start = [startPoint.lng, startPoint.lat];
    const end = [endPoint.lng, endPoint.lat];
    const trajectoryPoints = calculateArcPath(start, end);

    // 创建轨迹Polyline
    const polyline = new window.AMap.Polyline({
      path: trajectoryPoints,
      strokeColor: '#ff0000',
      strokeWeight: 3,
      strokeStyle: 'solid',
      zIndex: 1000,
      lineJoin: 'round',
      lineCap: 'round'
    });

    polyline.setMap(mainlandMapRef.current);
    trajectoryPolylineRef.current = polyline;

    // 动画：导弹图标沿轨迹移动
    animateMissileAlongPath(trajectoryPoints, endPoint);
  };

  // 导弹图标动画
  const animateMissileAlongPath = (path, endPoint) => {
    if (!mainlandMapRef.current || !window.AMap) return;

    let currentIndex = 0;
    const missileIcon = new window.AMap.Marker({
      position: path[0],
      content: `
        <div style="
          width: 20px;
          height: 20px;
          background: radial-gradient(circle, #ff0000 0%, #ff6666 100%);
          border-radius: 50%;
          box-shadow: 0 0 15px rgba(255,0,0,0.8);
          animation: pulse 0.5s infinite;
        ">
          <style>
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.2); }
            }
          </style>
        </div>
      `,
      zIndex: 1001,
      offset: new window.AMap.Pixel(-10, -10)
    });
    missileIcon.setMap(mainlandMapRef.current);
    missileIconRef.current = missileIcon;

    const interval = setInterval(() => {
      currentIndex += 2;
      if (currentIndex >= path.length) {
        clearInterval(interval);
        // 到达目标，显示爆炸效果
        showExplosion(endPoint);
        missileIcon.setMap(null);
        // 3秒后清除轨迹
        setTimeout(() => {
          if (trajectoryPolylineRef.current) {
            trajectoryPolylineRef.current.setMap(null);
          }
        }, 3000);
      } else {
        missileIcon.setPosition(path[currentIndex]);
      }
    }, 50);
  };

  // 爆炸效果
  const showExplosion = (position) => {
    if (!mainlandMapRef.current || !window.AMap) return;

    const explosion = new window.AMap.Marker({
      position: new window.AMap.LngLat(position.lng, position.lat),
      content: `
        <div style="
          width: 60px;
          height: 60px;
          background: radial-gradient(circle, rgba(255,0,0,0.9) 0%, rgba(255,165,0,0.7) 40%, transparent 100%);
          border-radius: 50%;
          animation: explode 1s ease-out forwards;
          box-shadow: 0 0 40px rgba(255,0,0,0.9);
        "></div>
        <style>
          @keyframes explode {
            0% { transform: scale(0); opacity: 1; }
            100% { transform: scale(3); opacity: 0; }
          }
        </style>
      `,
      zIndex: 1002,
      offset: new window.AMap.Pixel(-30, -30)
    });
    explosion.setMap(mainlandMapRef.current);
    explosionMarkerRef.current = explosion;

    setTimeout(() => {
      explosion.setMap(null);
    }, 2000);
  };

  // 处理导弹发射
  const handleLaunch = async () => {
    if (!selectedMissile || !targetPosition) {
      alert('请选择导弹和目标位置');
      return;
    }

    if (!connected || !publicKey) {
      alert('请先连接钱包');
      return;
    }

    // 检查余额
    if (balance === null) {
      await checkBalance();
    }
    if (balance < 100) {
      alert(`余额不足，需要至少100 TOT，当前余额：${balance?.toFixed(2) || 0}`);
      return;
    }

    setIsLaunching(true);

    try {
      // 1. 调用后端API记录发射
      const launchResult = await postMissileLaunch({
        missileId: selectedMissile.id,
        missileName: selectedMissile.name,
        launchSite: TAIWAN_LAUNCH_SITE,
        target: targetPosition,
        walletAddress: publicKey.toString()
      });

      if (!launchResult.success) {
        throw new Error(launchResult.message || '发射失败');
      }

      // 2. 消耗TOT Token
      const tokenResult = await consumeTokenForMissileLaunch(publicKey.toString());
      if (!tokenResult.success) {
        throw new Error('Token消耗失败');
      }

      // 3. 播放发射动画
      drawMissileTrajectory(
        TAIWAN_LAUNCH_SITE,
        targetPosition,
        selectedMissile.id
      );

      // 4. 更新发射历史
      const newLaunch = {
        id: launchResult.data.id,
        timestamp: new Date(launchResult.data.timestamp),
        missile: selectedMissile.name,
        target: `${targetPosition.lat.toFixed(2)}, ${targetPosition.lng.toFixed(2)}`,
        distance: targetPosition.distance,
        success: true
      };
      setLaunchHistory(prev => [newLaunch, ...prev]);

      // 5. 更新余额
      await checkBalance();

      // 6. 重置状态
      setTimeout(() => {
        setTargetPosition(null);
        if (targetMarkerRef.current) {
          targetMarkerRef.current.setMap(null);
        }
        setIsLaunching(false);
      }, 3000);

    } catch (error) {
      console.error('发射失败:', error);
      alert('发射失败: ' + error.message);
      setIsLaunching(false);
    }
  };

  // 加载发射历史
  useEffect(() => {
    if (!isOnline || !connected || !publicKey) return;

    const loadHistory = async () => {
      try {
        const result = await getMissileLaunchHistory({
          walletAddress: publicKey.toString(),
          limit: 10
        });
        if (result.success && result.data) {
          setLaunchHistory(result.data.history || []);
          if (result.data.stats) {
            setLaunchStats(result.data.stats);
          }
        }
      } catch (error) {
        console.error('加载发射历史失败:', error);
      }
    };

    loadHistory();
  }, [isOnline, connected, publicKey]);

  // 绘制导弹射程覆盖范围
  const drawMissileRangeCircles = () => {
    if (!mainlandMapRef.current || !window.AMap) {
      console.log('地图未初始化，延迟重试绘制导弹射程');
      setTimeout(drawMissileRangeCircles, 1000);
      return;
    }

    console.log('开始绘制导弹射程覆盖范围，可见性状态:', missileVisibility);

    // 清除旧的圆形
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

        // 创建圆形覆盖区域
        const circle = new window.AMap.Circle({
          center: new window.AMap.LngLat(TAIWAN_LAUNCH_SITE.lng, TAIWAN_LAUNCH_SITE.lat),
          radius: radiusInMeters,
          fillColor: missile.color,
          fillOpacity: missile.fillOpacity,
          strokeColor: missile.strokeColor,
          strokeOpacity: missile.strokeOpacity,
          strokeWeight: missile.strokeWeight,
          strokeStyle: 'dashed',
          zIndex: 50 + index,
          cursor: 'default'
        });

        // 添加到地图
        circle.setMap(mainlandMapRef.current);
        missileRangeCirclesRef.current.push({ circle, missileId: missile.id });

        console.log(`成功绘制 ${missile.name} 的射程覆盖范围`);

        // 添加信息窗口
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

  // 初始化地图
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      await loadAMapScript();
      if (!mounted || !window.AMap) return;

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

        // 在地图加载完成后绘制导弹射程
        if (mainlandMap && mainlandMap.on) {
          mainlandMap.on('complete', () => {
            console.log('mainland map complete event fired');
            setTimeout(() => {
              console.log('准备绘制导弹射程覆盖范围');
              drawMissileRangeCircles();
            }, 1500);
          });
        }
        
        // 添加地图点击事件处理（导弹发射目标选择）
        mainlandMap.on('click', (e) => {
          handleMapClickForMissileLaunch(e);
        });
        
        // 备用：延迟绘制导弹射程
        setTimeout(() => {
          if (mainlandMapRef.current) {
            console.log('备用：准备绘制导弹射程覆盖范围');
            drawMissileRangeCircles();
          }
        }, 2500);

      } catch (e) {
        console.error('Failed to initialize mainland map:', e);
      }
    };

    init();

    return () => {
      mounted = false;
      if (mainlandMapRef.current) {
        mainlandMapRef.current.destroy();
        mainlandMapRef.current = null;
      }
      // 清理标记
      if (targetMarkerRef.current) {
        try { targetMarkerRef.current.setMap(null); } catch (e) {}
      }
      if (trajectoryPolylineRef.current) {
        try { trajectoryPolylineRef.current.setMap(null); } catch (e) {}
      }
      if (missileIconRef.current) {
        try { missileIconRef.current.setMap(null); } catch (e) {}
      }
      if (explosionMarkerRef.current) {
        try { explosionMarkerRef.current.setMap(null); } catch (e) {}
      }
      // 清理导弹射程圆形
      missileRangeCirclesRef.current.forEach(({ circle }) => {
        try { circle.setMap(null); } catch (e) {}
      });
      missileRangeCirclesRef.current = [];
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

  return (
    <div className="w-full h-screen bg-slate-950 relative overflow-hidden flex flex-col">
      {/* 顶部导航栏 */}
      <div className="absolute top-0 left-0 w-full h-16 z-20 bg-gradient-to-b from-slate-900 to-transparent flex justify-between items-center px-8 border-b border-slate-800/50">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-mono">返回首页</span>
        </button>
        <div className="flex items-center space-x-4">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
          <span className="text-xs font-mono text-red-400 tracking-widest">导弹发射模拟系统</span>
        </div>
        {connected && balance !== null && (
          <div className="text-xs font-mono text-slate-400">
            余额: <span className="text-yellow-400">{balance.toFixed(2)}</span> TOT
          </div>
        )}
      </div>

      <div className="flex-1 w-full h-full pt-16 grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 md:px-8 py-6">
        {/* 左侧：导弹选择和控制面板 */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* 导弹发射控制面板 */}
          <div className="bg-black/90 border border-red-900 px-4 py-3 rounded-lg max-h-[40vh] overflow-y-auto">
            <div className="text-[10px] tracking-[0.2em] uppercase text-red-600 mb-3 font-mono font-bold flex items-center gap-2">
              <Rocket className="w-4 h-4" />
              MISSILE LAUNCH SYSTEM
            </div>
            
            {/* 导弹选择 */}
            <div className="mb-4">
              <div className="text-[9px] text-gray-400 mb-2 font-mono">选择导弹类型:</div>
              {MISSILE_DATA.map((missile) => (
                <div
                  key={missile.id}
                  onClick={() => {
                    setSelectedMissile(missile);
                    setTargetPosition(null);
                    if (targetMarkerRef.current) {
                      targetMarkerRef.current.setMap(null);
                    }
                  }}
                  className={`flex items-center gap-2 mb-2 text-xs cursor-pointer px-2 py-1 rounded transition-colors ${
                    selectedMissile?.id === missile.id
                      ? 'bg-red-900/50 border border-red-700'
                      : 'hover:bg-red-900/30'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full border-2 flex-shrink-0"
                    style={{
                      backgroundColor: selectedMissile?.id === missile.id ? missile.color : 'transparent',
                      borderColor: missile.strokeColor
                    }}
                  />
                  <div className="flex-1 font-mono text-white">
                    <div className="text-[10px]">{missile.name}</div>
                    <div className="text-[9px] text-gray-400">{missile.range}km</div>
                  </div>
                  {selectedMissile?.id === missile.id && (
                    <div className="text-[8px] text-red-400">●</div>
                  )}
                </div>
              ))}
            </div>

            {/* 目标信息 */}
            {selectedMissile && (
              <div className="mb-4 border-t border-gray-800 pt-3">
                <div className="text-[9px] text-gray-400 mb-2 font-mono">目标信息:</div>
                <div className="text-[10px] font-mono text-white space-y-1">
                  <div>发射点: {TAIWAN_LAUNCH_SITE.name}</div>
                  <div>目标点: {targetPosition ? `${targetPosition.lat.toFixed(2)}, ${targetPosition.lng.toFixed(2)}` : '[点击地图选择]'}</div>
                  {targetPosition && (
                    <>
                      <div>距离: {targetPosition.distance.toFixed(0)} km</div>
                      <div>预计飞行: {Math.round((targetPosition.distance / 800) * 3600)} 秒</div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 发射按钮 */}
            {selectedMissile && targetPosition && (
              <button
                onClick={handleLaunch}
                disabled={isLaunching || !connected}
                className="w-full bg-red-900/80 hover:bg-red-800 border border-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-mono text-xs shadow-lg mb-3"
              >
                <Zap className="w-4 h-4" />
                <span>发射</span>
                <span className="text-yellow-400 text-[10px]">-100 TOT</span>
                {isLaunching && <Loader className="w-3 h-3 animate-spin" />}
              </button>
            )}

            {/* 统计信息 */}
            <div className="border-t border-gray-800 pt-3">
              <div className="text-[9px] text-gray-400 mb-2 font-mono">发射统计:</div>
              <div className="text-[10px] font-mono text-white space-y-1">
                <div>累计发射: {launchStats.totalLaunches} 次</div>
                <div>命中率: {(launchStats.successRate * 100).toFixed(0)}%</div>
                <div>最远距离: {launchStats.maxDistance.toFixed(0)} km</div>
              </div>
            </div>
          </div>

          {/* 导弹射程覆盖图例 */}
          <div className="bg-black/90 border border-red-900 px-4 py-3 rounded-lg max-h-[30vh] overflow-y-auto">
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

          {/* 发射历史记录面板 */}
          <div className="bg-black/90 border border-orange-900 px-4 py-3 rounded-lg max-h-[30vh] overflow-y-auto">
            <div className="text-[10px] tracking-[0.2em] uppercase text-orange-600 mb-3 font-mono font-bold flex items-center gap-2">
              <Target className="w-4 h-4" />
              LAUNCH HISTORY
            </div>
            
            {launchHistory.length > 0 ? (
              <div className="space-y-2">
                {launchHistory.slice(0, 5).map((launch) => (
                  <div
                    key={launch.id}
                    className="bg-gray-900/50 border border-gray-800 px-2 py-2 rounded text-xs font-mono"
                  >
                    <div className="text-[9px] text-gray-400 mb-1">
                      {launch.timestamp instanceof Date
                        ? launch.timestamp.toLocaleTimeString()
                        : new Date(launch.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="text-[10px] text-white mb-1">
                      {launch.missile} → {launch.target}
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-[9px] text-gray-400">
                        {launch.distance?.toFixed(0) || 0}km
                      </div>
                      {launch.success && (
                        <div className="text-[9px] text-green-400">✓ 命中</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[10px] text-gray-500 font-mono text-center py-4">
                暂无发射记录
              </div>
            )}
          </div>
        </div>

        {/* 右侧：地图区域 */}
        <div className="lg:col-span-2">
          <div className="map-panel h-full relative">
            <div className="mainland-map-container h-full relative">
              <div ref={mainlandMapContainerRef} className="amap-container w-full h-full rounded-lg overflow-hidden" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissileLaunchPage;
