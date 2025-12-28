import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { 
  createTransferInstruction,
  getAccount,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { 
  calculateMinBid, 
  calculateSplit, 
  getTreasuryAddress, 
  formatAddress,
  getTwsTokenMint,
  getTwsTokenDecimals,
  toTokenAmount,
  getUserTokenAccountSync,
  getTreasuryTokenAccountSync,
  createTokenAccountIfNeeded
} from '../utils/solana';

// API 基础 URL
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');

// 获取拍卖状态
const fetchAuctionState = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auction/state`);
    const result = await response.json();
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to fetch auction state');
  } catch (error) {
    console.error('Error fetching auction state:', error);
    // 返回默认值作为后备
    return {
      currentPrice: 1000,
      highestBidder: null,
      owner: null,
      tauntMessage: '此房产等待第一个出价者',
      startPrice: 1000,
      startTime: Date.now(),
      ownershipDuration: 0,
      isLoading: false,
    };
  }
};

// 默认状态
const DEFAULT_AUCTION_STATE = {
  currentPrice: 1000,
  highestBidder: null,
  owner: null,
  tauntMessage: '加载中...',
  startPrice: 1000,
  startTime: Date.now(),
  ownershipDuration: 0,
  isLoading: true,
};

export const useAuction = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  
  const [auctionState, setAuctionState] = useState(DEFAULT_AUCTION_STATE);
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [userBalance, setUserBalance] = useState(0);

  // 获取用户余额
  useEffect(() => {
    if (connected && publicKey) {
      const fetchBalance = async () => {
        try {
          const mint = getTwsTokenMint();
          console.log('🔍 查询余额 - Mint 地址:', mint.toString());
          console.log('🔍 查询余额 - 用户地址:', publicKey.toString());
          console.log('🔍 连接的网络:', connection.rpcEndpoint);
          
          // 方法1: 使用 getParsedTokenAccountsByOwner 查询用户所有的 token accounts
          // 这个方法更可靠，可以找到所有 token accounts，即使 ATA 不存在
          try {
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
              publicKey,
              {
                mint: mint,
              }
            );
            
            console.log('📊 查询到的 Token Accounts:', tokenAccounts);
            
            if (tokenAccounts.value && tokenAccounts.value.length > 0) {
              // 找到匹配的 token account
              const twsAccount = tokenAccounts.value.find(
                account => account.account.data.parsed.info.mint === mint.toString()
              );
              
              if (twsAccount) {
                const tokenAmount = twsAccount.account.data.parsed.info.tokenAmount;
                const balance = tokenAmount.uiAmount || 
                  (Number(tokenAmount.amount) / Math.pow(10, tokenAmount.decimals));
                
                console.log('✅ 使用 getParsedTokenAccountsByOwner 获取余额:', {
                  amount: tokenAmount.amount,
                  decimals: tokenAmount.decimals,
                  uiAmount: tokenAmount.uiAmount,
                  uiAmountString: tokenAmount.uiAmountString,
                  balance: balance,
                });
                
                console.log('💰 最终余额:', balance, 'TWSCoin');
                setUserBalance(balance);
                return;
              }
            }
            
            console.log('ℹ️ 未找到 TWSCoin Token Account，余额为 0');
            setUserBalance(0);
          } catch (parseError) {
            console.warn('⚠️ getParsedTokenAccountsByOwner 失败，尝试备用方法:', parseError.message);
            
            // 方法2: 使用 ATA 地址查询（备用方法）
            const tokenAccount = getUserTokenAccountSync(publicKey, mint);
            console.log('🔍 Token Account 地址:', tokenAccount.toString());
            
            try {
              const tokenAccountInfo = await getAccount(connection, tokenAccount);
              const decimals = getTwsTokenDecimals();
              const balance = Number(tokenAccountInfo.amount) / Math.pow(10, decimals);
              
              console.log('✅ 使用 getAccount 获取余额:', balance, 'TWSCoin');
              setUserBalance(balance);
            } catch (accountError) {
              console.log('ℹ️ Token Account 不存在，余额为 0');
              console.log('错误信息:', accountError.message);
              setUserBalance(0);
            }
          }
        } catch (error) {
          console.error('❌ 获取 TWSCoin 余额失败:', error);
          
          // 检查是否是 RPC 访问限制错误
          if (error.message?.includes('403') || error.message?.includes('Access forbidden')) {
            console.error('⚠️ RPC 端点访问被拒绝（403 Forbidden）');
            console.error('💡 解决方案：请配置自定义 RPC 端点');
            console.error('   在 .env.local 文件中添加：VITE_SOLANA_RPC_URL=你的RPC端点URL');
            console.error('   推荐使用：Helius、QuickNode 或 Alchemy 等 RPC 提供商');
          }
          
          console.error('错误详情:', {
            message: error.message,
            rpcEndpoint: connection.rpcEndpoint,
            stack: error.stack,
          });
          setUserBalance(0);
        }
      };

      // 立即获取一次
      fetchBalance();
      // 每5秒刷新余额
      const interval = setInterval(fetchBalance, 5000);
      return () => clearInterval(interval);
    } else {
      setUserBalance(0);
    }
  }, [connected, publicKey, connection]);

  // 从数据库加载拍卖状态
  useEffect(() => {
    const loadAuctionState = async () => {
      const state = await fetchAuctionState();
      setAuctionState({
        ...state,
        isLoading: false,
      });
    };
    
    loadAuctionState();
    
    // 每5秒刷新一次（从数据库获取真实数据）
    const interval = setInterval(loadAuctionState, 5000);
    return () => clearInterval(interval);
  }, []);

  // 核心功能：出价 (The Shot) - 使用 SPL Token
  const placeBid = useCallback(async (tauntMessage = '') => {
    if (!publicKey) {
      return { success: false, error: '请先连接钱包！(Connect Wallet First)' };
    }

    setIsPlacingBid(true);

    try {
      const currentPrice = auctionState.currentPrice;
      const minBid = calculateMinBid(currentPrice);
      
      // 检查用户余额
      if (userBalance < minBid) {
        setIsPlacingBid(false);
        return { 
          success: false, 
          error: `余额不足！需要 ${minBid.toLocaleString()} TWS，当前余额 ${userBalance.toLocaleString()} TWS` 
        };
      }

      // 转换为链上数量（考虑 decimals）
      const bidAmountTokens = toTokenAmount(minBid);
      
      // 计算分账
      const { fee, payout } = calculateSplit(bidAmountTokens);
      
      const mint = getTwsTokenMint();
      const treasuryPublicKey = new PublicKey(getTreasuryAddress());
      
      // 检查是否有上一任持有者
      const hasOldOwner = auctionState.owner && 
                          auctionState.owner !== 'null' && 
                          auctionState.owner !== null &&
                          auctionState.owner.trim() !== '';
      const oldOwnerKey = hasOldOwner ? new PublicKey(auctionState.owner) : null;

      // 获取所有相关的 Token Account 地址
      const userTokenAccount = getUserTokenAccountSync(publicKey, mint);
      const treasuryTokenAccount = getTreasuryTokenAccountSync(treasuryPublicKey, mint);

      // 构建交易
      const transaction = new Transaction();

      // 检查并创建必要的 Token Account
      // 1. 检查用户的 Token Account
      const userTokenAccountInfo = await connection.getAccountInfo(userTokenAccount);
      if (!userTokenAccountInfo) {
        const createUserAccount = await createTokenAccountIfNeeded(connection, publicKey, publicKey, mint);
        if (createUserAccount) {
          transaction.add(createUserAccount);
        }
      }

      // 2. 检查财库的 Token Account
      const treasuryTokenAccountInfo = await connection.getAccountInfo(treasuryTokenAccount);
      if (!treasuryTokenAccountInfo) {
        const createTreasuryAccount = await createTokenAccountIfNeeded(connection, publicKey, treasuryPublicKey, mint);
        if (createTreasuryAccount) {
          transaction.add(createTreasuryAccount);
        }
      }

      // 3. 如果有上一任持有者，检查并创建其 Token Account
      let oldOwnerTokenAccount = null;
      if (hasOldOwner && oldOwnerKey) {
        oldOwnerTokenAccount = getUserTokenAccountSync(oldOwnerKey, mint);
        const oldOwnerTokenAccountInfo = await connection.getAccountInfo(oldOwnerTokenAccount);
        if (!oldOwnerTokenAccountInfo) {
          const createOldOwnerAccount = await createTokenAccountIfNeeded(connection, publicKey, oldOwnerKey, mint);
          if (createOldOwnerAccount) {
            transaction.add(createOldOwnerAccount);
          }
        }
      }

      // 步骤 1: 买家 -> TWS 财库 (交税 5%)
      transaction.add(
        createTransferInstruction(
          userTokenAccount,      // 源账户（买家）
          treasuryTokenAccount,  // 目标账户（财库）
          publicKey,            // 授权账户（买家）
          fee,                  // 转账数量
          [],                   // 多签账户（无）
          TOKEN_PROGRAM_ID      // Token Program ID
        )
      );

      // 步骤 2: 如果有上一任持有者，买家 -> 上任房主 (赔付+利润 95%)
      // 如果没有上一任持有者，将剩余 95% 也转给财库（作为初始拍卖费用）
      if (hasOldOwner && oldOwnerKey && oldOwnerTokenAccount) {
        transaction.add(
          createTransferInstruction(
            userTokenAccount,      // 源账户（买家）
            oldOwnerTokenAccount,  // 目标账户（上一任持有者）
            publicKey,            // 授权账户（买家）
            payout,               // 转账数量
            [],                   // 多签账户（无）
            TOKEN_PROGRAM_ID      // Token Program ID
          )
        );
      } else {
        // 第一个出价者：将剩余 95% 也转给财库
        transaction.add(
          createTransferInstruction(
            userTokenAccount,      // 源账户（买家）
            treasuryTokenAccount,  // 目标账户（财库）
            publicKey,            // 授权账户（买家）
            payout,               // 转账数量
            [],                   // 多签账户（无）
            TOKEN_PROGRAM_ID      // Token Program ID
          )
        );
      }

      // 获取最新区块哈希
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // 发送交易并签名
      const signature = await sendTransaction(transaction, connection);

      // 等待确认
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed');

      console.log("Bid Placed! Signature:", signature);

      // 在交易成功后，保存到数据库
      try {
        await fetch(`${API_BASE_URL}/api/auction/bid`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bidder: publicKey.toString(),
            amount: minBid,
            taunt: tauntMessage || '',
            transactionSignature: signature
          }),
        });
      } catch (error) {
        console.error('Failed to save bid to database:', error);
        // 即使保存失败，也不影响交易成功
      }

      // 更新前端状态
      setAuctionState(prev => ({
        ...prev,
        currentPrice: minBid,
        highestBidder: formatAddress(publicKey.toString()),
        owner: publicKey.toString(),
        tauntMessage: tauntMessage || prev.tauntMessage,
        ownershipDuration: 0,
        startTime: Date.now(),
      }));

      // 刷新余额
      try {
        const accountInfo = await getAccount(connection, userTokenAccount);
        const decimals = getTwsTokenDecimals();
        setUserBalance(Number(accountInfo.amount) / Math.pow(10, decimals));
      } catch (error) {
        console.warn('Failed to refresh balance:', error);
      }

      setIsPlacingBid(false);
      return { success: true, signature, message: '出价成功！' };

    } catch (error) {
      console.error("Bid Failed:", error);
      setIsPlacingBid(false);
      
      let errorMessage = '交易失败！';
      if (error.message?.includes('insufficient funds') || error.message?.includes('0x1')) {
        errorMessage = '余额不足，请确保有足够的 TWS！';
      } else if (error.message?.includes('TokenAccountNotFoundError') || error.message?.includes('0x5')) {
        errorMessage = 'Token 账户不存在，请先获取一些 TWSCoin！';
      } else if (error.message?.includes('User rejected')) {
        errorMessage = '用户取消了交易';
      } else {
        errorMessage = error.message || '交易失败，可能是您的余额不足，或者是历史的阻力。请重试。';
      }
      
      return { success: false, error: errorMessage };
    }
  }, [publicKey, sendTransaction, connection, auctionState, userBalance]);

  // 计算下一个出价金额
  const nextBidAmount = calculateMinBid(auctionState.currentPrice);

  return {
    ...auctionState,
    connected,
    isPlacingBid,
    nextBidAmount,
    userBalance,
    placeBid,
  };
};

