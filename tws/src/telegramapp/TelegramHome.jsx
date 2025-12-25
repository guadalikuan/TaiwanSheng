import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import WebApp from "@twa-dev/sdk";

// 格式化数字补零
const formatSegment = (value, length) => String(value).padStart(length, "0");

const TelegramHome = () => {
    const navigate = useNavigate();
    const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
    const [inviteCount, setInviteCount] = useState(0);
    const [loading, setLoading] = useState(false);

    // 本地资产（Telegram中sessionStorage仍生效）
    const [balance, setBalance] = useState(() => {
        const saved = sessionStorage.getItem("session_balance");
        return saved ? parseFloat(saved) : 1000.0;
    });
    const [twsBalance, setTwsBalance] = useState(() => {
        const saved = sessionStorage.getItem("session_tws_balance");
        return saved ? parseFloat(saved) : 0.0;
    });

    const targetRef = useRef(new Date("2027-12-31T00:00:00.000Z").getTime());

    // 适配Telegram环境的初始化（普通浏览器无操作）
    useEffect(() => {
        // Telegram环境初始化（普通浏览器跳过）
        if (window.Telegram?.WebApp) {
            WebApp.ready();
            WebApp.expand();
            WebApp.headerColor = "#000000";
            WebApp.backgroundColor = "#0a0a0a";
            WebApp.onEvent("backButtonClicked", () => navigate("/tg"));
        }

        // 倒计时逻辑（双环境通用）
        const calculateTime = () => {
            const now = Date.now();
            const distance = Math.max(targetRef.current - now, 0);
            setTimeLeft({
                d: Math.floor(distance / (1000 * 60 * 60 * 24)),
                h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
                s: Math.floor((distance % (1000 * 60)) / 1000),
            });
        };
        calculateTime();
        const interval = setInterval(calculateTime, 1000);

        // 本地读取邀请数（双环境通用）
        const fetchUserData = () => {
            const count = localStorage.getItem("invite_count") || 0;
            setInviteCount(parseInt(count));
        };
        fetchUserData();

        return () => {
            clearInterval(interval);
            if (window.Telegram?.WebApp) WebApp.offEvent("backButtonClicked");
        };
    }, [navigate]);

    // 统一提示框（Telegram原生/普通浏览器alert降级）
    const showNotice = (msg) => {
        // 1. 先判断是否是Telegram环境
        if (window.Telegram?.WebApp) {
            try {
                // 2. 尝试获取Telegram版本，低版本直接用alert
                const version = WebApp.version || "6.0";
                const [major] = version.split(".").map(Number);
                // 版本>6才用原生showAlert，否则降级为alert
                if (major > 6) {
                    WebApp.showAlert(msg);
                } else {
                    alert(msg);
                }
            } catch (err) {
                // 3. 即使版本判断失败，也兜底用alert
                alert(msg);
            }
        } else {
            // 非Telegram环境直接用alert
            alert(msg);
        }
    };

    // 裂变邀请（Telegram原生分享 + 普通浏览器复制链接降级）
    const handleReferral = async () => {
        // 通用邀请链接（区分环境）
        const userId =
            window.Telegram?.WebApp?.initDataUnsafe?.user?.id || "AGENT_LOCAL";
        const inviteLink = `https://t.me/TWS_Official_Bot?start=ref_${userId}`;

        // Telegram环境：尝试调用原生API（加try/catch+版本判断）
        if (window.Telegram?.WebApp) {
            try {
                const version = WebApp.version || "6.0";
                const [major] = version.split(".").map(Number);
                // 仅版本>6时，才调用高版本支持的API
                if (major > 6) {
                    WebApp.HapticFeedback?.impactOccurred("medium"); // 加?避免属性不存在
                    WebApp.showShareMessage?.(
                        // 加?避免函数不存在
                        "加入特工节点，一起获取$TWS空投！",
                        inviteLink
                    );
                } else {
                    // 低版本Telegram：降级为复制链接+alert
                    await navigator.clipboard.writeText(inviteLink);
                    showNotice(`链接已复制（Telegram低版本）：\n${inviteLink}`);
                }
            } catch (err) {
                // 任何Telegram API调用失败，都兜底执行普通逻辑
                await navigator.clipboard.writeText(inviteLink);
                showNotice(`链接已复制（兜底）：\n${inviteLink}`);
            }
        } else {
            // 非Telegram环境：复制链接+提示（无return，执行降级逻辑）
            try {
                await navigator.clipboard.writeText(inviteLink);
                showNotice(`链接已复制（本地模式）：\n${inviteLink}`);
            } catch (err) {
                // 剪贴板权限不足时的兜底提示
                showNotice(`邀请链接（本地模式）：\n${inviteLink}`);
            }
        }

        // 双环境通用：更新邀请数（核心逻辑不阻断）
        const newCount = inviteCount + 1;
        setInviteCount(newCount);
        localStorage.setItem("invite_count", newCount.toString());
    };

    // 空投领取（Telegram震动反馈 + 普通浏览器仅提示）
    const claimAirdrop = async () => {
        const hasClaimed = localStorage.getItem("airdrop_claimed");
        if (hasClaimed) {
            showNotice("⚠ 您已领取过空投，每位用户仅限一次！");
            return;
        }

        try {
            setLoading(true);
            await new Promise((resolve) => setTimeout(resolve, 800));

            const reward = 1000;
            const newTws = twsBalance + reward;
            setTwsBalance(newTws);
            sessionStorage.setItem("session_tws_balance", newTws.toString());
            localStorage.setItem("airdrop_claimed", "true");

            // Telegram环境：震动反馈（普通浏览器跳过）
            if (window.Telegram?.WebApp) {
                WebApp.HapticFeedback.notificationOccurred("success");
            }
            showNotice(
                `【协议注入成功】\n${reward.toLocaleString()} $TWS 已注入您的账户！`
            );
        } catch (err) {
            console.error("领取空投失败:", err);
            showNotice("⚠ 网络异常，领取空投失败！");
        } finally {
            setLoading(false);
        }
    };

    return (
        // 移除手机框后的根容器：全屏适配，去掉固定尺寸和居中限制
        <div className="min-h-screen bg-[#0a0a0a] font-mono select-none overflow-hidden text-red-600 p-6">
            {/* 核心内容区：全屏展示，去掉手机模拟层 */}
            <div className="relative w-full h-full flex flex-col items-center">
                {/* 扫描线特效（保留） */}
                <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-20">
                    <div className="w-full h-[3px] bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)]"></div>
                </div>

                {/* 加载遮罩（保留） */}
                {loading && (
                    <div className="absolute inset-0 z-70 bg-black/80 flex items-center justify-center">
                        <div className="w-12 h-12 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                <div className="relative z-10 w-full border border-red-900/30 bg-red-900/10 p-2 text-[10px] text-center mb-8 mt-10">
                    <span className="animate-pulse tracking-[0.2em]">
                        ⚠ NODE_CONNECTED:{" "}
                        {window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name ||
                            "ENCRYPTED_TUNNEL"}
                    </span>
                </div>

                {/* 倒计时（保留） */}
                <div className="relative z-10 flex flex-col items-center justify-center w-full py-10 border border-red-500/20 bg-zinc-950/40 rounded-sm shadow-[0_0_50px_rgba(220,38,38,0.1)] backdrop-blur-md">
                    <h2 className="text-zinc-600 text-[10px] tracking-[0.5em] mb-8 font-black">
                        ETU_COUNTDOWN
                    </h2>
                    <div className="text-4xl font-bold tracking-tighter tabular-nums flex items-baseline">
                        <div className="flex flex-col items-center">
                            <span>{formatSegment(timeLeft.d, 3)}</span>
                            <span className="text-[8px] text-zinc-700 mt-1">DAYS</span>
                        </div>
                        <span className="mx-1 text-red-950 animate-pulse text-2xl">
                            :
                        </span>
                        <div className="flex flex-col items-center">
                            <span>{formatSegment(timeLeft.h, 2)}</span>
                            <span className="text-[8px] text-zinc-700 mt-1">HRS</span>
                        </div>
                        <span className="mx-1 text-red-950 animate-pulse text-2xl">
                            :
                        </span>
                        <div className="flex flex-col items-center">
                            <span>{formatSegment(timeLeft.m, 2)}</span>
                            <span className="text-[8px] text-zinc-700 mt-1">MINS</span>
                        </div>
                        <span className="mx-1 text-red-950 animate-pulse text-2xl">
                            :
                        </span>
                        <div className="flex flex-col items-center text-red-500">
                            <span>{formatSegment(timeLeft.s, 2)}</span>
                            <span className="text-[8px] text-zinc-700 mt-1">SECS</span>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 w-full text-center text-[9px] text-zinc-600 mt-6 mb-4">
                    <span className="tracking-[0.3em]">
                        已招募特工：{inviteCount} 人
                    </span>
                </div>

                {/* 按钮组（保留） */}
                <div className="relative z-10 w-full space-y-4 mt-4 mb-10">
                    <button
                        onClick={() => navigate("/tg-market")}
                        disabled={loading}
                        className="w-full py-4 border border-red-600 bg-red-600/5 text-xs font-bold tracking-[0.5em] active:bg-red-600/20 transition-all rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        进入黑市 / BUY TOKEN
                    </button>
                    <button
                        onClick={handleReferral}
                        disabled={loading}
                        className="w-full py-4 border border-zinc-800 text-zinc-600 text-xs font-bold tracking-[0.5em] hover:text-red-500 transition-all rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        招募特工 / REFERRAL
                    </button>
                    <button
                        onClick={claimAirdrop}
                        disabled={loading}
                        className="w-full py-4 bg-zinc-900 border border-red-900/50 text-red-600 font-black text-xs tracking-[0.4em] hover:bg-red-600 hover:text-black transition-all rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        领取空投 / CLAIM AIRDROP
                    </button>
                </div>

                <div className="mt-auto mb-4 text-[8px] text-zinc-800 tracking-[0.5em] flex flex-col items-center space-y-1">
                    <span>TWS_PROTOCOL // SECURED_NODE_V2</span>
                    <div className="flex space-x-4">
                        <span className="text-red-900/80">
                            CREDITS: {balance.toFixed(2)} USDT
                        </span>
                        <span className="text-red-600 font-bold">
                            ASSETS: {twsBalance.toLocaleString()} $TWS
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TelegramHome;