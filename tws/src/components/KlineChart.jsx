import React, { useMemo, useState, useRef, useEffect } from 'react';

/**
 * 自定义 K 线图组件
 * 支持分时图（折线图）和 K 线图（蜡烛图）
 */
const KlineChart = ({ 
  data = [], 
  viewMode = '分时',
  currentPrice = 0,
  onHover = null,
  width = 800,
  height = 400,
}) => {
  const svgRef = useRef(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // 计算价格范围
  const priceRange = useMemo(() => {
    if (data.length === 0) {
      return { min: currentPrice * 0.9, max: currentPrice * 1.1 };
    }

    const allPrices = data.flatMap(item => [
      item.high || 0,
      item.low || 0,
      item.open || 0,
      item.close || 0,
    ]).filter(p => p > 0);

    if (allPrices.length === 0) {
      return { min: currentPrice * 0.9, max: currentPrice * 1.1 };
    }

    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const padding = (max - min) * 0.1; // 10% padding

    return {
      min: Math.max(0, min - padding),
      max: max + padding,
    };
  }, [data, currentPrice]);

  // 价格缩放函数
  const scaleY = (price) => {
    if (priceRange.max === priceRange.min) return height / 2;
    return height - ((price - priceRange.min) / (priceRange.max - priceRange.min)) * height;
  };

  // 时间缩放函数
  const scaleX = (index) => {
    if (data.length <= 1) return width / 2;
    return (index / (data.length - 1)) * width;
  };

  // 获取价格刻度
  const getPriceTicks = (count = 5) => {
    const { min, max } = priceRange;
    if (max === min) return [min];
    const step = (max - min) / (count - 1);
    return Array.from({ length: count }, (_, i) => {
      const price = min + step * i;
      return parseFloat(price.toFixed(6));
    }).reverse();
  };

  // 处理鼠标移动
  const handleMouseMove = (e) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });

    // 找到最接近的数据点
    if (data.length > 0) {
      const index = Math.round((x / width) * (data.length - 1));
      const clampedIndex = Math.max(0, Math.min(data.length - 1, index));
      setHoveredIndex(clampedIndex);

      if (onHover && data[clampedIndex]) {
        onHover(data[clampedIndex], clampedIndex);
      }
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    if (onHover) {
      onHover(null, null);
    }
  };

  // 生成分时图路径（折线图）
  const generateLinePath = () => {
    if (data.length === 0) return '';

    const points = data.map((item, index) => {
      const x = scaleX(index);
      const price = item.close || item.open || currentPrice;
      const y = scaleY(price);
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  // 渲染 K 线（蜡烛图）
  const renderCandles = () => {
    if (data.length === 0) return null;

    const candleWidth = Math.max(2, width / data.length * 0.8);
    const candleSpacing = width / data.length;

    return data.map((candle, index) => {
      const x = scaleX(index) - candleWidth / 2;
      const isUp = (candle.close || 0) >= (candle.open || 0);
      const openY = scaleY(candle.open || 0);
      const closeY = scaleY(candle.close || 0);
      const highY = scaleY(candle.high || 0);
      const lowY = scaleY(candle.low || 0);

      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.abs(closeY - openY) || 1;

      const isHovered = hoveredIndex === index;

      return (
        <g key={candle.id || index}>
          {/* 影线 */}
          <line
            x1={x + candleWidth / 2}
            y1={highY}
            x2={x + candleWidth / 2}
            y2={lowY}
            stroke={isUp ? '#10b981' : '#ef4444'}
            strokeWidth={isHovered ? 2 : 1}
            opacity={isHovered ? 1 : 0.8}
          />
          {/* 实体 */}
          <rect
            x={x}
            y={bodyTop}
            width={candleWidth}
            height={bodyHeight}
            fill={isUp ? '#10b981' : '#ef4444'}
            stroke={isHovered ? '#fff' : 'none'}
            strokeWidth={isHovered ? 1 : 0}
            opacity={isHovered ? 1 : 0.9}
          />
        </g>
      );
    });
  };

  // 渲染分时图（折线图）
  const renderLineChart = () => {
    if (data.length === 0) return null;

    const path = generateLinePath();
    const lastPoint = data[data.length - 1];
    const lastPrice = lastPoint.close || lastPoint.open || currentPrice;
    const lastX = scaleX(data.length - 1);
    const lastY = scaleY(lastPrice);

    return (
      <>
        {/* 填充区域 */}
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
          </linearGradient>
        </defs>
        <path
          d={`${path} L ${lastX},${height} L 0,${height} Z`}
          fill="url(#lineGradient)"
        />
        {/* 折线 */}
        <path
          d={path}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 最后一个点 */}
        <circle
          cx={lastX}
          cy={lastY}
          r="4"
          fill="#3b82f6"
          stroke="#fff"
          strokeWidth="2"
        />
      </>
    );
  };

  const priceTicks = getPriceTicks(5);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 font-mono text-sm">
        Loading chart data...
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* 网格背景 */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(148, 163, 184, 0.1)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* 网格线 */}
        {priceTicks.map((price, i) => {
          const y = scaleY(price);
          return (
            <line
              key={`grid-${i}`}
              x1="0"
              y1={y}
              x2={width}
              y2={y}
              stroke="rgba(148, 163, 184, 0.2)"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          );
        })}

        {/* 图表内容 */}
        <g>
          {viewMode === '分时' ? renderLineChart() : renderCandles()}
        </g>

        {/* 价格标签（左侧） */}
        {priceTicks.map((price, i) => {
          const y = scaleY(price);
          return (
            <text
              key={`price-${i}`}
              x="5"
              y={y + 4}
              fill="#94a3b8"
              fontSize="10"
              fontFamily="monospace"
              textAnchor="start"
            >
              {price.toFixed(6)}
            </text>
          );
        })}

        {/* 悬停信息 */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <>
            {/* 垂直线 */}
            <line
              x1={scaleX(hoveredIndex)}
              y1="0"
              x2={scaleX(hoveredIndex)}
              y2={height}
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
            {/* 信息框 */}
            <g transform={`translate(${scaleX(hoveredIndex)}, ${mousePos.y})`}>
              <rect
                x="-60"
                y="-60"
                width="120"
                height="50"
                fill="rgba(0, 0, 0, 0.8)"
                stroke="#3b82f6"
                strokeWidth="1"
                rx="4"
              />
              <text
                x="0"
                y="-40"
                fill="#fff"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="middle"
              >
                O: {data[hoveredIndex].open?.toFixed(6) || '--'}
              </text>
              <text
                x="0"
                y="-28"
                fill="#fff"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="middle"
              >
                H: {data[hoveredIndex].high?.toFixed(6) || '--'}
              </text>
              <text
                x="0"
                y="-16"
                fill="#fff"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="middle"
              >
                L: {data[hoveredIndex].low?.toFixed(6) || '--'}
              </text>
              <text
                x="0"
                y="-4"
                fill="#fff"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="middle"
              >
                C: {data[hoveredIndex].close?.toFixed(6) || '--'}
              </text>
            </g>
          </>
        )}
      </svg>
    </div>
  );
};

export default KlineChart;

