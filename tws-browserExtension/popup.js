// TWS天眼助手 - 主脚本
// API基础URL（可以从环境变量或配置中获取）
const API_BASE_URL = 'https://tws-fronted.zeabur.app';

// 调试日志函数
function debugLog(location, message, data = {}) {
    const logData = {
        location: location,
        message: message,
        data: data,
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1'
    };
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3373e655-ca72-4f0e-922d-35dd4b0e3d4d', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(logData)
    }).catch(() => {});
    // #endregion
    console.log(`[TWS图表] ${message}`, data);
}

// 错误处理和重试机制
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // 创建超时控制器
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                return response;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries && error.name !== 'AbortError') {
                // 指数退避
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            } else {
                break;
            }
        }
    }
    throw lastError;
}

// 统一倒计时目标日期
const UNIFICATION_DATE = new Date('2027-12-31T23:59:59');

// 运势数据
const FORTUNE_DATA = {
    colors: {
        '红': { 
            icon: '🔴', 
            text: '大吉大利',
            emoji: '🎉',
            description: '今日运势极佳，适合重大决策'
        },
        '绿': { 
            icon: '🟢', 
            text: '平稳发展',
            emoji: '📈',
            description: '运势平稳，适合稳步推进'
        },
        '黑': { 
            icon: '⚫', 
            text: '谨慎行事',
            emoji: '⚠️',
            description: '需谨慎行事，避免重大决策'
        }
    },
    yi: [
        '囤积物资', '买入 TWS', '学习简体字', '关注统一进程', '参与社区讨论',
        '投资理财', '合作洽谈', '学习新技能', '制定计划', '锻炼身体',
        '阅读书籍', '整理资料', '联系亲友', '清理空间', '规划未来'
    ],
    ji: [
        '相信绿媒', '投资台股', '去总统府附近', '传播不实信息', '忽视统一趋势',
        '冲动消费', '过度冒险', '拖延决策', '与人争执', '熬夜工作',
        '忽视健康', '轻信谣言', '过度娱乐', '逃避责任', '消极怠工'
    ],
    luckyNumbers: [3, 7, 9, 12, 21, 28, 33, 42, 49, 56],
    luckyDirections: ['东方', '南方', '北方', '东南', '西北'],
    luckyTimes: ['辰时(7-9点)', '午时(11-13点)', '申时(15-17点)', '戌时(19-21点)']
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    initializeHomepage();
    initializePriceTab();
    initializeCommunityTab();
    initializeAnnouncementTab();
});
// 初始化函数
function initializeApp() {
    console.log('[TWS天眼助手] 开始初始化应用');
    try {
        initializeTabs();
        initializeHomepage();
        initializePriceTab();
        initializeCommunityTab();
        initializeAnnouncementTab();
        console.log('[TWS天眼助手] 应用初始化完成');
    } catch (error) {
        console.error('[TWS天眼助手] 初始化错误:', error);
    }
}

// 初始化 - 兼容DOM已加载完成的情况
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM已经加载完成，直接执行
    initializeApp();
}
// ==================== 选项卡切换逻辑 ====================
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // 移除所有活动状态
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 添加活动状态
            button.classList.add('active');
            const targetContent = document.getElementById(`tab-${targetTab}`);
            if (targetContent) {
                targetContent.classList.add('active');
                
                // 如果切换到币价选项卡，尝试重新绘制图表
                if (targetTab === 'price') {
                    // #region agent log
                    debugLog('popup.js:tab-switch', '切换到币价选项卡', {});
                    // #endregion
                    setTimeout(() => {
                        // 尝试从缓存获取数据并绘制
                        chrome.storage.local.get(['priceData'], (result) => {
                            if (result.priceData && result.priceData.klineData) {
                                drawPriceChart(result.priceData.klineData);
                            } else {
                                // 重新加载数据
                                loadPriceData();
                            }
                        });
                    }, 100);
                }
            }
        });
    });
}

// ==================== 首页选项卡 ====================
function initializeHomepage() {
    initializeCountdown();
    initializeFortune();
}

function initializeCountdown() {
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

function updateCountdown() {
    const now = new Date();
    const diff = UNIFICATION_DATE - now;
    
    if (diff <= 0) {
        const countdownEl = document.getElementById('countdown');
        if (countdownEl) {
            countdownEl.innerHTML = '<span style="color:#27ae60">已实现统一！</span>';
        }
        return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    
    if (daysEl) daysEl.textContent = days.toString().padStart(2, '0');
    if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
    if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
    if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
}

function initializeFortune() {
    const today = new Date().toDateString();
    const fortuneKey = today + '_fortune';
    
    chrome.storage.local.get([fortuneKey], (result) => {
        let fortune;
        
        if (result[fortuneKey]) {
            fortune = JSON.parse(result[fortuneKey]);
        } else {
            fortune = generateDailyFortune();
            chrome.storage.local.set({ [fortuneKey]: JSON.stringify(fortune) });
        }
        
        updateFortuneDisplay(fortune);
        
        // 通知background.js更新图标颜色
        chrome.runtime.sendMessage({
            action: 'updateIconColor',
            color: fortune.color
        });
    });
}

function generateDailyFortune() {
    const colors = ['红', '绿', '黑'];
    const today = new Date();
    const userSeed = localStorage.getItem('user_id') || Math.random().toString(36).substr(2, 9);
    localStorage.setItem('user_id', userSeed);
    
    const dailySeed = today.toDateString() + userSeed;
    let hash = 0;
    for (let i = 0; i < dailySeed.length; i++) {
        hash = ((hash << 5) - hash) + dailySeed.charCodeAt(i);
        hash = hash & hash;
    }
    
    Math.seedrandom(hash);
    
    const colorIndex = Math.abs(hash) % colors.length;
    const color = colors[colorIndex];
    
    const yiItems = [...FORTUNE_DATA.yi]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .join('、');
        
    const jiItems = [...FORTUNE_DATA.ji]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .join('、');
    
    const govFortune = Math.floor(Math.random() * 85) + 13;
    const luckyNumber = FORTUNE_DATA.luckyNumbers[Math.floor(Math.random() * FORTUNE_DATA.luckyNumbers.length)];
    const luckyDirection = FORTUNE_DATA.luckyDirections[Math.floor(Math.random() * FORTUNE_DATA.luckyDirections.length)];
    const luckyTime = FORTUNE_DATA.luckyTimes[Math.floor(Math.random() * FORTUNE_DATA.luckyTimes.length)];
    const fortuneScore = Math.floor(Math.random() * 100) + 1;
    
    return {
        color: color,
        yi: yiItems,
        ji: jiItems,
        govFortune: govFortune,
        luckyNumber: luckyNumber,
        luckyDirection: luckyDirection,
        luckyTime: luckyTime,
        fortuneScore: fortuneScore,
        generatedAt: today.getTime()
    };
}

function updateFortuneDisplay(fortune) {
    const fortuneIcon = document.getElementById('fortune-icon');
    const fortuneText = document.getElementById('fortune-text');
    const fortuneYi = document.getElementById('fortune-yi');
    const fortuneJi = document.getElementById('fortune-ji');
    const govElement = document.getElementById('gov-fortune');
    const fortuneHeader = document.querySelector('.fortune-header');
    const fortuneScoreEl = document.getElementById('fortune-score');
    const luckyInfoEl = document.getElementById('lucky-info');
    
    const colorData = FORTUNE_DATA.colors[fortune.color];
    
    if (fortuneIcon) fortuneIcon.textContent = colorData.emoji;
    if (fortuneText) fortuneText.textContent = colorData.text;
    if (fortuneYi) fortuneYi.textContent = fortune.yi;
    if (fortuneJi) fortuneJi.textContent = fortune.ji;
    if (govElement) {
        govElement.textContent = `${fortune.govFortune}%`;
        if (fortune.govFortune < 30) {
            govElement.style.color = '#e74c3c';
        } else if (fortune.govFortune < 60) {
            govElement.style.color = '#f39c12';
        } else {
            govElement.style.color = '#27ae60';
        }
    }
    
    if (fortuneHeader) {
        fortuneHeader.className = 'fortune-header fortune-' + (fortune.color === '红' ? 'red' : fortune.color === '绿' ? 'green' : 'black');
    }
    
    if (fortuneScoreEl) {
        fortuneScoreEl.textContent = `${fortune.fortuneScore}分`;
        fortuneScoreEl.className = 'fortune-score';
        if (fortune.fortuneScore >= 90) {
            fortuneScoreEl.classList.add('score-excellent');
        } else if (fortune.fortuneScore >= 70) {
            fortuneScoreEl.classList.add('score-good');
        } else if (fortune.fortuneScore >= 50) {
            fortuneScoreEl.classList.add('score-average');
        } else {
            fortuneScoreEl.classList.add('score-poor');
        }
    }
    
    if (luckyInfoEl) {
        luckyInfoEl.innerHTML = `
            <div class="lucky-item">
                <span class="lucky-label">幸运数字</span>
                <span class="lucky-value">${fortune.luckyNumber}</span>
            </div>
            <div class="lucky-item">
                <span class="lucky-label">吉利方位</span>
                <span class="lucky-value">${fortune.luckyDirection}</span>
            </div>
            <div class="lucky-item">
                <span class="lucky-label">吉时</span>
                <span class="lucky-value">${fortune.luckyTime}</span>
            </div>
        `;
    }
}

// ==================== 币价选项卡 ====================
function initializePriceTab() {
    loadPriceData();
    // 每30秒更新一次
    setInterval(loadPriceData, 30000);
}

async function loadPriceData() {
    try {
        // 先尝试从缓存获取
        chrome.storage.local.get(['priceData', 'lastPriceUpdate'], (result) => {
            const now = Date.now();
            const cacheAge = now - (result.lastPriceUpdate || 0);
            
            // 如果缓存少于30秒，使用缓存
            if (result.priceData && cacheAge < 30000) {
                updatePriceDisplay(result.priceData);
                // 如果有K线数据，绘制图表（延迟绘制）
                if (result.priceData.klineData && result.priceData.klineData.length > 0) {
                    // #region agent log
                    debugLog('popup.js:301', '从缓存加载图表数据', {
                        klineDataLength: result.priceData.klineData.length,
                        tabActive: document.getElementById('tab-price')?.classList.contains('active')
                    });
                    // #endregion
                    setTimeout(() => {
                        drawPriceChart(result.priceData.klineData);
                    }, 200);
                }
                return;
            }
            
            // 否则从API获取
            fetchPriceData();
        });
    } catch (error) {
        console.error('加载价格数据失败:', error);
        updatePriceDisplay({
            currentPrice: '--',
            priceChange: '--',
            volume24h: '--',
            holderCount: '--'
        });
    }
}

async function fetchPriceData() {
    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/api/homepage/market`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const priceData = {
                currentPrice: `$${result.data.currentPrice?.toFixed(2) || '0.00'}`,
                priceChange: `${result.data.priceChange24h >= 0 ? '+' : ''}${result.data.priceChange24h?.toFixed(2) || '0.00'}%`,
                volume24h: formatNumber(result.data.volume24h || 0),
                holderCount: formatNumber(result.data.holderCount || 0),
                klineData: result.data.klineData || [] // 添加K线数据
            };
            
            // 缓存数据
            chrome.storage.local.set({
                priceData: priceData,
                lastPriceUpdate: Date.now()
            });
            
            updatePriceDisplay(priceData);
            // 绘制图表（延迟绘制，确保DOM已渲染）
            if (priceData.klineData && priceData.klineData.length > 0) {
                // #region agent log
                debugLog('popup.js:343', '准备绘制图表', {
                    klineDataLength: priceData.klineData.length,
                    tabActive: document.getElementById('tab-price')?.classList.contains('active')
                });
                // #endregion
                setTimeout(() => {
                    drawPriceChart(priceData.klineData);
                }, 200);
            } else {
                // #region agent log
                debugLog('popup.js:343', 'K线数据为空，无法绘制', {
                    hasKlineData: !!priceData.klineData,
                    klineDataLength: priceData.klineData ? priceData.klineData.length : 0
                });
                // #endregion
            }
        } else {
            throw new Error('数据格式错误');
        }
    } catch (error) {
        console.error('获取价格数据失败:', error);
        // 尝试使用缓存数据
        chrome.storage.local.get(['priceData'], (result) => {
            if (result.priceData) {
                updatePriceDisplay(result.priceData);
                // 如果有K线数据，尝试绘制图表
                if (result.priceData.klineData && result.priceData.klineData.length > 0) {
                    setTimeout(() => {
                        drawPriceChart(result.priceData.klineData);
                    }, 200);
                }
            } else {
                // 使用模拟数据作为最后的后备
                const mockData = {
                    currentPrice: '$0.15',
                    priceChange: '+2.5%',
                    volume24h: '4,291,002,911',
                    holderCount: '12,458',
                    klineData: [] // 模拟数据没有K线
                };
                updatePriceDisplay(mockData);
            }
        });
    }
}

function updatePriceDisplay(data) {
    const currentPriceEl = document.getElementById('current-price');
    const priceChangeEl = document.getElementById('price-change');
    const volume24hEl = document.getElementById('volume-24h');
    const holderCountEl = document.getElementById('holder-count');
    
    if (currentPriceEl) currentPriceEl.textContent = data.currentPrice;
    if (volume24hEl) volume24hEl.textContent = data.volume24h;
    if (holderCountEl) holderCountEl.textContent = data.holderCount;
    
    if (priceChangeEl) {
        priceChangeEl.textContent = data.priceChange;
        priceChangeEl.className = 'value change';
        if (data.priceChange.includes('+')) {
            priceChangeEl.classList.add('positive');
        } else if (data.priceChange.includes('-')) {
            priceChangeEl.classList.add('negative');
        }
    }
    
    // 如果有K线数据，绘制图表
    if (data.klineData && data.klineData.length > 0) {
        drawPriceChart(data.klineData);
    }
}

function formatNumber(num) {
    if (typeof num === 'string') num = parseFloat(num);
    if (isNaN(num)) return '0';
    return num.toLocaleString('zh-CN');
}

// 格式化价格显示（用于图表）
function formatPrice(price) {
    if (price >= 1000000) {
        return (price / 1000000).toFixed(2) + 'M';
    } else if (price >= 1000) {
        return (price / 1000).toFixed(2) + 'K';
    }
    return price.toFixed(2);
}

// 绘制价格走势图（增强版，带调试和错误处理）
function drawPriceChart(klineData) {
    // #region agent log
    debugLog('popup.js:411', 'drawPriceChart开始', {
        klineDataLength: klineData ? klineData.length : 0,
        klineDataType: typeof klineData,
        isArray: Array.isArray(klineData)
    });
    // #endregion
    
    const canvas = document.getElementById('price-chart');
    if (!canvas) {
        console.error('[TWS图表] Canvas元素不存在');
        // #region agent log
        debugLog('popup.js:413', 'Canvas元素不存在', {});
        // #endregion
        return;
    }
    
    // #region agent log
    debugLog('popup.js:415', 'Canvas元素找到', {
        width: canvas.width,
        height: canvas.height,
        offsetWidth: canvas.offsetWidth,
        offsetHeight: canvas.offsetHeight,
        isVisible: canvas.offsetParent !== null,
        parentDisplay: window.getComputedStyle(canvas.parentElement).display
    });
    // #endregion
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('[TWS图表] 无法获取Canvas上下文');
        // #region agent log
        debugLog('popup.js:416', '无法获取Canvas上下文', {});
        // #endregion
        return;
    }
    
    // 检查canvas是否可见
    const tabPrice = document.getElementById('tab-price');
    const isTabActive = tabPrice && tabPrice.classList.contains('active');
    const isCanvasVisible = canvas.offsetParent !== null && 
                           window.getComputedStyle(canvas).display !== 'none';
    
    // #region agent log
    debugLog('popup.js:visibility-check', '可见性检查', {
        isTabActive: isTabActive,
        isCanvasVisible: isCanvasVisible,
        canvasDisplay: window.getComputedStyle(canvas).display,
        canvasVisibility: window.getComputedStyle(canvas).visibility,
        offsetParent: canvas.offsetParent !== null
    });
    // #endregion
    
    // 如果canvas在隐藏的tab中，需要等待显示后再绘制
    if (tabPrice && !isTabActive) {
        console.log('[TWS图表] 币价选项卡未激活，延迟绘制');
        // #region agent log
        debugLog('popup.js:425', '选项卡未激活，延迟绘制', {});
        // #endregion
        // 监听选项卡切换（只添加一次监听器）
        if (!window.priceChartDrawPending) {
            window.priceChartDrawPending = true;
            const tabBtn = document.querySelector('.tab-btn[data-tab="price"]');
            if (tabBtn) {
                const drawWhenVisible = () => {
                    if (tabPrice.classList.contains('active')) {
                        setTimeout(() => {
                            drawPriceChart(klineData);
                            window.priceChartDrawPending = false;
                        }, 150);
                        tabBtn.removeEventListener('click', drawWhenVisible);
                    }
                };
                tabBtn.addEventListener('click', drawWhenVisible, {once: true});
            }
        }
        return;
    }
    
    // 即使tab激活，也稍微延迟确保DOM完全渲染
    if (!isCanvasVisible) {
        console.log('[TWS图表] Canvas不可见，延迟绘制');
        setTimeout(() => drawPriceChart(klineData), 200);
        return;
    }
    
    const width = canvas.width || canvas.offsetWidth || 360;
    const height = canvas.height || canvas.offsetHeight || 150;
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // #region agent log
    debugLog('popup.js:425', '开始绘制', {
        width: width,
        height: height,
        chartWidth: chartWidth,
        chartHeight: chartHeight
    });
    // #endregion
    
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    if (!klineData || klineData.length === 0) {
        console.warn('[TWS图表] K线数据为空');
        // #region agent log
        debugLog('popup.js:425', 'K线数据为空', {});
        // #endregion
        
        // 绘制占位文本
        ctx.fillStyle = '#8b949e';
        ctx.font = '14px Share Tech Mono';
        ctx.textAlign = 'center';
        ctx.fillText('暂无价格数据', width / 2, height / 2);
        return;
    }
    
    // 提取收盘价数据（取最近30个点）
    const prices = klineData.slice(-30).map(k => {
        if (typeof k === 'object' && k !== null) {
            return parseFloat(k.close) || 0;
        }
        return 0;
    }).filter(p => p > 0);
    
    // #region agent log
    debugLog('popup.js:428', '价格数据提取', {
        originalLength: klineData.length,
        pricesLength: prices.length,
        samplePrices: prices.slice(0, 5),
        sampleKline: klineData.slice(0, 2)
    });
    // #endregion
    
    if (prices.length === 0) {
        console.warn('[TWS图表] 无法提取有效价格数据');
        // #region agent log
        debugLog('popup.js:432', '无法提取有效价格', {
            klineDataSample: klineData.slice(0, 3)
        });
        // #endregion
        
        // 绘制占位文本
        ctx.fillStyle = '#8b949e';
        ctx.font = '14px Share Tech Mono';
        ctx.textAlign = 'center';
        ctx.fillText('数据格式错误', width / 2, height / 2);
        return;
    }
    
    // 计算价格范围
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    
    // #region agent log
    debugLog('popup.js:434', '价格范围计算', {
        minPrice: minPrice,
        maxPrice: maxPrice,
        priceRange: priceRange,
        pricesCount: prices.length
    });
    // #endregion
    
    // 绘制背景网格
    ctx.strokeStyle = 'rgba(6,182,212,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    // 绘制价格折线
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    prices.forEach((price, index) => {
        const x = padding + (chartWidth / (prices.length - 1)) * index;
        const y = padding + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // 添加渐变填充
    if (prices.length > 1) {
        const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
        gradient.addColorStop(0, 'rgba(251,191,36,0.3)');
        gradient.addColorStop(1, 'rgba(251,191,36,0.0)');
        
        ctx.fillStyle = gradient;
        ctx.lineTo(width - padding, height - padding);
        ctx.lineTo(padding, height - padding);
        ctx.closePath();
        ctx.fill();
    }
    
    // 重新绘制折线（在填充之上）
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    prices.forEach((price, index) => {
        const x = padding + (chartWidth / (prices.length - 1)) * index;
        const y = padding + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    
    // 绘制数据点
    ctx.fillStyle = '#fbbf24';
    prices.forEach((price, index) => {
        const x = padding + (chartWidth / (prices.length - 1)) * index;
        const y = padding + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // 绘制价格标签（只显示首尾）
    ctx.fillStyle = '#06b6d4';
    ctx.font = '10px Share Tech Mono';
    ctx.textAlign = 'left';
    
    if (prices.length > 0) {
        const firstPrice = prices[0];
        const lastPrice = prices[prices.length - 1];
        const firstY = padding + chartHeight - ((firstPrice - minPrice) / priceRange) * chartHeight;
        const lastY = padding + chartHeight - ((lastPrice - minPrice) / priceRange) * chartHeight;
        
        ctx.fillText(`$${formatPrice(firstPrice)}`, padding, firstY - 5);
        ctx.textAlign = 'right';
        ctx.fillText(`$${formatPrice(lastPrice)}`, width - padding, lastY - 5);
    }
    
    // #region agent log
    debugLog('popup.js:522', '图表绘制完成', {
        pricesDrawn: prices.length,
        firstPrice: prices[0],
        lastPrice: prices[prices.length - 1]
    });
    // #endregion
    
    console.log('[TWS图表] 价格走势图绘制完成');
}

// ==================== 社区选项卡 ====================
function initializeCommunityTab() {
    // 添加TWS官网按钮事件
    const websiteBtn = document.getElementById('tws-website-btn');
    if (websiteBtn) {
        websiteBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: 'https://tws-fronted.zeabur.app/' });
        });
    }
    
    const communityLinks = {
        'facebook-btn': { url: 'https://www.facebook.com/groups/1365839505037775/', name: 'Facebook' },
        'discord-btn': { url: 'https://discord.gg/mrF59Qxu', name: 'Discord' },
        'twitter-btn': { url: 'https://x.com/TWSDAO', name: 'X' },
        'telegram-btn': { url: 'https://t.me/twstaiwan', name: 'Telegram' },
        'line-btn': { url: 'https://line.me/R/ti/g/twstaiwan', name: 'Line' }
    };

    Object.keys(communityLinks).forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                const { url, name } = communityLinks[btnId];
                chrome.tabs.create({ url });
                recordCommunityClick(name);
            });
        }
    });

    const wechatBtn = document.getElementById('wechat-btn');
    if (wechatBtn) {
        wechatBtn.addEventListener('click', () => {
            showWechatQRCode();
        });
    }

    updateCommunityStats();
}

function showWechatQRCode() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>加入微信社群</h3>
                <button class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <div class="qrcode-container">
                    <div class="qrcode-placeholder">
                        <span class="qrcode-icon">📱</span>
                        <p>微信二维码</p>
                        <p class="qrcode-tip">请截图保存后使用微信扫描</p>
                    </div>
                </div>
                <div class="wechat-info">
                    <p><strong>微信号：</strong>tws_taiwan</p>
                    <p><strong>添加备注：</strong>"TWS社区"</p>
                </div>
            </div>
        </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        }
        .modal-content {
            background: var(--panel-bg);
            border-radius: 10px;
            padding: 20px;
            max-width: 90%;
            width: min(360px, 90%);
            text-align: center;
            border: 1px solid rgba(6,182,212,0.2);
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            color: var(--gold);
        }
        .close-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--muted);
        }
        .qrcode-placeholder {
            background: rgba(255,255,255,0.05);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 15px;
        }
        .qrcode-icon {
            font-size: 48px;
            display: block;
            margin-bottom: 10px;
        }
        .qrcode-tip {
            font-size: 12px;
            color: var(--muted);
            margin-top: 5px;
        }
        .wechat-info {
            text-align: left;
            font-size: 14px;
            color: var(--muted);
        }
    `;
    document.head.appendChild(style);

    const closeBtn = modal.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
        document.head.removeChild(style);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
            document.head.removeChild(style);
        }
    });

    document.body.appendChild(modal);
    recordCommunityClick('WeChat');
}

function recordCommunityClick(platform) {
    chrome.storage.local.get(['communityStats'], (result) => {
        const stats = result.communityStats || {};
        stats[platform] = (stats[platform] || 0) + 1;
        stats.totalClicks = (stats.totalClicks || 0) + 1;
        chrome.storage.local.set({ communityStats: stats });
    });
}

function updateCommunityStats() {
    const baseTotal = 15000;
    const baseOnline = 1200;
    const total = baseTotal + Math.floor(Math.random() * 500);
    const online = baseOnline + Math.floor(Math.random() * 100);
    
    const totalElement = document.getElementById('community-total');
    const onlineElement = document.getElementById('community-online');
    
    if (totalElement) totalElement.textContent = total.toLocaleString() + '+';
    if (onlineElement) onlineElement.textContent = online.toLocaleString() + '+';
}

// ==================== 公告选项卡 ====================
function initializeAnnouncementTab() {
    loadAnnouncements();
}

async function loadAnnouncements() {
    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/api/homepage/omega`);
        const result = await response.json();
        
        if (result.success && result.data && result.data.events) {
            const events = result.data.events.slice(-5).reverse();
            if (events.length > 0) {
                displayAnnouncements(events);
                return;
            }
        }
    } catch (error) {
        console.error('获取公告失败:', error);
    }
    
    // 使用默认公告
    const defaultAnnouncements = [
        "🎉 TWS 交易大赛即将开始，丰厚奖励等你来拿！",
        "📢 新版钱包功能已上线，支持更多数字货币",
        "🔔 社区活动：邀请好友得TWS，最高奖励1000TWS",
        "🌟 价格锚定功能已优化，支持更多电商平台",
        "💡 新手教程更新，快速了解TWS生态"
    ];
    
    displayAnnouncements(defaultAnnouncements);
}

function displayAnnouncements(announcements) {
    const announcementList = document.getElementById('announcement-list');
    if (!announcementList) return;
    
    if (announcements.length === 0) {
        announcementList.innerHTML = '<div class="announcement-item">暂无公告</div>';
        return;
    }
    
    announcementList.innerHTML = announcements.map(announcement => {
        const text = typeof announcement === 'string' ? announcement : announcement.text || announcement;
        return `<div class="announcement-item">${text}</div>`;
    }).join('');
}
