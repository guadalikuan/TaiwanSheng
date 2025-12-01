import React from 'react';
import Navbar from './Navbar';
import OmegaSection from './OmegaSection';
import MarketSection from './MarketSection';
import MapSection from './MapSection';
import AssetsSection from './AssetsSection';

const HomePage = () => (
  <div className="bg-black min-h-screen text-white font-sans overflow-x-hidden">
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

export default HomePage;

