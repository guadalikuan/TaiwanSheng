import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Lantern, FireSpark, WISHES } from './LanternCanvas';

/**
 * 地图孔明灯叠加层组件
 * 在地图上显示孔明灯效果，从IP地理位置向上飘
 */
const MapLanternOverlay = forwardRef(({ 
  mapRef, 
  mapContainerRef,
  onLanternRelease = null 
}, ref) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lanternsRef = useRef([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const mapInstanceRef = useRef(null);

  // 将地理坐标转换为屏幕像素坐标
  const lngLatToPixel = (lng, lat) => {
    if (!mapInstanceRef.current || !mapContainerRef?.current) {
      return null;
    }

    try {
      // 高德地图 API: lngLatToContainer 需要传入 LngLat 对象
      const lngLat = new window.AMap.LngLat(lng, lat);
      const pixel = mapInstanceRef.current.lngLatToContainer(lngLat);
      return { x: pixel.x, y: pixel.y };
    } catch (error) {
      console.warn('坐标转换失败:', error);
      return null;
    }
  };

  // 初始化 Canvas
  useEffect(() => {
    if (!mapContainerRef?.current || !mapRef?.current) return;

    const container = mapContainerRef.current;
    const map = mapRef.current;
    mapInstanceRef.current = map;

    // 创建 Canvas 元素
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1000';
    canvas.style.borderRadius = 'inherit';
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // 设置 Canvas 尺寸
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    container.appendChild(canvas);
    canvasRef.current = canvas;

    // 监听窗口大小变化
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    resizeObserver.observe(container);

    // 监听地图移动和缩放，更新孔明灯位置
    const updateLanternPositions = () => {
      lanternsRef.current.forEach(lantern => {
        if (lantern.geoPosition) {
          const pixel = lngLatToPixel(lantern.geoPosition.lng, lantern.geoPosition.lat);
          if (pixel) {
            // 更新孔明灯的起始位置（但保持相对屏幕的偏移）
            const offsetY = lantern.y - lantern.startScreenY;
            lantern.startScreenX = pixel.x;
            lantern.startScreenY = pixel.y;
            lantern.x = pixel.x;
            lantern.y = pixel.y + offsetY;
          }
        }
      });
    };

    // 监听地图事件
    if (map.on) {
      map.on('moveend', updateLanternPositions);
      map.on('zoomend', updateLanternPositions);
    }

    // 动画循环
    const animate = (currentTime) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 清空画布（透明背景，让地图可见）
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 更新和绘制孔明灯
      lanternsRef.current = lanternsRef.current.filter(lantern => {
        lantern.update();
        
        // 检查是否超出屏幕
        if (lantern.y < -100 || lantern.y > canvas.height + 100) {
          return false;
        }

        if (lantern.alive) {
          lantern.draw(ctx, canvas.width, canvas.height);
          return true;
        }
        return false;
      });

      // 如果还有孔明灯，继续动画
      if (lanternsRef.current.length > 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        animationFrameRef.current = null;
      }
    };

    // 启动动画循环（持续运行，等待孔明灯）
    const startAnimation = () => {
      if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    
    startAnimation();

    return () => {
      resizeObserver.disconnect();
      if (map.off) {
        map.off('moveend', updateLanternPositions);
        map.off('zoomend', updateLanternPositions);
      }
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mapRef, mapContainerRef, isAnimating]);

  // 释放孔明灯（从地理坐标位置）
  const releaseLanternFromGeo = (lng, lat, wish = null) => {
    if (!mapInstanceRef.current || !canvasRef.current) return;

    const pixel = lngLatToPixel(lng, lat);
    if (!pixel) {
      console.warn('无法转换坐标:', { lng, lat });
      return;
    }

    // 创建孔明灯实例
    const lantern = new Lantern(pixel.x, pixel.y, wish);
    
    // 保存地理坐标，用于地图移动时更新位置
    lantern.geoPosition = { lng, lat };
    lantern.startScreenX = pixel.x;
    lantern.startScreenY = pixel.y;

    lanternsRef.current.push(lantern);
    setIsAnimating(true);

    // 启动动画（如果还没有运行）
    if (!animationFrameRef.current) {
      const animate = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 更新和绘制孔明灯
        lanternsRef.current = lanternsRef.current.filter(lantern => {
          lantern.update();
          
          // 检查是否超出屏幕
          if (lantern.y < -100 || lantern.y > canvas.height + 100) {
            return false;
          }

          if (lantern.alive) {
            lantern.draw(ctx, canvas.width, canvas.height);
            return true;
          }
          return false;
        });

        if (lanternsRef.current.length > 0) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          animationFrameRef.current = null;
        }
      };
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    if (onLanternRelease) {
      onLanternRelease(lantern);
    }
  };

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    releaseLanternFromGeo
  }));

  return null; // 不渲染任何 DOM，Canvas 已通过 useEffect 添加到容器中
});

MapLanternOverlay.displayName = 'MapLanternOverlay';

export default MapLanternOverlay;
export { MapLanternOverlay };

