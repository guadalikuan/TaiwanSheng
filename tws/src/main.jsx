import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SSEProvider } from './contexts/SSEContext';
import { ServerStatusProvider } from './contexts/ServerStatusContext';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { SolanaWalletProvider } from './components/SolanaWalletProvider';
import App from './App';
import './index.css';

// 配置 TON Connect 清单地址（测试用，上线替换为自己的）
const tonManifestUrl = 'https://ton-connect.github.io/demo-dapp/tonconnect-manifest.json';

// 监听全局错误，捕获 TON Connect 的网络错误
if (typeof window !== 'undefined') {
  const originalError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    // 捕获 TON Connect 相关的 fetch 错误
    if (
      message?.includes('TON_CONNECT') || 
      message?.includes('Failed to fetch') ||
      error?.stack?.includes('wallets-list-manager') ||
      error?.stack?.includes('tonconnect')
    ) {
      console.warn('[TON Connect] 网络错误已捕获，不影响应用运行:', message);
      return true; // 阻止错误继续传播
    }
    // 其他错误正常处理
    if (originalError) {
      return originalError(message, source, lineno, colno, error);
    }
    return false;
  };

  // 捕获未处理的 Promise 拒绝（异步错误）
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    if (
      error?.message?.includes('TON_CONNECT') ||
      error?.message?.includes('Failed to fetch') ||
      error?.stack?.includes('wallets-list-manager') ||
      error?.stack?.includes('tonconnect')
    ) {
      console.warn('[TON Connect] Promise 拒绝已捕获，不影响应用运行:', error);
      event.preventDefault(); // 阻止错误继续传播
    }
  });
}

// TON Connect 错误边界组件
class TonConnectErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // 捕获 TON Connect 相关错误
    if (
      error?.message?.includes('TON_CONNECT') || 
      error?.message?.includes('Failed to fetch') ||
      error?.stack?.includes('wallets-list-manager')
    ) {
      console.warn('[TON Connect] 初始化失败，但不影响应用运行:', error);
      return { hasError: true };
    }
    // 其他错误继续抛出
    throw error;
  }

  componentDidCatch(error, errorInfo) {
    // 只记录 TON Connect 相关错误
    if (
      error?.message?.includes('TON_CONNECT') || 
      error?.message?.includes('Failed to fetch') ||
      error?.stack?.includes('wallets-list-manager')
    ) {
      console.warn('[TON Connect] 错误详情:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // TON Connect 失败时，使用降级方案（不包含 TON Connect Provider）
      return this.props.fallback || this.props.children;
    }
    return this.props.children;
  }
}

// 应用主组件（包含 TON Connect）
const AppWithTonConnect = () => (
  <TonConnectUIProvider 
    manifestUrl={tonManifestUrl}
    // 添加错误处理配置
    actionsConfiguration={{
      twaReturnUrl: undefined,
    }}
  >
    <SolanaWalletProvider>
      <ServerStatusProvider>
        <SSEProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </SSEProvider>
      </ServerStatusProvider>
    </SolanaWalletProvider>
  </TonConnectUIProvider>
);

// 应用主组件（不包含 TON Connect，作为降级方案）
const AppWithoutTonConnect = () => (
  <SolanaWalletProvider>
    <ServerStatusProvider>
      <SSEProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </SSEProvider>
    </ServerStatusProvider>
  </SolanaWalletProvider>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <TonConnectErrorBoundary fallback={<AppWithoutTonConnect />}>
        <AppWithTonConnect />
      </TonConnectErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>,
);

