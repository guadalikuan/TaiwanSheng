/**
 * Jupiter Swap API 工具函数
 * 用于实现 Solana 代币交换功能
 */

import { VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

// Jupiter API 端点
const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6/quote';
const JUPITER_SWAP_API = 'https://quote-api.jup.ag/v6/swap';

// SOL 原生代币地址
export const SOL_MINT = 'So11111111111111111111111111111111111111112';

/**
 * 获取代币交换报价
 * @param {string} inputMint - 输入代币的 mint 地址
 * @param {string} outputMint - 输出代币的 mint 地址
 * @param {number|string} amount - 输入代币数量（最小单位，字符串格式）
 * @param {number} slippageBps - 滑点容忍度（基点，默认50 = 0.5%）
 * @returns {Promise<Object>} 报价数据
 */
export const getJupiterQuote = async (inputMint, outputMint, amount, slippageBps = 50) => {
  try {
    // amount 应该已经是最小单位（字符串格式）
    const amountInSmallestUnit = amount.toString();

    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: amountInSmallestUnit,
      slippageBps: slippageBps.toString(),
      onlyDirectRoutes: 'false',
      asLegacyTransaction: 'false'
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时

    const response = await fetch(`${JUPITER_QUOTE_API}?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jupiter Quote API error: ${response.status} ${errorText}`);
    }

    const quote = await response.json();

    if (!quote || quote.error) {
      throw new Error(quote.error || 'Failed to get quote');
    }

    return {
      success: true,
      quote,
      inputAmount: quote.inAmount,
      outputAmount: quote.outAmount,
      priceImpact: quote.priceImpactPct ? parseFloat(quote.priceImpactPct) : 0,
      route: quote.routePlan,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试');
    }
    console.error('获取Jupiter报价失败:', err);
    throw err;
  }
};

/**
 * 创建 Jupiter Swap 交易
 * @param {Object} quote - Jupiter 报价对象
 * @param {string} userPublicKey - 用户公钥（字符串格式）
 * @param {Object} options - 选项
 * @param {boolean} options.wrapAndUnwrapSol - 是否自动包装/解包 SOL（默认 true）
 * @param {boolean} options.dynamicComputeUnitLimit - 是否动态计算计算单元限制（默认 true）
 * @param {string} options.prioritizationFeeLamports - 优先费用（默认 'auto'）
 * @returns {Promise<Object>} Swap 交易数据
 */
export const createJupiterSwap = async (quote, userPublicKey, options = {}) => {
  try {
    const {
      wrapAndUnwrapSol = true,
      dynamicComputeUnitLimit = true,
      prioritizationFeeLamports = 'auto'
    } = options;

    const swapRequest = {
      quoteResponse: quote,
      userPublicKey: userPublicKey.toString(),
      wrapAndUnwrapSol,
      dynamicComputeUnitLimit,
      prioritizationFeeLamports,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20秒超时

    const response = await fetch(JUPITER_SWAP_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(swapRequest),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jupiter Swap API error: ${response.status} ${errorText}`);
    }

    const swapData = await response.json();

    if (!swapData || swapData.error) {
      throw new Error(swapData.error || 'Failed to create swap transaction');
    }

    return {
      success: true,
      swapTransaction: swapData.swapTransaction,
      lastValidBlockHeight: swapData.lastValidBlockHeight,
      prioritizationFeeLamports: swapData.prioritizationFeeLamports,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试');
    }
    console.error('创建Jupiter Swap交易失败:', err);
    throw err;
  }
};

/**
 * 执行 Swap 交易
 * @param {string} swapTransactionBase64 - Base64 编码的交易数据
 * @param {Object} wallet - Solana 钱包适配器对象（包含 sendTransaction 方法）
 * @param {Object} connection - Solana 连接对象
 * @returns {Promise<string>} 交易签名
 */
export const executeSwap = async (swapTransactionBase64, wallet, connection) => {
  try {
    if (!wallet || !wallet.sendTransaction) {
      throw new Error('钱包未连接或不支持发送交易');
    }

    if (!connection) {
      throw new Error('Solana 连接未初始化');
    }

    // 反序列化交易
    const swapTransactionBuf = Buffer.from(swapTransactionBase64, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    // 发送交易（钱包会自动签名）
    const signature = await wallet.sendTransaction(transaction, connection, {
      skipPreflight: false,
      maxRetries: 3,
    });

    // 等待确认
    await connection.confirmTransaction(signature, 'confirmed');

    return signature;
  } catch (err) {
    console.error('执行Swap交易失败:', err);
    throw err;
  }
};

/**
 * 查询代币余额
 * @param {string} mint - 代币 mint 地址
 * @param {string} walletAddress - 钱包地址
 * @param {Object} connection - Solana 连接对象
 * @param {number} decimals - 代币小数位数（默认6，SOL为9）
 * @returns {Promise<number>} 代币余额（原始单位）
 */
export const getTokenBalance = async (mint, walletAddress, connection, decimals = 6) => {
  try {
    if (!connection || !walletAddress) {
      return 0;
    }

    const { PublicKey } = await import('@solana/web3.js');

    // 如果是 SOL，直接查询余额
    if (mint === SOL_MINT) {
      const publicKey = new PublicKey(walletAddress);
      const balance = await connection.getBalance(publicKey);
      return balance / 1e9; // SOL 有 9 位小数
    }

    // 对于 SPL 代币，查询关联代币账户余额
    const { getAccount } = await import('@solana/spl-token');

    const mintPublicKey = new PublicKey(mint);
    const walletPublicKey = new PublicKey(walletAddress);

    const tokenAccount = await getAssociatedTokenAddress(mintPublicKey, walletPublicKey);
    
    try {
      const accountInfo = await getAccount(connection, tokenAccount);
      return Number(accountInfo.amount) / Math.pow(10, decimals);
    } catch (err) {
      // 如果账户不存在，返回 0
      if (err.name === 'TokenAccountNotFoundError' || err.message?.includes('Invalid')) {
        return 0;
      }
      throw err;
    }
  } catch (err) {
    console.error('查询代币余额失败:', err);
    return 0;
  }
};

/**
 * 格式化代币数量（根据小数位数）
 * @param {number|string} amount - 原始数量
 * @param {number} decimals - 小数位数（默认 6）
 * @returns {string} 格式化后的数量
 */
export const formatTokenAmount = (amount, decimals = 6) => {
  if (!amount) return '0';
  const num = parseFloat(amount);
  if (isNaN(num)) return '0';
  return (num / Math.pow(10, decimals)).toFixed(decimals > 6 ? 6 : decimals);
};

/**
 * 将代币数量转换为最小单位
 * @param {number|string} amount - 原始数量
 * @param {number} decimals - 小数位数（默认 6）
 * @returns {string} 最小单位数量（字符串格式，避免精度丢失）
 */
export const toTokenSmallestUnit = (amount, decimals = 6) => {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0';
  return Math.floor(num * Math.pow(10, decimals)).toString();
};

