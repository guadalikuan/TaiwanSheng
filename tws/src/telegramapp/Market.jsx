import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { TonConnectButton } from '@tonconnect/ui-react';

const Market = () => {
    const navigate = useNavigate();
    const [amount, setAmount] = useState('');
    const [showDeposit, setShowDeposit] = useState(false);
    const [loading, setLoading] = useState(false); 

    // 本地资产（双环境通用）
    const [localBalance, setLocalBalance] = useState(() => {
        const saved = sessionStorage.getItem('session_balance');
        return saved ? parseFloat(saved) : 1000.00;
    });
    const [twsBalance, setTwsBalance] = useState(() => {
        const saved = sessionStorage.getItem('session_tws_balance');
        return saved ? parseFloat(saved) : 0.00;
    });

    // 统一提示框（Telegram原生/普通浏览器alert降级）
    const showNotice = (msg) => {
        if (window.Telegram?.WebApp) {
            try {
                const version = WebApp.version || "6.0";
                const [major] = version.split('.').map(Number);
                if (major > 6) {
                    WebApp.showAlert(msg);
                } else {
                    alert(msg);
                }
            } catch (err) {
                alert(msg);
            }
        } else {
            alert(msg);
        }
    };

    // Telegram环境初始化（普通浏览器无操作）
    useEffect(() => {
        if (window.Telegram?.WebApp) {
            WebApp.ready();
            WebApp.expand();
            // 版本判断，仅高版本设置颜色（避免6.0版本提示）
            const version = WebApp.version || "6.0";
            const [major] = version.split('.').map(Number);
            if (major > 6) {
                WebApp.headerColor = '#000000';
                WebApp.backgroundColor = '#0a0a0a';
            }
            WebApp.onEvent('backButtonClicked', () => navigate('/tg'));
        }
    }, [navigate]);

    // 买币逻辑（Telegram原生交互 + 普通浏览器降级）
    const handleBuy = async () => {
        const buyNum = parseFloat(amount);
        // 基础校验（双环境通用）
        if (!buyNum || buyNum <= 0 || isNaN(buyNum)) {
            // Telegram环境：震动反馈（低版本跳过）
            if (window.Telegram?.WebApp) {
                try {
                    const version = WebApp.version || "6.0";
                    const [major] = version.split('.').map(Number);
                    if (major > 6) {
                        WebApp.HapticFeedback?.notificationOccurred('error');
                    }
                } catch (err) {}
            }
            showNotice("错误：请输入有效的购买数量！");
            return;
        }

        const cost = buyNum * 0.5;
        // 余额不足判断（Telegram原生confirm + 普通confirm兜底）
        if (cost > localBalance) {
            // Telegram环境：震动反馈（低版本跳过）
            if (window.Telegram?.WebApp) {
                try {
                    const version = WebApp.version || "6.0";
                    const [major] = version.split('.').map(Number);
                    if (major > 6) {
                        WebApp.HapticFeedback?.notificationOccurred('warning');
                    }
                } catch (err) {}
            }

            // 核心：Telegram confirm 降级为普通confirm
            let confirmDeposit = false;
            if (window.Telegram?.WebApp) {
                try {
                    const version = WebApp.version || "6.0";
                    const [major] = version.split('.').map(Number);
                    // 高版本用原生confirm，低版本/报错用普通confirm
                    if (major > 6) {
                        confirmDeposit = await WebApp.showConfirm(
                            "⚠ USDT余额不足！\n是否前往充值界面补充余额？"
                        );
                    } else {
                        confirmDeposit = confirm("⚠ USDT余额不足！\n是否前往充值界面补充余额？");
                    }
                } catch (err) {
                    // 调用失败兜底
                    confirmDeposit = confirm("⚠ USDT余额不足！\n是否前往充值界面补充余额？");
                }
            } else {
                // 非Telegram环境直接用普通confirm
                confirmDeposit = confirm("⚠ USDT余额不足！\n是否前往充值界面补充余额？");
            }
            if (confirmDeposit) setShowDeposit(true);
            return;
        }

        // 交易确认（Telegram confirm + 普通confirm兜底）
        const confirmMsg = `【确认交易】\n您将花费 ${cost.toFixed(2)} USDT 采购 ${buyNum.toFixed(2)} 枚 TWS？`;
        let confirmed = false;
        if (window.Telegram?.WebApp) {
            try {
                const version = WebApp.version || "6.0";
                const [major] = version.split('.').map(Number);
                if (major > 6) {
                    confirmed = await WebApp.showConfirm(confirmMsg);
                } else {
                    confirmed = confirm(confirmMsg);
                }
            } catch (err) {
                confirmed = confirm(confirmMsg);
            }
        } else {
            confirmed = confirm(confirmMsg);
        }

        if (!confirmed) return;

        // 买币核心逻辑（双环境通用）
        try {
            setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 800));
            
            const newUsdt = localBalance - cost;
            const newTws = twsBalance + buyNum;
            setLocalBalance(newUsdt);
            setTwsBalance(newTws);
            sessionStorage.setItem('session_balance', newUsdt.toString());
            sessionStorage.setItem('session_tws_balance', newTws.toString());
            setAmount('');

            // 交易成功震动反馈（低版本跳过）
            if (window.Telegram?.WebApp) {
                try {
                    const version = WebApp.version || "6.0";
                    const [major] = version.split('.').map(Number);
                    if (major > 6) {
                        WebApp.HapticFeedback?.notificationOccurred('success');
                    }
                } catch (err) {}
            }
            showNotice(`【交易成功】\n已购买 ${buyNum.toFixed(2)} 枚 TWS。\n剩余 USDT：${newUsdt.toFixed(2)}`);
        } catch (err) {
            console.error('买币失败:', err);
            showNotice("⚠ 网络异常，交易请求失败！");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center py-10 px-4 font-mono select-none overflow-hidden text-red-600">
            <div className="relative w-[390px] h-[844px] bg-black rounded-[55px] border-[12px] border-[#1a1a1a] shadow-[0_0_100px_rgba(220,38,38,0.15)] flex flex-col overflow-hidden">
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-8 bg-[#1a1a1a] rounded-3xl z-[60]"></div>
                
                {/* 加载遮罩（双环境通用） */}
                {loading && (
                    <div className="absolute inset-0 z-80 bg-black/80 flex items-center justify-center">
                        <div className="w-12 h-12 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto relative p-8 mt-10">
                    <div className="flex items-center justify-between mb-10 border-b border-red-900/20 pb-4 relative z-10">
                        <button 
                            onClick={() => navigate('/tg')} 
                            disabled={loading}
                            className="text-red-600 text-[10px] tracking-tighter hover:text-red-400 disabled:opacity-50 cursor-pointer"
                        >
                            &lt;&lt; RETURN_MAIN
                        </button>
                        <span className="text-[10px] tracking-[0.3em] text-zinc-600">MARKET_TERM_09</span>
                    </div>

                    {/* 资产展示（双环境通用） */}
                    <div className="bg-gradient-to-br from-red-950/20 to-black border border-red-900/30 p-6 mb-10 relative z-10 shadow-2xl">
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-[9px] text-zinc-500 mb-1 tracking-[0.4em]">USDT CREDITS</div>
                                <div className="text-3xl font-bold tracking-tighter text-red-900/70">{localBalance.toFixed(2)}</div>
                            </div>
                            <div className="text-right border-l border-red-900/30 pl-4">
                                <div className="text-[9px] text-zinc-500 mb-1 tracking-[0.4em]">OWNED $TWS</div>
                                <div className="text-2xl font-black tracking-tighter text-red-600">{twsBalance.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    {/* 购买表单（双环境通用） */}
                    <div className="space-y-10 relative z-10">
                        <div className="border-b border-zinc-900 focus-within:border-red-600 transition-all">
                            <label 
                                htmlFor="purchase-amount" 
                                className="text-[9px] text-zinc-600 block mb-2 tracking-[0.4em] uppercase"
                            >
                                Set Purchase Amount
                            </label>
                            <input 
                                id="purchase-amount"
                                name="purchase-amount"
                                type="number" 
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)} 
                                placeholder="0.00" 
                                disabled={loading}
                                className="w-full bg-transparent py-4 outline-none text-4xl text-red-500 font-light placeholder:text-red-950/30 disabled:opacity-50"
                                step="0.01"
                                min="0.01"
                            />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-zinc-600 py-2 border-y border-white/5">
                            <span className="tracking-[0.2em]">EXCHANGE RATE</span>
                            <span className="text-red-900 font-bold">1 $TWS = 0.50 USDT</span>
                        </div>
                        <button 
                            onClick={handleBuy} 
                            disabled={loading}
                            className="w-full py-5 bg-red-600 text-black font-black text-sm tracking-[0.5em] active:scale-95 transition-all shadow-[0_0_30px_rgba(220,38,38,0.2)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            CONFIRM PURCHASE
                        </button>
                    </div>

                    {/* 充值弹窗（Telegram显示TON钱包 + 普通浏览器降级） */}
                    {showDeposit && (
                        <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-md p-8 flex flex-col items-center justify-center">
                            <h3 className="text-red-600 text-lg font-black mb-3">CREDITS INSUFFICIENT</h3>
                            <p className="text-zinc-500 text-[10px] mb-8 text-center leading-5">
                                您的USDT余额不足以完成本次交易<br/>
                                请通过TON钱包充值后重试
                            </p>
                            {/* Telegram环境显示TON钱包，普通浏览器显示提示按钮 */}
                            <div className="p-4 bg-white/5 border border-white/10 rounded-xl mb-8 scale-110">
                                {window.Telegram?.WebApp ? (
                                    <TonConnectButton />
                                ) : (
                                    <button 
                                        className="px-6 py-3 border border-red-600 text-red-600 text-sm cursor-pointer"
                                        onClick={() => showNotice("TON钱包仅支持Telegram环境使用")}
                                    >
                                        连接TON钱包（仅Telegram）
                                    </button>
                                )}
                            </div>
                            <button 
                                onClick={() => {
                                    // Telegram环境打开充值Bot，普通浏览器直接关闭弹窗
                                    if (window.Telegram?.WebApp) {
                                        WebApp.openTelegramLink("https://t.me/TWS_Recharge_Bot");
                                    }
                                    setShowDeposit(false);
                                }}
                                className="w-full py-3 border border-red-600 text-red-600 text-[10px] tracking-widest hover:bg-red-600 hover:text-black transition-all mb-4 cursor-pointer"
                            >
                                RECHARGE VIA BOT
                            </button>
                            <button 
                                onClick={() => setShowDeposit(false)} 
                                disabled={loading}
                                className="w-full py-3 border border-zinc-800 text-zinc-600 text-[10px] tracking-widest hover:text-red-500 transition-all cursor-pointer"
                            >
                                CLOSE OVERLAY
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Market;