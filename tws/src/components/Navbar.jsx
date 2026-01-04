import React, { useState, useEffect } from 'react';
import { Radio, BarChart3, Map, Database, ShieldAlert, LogIn, LogOut, User, Hammer, Wallet } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout, loginWithWallet } = useAuth();
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [scrolled, setScrolled] = useState(false);
  const isHomePage = location.pathname === '/';

  // 当钱包连接后，自动登录
  useEffect(() => {
    if (connected && publicKey && !isAuthenticated) {
      const walletAddress = publicKey.toString();
      loginWithWallet(walletAddress);
    }
  }, [connected, publicKey, isAuthenticated, loginWithWallet]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleConnectWallet = () => {
    setVisible(true);
  };

  const navLinks = [
    { id: 'omega', label: '天機 | OMEGA', icon: <Radio size={16} /> },
    { id: 'market', label: '戰圖 | MARKET', icon: <BarChart3 size={16} /> },
    { id: 'map', label: '圍城 | INTEL', icon: <Map size={16} /> },
    { id: 'assets', label: '資產 | ASSETS', icon: <Database size={16} /> },
  ];

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 border-b border-white/5 ${
        scrolled ? 'bg-slate-950/90 backdrop-blur-md py-2' : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-10">
          <div 
            onClick={() => !isHomePage && navigate('/')}
            className={`flex-shrink-0 flex items-center group ${!isHomePage ? 'cursor-pointer' : ''}`}
          >
            <div className="w-2 h-8 bg-red-600 mr-3 animate-pulse" />
            <div>
              <h1 className={`text-2xl font-bold text-white tracking-tighter transition-colors ${!isHomePage ? 'group-hover:text-red-500' : ''}`}>
                TaiOne<span className="text-xs align-top opacity-50">.OSCN</span>
              </h1>
              <p className="text-[10px] text-slate-400 tracking-[0.3em] uppercase">Strait-X Protocol</p>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {navLinks.map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  className="flex items-center text-slate-300 hover:text-cyan-400 px-3 py-2 rounded-md text-sm font-medium transition-all hover:bg-white/5 group"
                >
                  <span className="mr-2 opacity-50 group-hover:opacity-100 group-hover:animate-bounce">{link.icon}</span>
                  {link.label}
                </a>
              ))}
              {/* 处置按钮 */}
              <button
                onClick={() => navigate('/auctions')}
                className="flex items-center text-slate-300 hover:text-red-400 px-3 py-2 rounded-md text-sm font-medium transition-all hover:bg-white/5 group"
              >
                <span className="mr-2 opacity-50 group-hover:opacity-100 group-hover:animate-bounce">
                  <Hammer size={16} />
                </span>
                處置 | AUCTION
              </button>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <div className="flex items-center space-x-2 border-r border-white/10 pr-4">
                  <User size={14} className="text-cyan-400" />
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-300 font-mono">{user?.username || 'USER'}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {publicKey ? `${publicKey.toString().slice(0, 6)}...${publicKey.toString().slice(-4)}` : (user?.address ? `${user.address.slice(0, 6)}...${user.address.slice(-4)}` : '')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="bg-red-900/20 border border-red-900/50 text-red-500 hover:bg-red-600 hover:text-white px-4 py-1 rounded text-xs font-mono tracking-widest transition-all flex items-center"
                  type="button"
                >
                  <LogOut size={14} className="mr-2" />
                  登出 / LOGOUT
                </button>
              </>
            ) : (
              <button
                onClick={handleConnectWallet}
                className="bg-indigo-900/20 border border-indigo-900/50 text-indigo-400 hover:bg-indigo-600 hover:text-white px-4 py-1 rounded text-xs font-mono tracking-widest transition-all flex items-center"
                type="button"
              >
                <Wallet size={14} className="mr-2" />
                連接錢包 / CONNECT WALLET
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-cyan-900 to-transparent opacity-50" />
    </nav>
  );
};

export default Navbar;

