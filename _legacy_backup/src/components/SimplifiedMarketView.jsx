import React, { useState } from 'react';
import { ShoppingBag, Lock } from 'lucide-react';

const SimplifiedMarketView = () => {
  const [isMinting, setIsMinting] = useState(false);

  const assets = [
    { name: "Xi'an Bunker A", id: 1 },
    { name: 'Guiyang Data Center', id: 2 }
  ];

  const handleMint = (assetId) => {
    setIsMinting(true);
    setTimeout(() => {
      setIsMinting(false);
      alert(`ALLOCATION SECURED. ASSET ID: ${Math.floor(Math.random() * 99999)}`);
    }, 2000);
  };

  return (
    <div className="p-4 pt-8 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-yellow-500" /> BLACK MARKET
        </h2>
        <span className="text-xs font-mono text-gray-400">BAL: 0.00 TWS</span>
      </div>

      {/* 盲盒资产 */}
      <div className="grid grid-cols-2 gap-3">
        {assets.map((item) => (
          <div 
            key={item.id} 
            className="bg-gray-900 border border-gray-800 p-3 rounded relative overflow-hidden group active:scale-95 transition-transform"
          >
            <div className="absolute top-0 right-0 bg-yellow-600 text-black text-[9px] font-bold px-1.5">RARE</div>
            <div className="w-full h-20 bg-gray-800 mb-2 rounded flex items-center justify-center text-gray-600">
              <Lock className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-gray-200">{item.name}</div>
            <div className="text-[10px] text-gray-500 mt-1">Backed by NPL Assets</div>
            <button 
              onClick={() => handleMint(item.id)}
              disabled={isMinting}
              className={`w-full mt-2 bg-yellow-600/20 border border-yellow-600/50 text-yellow-500 text-xs py-1 rounded hover:bg-yellow-600 hover:text-black transition-colors ${
                isMinting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isMinting ? 'MINTING...' : 'MINT (100 USDT)'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimplifiedMarketView;

