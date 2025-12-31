import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

// 心愿词库
const WISHES = ["平安", "喜乐", "顺遂", "安康", "锦绣", "如愿", "团圆", "祈福", "良辰", "美景"];

// 颜色定义
const SKY_TOP = [5, 5, 20];
const SKY_BOTTOM = [15, 10, 35];
const STAR_WHITE = [255, 255, 240];

// 工具函数
const clamp = (n) => Math.max(0, Math.min(255, Math.floor(n)));

const lerpColor = (c1, c2, t) => [
  clamp(c1[0] + (c2[0] - c1[0]) * t),
  clamp(c1[1] + (c2[1] - c1[1]) * t),
  clamp(c1[2] + (c2[2] - c1[2]) * t)
];

// 火花粒子类
class FireSpark {
  constructor(x, y, scale) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 0.8;
    this.vy = (Math.random() * -0.8 - 0.4) * scale;
    this.life = 1.0;
    this.decay = Math.random() * 0.01 + 0.015;
    this.size = (Math.random() * 1.5 + 1) * scale;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.015; // 轻微重力
    this.life -= this.decay;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = clamp(this.life * 255);
    const c = lerpColor([255, 200, 50], [150, 30, 0], 1 - this.life);
    ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha / 255})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 孔明灯类
class Lantern {
  constructor(x, y, wish = null) {
    this.z = Math.random() * 3.3 + 1.2;
    this.x = x;
    this.y = y;
    this.startY = y;
    this.speedY = (Math.random() * 0.6 + 0.6) / this.z;
    this.timeOffset = Math.random() * 100;
    this.sparks = [];
    this.alive = true;
    this.wish = wish || WISHES[Math.floor(Math.random() * WISHES.length)];
    this.tilt = 0;
  }

  update() {
    this.y -= this.speedY;
    this.timeOffset += 0.02;
    this.tilt = Math.sin(this.timeOffset) * 4;
    this.x += Math.cos(this.timeOffset * 0.5) * (0.3 / this.z);

    // 生成火花
    if (Math.random() > 0.75) {
      const scale = 1.0 / this.z;
      this.sparks.push(new FireSpark(this.x, this.y + 50 * scale, scale));
    }
    this.sparks = this.sparks.filter(p => p.update());

    // 检查是否超出屏幕
    if (this.y < -150) {
      this.alive = false;
    }
  }

  draw(ctx, canvasWidth, canvasHeight) {
    const scale = 1.0 / this.z;
    const w = 40 * scale;
    const h = 60 * scale;

    // 保存上下文
    ctx.save();

    // 1. 动态光晕 (Bloom)
    const breath = (Math.sin(this.timeOffset * 3) + 1) * 0.1;
    const glowR = w * (2.5 + breath);
    
    const gradient = ctx.createRadialGradient(
      this.x, this.y + h / 2,
      0,
      this.x, this.y + h / 2,
      glowR
    );
    gradient.addColorStop(0, `rgba(255, 120, 40, ${0.45 * (1 - 0)})`);
    gradient.addColorStop(1, 'rgba(255, 120, 40, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y + h / 2, glowR, 0, Math.PI * 2);
    ctx.fill();

    // 2. 绘制粒子
    this.sparks.forEach(p => p.draw(ctx));

    // 3. 绘制灯笼主体
    ctx.translate(this.x, this.y + h * 0.2);
    ctx.rotate((this.tilt * Math.PI) / 180);

    const cBreath = (Math.sin(this.timeOffset * 2) + 1) * 10;
    const mR = clamp(230 + cBreath);
    const mG = clamp(80 + cBreath / 2);

    // 绘制灯笼主体（渐变圆柱）
    for (let i = 0; i < h; i++) {
      const ratio = i / h;
      const curW = w * (0.8 + 0.2 * Math.sin(Math.PI * ratio));
      const r = clamp(mR * ratio + 150 * (1 - ratio));
      const g = clamp(mG * ratio + 40 * (1 - ratio));
      const alpha = clamp(180 + 40 * (1 - ratio));

      const lineY = -h * 0.5 + i;
      ctx.strokeStyle = `rgba(${r}, ${g}, 30, ${alpha / 255})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-curW / 2, lineY);
      ctx.lineTo(curW / 2, lineY);
      ctx.stroke();

      // 边缘细节
      if (i % 3 === 0) {
        for (const edge of [-0.45, 0.45]) {
          const posX = curW * edge;
          ctx.fillStyle = `rgba(100, 30, 10, ${alpha / 510})`;
          ctx.fillRect(posX - 1, lineY - 1, 2, 2);
        }
      }
    }

    // 4. 绘制心愿文字
    const wishSize = Math.max(5, 18 * scale);
    if (wishSize > 5) {
      ctx.font = `${wishSize}px "SimHei", "Microsoft YaHei", sans-serif`;
      ctx.fillStyle = 'rgba(80, 20, 10, 0.63)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.wish, 0, 0);
    }

    // 5. 底部穗子
    const tasselLen = h * 0.6;
    for (const offsetX of [-w * 0.2, w * 0.2]) {
      const tStartX = offsetX;
      const tStartY = h * 0.5;
      const tEndX = tStartX - Math.sin(this.timeOffset * 1.5) * (5 * scale);
      const tEndY = tStartY + tasselLen;

      ctx.strokeStyle = 'rgba(150, 40, 20, 0.78)';
      ctx.lineWidth = Math.max(1, 1.5 * scale);
      ctx.beginPath();
      ctx.moveTo(tStartX, tStartY);
      ctx.lineTo(tEndX, tEndY);
      ctx.stroke();

      ctx.fillStyle = 'rgba(200, 160, 40, 0.86)';
      ctx.beginPath();
      ctx.arc(tEndX, tEndY, Math.max(1, 2 * scale), 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. 火源核心
    ctx.fillStyle = 'rgba(255, 255, 200, 0.94)';
    ctx.beginPath();
    ctx.ellipse(0, h * 0.25, w * 0.15, h * 0.075, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

const LanternCanvas = forwardRef(({ 
  onLanternRelease, 
  initialPosition = null,
  wish = null 
}, ref) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lanternsRef = useRef([]);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布尺寸
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width || 800;
      canvas.height = rect.height || 600;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 创建背景渐变
    const createBackground = () => {
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, `rgb(${SKY_TOP.join(',')})`);
      gradient.addColorStop(1, `rgb(${SKY_BOTTOM.join(',')})`);
      return gradient;
    };

    // 绘制星星
    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 0.8 + 0.4
    }));

    const drawStars = (time) => {
      stars.forEach((star, i) => {
        const alpha = 150 + 105 * Math.sin(time * 0.001 + star.x);
        ctx.fillStyle = `rgba(${STAR_WHITE.join(',')}, ${alpha / 255})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    // 动画循环
    let lastTime = 0;
    const animate = (currentTime) => {
      if (!isAnimating && lanternsRef.current.length === 0) {
        animationFrameRef.current = null;
        return;
      }

      // 清空画布
      ctx.fillStyle = createBackground();
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 绘制星星
      drawStars(currentTime);

      // 更新和绘制孔明灯
      lanternsRef.current = lanternsRef.current.filter(lantern => {
        lantern.update();
        if (lantern.alive) {
          lantern.draw(ctx, canvas.width, canvas.height);
          return true;
        }
        return false;
      });

      // 如果还有孔明灯，继续动画
      if (lanternsRef.current.length > 0 || isAnimating) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    // 如果有初始位置，创建孔明灯
    if (initialPosition && !isAnimating) {
      const lantern = new Lantern(
        initialPosition.x || canvas.width / 2,
        initialPosition.y || canvas.height,
        wish
      );
      lanternsRef.current.push(lantern);
      setIsAnimating(true);
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [initialPosition, wish, isAnimating]);

  // 释放孔明灯的函数
  const releaseLantern = (position, wishText = null) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const lantern = new Lantern(
      position.x || canvas.width / 2,
      position.y || canvas.height,
      wishText
    );
    
    lanternsRef.current.push(lantern);
    setIsAnimating(true);
    
    // 启动动画
    if (!animationFrameRef.current) {
      const animate = (currentTime) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 清空画布
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, `rgb(${SKY_TOP.join(',')})`);
        gradient.addColorStop(1, `rgb(${SKY_BOTTOM.join(',')})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 绘制星星
        const stars = Array.from({ length: 120 }, () => ({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 0.8 + 0.4
        }));
        stars.forEach((star, i) => {
          const alpha = 150 + 105 * Math.sin(currentTime * 0.001 + star.x);
          ctx.fillStyle = `rgba(${STAR_WHITE.join(',')}, ${alpha / 255})`;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
        });

        // 更新和绘制孔明灯
        lanternsRef.current = lanternsRef.current.filter(lantern => {
          lantern.update();
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
    releaseLantern
  }));

  return (
    <canvas
      ref={canvasRef}
      className="lantern-canvas"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000
      }}
    />
  );
});

LanternCanvas.displayName = 'LanternCanvas';

export default LanternCanvas;
export { Lantern, FireSpark, WISHES };

