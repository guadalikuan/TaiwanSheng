import React, { useState, useEffect } from 'react';
import { Radio, BarChart3, Map, Database, ShieldAlert, Activity, LogIn, LogOut, User, Wallet, Loader, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getHomepageStats } from '../utils/api';
import { useSSE } from '../contexts/SSEContext';
import { useServerStatus } from '../contexts/ServerStatusContext';
import { connectWallet, signMessage, isWalletInstalled } from '../utils/wallet';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout, loginWithWallet } = useAuth();
  const { isOnline } = useServerStatus();
  const [scrolled, setScrolled] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(12405);
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [walletError, setWalletError] = useState('');
  const isHomePage = location.pathname === '/';

  // 加载初始统计数据
  useEffect(() => {
    // 如果服务器离线，不发起请求，避免浏览器控制台显示错误
    if (!isOnline) {
      return;
    }

    const loadStats = async () => {
      try {
        const response = await getHomepageStats();
        if (response && response.success && response.data && response.data.onlineUsers) {
          setOnlineUsers(response.data.onlineUsers);
        } else if (response && response.success === false) {
          // 处理错误响应（如服务器离线）
          // 完全静默处理，不输出任何日志
          // 服务器离线时，不更新用户数，保持默认值或显示离线状态
        }
      } catch (error) {
        // 连接错误已在 api.js 中处理，这里只记录其他错误
        if (error.name !== 'ConnectionRefusedError') {
          console.error('Failed to load homepage stats:', error);
        }
      }
    };
    loadStats();
  }, [isOnline]);

  // 使用 SSE 接收实时更新
  const { subscribe } = useSSE();
  
  useEffect(() => {
    // 订阅 stats 数据更新
    const unsubscribe = subscribe('stats', (message) => {
      if (message.type === 'update' && message.data && message.data.onlineUsers !== undefined) {
        setOnlineUsers(message.data.onlineUsers);
      }
    });
    
    return unsubscribe;
  }, [subscribe]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 连接钱包并登录
  const handleConnectWallet = async () => {
    if (!isWalletInstalled()) {
      setWalletError('请安装Phantom钱包');
      setTimeout(() => setWalletError(''), 3000);
      return;
    }

    setWalletConnecting(true);
    setWalletError('');

    try {
      // 连接钱包
      const { address } = await connectWallet();
      
      // 生成登录消息
      const message = `TWS Protocol 登录验证\n\n地址: ${address}\n时间: ${new Date().toISOString()}\n\n点击签名以登录。`;
      
      // 请求签名
      const signature = await signMessage(message);
      
      // 尝试登录
      const result = await loginWithWallet(address, signature, message);
      
      if (result.success) {
        // 登录成功，刷新页面或跳转
        window.location.reload();
      } else if (result.needsRegistration) {
        // 需要注册，跳转到登录页面并提示
        navigate('/login', { 
          state: { 
            walletAddress: address,
            needsRegistration: true 
          } 
        });
      } else {
        setWalletError(result.message || '登录失败');
        setTimeout(() => setWalletError(''), 5000);
      }
    } catch (error) {
      console.error('钱包连接错误:', error);
      setWalletError(error.message || '连接钱包失败，请重试');
      setTimeout(() => setWalletError(''), 5000);
    } finally {
      setWalletConnecting(false);
    }
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
                TWS<span className="text-xs align-top opacity-50">.OSCN</span>
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
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4 relative">
            <div className="flex flex-col items-end border-r border-white/10 pr-4">
              <div className="flex items-center text-xs text-green-500 font-mono">
                <Activity size={12} className="mr-1" />
                LIVE NODE
              </div>
              <div className="text-slate-200 font-mono text-sm">
                {onlineUsers.toLocaleString()}
                <span className="text-slate-500 text-xs"> CONN.</span>
              </div>
            </div>

            {/* 钱包连接错误提示 */}
            {walletError && (
              <div className="absolute top-full right-0 mt-2 bg-red-900/90 border border-red-700 rounded p-2 text-xs text-red-200 flex items-center gap-2 z-50 max-w-xs shadow-lg">
                <AlertCircle size={14} />
                <span>{walletError}</span>
              </div>
            )}

            {isAuthenticated ? (
              <>
                <div className="flex items-center space-x-2 border-r border-white/10 pr-4">
                  <User size={14} className="text-cyan-400" />
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-300 font-mono">{user?.username || 'USER'}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {user?.address ? `${user.address.slice(0, 6)}...${user.address.slice(-4)}` : ''}
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
              <div className="flex items-center gap-2">
                {/* 钱包连接按钮 */}
                {isWalletInstalled() && (
                  <button
                    onClick={handleConnectWallet}
                    disabled={walletConnecting}
                    className="bg-blue-900/20 border border-blue-900/50 text-blue-400 hover:bg-blue-600 hover:text-white px-4 py-1 rounded text-xs font-mono tracking-widest transition-all flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                    title="连接钱包登录"
                  >
                    {walletConnecting ? (
                      <>
                        <Loader size={14} className="mr-2 animate-spin" />
                        连接中...
                      </>
                    ) : (
                      <>
                        <Wallet size={14} className="mr-2" />
                        连接钱包
                      </>
                    )}
                  </button>
                )}
                {/* 传统登录按钮 */}
              <button
                onClick={() => navigate('/login')}
                className="bg-red-900/20 border border-red-900/50 text-red-500 hover:bg-red-600 hover:text-white px-4 py-1 rounded text-xs font-mono tracking-widest transition-all flex items-center"
                type="button"
              >
                <LogIn size={14} className="mr-2" />
                登入 / LOGIN
              </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-cyan-900 to-transparent opacity-50" />
    </nav>
  );
};

export default Navbar;

