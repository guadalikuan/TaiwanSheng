import React, { useState, useEffect } from 'react';
import { Database, ShieldCheck, ArrowRight, Lock, FileText, Globe, Zap, Key, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getHomepageAssets } from '../utils/api';

const AssetsSection = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  // 加载资产列表
  useEffect(() => {
    const loadAssets = async () => {
      try {
        const response = await getHomepageAssets();
        if (response.success && response.data && response.data.assets) {
          setAssets(response.data.assets);
        }
      } catch (error) {
        console.error('Failed to load assets:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAssets();
  }, []);
  
  return (
    <div className="w-full min-h-full bg-slate-950 relative flex flex-col pt-16 md:pt-20">
      <div className="px-8 md:px-20 mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter">
              STRATEGIC <span className="text-gold">RESERVES</span>
            </h2>
            <p className="text-slate-400 font-mono max-w-2xl">
              VERIFIED ASSETS ON-CHAIN. NON-PERFORMING LOANS CONVERTED TO SOVEREIGN EQUITY.
              <br />
              <span className="text-red-500">WARNING: TITLES ARE ANCHORED TO THE &apos;ONE CHINA&apos; POLICY.</span>
            </p>
          </div>
          <button
            onClick={() => navigate('/loadout')}
            className="ml-4 bg-emerald-600/20 border border-emerald-600/50 text-emerald-400 hover:bg-emerald-600 hover:text-white px-6 py-3 rounded text-sm font-mono tracking-widest transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <Key size={16} />
            查看我的资产
          </button>
        </div>
      </div>

    <div className="flex-1 overflow-y-auto px-8 md:px-20 pb-10 no-scrollbar">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500 font-mono">Loading assets...</div>
        </div>
      ) : assets.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500 font-mono">No assets available</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {assets.map((item, index) => (
          <div
            key={item.id}
            className={`group relative bg-slate-900/50 border ${
              item.status === 'LOCKED' ? 'border-slate-800 opacity-50' : 'border-slate-700 hover:border-gold'
            } p-6 transition-all duration-300 hover:-translate-y-2 cursor-pointer`}
            onClick={() => navigate(`/asset-detail/${item.id}`)}
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-mono text-slate-500">ID: TWS-{item.id}0{index}</span>
              <span
                className={`text-[10px] font-bold px-2 py-1 rounded ${
                  item.status === 'AVAILABLE'
                    ? 'bg-green-900 text-green-400'
                    : item.status === 'RESERVED'
                    ? 'bg-yellow-900 text-yellow-400'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {item.status}
              </span>
            </div>

            <div className="h-24 bg-slate-800/50 mb-4 flex items-center justify-center overflow-hidden relative">
              <Database className="text-slate-700 opacity-20 w-16 h-16" />
              <div className="absolute bottom-0 left-0 bg-black/60 px-2 text-[10px] text-white font-mono">{item.city}</div>
            </div>

            <h3 className="text-xl font-bold text-white mb-2 font-mono truncate">{item.title}</h3>

            <div className="grid grid-cols-2 gap-4 mb-6 border-t border-slate-800 pt-4">
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Entry Price</div>
                <div className="text-cyan-400 font-mono">{item.price}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Est. Yield</div>
                <div className="text-gold font-mono">{item.yield}</div>
              </div>
            </div>

            <button
              type="button"
              disabled={item.status === 'LOCKED'}
              className="w-full py-3 bg-slate-800 hover:bg-gold disabled:hover:bg-slate-800 disabled:text-slate-500 hover:text-black text-white font-mono text-sm flex items-center justify-center transition-colors border border-slate-700 hover:border-gold group-hover:shadow-[0_0_20px_rgba(251,191,36,0.3)]"
            >
              {item.status === 'LOCKED' ? (
                <Lock size={14} />
              ) : (
                <>
                  SECURE TITLE <ArrowRight size={14} className="ml-2" />
                </>
              )}
            </button>
          </div>
          ))}
        </div>
      )}
    </div>

    <div className="w-full bg-black border-t border-slate-800 p-8 md:px-20">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="text-2xl font-black text-white tracking-tighter mb-4">TWS</div>
          <div className="text-xs text-slate-500 font-mono">
            PROJECT TIANHE
            <br />
            OPERATION: REUNIFICATION
            <br />
            EST. 2024
          </div>
        </div>

        <div>
          <h4 className="text-white font-bold mb-4 text-sm uppercase">Protocol</h4>
          <ul className="space-y-2 text-xs text-slate-400 font-mono">
            <li className="hover:text-gold cursor-pointer flex items-center">
              <FileText size={10} className="mr-2" /> Whitepaper [REDACTED]
            </li>
            <li className="hover:text-gold cursor-pointer flex items-center">
              <Zap size={10} className="mr-2" /> Smart Contract
            </li>
            <li className="hover:text-gold cursor-pointer flex items-center">
              <ShieldCheck size={10} className="mr-2" /> Audits
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-4 text-sm uppercase">Community</h4>
          <ul className="space-y-2 text-xs text-slate-400 font-mono">
            <li className="hover:text-cyan-400 cursor-pointer flex items-center">
              <Globe size={10} className="mr-2" /> Telegram [ENCRYPTED]
            </li>
            <li className="hover:text-cyan-400 cursor-pointer">Twitter / X</li>
          </ul>
        </div>

        <div className="border-l border-slate-800 pl-6">
          <p className="text-[10px] text-slate-600 leading-relaxed font-mono mb-4">
            DISCLAIMER: Participation in Project Tianhe implies consent to the inevitability of historical trends. Assets are backed by physical collateral in Mainland China. Not financial advice. History favors the prepared.
          </p>
          <button
            onClick={() => navigate('/arsenal')}
            className="bg-red-900/20 border border-red-900/50 text-red-500 hover:bg-red-600 hover:text-white px-4 py-2 rounded text-xs font-mono tracking-widest transition-all flex items-center gap-2 mt-4"
          >
            <Package size={14} />
            资产入库 / ARSENAL ENTRY
          </button>
        </div>
      </div>
      <div className="text-center text-[10px] text-slate-800 mt-8 font-mono">
        COPYRIGHT © 2025 TWS FOUNDATION. ALL RIGHTS RESERVED.
        <br />
        <span className="text-[8px] opacity-50">This is a gamified asset simulation. Not financial advice.</span>
      </div>
    </div>
  </div>
  );
};

export default AssetsSection;

