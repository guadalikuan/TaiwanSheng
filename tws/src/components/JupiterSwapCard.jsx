import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowUpDown, 
  Wallet, 
  Loader, 
  AlertCircle, 
  CheckCircle, 
  ExternalLink,
  Search,
  X
} from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { 
  getJupiterQuote, 
  createJupiterSwap, 
  executeSwap, 
  getTokenBalance,
  formatTokenAmount,
  toTokenSmallestUnit,
  SOL_MINT
} from '../utils/jupiterSwap';
import { 
  getPopularTokens, 
  searchTokenByAddress,
  searchTokenBySymbol,
  isValidTokenAddress,
  createCustomToken,
  getTokenMetadata
} from '../utils/tokenList';

const JupiterSwapCard = () => {
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  // 状态管理
  const [inputToken, setInputToken] = useState(null);
  const [outputToken, setOutputToken] = useState(null);
  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('');
  const [inputBalance, setInputBalance] = useState(0);
  const [outputBalance, setOutputBalance] = useState(0);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);
  const [slippageBps, setSlippageBps] = useState(50); // 0.5% 默认滑点

  // 代币选择器状态
  const [showInputTokenSelector, setShowInputTokenSelector] = useState(false);
  const [showOutputTokenSelector, setShowOutputTokenSelector] = useState(false);
  const [tokenSearchQuery, setTokenSearchQuery] = useState('');

  const popularTokens = getPopularTokens();

  // 初始化默认代币（SOL -> USDC）
  useEffect(() => {
    if (popularTokens.length >= 2) {
      setInputToken(popularTokens[0]); // SOL
      setOutputToken(popularTokens[1]); // USDC
    }
  }, []);

  // 查询输入代币余额
  const fetchInputBalance = useCallback(async () => {
    if (!connected || !publicKey || !inputToken) return;
    
    try {
      const balance = await getTokenBalance(
        inputToken.address,
        publicKey.toString(),
        connection,
        inputToken.decimals || 6
      );
      setInputBalance(balance);
    } catch (err) {
      console.error('查询输入代币余额失败:', err);
      setInputBalance(0);
    }
  }, [connected, publicKey, inputToken, connection]);

  // 查询输出代币余额
  const fetchOutputBalance = useCallback(async () => {
    if (!connected || !publicKey || !outputToken) return;
    
    try {
      const balance = await getTokenBalance(
        outputToken.address,
        publicKey.toString(),
        connection,
        outputToken.decimals || 6
      );
      setOutputBalance(balance);
    } catch (err) {
      console.error('查询输出代币余额失败:', err);
      setOutputBalance(0);
    }
  }, [connected, publicKey, outputToken, connection]);

  // 当代币或连接状态变化时，更新余额
  useEffect(() => {
    fetchInputBalance();
  }, [fetchInputBalance]);

  useEffect(() => {
    fetchOutputBalance();
  }, [fetchOutputBalance]);

  // 获取报价
  const fetchQuote = useCallback(async () => {
    if (!inputToken || !outputToken || !inputAmount || parseFloat(inputAmount) <= 0) {
      setQuote(null);
      setOutputAmount('');
      return;
    }

    if (inputToken.address === outputToken.address) {
      setQuote(null);
      setOutputAmount('');
      setError('不能交换相同的代币');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 将输入数量转换为最小单位（字符串格式，避免精度丢失）
      const amountInSmallestUnit = toTokenSmallestUnit(inputAmount, inputToken.decimals || 6);
      
      const result = await getJupiterQuote(
        inputToken.address,
        outputToken.address,
        amountInSmallestUnit,
        slippageBps
      );

      if (result.success && result.quote) {
        setQuote(result.quote);
        // 将输出数量转换为可读格式
        // Jupiter返回的outAmount是最小单位（字符串）
        const outputAmountRaw = BigInt(result.outputAmount || result.quote.outAmount || '0');
        const outputAmountFormatted = (Number(outputAmountRaw) / Math.pow(10, outputToken.decimals || 6)).toFixed(6);
        setOutputAmount(outputAmountFormatted);
      } else {
        throw new Error('获取报价失败');
      }
    } catch (err) {
      console.error('获取报价失败:', err);
      setError(err.message || '获取报价失败，请稍后重试');
      setQuote(null);
      setOutputAmount('');
    } finally {
      setLoading(false);
    }
  }, [inputToken, outputToken, inputAmount, slippageBps]);

  // 当输入变化时，延迟获取报价（防抖）
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuote();
    }, 500); // 500ms 防抖

    return () => clearTimeout(timer);
  }, [fetchQuote]);

  // 交换输入输出代币
  const swapTokens = () => {
    const temp = inputToken;
    setInputToken(outputToken);
    setOutputToken(temp);
    setInputAmount('');
    setOutputAmount('');
    setQuote(null);
  };

  // 设置最大输入
  const setMaxInput = () => {
    if (inputBalance > 0) {
      // 保留一些余额用于手续费（如果是SOL）
      const maxAmount = inputToken.address === SOL_MINT 
        ? Math.max(0, inputBalance - 0.01) // SOL 保留 0.01 用于手续费
        : inputBalance;
      setInputAmount(maxAmount.toFixed(6));
    }
  };

  // 执行 Swap
  const handleSwap = async () => {
    if (!connected || !publicKey) {
      setVisible(true);
      return;
    }

    if (!quote || !inputToken || !outputToken || !inputAmount) {
      setError('请先获取报价');
      return;
    }

    if (parseFloat(inputAmount) > inputBalance) {
      setError('余额不足');
      return;
    }

    setSwapping(true);
    setError(null);
    setTxHash(null);

    try {
      // 创建 Swap 交易
      const swapData = await createJupiterSwap(quote, publicKey.toString(), {
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto'
      });

      if (!swapData.success) {
        throw new Error('创建交易失败');
      }

      // 执行 Swap
      const signature = await executeSwap(
        swapData.swapTransaction,
        { sendTransaction },
        connection
      );

      setTxHash(signature);

      // 刷新余额
      setTimeout(() => {
        fetchInputBalance();
        fetchOutputBalance();
      }, 2000);

      // 清空输入
      setInputAmount('');
      setOutputAmount('');
      setQuote(null);
    } catch (err) {
      console.error('Swap失败:', err);
      setError(err.message || 'Swap失败，请稍后重试');
    } finally {
      setSwapping(false);
    }
  };

  // 处理代币选择
  const handleSelectToken = (token, isInput) => {
    if (isInput) {
      setInputToken(token);
      setShowInputTokenSelector(false);
    } else {
      setOutputToken(token);
      setShowOutputTokenSelector(false);
    }
    setTokenSearchQuery('');
    setInputAmount('');
    setOutputAmount('');
    setQuote(null);
  };

  // 处理自定义代币地址
  const handleCustomToken = async (address, isInput) => {
    try {
      const token = await getTokenMetadata(address);
      handleSelectToken(token, isInput);
    } catch (err) {
      setError(err.message || '无效的代币地址');
    }
  };

  // 过滤代币列表
  const getFilteredTokens = () => {
    if (!tokenSearchQuery.trim()) {
      return popularTokens;
    }

    const query = tokenSearchQuery.trim().toUpperCase();
    
    // 先尝试按地址搜索
    const byAddress = searchTokenByAddress(query);
    if (byAddress) {
      return [byAddress];
    }

    // 按符号/名称搜索
    return searchTokenBySymbol(query);
  };

  // 代币选择器组件（内联定义）
  const renderTokenSelector = (isInput) => {
    const token = isInput ? inputToken : outputToken;
    const amount = isInput ? inputAmount : outputAmount;
    const balance = isInput ? inputBalance : outputBalance;
    const showSelector = isInput ? showInputTokenSelector : showOutputTokenSelector;

    return (
      <div className="space-y-1.5 shrink-0">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-slate-400 uppercase">
            {isInput ? 'From' : 'To'}
          </label>
          {isInput && connected && (
            <button
              onClick={setMaxInput}
              className="text-[9px] text-cyan-400 hover:text-cyan-300"
            >
              MAX
            </button>
          )}
        </div>

        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-2">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {!isInput ? (
                <div className="text-sm font-mono text-slate-300 truncate">
                  {amount || '0.00'}
                </div>
              ) : (
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent text-sm font-mono text-white focus:outline-none"
                  step="any"
                  min="0"
                />
              )}
            </div>
            <button
              onClick={() => {
                if (isInput) {
                  setShowInputTokenSelector(true);
                } else {
                  setShowOutputTokenSelector(true);
                }
              }}
              className="flex items-center space-x-1.5 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors shrink-0 ml-2"
            >
              {token ? (
                <>
                  <span className="text-xs font-mono text-white">{token.symbol}</span>
                  <ArrowUpDown size={12} className="text-slate-400" />
                </>
              ) : (
                <span className="text-xs text-slate-400">Select</span>
              )}
            </button>
          </div>

          {token && connected && (
            <div className="mt-1.5 text-[9px] text-slate-500">
              Balance: {balance.toFixed(4)} {token.symbol}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 代币选择器弹窗
  const renderTokenSelectorModal = (isInput) => {
    const showSelector = isInput ? showInputTokenSelector : showOutputTokenSelector;
    if (!showSelector) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Select Token</h3>
            <button
              onClick={() => {
                if (isInput) {
                  setShowInputTokenSelector(false);
                } else {
                  setShowOutputTokenSelector(false);
                }
                setTokenSearchQuery('');
              }}
              className="text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={tokenSearchQuery}
              onChange={(e) => setTokenSearchQuery(e.target.value)}
              placeholder="Search by name or address"
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            {getFilteredTokens().map((t) => (
              <button
                key={t.address}
                onClick={() => handleSelectToken(t, isInput)}
                className="w-full flex items-center space-x-3 p-3 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                  {t.logoURI ? (
                    <img src={t.logoURI} alt={t.symbol} className="w-8 h-8 rounded-full" />
                  ) : (
                    <span className="text-xs text-slate-400">{t.symbol[0]}</span>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-white">{t.symbol}</div>
                  <div className="text-xs text-slate-400">{t.name}</div>
                </div>
              </button>
            ))}

            {/* 自定义代币输入 */}
            {tokenSearchQuery && isValidTokenAddress(tokenSearchQuery) && (
              <button
                onClick={() => handleCustomToken(tokenSearchQuery, isInput)}
                className="w-full flex items-center space-x-3 p-3 hover:bg-slate-800 rounded-lg transition-colors border border-cyan-500/50"
              >
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <span className="text-xs text-cyan-400">?</span>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-cyan-400">Custom Token</div>
                  <div className="text-xs text-slate-400 font-mono">{tokenSearchQuery.slice(0, 20)}...</div>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col border-b border-slate-800" style={{ maxHeight: '50vh', minHeight: '300px' }}>
      <div className="h-10 border-b border-slate-800 flex items-center px-4 text-xs text-slate-400 uppercase tracking-wider bg-slate-900 shrink-0">
        <span>JUPITER SWAP</span>
      </div>

      <div className="flex-1 p-3 flex flex-col space-y-3 bg-slate-900/20 overflow-y-auto" style={{ minHeight: 0 }}>
        {!connected ? (
          <div className="w-full space-y-2 flex flex-col justify-center flex-1">
            <div className="text-center">
              <AlertCircle className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
              <p className="text-xs text-slate-400 mb-3">请先连接钱包</p>
            </div>
            <button
              onClick={() => setVisible(true)}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-lg transition-all shadow-lg flex items-center justify-center space-x-2 text-sm"
            >
              <Wallet size={14} />
              <span>连接钱包</span>
            </button>
          </div>
        ) : (
          <>
            {/* 输入代币 */}
            {renderTokenSelector(true)}
            {renderTokenSelectorModal(true)}

            {/* 交换按钮 */}
            <button
              onClick={swapTokens}
              className="w-full flex items-center justify-center p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors shrink-0"
              disabled={!inputToken || !outputToken}
            >
              <ArrowUpDown size={16} className="text-slate-400" />
            </button>

            {/* 输出代币 */}
            {renderTokenSelector(false)}
            {renderTokenSelectorModal(false)}

            {/* 报价信息 */}
            {quote && (
              <div className="w-full bg-slate-800/50 rounded-lg p-2 border border-slate-700 space-y-1 shrink-0">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Price Impact</span>
                  <span className={quote.priceImpact && quote.priceImpact > 1 ? 'text-red-500' : 'text-slate-300'}>
                    {quote.priceImpact ? quote.priceImpact.toFixed(2) : '0.00'}%
                  </span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Slippage</span>
                  <span className="text-slate-300">{(slippageBps / 100).toFixed(2)}%</span>
                </div>
              </div>
            )}

            {/* 错误提示 */}
            {error && (
              <div className="w-full bg-red-900/20 border border-red-700 rounded-lg p-2 shrink-0">
                <p className="text-[10px] text-red-400">{error}</p>
              </div>
            )}

            {/* 交易成功提示 */}
            {txHash && (
              <div className="w-full bg-green-900/20 border border-green-700 rounded-lg p-2 shrink-0">
                <div className="flex items-center space-x-2 mb-1">
                  <CheckCircle size={12} className="text-green-500" />
                  <span className="text-xs font-bold text-green-400">Swap成功！</span>
                </div>
                <a
                  href={`https://solscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] text-cyan-400 hover:underline flex items-center space-x-1"
                >
                  <span>查看交易</span>
                  <ExternalLink size={9} />
                </a>
              </div>
            )}

            {/* Swap按钮 */}
            <button
              onClick={handleSwap}
              disabled={!quote || swapping || loading || !inputAmount || parseFloat(inputAmount) <= 0}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-lg transition-all shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm shrink-0"
            >
              {swapping ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  <span>Swapping...</span>
                </>
              ) : loading ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  <span>Loading...</span>
                </>
              ) : (
                <span>Swap</span>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default JupiterSwapCard;

