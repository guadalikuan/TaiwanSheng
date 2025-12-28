import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect, useRef } from 'react';

/**
 * 通用的 Solana 钱包连接按钮组件
 * 可以在整个项目中使用
 * 
 * @param {Object} props
 * @param {string} props.className - 自定义样式类名
 * @param {string} props.variant - 按钮变体：'default' | 'compact'
 */
export default function WalletConnectButton({ className = '', variant = 'default' }) {
  const { connected, publicKey, disconnect, wallet, wallets, select } = useWallet();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showWalletList, setShowWalletList] = useState(false);
  const dropdownRef = useRef(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowWalletList(false);
      }
    };

    if (showWalletList) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showWalletList]);

  const handleClick = async () => {
    if (connected) {
      // 已连接，显示断开选项
      if (window.confirm('确定要断开钱包连接吗？')) {
        setIsDisconnecting(true);
        try {
          await disconnect();
        } catch (error) {
          console.error('Disconnect error:', error);
        } finally {
          setIsDisconnecting(false);
        }
      }
    } else {
      // 未连接，显示钱包选择列表
      setShowWalletList(true);
    }
  };

  const handleSelectWallet = async (walletAdapter) => {
    try {
      select(walletAdapter.adapter.name);
      setShowWalletList(false);
      // 钱包适配器会自动触发连接
    } catch (error) {
      console.error('Wallet selection error:', error);
    }
  };

  // 默认样式
  const defaultClassName = variant === 'compact'
    ? 'bg-tws-red hover:bg-red-600 text-white font-bold rounded-lg px-3 py-1.5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
    : 'bg-tws-red hover:bg-red-600 text-white font-bold rounded-lg px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={isDisconnecting}
        className={className || defaultClassName}
        title={connected && publicKey ? `已连接: ${publicKey.toString()}` : '连接 Solana 钱包'}
      >
        {isDisconnecting ? (
          '断开中...'
        ) : connected && publicKey ? (
          <span className="font-mono">
            {variant === 'compact' 
              ? `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`
              : `${publicKey.toString().slice(0, 6)}...${publicKey.toString().slice(-4)}`
            }
          </span>
        ) : (
          '连接钱包'
        )}
      </button>

      {/* 自定义钱包选择下拉菜单 */}
      {showWalletList && !connected && (
        <div ref={dropdownRef} className="absolute top-full right-0 mt-2 bg-tws-black border-2 border-tws-red rounded-lg shadow-lg z-50 min-w-[200px]">
          <div className="p-2">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-700">
              <span className="text-sm font-bold text-tws-gold">选择钱包</span>
              <button
                onClick={() => setShowWalletList(false)}
                className="text-gray-400 hover:text-white text-lg"
              >
                ×
              </button>
            </div>
            {wallets && wallets.length > 0 ? (
              <div className="space-y-1">
                {wallets.map((walletAdapter) => (
                  <button
                    key={walletAdapter.adapter.name}
                    onClick={() => handleSelectWallet(walletAdapter)}
                    className="w-full text-left px-3 py-2 hover:bg-tws-dark-red rounded text-sm text-white transition-colors"
                  >
                    {walletAdapter.adapter.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-xs p-2">没有可用的钱包</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

