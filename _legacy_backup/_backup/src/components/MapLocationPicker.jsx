import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, Loader, AlertCircle, Navigation2, X } from 'lucide-react';
import { isAmapConfigured, searchAmapPOI, reverseGeocodeAmap, geocodeAmap } from '../utils/amapApi';

// 修复 Leaflet 默认图标路径问题
const transparentGif = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
if (L.Icon.Default.prototype) {
  if (typeof L.Icon.Default.prototype._getIconUrl === 'function') {
    L.Icon.Default.prototype._getIconUrl = function(name) {
      return transparentGif;
    };
  }
  L.Icon.Default.mergeOptions({
    iconUrl: transparentGif,
    iconRetinaUrl: transparentGif,
    shadowUrl: transparentGif,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
  });
}

/**
 * 地图位置选择器组件
 * 支持：
 * 1. 根据地址自动反向地理编码获取经纬度
 * 2. 在地图上点击或拖动标记选择位置
 * 3. 显示当前选择的经纬度
 */
const MapLocationPicker = ({ 
  city = '西安',
  province = '', // 省份信息（可选，用于更准确的地理编码）
  address = '', 
  onChange,
  defaultLat = null,
  defaultLng = null 
}) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [searchAddress, setSearchAddress] = useState(address || '');
  const [isSearching, setIsSearching] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [currentLat, setCurrentLat] = useState(defaultLat || 34.3416); // 西安默认坐标
  const [currentLng, setCurrentLng] = useState(defaultLng || 108.9398);
  const [isDragging, setIsDragging] = useState(false);
  const [searchResults, setSearchResults] = useState([]); // 搜索结果列表
  const [showResults, setShowResults] = useState(false); // 是否显示搜索结果列表
  const [selectedIndex, setSelectedIndex] = useState(-1); // 当前选中的结果索引（用于键盘导航）
  const searchTimeoutRef = useRef(null); // 防抖定时器

  // 初始化地图
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: true,
      dragging: true,
      doubleClickZoom: true,
    }).setView([currentLat, currentLng], 13);

    // 使用 OpenStreetMap 瓦片（浅色主题，房地产风格）
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors',
      crossOrigin: true,
    }).addTo(map);

    mapRef.current = map;

    // 创建自定义标记图标（房地产风格 - 蓝色房子图标）
    const customIcon = L.divIcon({
      className: 'custom-map-marker',
      html: '<div style="width: 36px; height: 36px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; position: relative;"><div style="width: 20px; height: 20px; background: white; clip-path: polygon(50% 0%, 0% 100%, 100% 100%);"></div></div>',
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });

    // 创建初始标记
    const marker = L.marker([currentLat, currentLng], {
      icon: customIcon,
      draggable: true,
    }).addTo(map);

    markerRef.current = marker;

    // 标记拖动事件
    marker.on('dragstart', () => {
      setIsDragging(true);
      setIsReverseGeocoding(false);
    });
    marker.on('dragend', async (e) => {
      setIsDragging(false);
      const lat = e.target.getLatLng().lat;
      const lng = e.target.getLatLng().lng;
      setCurrentLat(lat);
      setCurrentLng(lng);
      
      // 拖动结束后获取地址（优先使用高德地图 API）
      setIsReverseGeocoding(true);
      try {
        let addressName = '';
        
        // 优先使用高德地图 API
        if (isAmapConfigured()) {
          try {
            const amapResult = await reverseGeocodeAmap(lat, lng);
            if (amapResult && amapResult.fullAddress) {
              addressName = amapResult.fullAddress;
            } else if (amapResult && amapResult.address) {
              addressName = amapResult.address;
            }
          } catch (amapError) {
            console.warn('高德地图逆地理编码失败，回退到 Nominatim:', amapError);
            // 回退到 Nominatim
          }
        }
        
        // 如果高德地图 API 未配置或失败，使用 Nominatim 回退方案
        if (!addressName) {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=zh-CN`,
            {
              headers: {
                'User-Agent': 'TWS-Asset-Management-System/1.0',
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data && data.display_name) {
              addressName = data.display_name;
            }
          }
        }
        
        // 更新地址和回调
        if (addressName) {
          setSearchAddress(addressName);
          if (onChange) {
            onChange({ lat, lng, address: addressName });
          }
        } else {
          if (onChange) {
            onChange({ lat, lng, address: searchAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
          }
        }
      } catch (error) {
        console.error('拖动后地理编码错误:', error);
        if (onChange) {
          onChange({ lat, lng, address: searchAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
        }
      } finally {
        setIsReverseGeocoding(false);
      }
    });

    // 地图点击事件 - 点击后立即获取地址
    map.on('click', async (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      
      // 更新标记位置
      marker.setLatLng([lat, lng]);
      setCurrentLat(lat);
      setCurrentLng(lng);
      
      // 立即进行正向地理编码获取地址
      setIsReverseGeocoding(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=zh-CN`,
          {
            headers: {
              'User-Agent': 'TWS-Asset-Management-System/1.0',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data && data.display_name) {
            const addressName = data.display_name;
            setSearchAddress(addressName);
            if (onChange) {
              onChange({ lat, lng, address: addressName });
            }
          } else {
            // 如果获取不到详细地址，至少更新坐标
            if (onChange) {
              onChange({ lat, lng, address: searchAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
            }
          }
        }
      } catch (error) {
        console.error('点击位置地理编码错误:', error);
        // 即使失败也要更新坐标
        if (onChange) {
          onChange({ lat, lng, address: searchAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
        }
      } finally {
        setIsReverseGeocoding(false);
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);


  // 更新标记位置（当坐标变化时）
  useEffect(() => {
    if (markerRef.current && mapRef.current && (currentLat !== defaultLat || currentLng !== defaultLng)) {
      markerRef.current.setLatLng([currentLat, currentLng]);
      // 只有当坐标真正变化时才移动视图，避免不必要的动画
      const currentCenter = mapRef.current.getCenter();
      const latDiff = Math.abs(currentCenter.lat - currentLat);
      const lngDiff = Math.abs(currentCenter.lng - currentLng);
      if (latDiff > 0.001 || lngDiff > 0.001) {
        mapRef.current.setView([currentLat, currentLng], 13, { animate: true });
      }
    }
  }, [currentLat, currentLng]);

  // 点击外部关闭搜索结果列表
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      // 检查点击是否在搜索容器外部
      const searchContainer = document.querySelector('.search-container');
      if (showResults && searchContainer && !searchContainer.contains(target)) {
        setShowResults(false);
        setSelectedIndex(-1);
      }
    };
    
    if (showResults) {
      // 延迟添加事件监听，避免立即触发
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showResults]);


  // 处理地址搜索（手动点击搜索按钮或按Enter）
  const handleSearch = (e) => {
    if (e) e.preventDefault();
    if (!searchAddress.trim()) {
      setSearchError('请输入地址或经纬度坐标');
      return;
    }
    
    // 清除防抖定时器（如果存在）
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // 执行搜索
    geocodeAddress(searchAddress.trim());
  };

  // 移除实时搜索，改为手动触发（回车键或搜索按钮）

  // 选择搜索结果并定位（用户手动选择后才会执行定位）
  const selectSearchResult = (result, keepListOpen = false) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const displayName = result.display_name || searchAddress;
    
    // 更新坐标
    setCurrentLat(lat);
    setCurrentLng(lng);
    setSearchAddress(displayName);
    
    // 定位到该坐标
    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      // 根据结果类型和重要性调整缩放级别
      const resultType = result.type || '';
      const zoom = ['building', 'house', 'residential'].includes(resultType.toLowerCase()) ? 18 : 
                   resultType === 'road' ? 17 : 
                   ['city', 'town'].includes(resultType.toLowerCase()) ? 13 : 
                   (result.importance || 0) > 0.7 ? 16 : 15;
      mapRef.current.setView([lat, lng], zoom, { animate: true });
    }

    // 通知父组件
    if (onChange) {
      onChange({ lat, lng, address: displayName });
    }
    
    // 用户手动选择后隐藏列表
    if (!keepListOpen) {
      setShowResults(false);
      setSelectedIndex(-1);
    }
  };

  // 获取结果类型的中文描述
  const getResultTypeLabel = (result) => {
    const type = (result.type || '').toLowerCase();
    const typeMap = {
      'building': '建筑物',
      'house': '房屋',
      'residential': '住宅',
      'commercial': '商业',
      'road': '道路',
      'place': '地点',
      'city': '城市',
      'town': '城镇',
      'village': '村庄',
    };
    return typeMap[type] || '位置';
  };

  // 智能构建搜索查询字符串
  const buildSearchQuery = (addressQuery) => {
    // 清理地址字符串（去除多余空格，统一格式）
    const cleanedQuery = addressQuery.trim().replace(/\s+/g, ' ');
    
    // 检查地址是否已包含省份和城市信息
    const hasProvince = province && cleanedQuery.includes(province.replace('省', '').replace('市', ''));
    const hasCity = city && (cleanedQuery.includes(city.replace('市', '')) || cleanedQuery.includes(city));
    
    // 如果地址已包含省份和城市，直接使用
    if (hasProvince && hasCity) {
      return cleanedQuery;
    }
    
    // 如果只包含省份，添加城市
    if (hasProvince && !hasCity && city) {
      return `${cleanedQuery} ${city}`;
    }
    
    // 如果只包含城市，添加省份（如果有）
    if (hasCity && !hasProvince && province) {
      return `${province} ${cleanedQuery}`;
    }
    
    // 如果都不包含，添加省份和城市
    if (province && city) {
      // 确保省份格式正确（去掉可能的重复后缀）
      const provinceName = province.replace('省', '').replace('市', '');
      const cityName = city.replace('市', '');
      return `${provinceName}省 ${cityName}市 ${cleanedQuery}`;
    } else if (city) {
      const cityName = city.replace('市', '');
      return `${cityName}市 ${cleanedQuery}`;
    }
    
    // 如果都没有，直接返回清理后的查询
    return cleanedQuery;
  };

  // 构建针对项目名称和详细位置的搜索查询
  const buildDetailedSearchQueries = (addressQuery) => {
    const queries = [];
    const cleanedQuery = addressQuery.trim().replace(/\s+/g, ' ');
    
    // 提取项目名称（支持多种格式）
    const projectPatterns = [
      /(信达[^省市区县路号大道]*[府苑园城中心广场大厦小区花园湾居里郡公馆])/,
      /([^省市区县路号大道]+(?:府|苑|园|城|中心|广场|大厦|小区|花园|湾|居|里|郡|公馆))/,
      /(辰樾府|宸樾府)/,
    ];
    
    let projectName = null;
    for (const pattern of projectPatterns) {
      const match = cleanedQuery.match(pattern);
      if (match) {
        projectName = match[1].trim();
        break;
      }
    }
    
    // 提取区域信息
    const regionPatterns = [
      /(未央区|灞桥区|雁塔区|曲江|高新区|碑林区|莲湖区|新城区|浐灞|浐灞生态区)/,
    ];
    
    let regionName = null;
    for (const pattern of regionPatterns) {
      const match = cleanedQuery.match(pattern);
      if (match) {
        regionName = match[1].trim();
        break;
      }
    }
    
    // 提取道路交汇信息
    const roadPattern = /([^省市区县]+(?:大道|路|街|道))\s*(?:与|和|及|交汇|交汇处)\s*([^省市区县]+(?:大道|路|街|道|路|街))/;
    const roadMatch = cleanedQuery.match(roadPattern);
    
    const cityName = city ? city.replace('市', '') : '西安';
    
    // 构建多种搜索查询组合
    if (projectName) {
      const variants = [
        projectName.replace(/\s+/g, ''),
        projectName.replace(/宸/g, '辰'),
        projectName.replace(/辰/g, '宸'),
      ];
      
      for (const variant of variants) {
        // 查询1: 城市 + 区域 + 项目名称
        if (regionName) {
          queries.push(`${cityName} ${regionName} ${variant}`);
        }
        // 查询2: 城市 + 项目名称
        queries.push(`${cityName} ${variant}`);
        // 查询3: 仅项目名称
        queries.push(variant);
      }
    }
    
    // 如果包含道路交汇信息
    if (roadMatch) {
      const road1 = roadMatch[1].trim();
      const road2 = roadMatch[2].trim();
      
      // 查询4: 城市 + 道路交汇 + 项目名称
      if (projectName) {
        queries.push(`${cityName} ${road1} ${road2} ${projectName}`);
      }
      // 查询5: 城市 + 道路交汇
      queries.push(`${cityName} ${road1} ${road2}`);
      // 查询6: 仅道路交汇
      queries.push(`${road1} ${road2}`);
    }
    
    return queries;
  };

  // 检查是否是经纬度坐标格式
  const isCoordinateFormat = (query) => {
    // 支持格式：34.3416, 108.9398 或 34.3416,108.9398 或 34°20'29.76"N, 108°56'23.28"E
    const coordPattern = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?((1[0-7]\d|1[0-8]\d|[1-9]?\d)(\.\d+)?|180(\.0+)?)$/;
    const coordPatternNoSpace = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),[-+]?((1[0-7]\d|1[0-8]\d|[1-9]?\d)(\.\d+)?|180(\.0+)?)$/;
    return coordPattern.test(query.trim()) || coordPatternNoSpace.test(query.trim());
  };

  // 通过经纬度搜索地址（反向地理编码）- 优先使用高德地图 API
  const searchByCoordinate = async (coordinateStr) => {
    const coords = coordinateStr.split(',').map(c => c.trim());
    if (coords.length !== 2) {
      setSearchError('经纬度格式错误，请输入：纬度, 经度（如：34.3416, 108.9398）');
      return;
    }

    const lat = parseFloat(coords[0]);
    const lng = parseFloat(coords[1]);

    // 验证坐标范围
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setSearchError('经纬度超出有效范围（纬度：-90 到 90，经度：-180 到 180）');
      return;
    }

    setIsSearching(true);
    setSearchError('');

    try {
      let result = null;
      
      // 优先使用高德地图 API
      if (isAmapConfigured()) {
        try {
          const amapResult = await reverseGeocodeAmap(lat, lng);
          if (amapResult && (amapResult.fullAddress || amapResult.address)) {
            const displayName = amapResult.fullAddress || amapResult.address;
            result = {
              lat: lat.toString(),
              lon: lng.toString(),
              display_name: displayName,
              address: {
                province: amapResult.province || '',
                city: amapResult.city || '',
                district: amapResult.district || '',
                street: amapResult.street || '',
              },
              type: 'place',
              importance: 1.0,
              place_id: `coordinate_${lat}_${lng}`,
              relevanceScore: 100,
              _amap: true,
            };
          }
        } catch (amapError) {
          console.warn('高德地图逆地理编码失败，回退到 Nominatim:', amapError);
          // 回退到 Nominatim
        }
      }
      
      // 如果高德地图 API 未配置或失败，使用 Nominatim 回退方案
      if (!result) {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=zh-CN`,
          {
            headers: {
              'User-Agent': 'TWS-Asset-Management-System/1.0',
              'Accept-Language': 'zh-CN,zh;q=0.9',
            },
          }
        );

        if (!response.ok) {
          throw new Error('反向地理编码请求失败');
        }

        const data = await response.json();

        if (data && data.display_name) {
          result = {
            lat: lat.toString(),
            lon: lng.toString(),
            display_name: data.display_name,
            address: data.address || {},
            type: data.type || 'place',
            importance: data.importance || 0.5,
            place_id: data.place_id || `coordinate_${lat}_${lng}`,
            relevanceScore: 100,
          };
        }
      }
      
      if (result) {
        // 显示结果列表，等待用户手动选择（不自动定位）
        setSearchResults([result]);
        setShowResults(true);
        setSelectedIndex(-1);
      } else {
        setSearchError('无法获取该坐标的地址信息');
      }
    } catch (error) {
      console.error('坐标搜索错误:', error);
      setSearchError('坐标解析失败，请检查网络或稍后重试');
    } finally {
      setIsSearching(false);
    }
  };

  // 反向地理编码（地址 -> 经纬度）- 优化搜索功能
  const geocodeAddress = async (addressQuery) => {
    if (!addressQuery || addressQuery.trim() === '') {
      setSearchError('请输入地址或经纬度坐标');
      return;
    }

    setIsSearching(true);
    setSearchError('');

    try {
      // 检查是否是经纬度坐标格式
      if (isCoordinateFormat(addressQuery)) {
        await searchByCoordinate(addressQuery);
        return; // 坐标搜索已完成，直接返回
      }

      // 构建搜索查询字符串
      const query = buildSearchQuery(addressQuery);
      const encodedQuery = encodeURIComponent(query);
      
      // 优先使用高德地图 API 进行搜索
      let data = null;
      if (isAmapConfigured()) {
        try {
          const amapResults = await searchAmapPOI(query, city, 10);
          if (amapResults && amapResults.length > 0) {
            // 转换高德地图结果为统一格式
            data = amapResults.map(poi => ({
              lat: poi.lat?.toString() || '',
              lon: poi.lng?.toString() || '',
              display_name: poi._displayName || poi.name || '',
              address: {
                province: poi.province || '',
                city: poi.city || '',
                district: poi.district || '',
                road: poi.address || '',
              },
              type: poi.type || 'place',
              importance: 1.0,
              place_id: poi.typecode || `amap_${poi.lat}_${poi.lng}`,
              relevanceScore: 100,
              _amap: true,
            }));
          }
        } catch (amapError) {
          console.warn('高德地图搜索失败，回退到 Nominatim:', amapError);
          // 继续使用 Nominatim 回退方案
        }
      }
      
      // 如果高德地图 API 未配置或失败，使用 Nominatim 回退方案
      // 策略1：精确搜索（包含完整地址信息）
      // 增加 limit 到 10，显示更多结果供用户选择
      if (!data || data.length === 0) {
        let searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=10&countrycodes=cn&addressdetails=1&accept-language=zh-CN&dedupe=1`;
        
        // 如果提供了城市信息，添加边界限制以提高准确性
        if (city) {
          // 主要城市的边界框（简化版，用于限制搜索范围）
            const cityBounds = {
            '西安': { south: 33.7, north: 34.8, west: 108.5, east: 109.5 },
            '北京': { south: 39.4, north: 41.1, west: 115.7, east: 117.4 },
            '上海': { south: 30.7, north: 31.9, west: 120.8, east: 122.0 },
            '广州': { south: 22.7, north: 23.8, west: 112.9, east: 113.9 },
            '深圳': { south: 22.4, north: 22.9, west: 113.7, east: 114.6 },
            '成都': { south: 30.4, north: 30.9, west: 103.9, east: 104.7 },
            '杭州': { south: 30.0, north: 30.5, west: 119.8, east: 120.6 },
            '南京': { south: 31.7, north: 32.3, west: 118.4, east: 119.2 },
            '武汉': { south: 30.3, north: 30.8, west: 114.0, east: 114.6 },
            '重庆': { south: 29.2, north: 30.0, west: 106.2, east: 107.0 },
            '天津': { south: 38.9, north: 39.3, west: 117.0, east: 117.9 },
            '苏州': { south: 31.1, north: 31.5, west: 120.3, east: 121.0 },
            '郑州': { south: 34.5, north: 34.9, west: 113.3, east: 113.9 },
            '长沙': { south: 28.0, north: 28.4, west: 112.8, east: 113.3 },
            '沈阳': { south: 41.6, north: 42.0, west: 123.2, east: 123.7 },
          };
          
          // 尝试匹配城市名称（支持带"市"或不带）
          const cityKey = city.replace('市', '').trim();
          const bounds = cityBounds[city] || cityBounds[cityKey];
          
          if (bounds) {
            // 使用 viewbox 参数限制搜索范围（west, north, east, south）
            searchUrl += `&bounded=1&viewbox=${bounds.west},${bounds.north},${bounds.east},${bounds.south}`;
          }
        }
        
        let response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'TWS-Asset-Management-System/1.0',
            'Accept-Language': 'zh-CN,zh;q=0.9',
          },
        });

        if (!response.ok) {
          throw new Error('地理编码请求失败');
        }

        data = await response.json();
      }
      
      // 如果没有找到结果，尝试多种策略
      if (!data || data.length === 0) {
        // 策略2：使用详细位置信息构建多个查询
        const detailedQueries = buildDetailedSearchQueries(addressQuery);
        for (const detailedQuery of detailedQueries) {
          const encodedDetailed = encodeURIComponent(detailedQuery);
          const detailedUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedDetailed}&limit=10&countrycodes=cn&addressdetails=1&accept-language=zh-CN`;
          
          const detailedResponse = await fetch(detailedUrl, {
            headers: {
              'User-Agent': 'TWS-Asset-Management-System/1.0',
              'Accept-Language': 'zh-CN,zh;q=0.9',
            },
          });
          
          if (detailedResponse.ok) {
            const detailedData = await detailedResponse.json();
            if (detailedData && detailedData.length > 0) {
              data = detailedData;
              break; // 找到结果就停止
            }
          }
        }
      }

      // 如果还是没有结果，尝试其他策略
      if (!data || data.length === 0) {
        // 策略2：提取项目名称部分（例如"信达 辰樾府"、"信达辰樾府"、"宸樾府"）
        // 支持多种项目名称格式：府、苑、园、城、中心、广场、大厦、小区、花园、湾等
        const projectNamePatterns = [
          /([^省市区县路号]+(?:府|苑|园|城|中心|广场|大厦|小区|花园|湾|居|里|郡|公馆))/,
          /(信达[^省市区县路号]*)/,
          /(辰樾府|宸樾府)/,
        ];
        
        let projectName = null;
        for (const pattern of projectNamePatterns) {
          const match = query.match(pattern);
          if (match) {
            projectName = match[1].trim();
            break;
          }
        }
        
        if (projectName) {
          // 尝试多种项目名称变体
          const projectVariants = [
            projectName,
            projectName.replace(/\s+/g, ''), // 移除空格：信达 辰樾府 -> 信达辰樾府
            projectName.replace(/宸/g, '辰'), // 宸樾府 -> 辰樾府
            projectName.replace(/辰/g, '宸'), // 辰樾府 -> 宸樾府
          ];
          
          for (const variant of projectVariants) {
            let projectQuery = variant;
            
            // 如果有城市信息，添加城市前缀
            if (city) {
              const cityName = city.replace('市', '');
              projectQuery = `${cityName} ${projectQuery}`;
            }
            
            // 如果包含区域信息（如未央区、浐灞），添加区域信息以提高准确性
            const regionKeywords = ['未央', '浐灞', '灞桥', '雁塔', '曲江', '高新', '碑林', '莲湖', '新城'];
            const hasRegion = regionKeywords.some(keyword => query.includes(keyword));
            if (hasRegion && city) {
              // 提取区域名称
              for (const keyword of regionKeywords) {
                if (query.includes(keyword)) {
                  projectQuery = `${city.replace('市', '')} ${keyword} ${variant}`;
                  break;
                }
              }
            }
            
            const encodedProject = encodeURIComponent(projectQuery);
            const projectUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedProject}&limit=10&countrycodes=cn&addressdetails=1&accept-language=zh-CN`;
            
            const projectResponse = await fetch(projectUrl, {
              headers: {
                'User-Agent': 'TWS-Asset-Management-System/1.0',
                'Accept-Language': 'zh-CN,zh;q=0.9',
              },
            });
            
            if (projectResponse.ok) {
              const projectData = await projectResponse.json();
              if (projectData && projectData.length > 0) {
                data = projectData;
                break; // 找到结果就停止
              }
            }
          }
        }
        
        // 策略2.1：如果没有找到，尝试使用道路交汇信息搜索
        if ((!data || data.length === 0) && query.includes('大道') && query.includes('路')) {
          // 提取道路交汇信息（例如：北辰大道与欧亚三路）
          const roadMatch = query.match(/([^省市区县]+(?:大道|路|街))\s*(?:与|和|及)\s*([^省市区县]+(?:大道|路|街|道))/);
          if (roadMatch) {
            const road1 = roadMatch[1].trim();
            const road2 = roadMatch[2].trim();
            let roadQuery = road1;
            
            if (city) {
              const cityName = city.replace('市', '');
              roadQuery = `${cityName} ${road1} ${road2}`;
            }
            
            const encodedRoad = encodeURIComponent(roadQuery);
            const roadUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedRoad}&limit=10&countrycodes=cn&addressdetails=1&accept-language=zh-CN`;
            
            const roadResponse = await fetch(roadUrl, {
              headers: {
                'User-Agent': 'TWS-Asset-Management-System/1.0',
                'Accept-Language': 'zh-CN,zh;q=0.9',
              },
            });
            
            if (roadResponse.ok) {
              const roadData = await roadResponse.json();
              if (roadData && roadData.length > 0) {
                data = roadData;
              }
            }
          }
        }
        
        // 策略3：如果还是没有结果，尝试简化查询（移除修饰词）
        if (!data || data.length === 0) {
          const simplifiedQuery = query
            .replace(/省/g, '')
            .replace(/市/g, '')
            .replace(/区/g, '')
            .replace(/县/g, '')
            .trim();
          
          const encodedSimplified = encodeURIComponent(simplifiedQuery);
          const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedSimplified}&limit=10&countrycodes=cn&addressdetails=1&accept-language=zh-CN`;
          
          const fallbackResponse = await fetch(fallbackUrl, {
            headers: {
              'User-Agent': 'TWS-Asset-Management-System/1.0',
              'Accept-Language': 'zh-CN,zh;q=0.9',
            },
          });
          
          if (fallbackResponse.ok) {
            data = await fallbackResponse.json();
          }
        }
      }

      // 如果找到了结果
      if (data && data.length > 0) {
        // 使用原始查询字符串进行相关性评分
        const originalQuery = addressQuery.toLowerCase();
        
        // 过滤和评分结果
        const filteredAndScored = data.map(result => {
          const displayName = result.display_name || '';
          const address = result.address || {};
          const resultCity = address.city || address.town || address.village || '';
          const resultProvince = address.state || address.province || '';
          const displayNameLower = displayName.toLowerCase();
          
          // 计算相关性分数（0-100）
          let score = 0;
          
          // 1. 地理位置相关性（30分）
          if (city) {
            const cityKey = city.replace('市', '').trim();
            
            // 检查是否在目标城市
            const isInTargetCity = displayName.includes(cityKey) || 
                                 displayName.includes(city) ||
                                 resultCity.includes(cityKey) ||
                                 resultCity.includes(city);
            
            if (isInTargetCity) {
              score += 30;
            } else {
              // 如果明显不在目标城市，大幅减分
              // 例如：搜索"西安"但结果是"潮州"，应该排除
              const commonCities = ['西安', '北京', '上海', '广州', '深圳', '成都', '杭州', '南京', '武汉', '重庆', '天津', '苏州', '郑州', '长沙', '沈阳', '潮州', '汕头', '揭阳'];
              const isOtherCity = commonCities.some(c => {
                const cKey = c.replace('市', '').trim();
                return (displayName.includes(c) || displayName.includes(cKey) || resultCity.includes(cKey)) && cKey !== cityKey;
              });
              if (isOtherCity) {
                score -= 50; // 大幅减分，基本会排在最后
              }
            }
            
            // 检查区域匹配（如果在目标区域，额外加分）
            const regionKeywords = ['未央', '浐灞', '灞桥', '雁塔', '曲江', '高新', '碑林', '莲湖', '新城'];
            const hasRegion = regionKeywords.some(keyword => {
              return originalQuery.includes(keyword.toLowerCase()) && 
                     (displayName.includes(keyword) || address.district?.includes(keyword) || address.county?.includes(keyword));
            });
            if (hasRegion) {
              score += 15;
            }
          }
          
          // 2. 文本匹配相关性（40分）
          // 检查是否包含关键项目名称
          const projectKeywords = ['信达', '辰樾', '宸樾', '府'];
          const matchedKeywords = projectKeywords.filter(kw => {
            return displayNameLower.includes(kw.toLowerCase()) || originalQuery.includes(kw.toLowerCase());
          });
          score += (matchedKeywords.length / projectKeywords.length) * 25;
          
          // 检查整体文本相似度（提取关键词）
          const queryWords = originalQuery
            .replace(/省|市|区|县|路|号|与|和|及/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 1 && !['的', '在', '和', '与'].includes(w));
          
          const matchedWords = queryWords.filter(word => displayNameLower.includes(word));
          if (queryWords.length > 0) {
            score += (matchedWords.length / queryWords.length) * 15;
          }
          
          // 3. 结果类型相关性（20分）
          const resultType = (result.type || '').toLowerCase();
          const buildingTypes = ['building', 'house', 'residential', 'commercial'];
          if (buildingTypes.includes(resultType)) {
            score += 20;
          } else if (resultType === 'place') {
            score += 10;
          }
          
          // 4. Importance值（10分）
          score += ((result.importance || 0) * 10);
          
          return {
            ...result,
            relevanceScore: score
          };
        }).filter(result => {
          // 过滤掉明显不相关的结果（负分太多）
          // 如果城市是西安，排除明显在潮州、广州等地的结果
          if (city && (city.includes('西安') || city.includes('西安'))) {
            const displayName = (result.display_name || '').toLowerCase();
            const excludeKeywords = ['潮州', '潮安', '汕头', '揭阳', '梅州', '广东'];
            const shouldExclude = excludeKeywords.some(keyword => displayName.includes(keyword.toLowerCase()));
            if (shouldExclude) {
              return false;
            }
          }
          return result.relevanceScore > -30; // 只保留相关性不是太差的结果
        });
        
        // 按相关性分数排序
        const sortedResults = filteredAndScored.sort((a, b) => {
          // 首先按相关性分数排序
          if (Math.abs(a.relevanceScore - b.relevanceScore) > 5) {
            return b.relevanceScore - a.relevanceScore;
          }
          
          // 如果分数相近，再按类型和importance排序
          const aType = (a.type || '').toLowerCase();
          const bType = (b.type || '').toLowerCase();
          const buildingTypes = ['building', 'house', 'residential', 'commercial'];
          const aIsBuilding = buildingTypes.includes(aType);
          const bIsBuilding = buildingTypes.includes(bType);
          
          if (aIsBuilding && !bIsBuilding) return -1;
          if (!aIsBuilding && bIsBuilding) return 1;
          
          return (b.importance || 0) - (a.importance || 0);
        });
        
        // 只显示相关性较高的结果（至少有一些相关性）
        const validResults = sortedResults.filter(r => r.relevanceScore >= 10);
        
        if (validResults.length > 0) {
          // 有高相关性结果：显示结果列表
          setSearchResults(validResults);
          setShowResults(true);
          setSelectedIndex(-1); // 重置选中索引
          
          // 不自动选择，让用户从列表中选择（类似高德地图）
          // 但如果只有一个结果，可以自动选择
          if (validResults.length === 1) {
            selectSearchResult(validResults[0], true);
          }
        } else if (sortedResults.length > 0) {
          // 如果没有高相关性结果，但有搜索结果：显示所有结果（前10个）让用户手动选择
          // 标记这些结果为"低相关性"
          const lowRelevanceResults = sortedResults.slice(0, 10).map(r => ({
            ...r,
            isLowRelevance: true
          }));
          setSearchResults(lowRelevanceResults);
          setShowResults(true);
          setSelectedIndex(-1); // 重置选中索引
          setSearchError('');
        } else {
          // 完全没有搜索结果
          setSearchResults([]);
          setShowResults(false);
          setSelectedIndex(-1);
        }
      } else {
        setSearchResults([]);
        setShowResults(false);
        setSearchError('未找到该地址。建议：1) 检查地址拼写 2) 尝试更详细的地址（如：XX区XX路XX号）3) 可以点击地图手动选择位置');
      }
    } catch (error) {
      console.error('地理编码错误:', error);
      setSearchError('地址解析失败，请检查网络或稍后重试');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* 地址搜索栏 */}
      <div className="flex gap-2 relative search-container">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchAddress}
            onChange={(e) => {
              const value = e.target.value;
              setSearchAddress(value);
              setSearchError(''); // 清除错误提示
              // 输入时不清空之前的结果列表，用户可以选择继续查看之前的结果
              // 只有按回车或点击搜索按钮才会触发新的搜索
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (showResults && selectedIndex >= 0 && selectedIndex < searchResults.length) {
                  // 如果结果列表显示且有选中的结果，选择它
                  selectSearchResult(searchResults[selectedIndex]);
                } else {
                  // 否则执行搜索并定位
                  handleSearch();
                }
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (showResults && searchResults.length > 0) {
                  setSelectedIndex(prev => 
                    prev < searchResults.length - 1 ? prev + 1 : prev
                  );
                }
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (showResults) {
                  setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
                }
              } else if (e.key === 'Escape') {
                setShowResults(false);
                setSelectedIndex(-1);
              }
            }}
            onFocus={() => {
              // 如果有搜索结果，重新显示列表
              if (searchResults.length > 0) {
                setShowResults(true);
              }
            }}
            placeholder={`输入地址或经纬度（支持：${city}市某某区某某路、项目名称、经纬度如"34.3416, 108.9398"等）`}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            disabled={isSearching}
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader className="w-4 h-4 animate-spin text-blue-600" />
            </div>
          )}
          
          {/* 搜索结果下拉列表 - 类似高德地图样式 */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-xl z-[9999] max-h-96 overflow-y-auto">
              {/* 结果数量提示 */}
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between sticky top-0">
                <span className="text-xs font-medium text-gray-600">
                  共找到 <span className="text-blue-600 font-bold">{searchResults.length}</span> 个结果
                  {searchResults[0]?.isLowRelevance && (
                    <span className="ml-2 text-amber-600">（未找到完全匹配）</span>
                  )}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowResults(false);
                    setSelectedIndex(-1);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="关闭"
                >
                  <X size={16} />
                </button>
              </div>
              
              {/* 结果列表 */}
              <div className="divide-y divide-gray-100">
                {searchResults.map((result, index) => {
                  const resultType = getResultTypeLabel(result);
                  const relevanceScore = result.relevanceScore !== undefined ? Math.max(0, result.relevanceScore).toFixed(0) : null;
                  const isLowRelevance = result.isLowRelevance;
                  const isSelected = selectedIndex === index;
                  const isFirst = index === 0 && !isLowRelevance;
                  
                  return (
                    <button
                      key={`${result.place_id || index}-${result.lat}-${result.lon}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectSearchResult(result);
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full text-left p-4 transition-colors focus:outline-none ${
                        isSelected || isFirst
                          ? 'bg-blue-50 border-l-4 border-blue-500'
                          : isLowRelevance
                          ? 'hover:bg-amber-50 border-l-2 border-amber-300'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* 图标 */}
                        <div className="flex-shrink-0 mt-1">
                          <MapPin 
                            size={18} 
                            className={
                              isSelected || isFirst
                                ? 'text-blue-600' 
                                : isLowRelevance 
                                ? 'text-amber-500' 
                                : 'text-gray-400'
                            } 
                          />
                        </div>
                        
                        {/* 地址信息 */}
                        <div className="flex-1 min-w-0">
                          {/* 主地址 */}
                          <div className="flex items-start gap-2 mb-1.5">
                            <span className={`text-sm font-medium ${
                              isSelected || isFirst ? 'text-blue-900' : 'text-gray-900'
                            } leading-snug`}>
                              {result.display_name || '未知地址'}
                            </span>
                            {isFirst && !isLowRelevance && (
                              <span className="flex-shrink-0 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                                推荐
                              </span>
                            )}
                          </div>
                          
                          {/* 详细信息 */}
                          <div className="space-y-1">
                            {/* 区域信息 */}
                            {result.address && (
                              <div className="text-xs text-gray-600 flex items-center gap-2 flex-wrap">
                                {result.address.district && (
                                  <span>{result.address.district}</span>
                                )}
                                {result.address.city && (
                                  <span>{result.address.city}</span>
                                )}
                                {!result.address.district && !result.address.city && result.address.town && (
                                  <span>{result.address.town}</span>
                                )}
                              </div>
                            )}
                            
                            {/* 类型、相关性和经纬度 */}
                            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                                {resultType}
                              </span>
                              {relevanceScore !== null && (
                                <span className={isLowRelevance ? 'text-amber-600' : 'text-gray-500'}>
                                  匹配度: {relevanceScore}%
                                </span>
                              )}
                              {/* 显示经纬度 */}
                              {result.lat && result.lon && (
                                <span className="font-mono text-gray-600" title="经纬度坐标">
                                  {parseFloat(result.lat).toFixed(6)}, {parseFloat(result.lon).toFixed(6)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* 导航图标 */}
                        <div className="flex-shrink-0 pt-0.5">
                          <Navigation2 
                            size={16} 
                            className={
                              isSelected || isFirst
                                ? 'text-blue-500' 
                                : isLowRelevance 
                                ? 'text-amber-400' 
                                : 'text-gray-300'
                            } 
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <Search size={16} />
          搜索
        </button>
      </div>

      {/* 错误提示 */}
      {searchError && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">
          <AlertCircle size={16} />
          <span>{searchError}</span>
        </div>
      )}

      {/* 地图容器 */}
      <div className="relative border border-gray-300 rounded-lg overflow-hidden shadow-sm" style={{ height: '400px' }}>
        <div ref={mapContainerRef} className="w-full h-full" />
        
        {/* 提示信息 */}
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm border border-gray-300 text-gray-700 px-3 py-2 rounded-lg shadow-md text-xs z-[1000]">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-blue-600" />
            <span className="font-medium">
              {isReverseGeocoding ? '正在获取地址...' : '点击地图或拖动标记选择位置'}
            </span>
            {isReverseGeocoding && (
              <Loader className="w-3 h-3 animate-spin text-blue-600" />
            )}
          </div>
        </div>
      </div>

      {/* 坐标显示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs font-mono">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <div>
              <span className="text-gray-600 font-medium">纬度 (Lat):</span>
              <span className="ml-2 text-blue-900 font-bold">{currentLat.toFixed(6)}</span>
            </div>
            <div>
              <span className="text-gray-600 font-medium">经度 (Lng):</span>
              <span className="ml-2 text-blue-900 font-bold">{currentLng.toFixed(6)}</span>
            </div>
          </div>
          <div className="text-blue-600 text-[10px] font-medium flex items-center gap-1">
            {isReverseGeocoding ? (
              <>
                <Loader className="w-3 h-3 animate-spin" />
                获取地址中...
              </>
            ) : isDragging ? (
              '拖动中...'
            ) : (
              '✓ 已定位'
            )}
          </div>
        </div>
        {searchAddress && (
          <div className="mt-2 pt-2 border-t border-blue-200">
            <span className="text-gray-600 font-medium">地址:</span>
            <span className="ml-2 text-blue-900">{searchAddress}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapLocationPicker;

