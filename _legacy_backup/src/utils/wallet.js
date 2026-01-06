import { Connection, PublicKey } from '@solana/web3.js';

/**
 * 检查是否安装了Solana钱包（Phantom等）
 */
export const isWalletInstalled = () => {
  return typeof window !== 'undefined' && window.solana && window.solana.isPhantom;
};

/**
 * 获取当前连接的钱包地址
 */
export const getConnectedAddress = async () => {
  if (!isWalletInstalled()) {
    throw new Error('请安装Phantom钱包');
  }

  try {
    const response = await window.solana.connect({ onlyIfTrusted: true });
    return response.publicKey.toString();
  } catch (error) {
    // 如果用户未授权，返回null
    return null;
  }
};

/**
 * 连接Solana钱包（Phantom等）
 */
export const connectWallet = async () => {
  if (!isWalletInstalled()) {
    throw new Error('请安装Phantom钱包。访问 https://phantom.app 下载安装。');
  }

  try {
    // 请求连接钱包
    const response = await window.solana.connect();
    
    if (!response.publicKey) {
      throw new Error('用户拒绝了连接请求');
    }

    const address = response.publicKey.toString();
    
    // 创建Solana连接（用于后续操作）
    const connection = new Connection(
      process.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    
    return {
      address,
      publicKey: response.publicKey,
      connection
    };
  } catch (error) {
    console.error('连接钱包失败:', error);
    if (error.code === 4001 || error.code === -32002) {
      throw new Error('用户拒绝了连接请求');
    }
    throw error;
  }
};

/**
 * 签名消息（用于钱包登录验证）
 * Solana使用UTF-8编码的消息签名
 */
export const signMessage = async (message) => {
  if (!isWalletInstalled()) {
    throw new Error('请安装Phantom钱包');
  }

  try {
    // 确保钱包已连接
    if (!window.solana.isConnected) {
      await window.solana.connect();
    }

    // 将消息转换为Uint8Array
    const messageBytes = new TextEncoder().encode(message);
    
    // 请求签名（Phantom的signMessage返回 { signature: Uint8Array }）
    const signedMessage = await window.solana.signMessage(messageBytes);
    
    // 将Uint8Array转换为base64字符串
    // 在浏览器环境中，使用btoa或手动转换
    const signatureArray = Array.from(signedMessage.signature);
    const signature = btoa(String.fromCharCode(...signatureArray));
    
    return signature;
  } catch (error) {
    console.error('签名失败:', error);
    if (error.code === 4001) {
      throw new Error('用户拒绝了签名请求');
    }
    throw error;
  }
};

/**
 * 验证Solana地址格式
 */
export const isValidSolanaAddress = (address) => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

/**
 * 监听钱包账户变化
 */
export const onAccountsChanged = (callback) => {
  if (!isWalletInstalled()) {
    return null;
  }

  const handler = (publicKey) => {
    callback(publicKey ? publicKey.toString() : null);
  };

  window.solana.on('accountChanged', handler);
  
  // 返回清理函数
  return () => {
    window.solana.removeListener('accountChanged', handler);
  };
};

/**
 * 监听钱包断开连接
 */
export const onDisconnect = (callback) => {
  if (!isWalletInstalled()) {
    return null;
  }

  window.solana.on('disconnect', callback);
  
  // 返回清理函数
  return () => {
    window.solana.removeListener('disconnect', callback);
  };
};

/**
 * 断开钱包连接
 */
export const disconnectWallet = async () => {
  if (!isWalletInstalled()) {
    return;
  }

  try {
    await window.solana.disconnect();
  } catch (error) {
    console.error('断开连接失败:', error);
  }
};
