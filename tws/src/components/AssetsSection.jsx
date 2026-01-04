import React, { useState, useEffect } from 'react';
import { Database, ShieldCheck, ArrowRight, Lock, FileText, Globe, Zap, Key, Package, Github, Building2, Wheat, FlaskConical, Wine, Palette, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getHomepageAssets } from '../utils/api';
import { useServerStatus } from '../contexts/ServerStatusContext';

const AssetsSection = () => {
  const navigate = useNavigate();
  const { isOnline } = useServerStatus();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('房产'); // 当前选中的资产类型
  const [showLineQR, setShowLineQR] = useState(false);
  const [lineQrPosition, setLineQrPosition] = useState({ x: 0, y: 0 });

  // 资产类型配置
  const assetTypes = [
    { id: '房产', icon: Building2, color: 'text-blue-400' },
    { id: '农田', icon: Wheat, color: 'text-green-400' },
    { id: '科创', icon: FlaskConical, color: 'text-purple-400' },
    { id: '酒水', icon: Wine, color: 'text-red-400' },
    { id: '文创', icon: Palette, color: 'text-yellow-400' },
  ];

  // 載入資產列表（根据类型筛选）
  useEffect(() => {
    // 如果服务器离线，不发起请求，避免浏览器控制台显示错误
    if (!isOnline) {
      setLoading(false);
      return;
    }

    const loadAssets = async () => {
      try {
        const response = await getHomepageAssets(activeTab);
        if (response && response.success && response.data && response.data.assets) {
          setAssets(response.data.assets);
        } else if (response && response.success === false) {
          // 处理错误响应（如服务器离线）
          // 完全静默处理，不输出任何日志
          // 保持空数组，不显示错误
        }
      } catch (error) {
        // 连接错误已在 api.js 中处理，完全静默
        // 只记录非连接错误
        if (error.name !== 'ConnectionRefusedError' && !error.message?.includes('无法连接到服务器')) {
          console.error('Failed to load assets:', error);
        }
      } finally {
        setLoading(false);
      }
    };
    loadAssets();
  }, [isOnline, activeTab]);
  
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
          <div className="flex gap-2">
            {/* 科创项目发布按钮（仅科创选项卡显示） */}
            {activeTab === '科创' && (
              <button
                onClick={() => navigate('/tech-project/create')}
                className="ml-4 bg-purple-600/20 border border-purple-600/50 text-purple-400 hover:bg-purple-600 hover:text-white px-6 py-3 rounded text-sm font-mono tracking-widest transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Plus size={16} />
                发布科技项目
              </button>
            )}
            <button
              onClick={() => navigate('/loadout')}
              className="ml-4 bg-emerald-600/20 border border-emerald-600/50 text-emerald-400 hover:bg-emerald-600 hover:text-white px-6 py-3 rounded text-sm font-mono tracking-widest transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <Key size={16} />
              查看我的資產
            </button>
          </div>
        </div>

        {/* 资产类型选项卡 */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
          {assetTypes.map((type) => {
            const Icon = type.icon;
            const isActive = activeTab === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setActiveTab(type.id)}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-lg font-mono text-sm transition-all whitespace-nowrap
                  ${isActive 
                    ? 'bg-gold text-black border-2 border-gold' 
                    : 'bg-slate-800/50 text-slate-400 border-2 border-slate-700 hover:border-slate-600 hover:text-slate-300'
                  }
                `}
              >
                <Icon size={18} className={isActive ? 'text-black' : type.color} />
                {type.id}
              </button>
            );
          })}
        </div>
      </div>

    <div className="flex-1 overflow-y-auto px-8 md:px-20 pb-10 no-scrollbar">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500 font-mono">載入資產中...</div>
        </div>
      ) : assets.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500 font-mono">暫無可用資產</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {assets.map((item, index) => (
          <div
            key={item.id}
            className={`group relative bg-slate-900/50 border ${
              item.status === 'LOCKED' ? 'border-slate-800 opacity-50' : 'border-slate-700 hover:border-gold'
            } p-6 transition-all duration-300 hover:-translate-y-2 cursor-pointer`}
            onClick={() => {
              // 根据资产类型跳转到不同详情页
              if (activeTab === '科创') {
                navigate(`/tech-project/${item.id}`);
              } else {
                navigate(`/asset-detail/${item.id}?type=${activeTab}`);
              }
            }}
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
              {activeTab === '科创' ? (
                <FlaskConical className="text-purple-700 opacity-20 w-16 h-16" />
              ) : activeTab === '农田' ? (
                <Wheat className="text-green-700 opacity-20 w-16 h-16" />
              ) : activeTab === '酒水' ? (
                <Wine className="text-red-700 opacity-20 w-16 h-16" />
              ) : activeTab === '文创' ? (
                <Palette className="text-yellow-700 opacity-20 w-16 h-16" />
              ) : (
                <Database className="text-slate-700 opacity-20 w-16 h-16" />
              )}
              <div className="absolute bottom-0 left-0 bg-black/60 px-2 text-[10px] text-white font-mono">
                {item.city || item.location || 'N/A'}
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-2 font-mono truncate">{item.title}</h3>

            <div className="grid grid-cols-2 gap-4 mb-6 border-t border-slate-800 pt-4">
              <div>
                <div className="text-[10px] text-slate-500 uppercase">入場價格</div>
                <div className="text-cyan-400 font-mono">{item.price}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">預估收益</div>
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
              ) : activeTab === '科创' ? (
                <>
                  投资项目 <ArrowRight size={14} className="ml-2" />
                </>
              ) : (
                <>
                  獲取產權 <ArrowRight size={14} className="ml-2" />
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
          <div className="text-2xl font-black text-white tracking-tighter mb-4">TaiOne</div>
          <div className="text-xs text-slate-500 font-mono">
            项目：TaiOne
            <br />
            行动：新型和平统一
            <br />
            成立于2025.12
          </div>
        </div>

        <div>
          <h4 className="text-white font-bold mb-4 text-sm uppercase">協議</h4>
          <ul className="space-y-2 text-xs text-slate-400 font-mono">
            <li 
              onClick={() => navigate('/letter')}
              className="hover:text-gold cursor-pointer flex items-center"
            >
              <FileText size={10} className="mr-2" /> 長安家書
            </li>
            <li className="hover:text-gold cursor-pointer flex items-center">
              <Zap size={10} className="mr-2" /> 智能合約
            </li>
            <li className="hover:text-gold cursor-pointer flex items-center">
              <ShieldCheck size={10} className="mr-2" /> 審計
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-4 text-sm uppercase">社群</h4>
          <ul className="space-y-2 text-xs text-slate-400 font-mono">
            {/* 👇 改这里：Telegram 链接 */}
            <li className="hover:text-cyan-400 cursor-pointer flex items-center">
              <Globe size={10} className="mr-2" /> 
              <a 
                href="https://你的Telegram社群链接"  // 替换这行的链接
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full"
              >
                Telegram [加密]
              </a>
            </li>
            {/* 👇 改这里：Twitter/X 链接 */}
            <li className="hover:text-cyan-400 cursor-pointer flex items-center">
              <Globe size={10} className="mr-2" />  
              <a 
                href="https://x.com/TWSDAO"  // 替换这行的链接
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full"
              >
                Twitter / X
              </a>
            </li>
            {/* 👇 改这里：Facebook 链接（新增） */}
            <li className="hover:text-cyan-400 cursor-pointer flex items-center">
              <Globe size={10} className="mr-2" />  
              <a 
                href="https://www.facebook.com/groups/1365839505037775/"  // 替换这行的链接
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full"
              >
                Facebook
              </a>
            </li>
            {/* 👇 新增 Discord 链接 */}
            <li className="hover:text-cyan-400 cursor-pointer flex items-center">
              <Globe size={10} className="mr-2" />  {/* 可换成Discord专属图标 */}
              <a 
                href="https://discord.com/invite/WChB9fEqTe"  // 替换成实际的Discord社群链接
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full"
              >
                Discord
              </a>
            </li>
            {/* 👇 新增 GitHub 链接 */}
            <li className="hover:text-cyan-400 cursor-pointer flex items-center">
              <Github size={10} className="mr-2" />
              <a 
                href="https://github.com/guadalikuan/TaiwanSheng"
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full"
              >
                GitHub
              </a>
            </li>
            {/* 👇 新增 LINE 链接 */}
            <li className="hover:text-cyan-400 cursor-pointer flex items-center relative group">
              <Globe size={10} className="mr-2" />
              <a 
                href="https://line.me/R/ti/g/5VfGyxKhyx"
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full"
                onMouseEnter={(e) => {
                  setLineQrPosition({ x: e.clientX, y: e.clientY });
                  setShowLineQR(true);
                }}
                onMouseLeave={() => {
                  setShowLineQR(false);
                }}
                onMouseMove={(e) => {
                  setLineQrPosition({ x: e.clientX, y: e.clientY });
                }}
              >
                LINE
              </a>
              {/* QR码弹窗 */}
              {showLineQR && (
                <div 
                  className="fixed z-50 bg-white p-4 rounded-lg shadow-2xl border-2 border-cyan-400 pointer-events-none"
                  style={{
                    left: `${lineQrPosition.x + 20}px`,
                    top: `${lineQrPosition.y - 180}px`,
                  }}
                >
                  <img 
                    src="/line-qr-code.png" 
                    alt="LINE QR Code" 
                    className="w-48 h-48"
                    onError={(e) => {
                      // 如果图片不存在，显示占位符
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiMwMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5MSU5FIFEgUiBDb2RlPC90ZXh0Pjwvc3ZnPg==';
                    }}
                  />
                </div>
              )}
            </li>
          </ul>
        </div>

        <div className="border-l border-slate-800 pl-6">
          <p className="text-[10px] text-slate-600 leading-relaxed font-mono mb-4">
            免責聲明：參與TaiOne即表示同意歷史趨勢的必然性。資產由中國大陸的實物抵押品支持。不構成財務建議。歷史偏愛有準備的人。
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
        版權 © 2025 TaiOne 基金會。保留所有權利。
        <br />
        <span className="text-[8px] opacity-50">這是一個遊戲化的資產模擬。不構成財務建議。</span>
      </div>
    </div>
  </div>
  );
};

export default AssetsSection;

