import React, { useEffect } from 'react';
import Navbar from './Navbar';
import OmegaSection from './OmegaSection';
import MarketSection from './MarketSection';
import MapSection from './MapSection';
import AssetsSection from './AssetsSection';
import { SSEProvider } from '../contexts/SSEContext';
import { ServerStatusProvider, useServerStatus } from '../contexts/ServerStatusContext';

// 服务器离线提示组件
const ServerOfflineBanner = () => {
  const { isOnline, isChecking, refreshStatus } = useServerStatus();

  if (isOnline || isChecking) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-900/90 text-white p-3 text-center font-mono text-sm border-b border-red-700">
      <div className="flex items-center justify-center gap-4">
        <span className="animate-pulse">⚠️</span>
        <span>服务器离线 - 请确保服务器正在运行 (npm run dev:backend)</span>
        <button
          onClick={refreshStatus}
          className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-xs transition-colors"
        >
          重试
        </button>
      </div>
    </div>
  );
};

const HomePageContent = () => {
  // 处理 hash 路由
  useEffect(() => {
    const handleHashScroll = () => {
      const hash = window.location.hash;
      if (hash) {
        const elementId = hash.substring(1); // 去掉 # 号
        const element = document.getElementById(elementId);
        if (element) {
          // 延迟一下确保页面已渲染
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      }
    };

    // 初始加载时检查 hash
    handleHashScroll();

    // 监听 hash 变化
    window.addEventListener('hashchange', handleHashScroll);

    return () => {
      window.removeEventListener('hashchange', handleHashScroll);
    };
  }, []);

  return (
    <div className="bg-black min-h-screen text-white font-sans overflow-x-hidden">
      <ServerOfflineBanner />
      <Navbar />
      <main className="h-screen w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar">
        <section id="omega" className="h-screen w-full snap-start shrink-0 relative">
          <OmegaSection />
        </section>
        <section id="market" className="h-screen w-full snap-start shrink-0 relative">
          <MarketSection />
        </section>
        <section id="map" className="h-screen w-full snap-start shrink-0 relative">
          <MapSection />
        </section>
        <section id="assets" className="min-h-screen w-full snap-start shrink-0 relative">
          <AssetsSection />
        </section>
      </main>
    </div>
  );
};

const HomePage = () => (
  <ServerStatusProvider>
    <SSEProvider>
      <HomePageContent />
    </SSEProvider>
  </ServerStatusProvider>
);

export default HomePage;

