import React from 'react';

const MapNewWalletsBox = ({ walletLogs = [] }) => {
  const formatAddress = (address) => {
    if (!address) return 'Unknown';
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="map-new-wallets-box bg-black/70 border border-green-900 px-4 py-3 rounded-lg">
      <div className="text-xs font-mono text-slate-300 uppercase mb-2">
        Recent Wallet Connections
      </div>

      <div className="space-y-1 max-h-52 overflow-y-auto">
        {walletLogs.length === 0 ? (
          <div className="text-xs text-slate-500 font-mono py-2">
            No wallets connected
          </div>
        ) : (
          walletLogs.map(wallet => (
            <div key={wallet.id} className="item">
              <div className="flex-1">
                <div className="text-sm font-mono text-green-400">
                  {formatAddress(wallet.address)}
                </div>
                <div className="text-xs text-slate-400">
                  {wallet.location && wallet.location.lat 
                    ? `${Number(wallet.location.lat).toFixed(3)}, ${Number(wallet.location.lng).toFixed(3)}`
                    : (wallet.city || wallet.location || 'Unknown')
                  } • {new Date(wallet.timestamp || Date.now()).toLocaleTimeString()}
                </div>
              </div>
              <div className="text-xs text-green-300 font-mono">[ONLINE]</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MapNewWalletsBox;
