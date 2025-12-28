import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SolanaWalletProvider } from './contexts/SolanaWalletContext';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import App from './App';
import './index.css';

// 导入 buffer polyfill（Solana SDK 需要）
import { Buffer } from 'buffer';
window.Buffer = Buffer;
globalThis.Buffer = Buffer;

// 2. 配置 TON Connect 清单地址（测试用，上线替换为自己的）
// 测试清单地址（官方示例），上线需替换为你自己的 manifest.json 地址
const tonManifestUrl = 'https://ton-connect.github.io/demo-dapp/tonconnect-manifest.json';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
    {/* 添加 TonConnectUIProvider 包裹 AuthProvider + App */}
      <TonConnectUIProvider manifestUrl={tonManifestUrl}>
        <AuthProvider>
          <SolanaWalletProvider>
            <App />
          </SolanaWalletProvider>
        </AuthProvider>
      </TonConnectUIProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

