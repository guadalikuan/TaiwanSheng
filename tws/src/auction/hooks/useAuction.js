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

// 模拟数据（如果智能合约尚未部署）
const MOCK_AUCTION_STATE = {
  currentPrice: 1000, // 起拍价 1000 TWS
  highestBidder: '8V77...FpB',
  owner: '8V77HPB5pWN5tRTPdVncCqYTQCaqyCpWyvHP7eCpdFpB',
  tauntMessage: '此房产已被TWS接管',
  startPrice: 1000,
  startTime: Date.now() - 3600000, // 1小时前开始
  ownershipDuration: 3600,
  isLoading: false,
};

export const useAuction = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  
  const [auctionState, setAuctionState] = useState(MOCK_AUCTION_STATE);
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [userBalance, setUserBalance] = useState(0);

  // 获取用户余额
  useEffect(() => {
    if (connected && publicKey) {
      const fetchBalance = async () => {
        try {
          const mint = getTwsTokenMint();
          const tokenAccount = getUserTokenAccountSync(publicKey, mint);
          const accountInfo = await getAccount(connection, tokenAccount);
          const decimals = getTwsTokenDecimals();
          setUserBalance(Number(accountInfo.amount) / Math.pow(10, decimals));
        } catch (error) {
          // Token Account 不存在，余额为 0
          setUserBalance(0);
        }
      };

      fetchBalance();
      const interval = setInterval(fetchBalance, 5000); // 每5秒刷新余额
      return () => clearInterval(interval);
    } else {
      setUserBalance(0);
    }
  }, [connected, publicKey, connection]);

  // 模拟：定期刷新数据（制造一种"有人在抢"的假象）
  useEffect(() => {
    const interval = setInterval(() => {
      // 这里可以接入真实的链上数据查询逻辑
      // 现在我们用随机数模拟价格波动，保持刺激感
      if (Math.random() > 0.7) {
        setAuctionState(prev => ({
          ...prev,
          currentPrice: prev.currentPrice + Math.floor(Math.random() * 50),
          ownershipDuration: prev.ownershipDuration + 1,
        }));
      }
    }, 5000); // 每5秒刷新一次

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
      const oldOwnerKey = new PublicKey(auctionState.owner);

      // 获取所有相关的 Token Account 地址
      const userTokenAccount = getUserTokenAccountSync(publicKey, mint);
      const treasuryTokenAccount = getTreasuryTokenAccountSync(treasuryPublicKey, mint);
      const oldOwnerTokenAccount = getUserTokenAccountSync(oldOwnerKey, mint);

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

      // 3. 检查上一任持有者的 Token Account
      const oldOwnerTokenAccountInfo = await connection.getAccountInfo(oldOwnerTokenAccount);
      if (!oldOwnerTokenAccountInfo) {
        const createOldOwnerAccount = await createTokenAccountIfNeeded(connection, publicKey, oldOwnerKey, mint);
        if (createOldOwnerAccount) {
          transaction.add(createOldOwnerAccount);
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

      // 步骤 2: 买家 -> 上任房主 (赔付+利润 95%)
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
        errorMessage = 'Token 账户不存在，请先获取一些 TWS！';
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

