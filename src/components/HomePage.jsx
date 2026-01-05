import React from 'react';
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

const HomePageContent = () => (
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

const HomePage = () => (
  <ServerStatusProvider>
    <SSEProvider>
      <HomePageContent />
    </SSEProvider>
  </ServerStatusProvider>
);

export default HomePage;

