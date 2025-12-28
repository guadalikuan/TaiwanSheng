import React, { createContext, useContext, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// 引入钱包样式 - 使用 import（Vite 兼容）
import '@solana/wallet-adapter-react-ui/styles.css';

const SolanaWalletContext = createContext(null);

export const useSolanaWallet = () => {
  const context = useContext(SolanaWalletContext);
  if (!context) {
    throw new Error('useSolanaWallet must be used within SolanaWalletProvider');
  }
  return context;
};

export const SolanaWalletProvider = ({ children }) => {
  // 从环境变量获取网络配置，默认使用主网
  const networkEnv = import.meta.env.VITE_SOLANA_NETWORK || 'mainnet-beta';
  const network = networkEnv === 'mainnet-beta' 
    ? WalletAdapterNetwork.Mainnet 
    : WalletAdapterNetwork.Devnet;
  
  const endpoint = useMemo(() => {
    const customRpc = import.meta.env.VITE_SOLANA_RPC_URL;
    if (customRpc) {
      console.log('✅ 使用自定义 RPC 端点:', customRpc);
      return customRpc;
    } else {
      const defaultEndpoint = clusterApiUrl(network);
      console.warn('⚠️ 未配置自定义 RPC 端点，使用默认端点:', defaultEndpoint);
      console.warn('⚠️ 默认端点有访问限制，可能返回 403 错误');
      console.warn('💡 请在 tws/.env.local 文件中配置 VITE_SOLANA_RPC_URL');
      console.warn('💡 详细说明请查看: tws/RPC_CONFIG.md');
      return defaultEndpoint;
    }
  }, [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

