// 统一倒计时目标日期（示例日期，可根据需要调整）
const UNIFICATION_DATE = new Date('2027-12-31T23:59:59');

// 运势数据（增强版）
const FORTUNE_DATA = {
    colors: {
        '红': { 
            icon: '🔴', 
            text: '大吉大利',
            bgColor: '#ff6b6b',
            textColor: '#fff',
            emoji: '🎉',
            description: '今日运势极佳，适合重大决策'
        },
        '绿': { 
            icon: '🟢', 
            text: '平稳发展',
            bgColor: '#27ae60',
            textColor: '#fff',
            emoji: '📈',
            description: '运势平稳，适合稳步推进'
        },
        '黑': { 
            icon: '⚫', 
            text: '谨慎行事',
            bgColor: '#2d3436',
            textColor: '#fff',
            emoji: '⚠️',
            description: '需谨慎行事，避免重大决策'
        },
        '金': { 
            icon: '�', 
            text: '财运亨通',
            bgColor: '#fdcb6e',
            textColor: '#2d3436',
            emoji: '💰',
            description: '财运极佳，适合投资理财'
        },
        '紫': { 
            icon: '🟣', 
            text: '贵人相助',
            bgColor: '#6c5ce7',
            textColor: '#fff',
            emoji: '🤝',
            description: '贵人运强，适合合作洽谈'
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

// 初始化函数
document.addEventListener('DOMContentLoaded', function() {
    initializeCountdown();
    initializeFortune();
    initializePriceData();
    initializeCommunityLinks();
    initializeAnnouncement();
});

// 初始化倒计时
function initializeCountdown() {
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

function updateCountdown() {
    const now = new Date();
    const diff = UNIFICATION_DATE - now;
    
    if (diff <= 0) {
        document.getElementById('countdown').innerHTML = '<span style="color:#27ae60">已实现统一！</span>';
        return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    document.getElementById('days').textContent = days.toString().padStart(2, '0');
    document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
    document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
    document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
}

// 初始化今日运势
function initializeFortune() {
    const today = new Date().toDateString();
    const fortuneKey = today + '_fortune';
    
    // 从本地存储获取或生成今日运势
    let fortune = localStorage.getItem(fortuneKey);
    
    if (!fortune) {
        fortune = generateDailyFortune();
        localStorage.setItem(fortuneKey, JSON.stringify(fortune));
    } else {
        fortune = JSON.parse(fortune);
    }
    
    updateFortuneDisplay(fortune);
}

function generateDailyFortune() {
    const colors = Object.keys(FORTUNE_DATA.colors);
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    // 基于用户ID生成个性化运势（确保每日相同）
    const today = new Date();
    const userSeed = localStorage.getItem('user_id') || Math.random().toString(36).substr(2, 9);
    localStorage.setItem('user_id', userSeed);
    
    const dailySeed = today.toDateString() + userSeed;
    let hash = 0;
    for (let i = 0; i < dailySeed.length; i++) {
        hash = ((hash << 5) - hash) + dailySeed.charCodeAt(i);
        hash = hash & hash; // Convert to 32bit integer
    }
    
    // 使用哈希值确保每日运势一致
    Math.seedrandom(hash);
    
    // 随机选择宜忌事项（各3条）
    const yiItems = [...FORTUNE_DATA.yi]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .join('、');
        
    const jiItems = [...FORTUNE_DATA.ji]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .join('、');
    
    // 随机生成当局气数（13%-97%之间）
    const govFortune = Math.floor(Math.random() * 85) + 13;
    
    // 生成幸运数字、方位、时辰
    const luckyNumber = FORTUNE_DATA.luckyNumbers[Math.floor(Math.random() * FORTUNE_DATA.luckyNumbers.length)];
    const luckyDirection = FORTUNE_DATA.luckyDirections[Math.floor(Math.random() * FORTUNE_DATA.luckyDirections.length)];
    const luckyTime = FORTUNE_DATA.luckyTimes[Math.floor(Math.random() * FORTUNE_DATA.luckyTimes.length)];
    
    // 生成运势评分（1-100）
    const fortuneScore = Math.floor(Math.random() * 100) + 1;
    
    // 生成运势描述
    const fortuneDescription = getFortuneDescription(fortuneScore);
    
    return {
        color: randomColor,
        yi: yiItems,
        ji: jiItems,
        govFortune: govFortune,
        luckyNumber: luckyNumber,
        luckyDirection: luckyDirection,
        luckyTime: luckyTime,
        fortuneScore: fortuneScore,
        fortuneDescription: fortuneDescription,
        generatedAt: today.getTime()
    };
}

function getFortuneDescription(score) {
    if (score >= 90) return '运势极佳，万事顺利';
    if (score >= 70) return '运势良好，把握机会';
    if (score >= 50) return '运势平稳，稳扎稳打';
    if (score >= 30) return '运势一般，谨慎行事';
    return '运势低迷，韬光养晦';
}

function updateFortuneDisplay(fortune) {
    const fortuneIcon = document.getElementById('fortune-icon');
    const fortuneText = document.getElementById('fortune-text');
    const fortuneYi = document.getElementById('fortune-yi');
    const fortuneJi = document.getElementById('fortune-ji');
    const govElement = document.getElementById('gov-fortune');
    const fortuneHeader = document.querySelector('.fortune-header');
    
    // 设置运势图标和文本
    if (fortuneIcon) fortuneIcon.textContent = FORTUNE_DATA.colors[fortune.color].emoji;
    if (fortuneText) fortuneText.textContent = FORTUNE_DATA.colors[fortune.color].text;
    if (fortuneYi) fortuneYi.textContent = fortune.yi;
    if (fortuneJi) fortuneJi.textContent = fortune.ji;
    if (govElement) govElement.textContent = `${fortune.govFortune}%`;
    
    // 设置运势区块颜色主题
    if (fortuneHeader) {
        fortuneHeader.className = 'fortune-header fortune-' + fortune.color;
    }
    
    // 设置当局气数颜色
    if (fortune.govFortune < 30) {
        govElement.style.color = '#e74c3c';
        govElement.style.fontWeight = 'bold';
    } else if (fortune.govFortune < 60) {
        govElement.style.color = '#f39c12';
        govElement.style.fontWeight = 'bold';
    } else {
        govElement.style.color = '#27ae60';
        govElement.style.fontWeight = 'bold';
    }
    
    // 添加运势评分显示
    const fortuneScoreElement = document.getElementById('fortune-score');
    if (fortuneScoreElement) {
        fortuneScoreElement.textContent = `${fortune.fortuneScore}分`;
        fortuneScoreElement.title = fortune.fortuneDescription;
        
        // 设置评分颜色类
        fortuneScoreElement.className = 'fortune-score';
        if (fortune.fortuneScore >= 90) {
            fortuneScoreElement.classList.add('score-excellent');
        } else if (fortune.fortuneScore >= 70) {
            fortuneScoreElement.classList.add('score-good');
        } else if (fortune.fortuneScore >= 50) {
            fortuneScoreElement.classList.add('score-average');
        } else if (fortune.fortuneScore >= 30) {
            fortuneScoreElement.classList.add('score-poor');
        } else {
            fortuneScoreElement.classList.add('score-poor');
        }
    }
    
    // 添加幸运信息显示
    const luckyInfoElement = document.getElementById('lucky-info');
    if (luckyInfoElement) {
        luckyInfoElement.innerHTML = `
            <div class="lucky-item">
                <span class="lucky-label">幸运数字：</span>
                <span class="lucky-value">${fortune.luckyNumber}</span>
            </div>
            <div class="lucky-item">
                <span class="lucky-label">吉利方位：</span>
                <span class="lucky-value">${fortune.luckyDirection}</span>
            </div>
            <div class="lucky-item">
                <span class="lucky-label">吉时：</span>
                <span class="lucky-value">${fortune.luckyTime}</span>
            </div>
        `;
    }
    
    // 添加运势动画效果
    animateFortuneDisplay(fortune);
}

function animateFortuneDisplay(fortune) {
    const fortuneIcon = document.getElementById('fortune-icon');
    if (fortuneIcon) {
        fortuneIcon.style.animation = 'fortunePulse 2s ease-in-out';
        setTimeout(() => {
            fortuneIcon.style.animation = '';
        }, 2000);
    }
    
    // 添加运势描述提示
    const colorData = FORTUNE_DATA.colors[fortune.color];
    showStatusMessage(`今日运势：${colorData.text} - ${colorData.description}`, 'info');
}

// 初始化价格数据
async function initializePriceData() {
    try {
        // 模拟API调用获取价格数据
        const priceData = await fetchPriceData();
        updatePriceDisplay(priceData);
    } catch (error) {
        console.error('获取价格数据失败:', error);
        updatePriceDisplay({
            currentPrice: '--',
            priceChange: '--',
            holderCount: '--'
        });
    }
}

async function fetchPriceData() {
    // 这里可以替换为真实的API调用
    // 示例使用模拟数据
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                currentPrice: '$0.15',
                priceChange: '+2.5%',
                holderCount: '12,458'
            });
        }, 1000);
    });
}

function updatePriceDisplay(data) {
    document.getElementById('current-price').textContent = data.currentPrice;
    
    const changeElement = document.getElementById('price-change');
    changeElement.textContent = data.priceChange;
    
    if (data.priceChange.includes('+')) {
        changeElement.className = 'value change positive';
    } else if (data.priceChange.includes('-')) {
        changeElement.className = 'value change negative';
    }
    
    document.getElementById('holder-count').textContent = data.holderCount;
}

// 初始化社区链接
function initializeCommunityLinks() {
    const communityLinks = {
        'facebook-btn': { url: 'https://facebook.com/groups/twstaiwan', name: 'Facebook' },
        'discord-btn': { url: 'https://discord.gg/twstaiwan', name: 'Discord' },
        'twitter-btn': { url: 'https://twitter.com/twstaiwan', name: 'Twitter' },
        'telegram-btn': { url: 'https://t.me/twstaiwan', name: 'Telegram' },
        'line-btn': { url: 'https://line.me/R/ti/g/twstaiwan', name: 'Line' }
    };

    // 处理普通链接按钮
    Object.keys(communityLinks).forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                const { url, name } = communityLinks[btnId];
                chrome.tabs.create({ url });
                showStatusMessage(`正在打开${name}社区...`, 'success');
                
                // 记录点击统计
                recordCommunityClick(name);
            });
        }
    });

    // 处理微信按钮
    const wechatBtn = document.getElementById('wechat-btn');
    if (wechatBtn) {
        wechatBtn.addEventListener('click', () => {
            showWechatQRCode();
        });
    }

    // 更新社区统计信息
    updateCommunityStats();
}

// 显示微信二维码
function showWechatQRCode() {
    // 创建二维码模态框
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

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .modal-content {
            background: white;
            border-radius: 10px;
            padding: 20px;
            max-width: 300px;
            text-align: center;
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .close-btn {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
        }
        .qrcode-placeholder {
            background: #f5f5f5;
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
            color: #666;
            margin-top: 5px;
        }
        .wechat-info {
            text-align: left;
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);

    // 关闭功能
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
    showStatusMessage('微信社群信息已显示', 'success');
    recordCommunityClick('WeChat');
}

// 记录社区点击统计
function recordCommunityClick(platform) {
    chrome.storage.local.get(['communityStats'], (result) => {
        const stats = result.communityStats || {};
        stats[platform] = (stats[platform] || 0) + 1;
        stats.totalClicks = (stats.totalClicks || 0) + 1;
        
        chrome.storage.local.set({ communityStats: stats });
    });
}

// 更新社区统计信息
function updateCommunityStats() {
    // 模拟动态统计数据
    const baseTotal = 15000;
    const baseOnline = 1200;
    
    // 添加随机波动
    const total = baseTotal + Math.floor(Math.random() * 500);
    const online = baseOnline + Math.floor(Math.random() * 100);
    
    const totalElement = document.getElementById('community-total');
    const onlineElement = document.getElementById('community-online');
    
    if (totalElement) totalElement.textContent = total.toLocaleString() + '+';
    if (onlineElement) onlineElement.textContent = online.toLocaleString() + '+';
}

// 初始化公告
function initializeAnnouncement() {
    const announcements = [
        "🎉 TWS 交易大赛即将开始，丰厚奖励等你来拿！",
        "📢 新版钱包功能已上线，支持更多数字货币",
        "🔔 社区活动：邀请好友得TWS，最高奖励1000TWS",
        "🌟 价格锚定功能已优化，支持更多电商平台",
        "💡 新手教程更新，快速了解TWS生态"
    ];
    
    const randomAnnouncement = announcements[Math.floor(Math.random() * announcements.length)];
    document.getElementById('announcement').textContent = randomAnnouncement;
}

// 价格锚定功能开关
function togglePriceAnchor() {
    chrome.storage.local.get(['priceAnchorEnabled'], function(result) {
        const enabled = !result.priceAnchorEnabled;
        chrome.storage.local.set({priceAnchorEnabled: enabled}, function() {
            // 发送消息给content script
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'togglePriceAnchor',
                    enabled: enabled
                });
            });
            
            // 显示状态提示
            showStatusMessage(`价格锚定功能已${enabled ? '启用' : '禁用'}`);
        });
    });
}

// 显示状态消息
function showStatusMessage(message) {
    const statusDiv = document.createElement('div');
    statusDiv.textContent = message;
    statusDiv.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 12px;
        z-index: 10000;
        animation: fadeInOut 2s ease-in-out;
        min-width: 500px;
    `;
    
    document.body.appendChild(statusDiv);
    
    setTimeout(() => {
        statusDiv.remove();
    }, 2000);
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        20% { opacity: 1; transform: translateX(-50%) translateY(0); }
        80% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
    }
`;
document.head.appendChild(style);

// 监听游戏按钮点击
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('game-btn')) {
        const gameType = e.target.textContent;
        handleGameClick(gameType);
    }
});

function handleGameClick(gameType) {
    switch(gameType) {
        case '价格锚定':
            togglePriceAnchor();
            break;
        case '每日签到':
            handleDailyCheckin();
            break;
        case '任务中心':
            // 打开任务中心
            showTaskCenter();
            break;
    }
}

// 处理每日签到
function handleDailyCheckin() {
    const today = new Date().toDateString();
    const checkinKey = today + '_checkin';
    
    chrome.storage.local.get([checkinKey], function(result) {
        if (result[checkinKey]) {
            showStatusMessage('今天已经签到过了！');
        } else {
            // 模拟签到奖励
            const rewards = [5, 10, 15, 20, 25];
            const reward = rewards[Math.floor(Math.random() * rewards.length)];
            
            chrome.storage.local.set({[checkinKey]: true}, function() {
                showStatusMessage(`签到成功！获得 ${reward} TWS 奖励`);
            });
        }
    });
}

// 显示任务中心
function showTaskCenter() {
    const tasks = [
        { name: '浏览电商网站', reward: 10, completed: false },
        { name: '分享到社交媒体', reward: 15, completed: false },
        { name: '邀请好友', reward: 25, completed: false },
        { name: '完成每日签到', reward: 5, completed: false }
    ];
    
    const taskHtml = tasks.map(task => 
        `<div class="task-item">
            <span>${task.name}</span>
            <span>+${task.reward} TWS</span>
        </div>`
    ).join('');
    
    const modal = createModal('任务中心', taskHtml);
    document.body.appendChild(modal);
}

// 创建模态框
function createModal(title, content) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 10px;
        max-width: 300px;
        max-height: 400px;
        overflow-y: auto;
    `;
    
    modalContent.innerHTML = `
        <h3>${title}</h3>
        <div>${content}</div>
        <button onclick="this.parentElement.parentElement.remove()" style="margin-top: 10px; padding: 5px 10px;">关闭</button>
    `;
    
    modal.appendChild(modalContent);
    
    // 点击背景关闭
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    return modal;
}

// 添加任务中心样式
const taskStyle = document.createElement('style');
taskStyle.textContent = `
    .task-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #eee;
    }
    .task-item:last-child {
        border-bottom: none;
    }
`;
document.head.appendChild(taskStyle);