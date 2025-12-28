import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import WalletConnectButton from '../../components/WalletConnectButton';

export default function AuctionHeader() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleBackToTws = () => {
    navigate('/');
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-tws-black/90 backdrop-blur-md border-b border-tws-red/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 左侧：TWS 品牌和返回按钮 */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToTws}
              className="flex items-center group hover:opacity-80 transition-opacity"
            >
              <div className="w-2 h-8 bg-tws-red mr-3 animate-pulse" />
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tighter group-hover:text-tws-red transition-colors">
                  TWS<span className="text-xs align-top opacity-50">.OSCN</span>
                </h1>
                <p className="text-[10px] text-slate-400 tracking-[0.3em] uppercase">Strait-X Protocol</p>
              </div>
            </button>
            <div className="h-8 w-px bg-gray-700" />
            <button
              onClick={handleBackToTws}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← 返回 TWS 首页
            </button>
          </div>

          {/* 右侧：用户信息和钱包 */}
          <div className="flex items-center space-x-4">
            {/* TWS 用户信息 */}
            {isAuthenticated && user && (
              <div className="hidden md:flex items-center space-x-2 border-r border-gray-700 pr-4">
                <div className="flex flex-col text-right">
                  <span className="text-xs text-slate-300 font-mono">{user.username || 'USER'}</span>
                  {user.address && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      {user.address.slice(0, 6)}...{user.address.slice(-4)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Solana 钱包连接按钮 - 使用通用组件 */}
            <WalletConnectButton />
          </div>
        </div>
      </div>
    </nav>
  );
}

