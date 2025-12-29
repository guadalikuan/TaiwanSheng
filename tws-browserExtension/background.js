// 背景脚本 - 服务工作者

// 插件安装时的初始化
chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === 'install') {
        // 首次安装时的初始化
        initializeExtension();
    } else if (details.reason === 'update') {
        // 更新时的处理
        handleExtensionUpdate();
    }
});

// 初始化扩展
function initializeExtension() {
    console.log('TWS浏览器插件初始化');
    
    // 设置默认配置
    chrome.storage.local.set({
        priceAnchorEnabled: true,
        lastPriceUpdate: 0,
        dailyFortune: {},
        userPreferences: {
            theme: 'default',
            notifications: true,
            autoUpdate: true
        }
    });
    
    // 创建右键菜单
    createContextMenus();
    
    // 发送欢迎通知
    showWelcomeNotification();
}

// 处理扩展更新
function handleExtensionUpdate() {
    console.log('TWS浏览器插件已更新');
    
    // 检查是否需要数据迁移
    migrateDataIfNeeded();
}

// 创建右键菜单
function createContextMenus() {
    // 移除所有现有菜单
    chrome.contextMenus.removeAll(function() {
        // 创建价格锚定开关菜单
        chrome.contextMenus.create({
            id: 'togglePriceAnchor',
            title: '切换TWS价格锚定',
            contexts: ['page']
        });
        
        // 创建查看TWS信息菜单
        chrome.contextMenus.create({
            id: 'viewTWSInfo',
            title: '查看TWS信息',
            contexts: ['page']
        });
        
        // 创建分隔符
        chrome.contextMenus.create({
            id: 'separator1',
            type: 'separator',
            contexts: ['page']
        });
        
        // 创建快速链接菜单
        chrome.contextMenus.create({
            id: 'quickLinks',
            title: '快速链接',
            contexts: ['page']
        });
        
        // 子菜单：社区链接
        chrome.contextMenus.create({
            id: 'openFacebook',
            parentId: 'quickLinks',
            title: 'Facebook社区',
            contexts: ['page']
        });
        
        chrome.contextMenus.create({
            id: 'openDiscord',
            parentId: 'quickLinks',
            title: 'Discord社区',
            contexts: ['page']
        });
        
        chrome.contextMenus.create({
            id: 'openTwitter',
            parentId: 'quickLinks',
            title: 'Twitter社区',
            contexts: ['page']
        });
    });
}

// 显示欢迎通知
function showWelcomeNotification() {
    chrome.notifications.create('welcome', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'TWS天眼助手',
        message: '插件安装成功！点击图标开始使用各种功能。',
        priority: 2
    });
}

// 数据迁移（如果需要）
function migrateDataIfNeeded() {
    chrome.storage.local.get(['version'], function(result) {
        const currentVersion = chrome.runtime.getManifest().version;
        
        if (!result.version || result.version !== currentVersion) {
            // 执行数据迁移逻辑
            migrateUserData();
            
            // 更新版本号
            chrome.storage.local.set({version: currentVersion});
        }
    });
}

// 迁移用户数据
function migrateUserData() {
    // 这里可以添加数据迁移逻辑
    console.log('执行数据迁移');
}

// 监听右键菜单点击
chrome.contextMenus.onClicked.addListener(function(info, tab) {
    switch(info.menuItemId) {
        case 'togglePriceAnchor':
            togglePriceAnchor(tab);
            break;
        case 'viewTWSInfo':
            openTWSInfo(tab);
            break;
        case 'openFacebook':
            openCommunityLink('https://facebook.com/groups/twstaiwan');
            break;
        case 'openDiscord':
            openCommunityLink('https://discord.gg/twstaiwan');
            break;
        case 'openTwitter':
            openCommunityLink('https://twitter.com/twstaiwan');
            break;
    }
});

// 切换价格锚定功能
function togglePriceAnchor(tab) {
    chrome.storage.local.get(['priceAnchorEnabled'], function(result) {
        const enabled = !result.priceAnchorEnabled;
        
        chrome.storage.local.set({priceAnchorEnabled: enabled}, function() {
            // 发送消息给content script
            chrome.tabs.sendMessage(tab.id, {
                action: 'togglePriceAnchor',
                enabled: enabled
            });
            
            // 显示状态通知
            showStatusNotification(enabled ? '价格锚定已启用' : '价格锚定已禁用');
        });
    });
}

// 打开TWS信息页面
function openTWSInfo(tab) {
    chrome.tabs.create({
        url: chrome.runtime.getURL('info.html'),
        active: true
    });
}

// 打开社区链接
function openCommunityLink(url) {
    chrome.tabs.create({
        url: url,
        active: false
    });
}

// 显示状态通知
function showStatusNotification(message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'TWS天眼助手',
        message: message,
        priority: 1
    });
}

// 监听标签页更新
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
        // 页面加载完成后检查是否需要启用价格锚定
        checkAndEnablePriceAnchor(tab);
    }
});

// 检查并启用价格锚定
function checkAndEnablePriceAnchor(tab) {
    const supportedSites = ['pchome.com.tw', 'momoshop.com.tw', 'shopee.tw'];
    const currentHost = new URL(tab.url).hostname;
    
    if (supportedSites.some(site => currentHost.includes(site))) {
        chrome.storage.local.get(['priceAnchorEnabled'], function(result) {
            if (result.priceAnchorEnabled) {
                // 发送消息启用价格锚定
                chrome.tabs.sendMessage(tab.id, {
                    action: 'togglePriceAnchor',
                    enabled: true
                });
            }
        });
    }
}

// 定期更新价格数据
function schedulePriceUpdates() {
    // 每5分钟更新一次价格数据
    setInterval(updatePriceData, 5 * 60 * 1000);
    
    // 立即执行一次更新
    updatePriceData();
}

// 更新价格数据
async function updatePriceData() {
    try {
        const priceData = await fetchPriceData();
        
        chrome.storage.local.set({
            currentPrice: priceData.currentPrice,
            priceChange: priceData.priceChange,
            holderCount: priceData.holderCount,
            lastPriceUpdate: Date.now()
        });
        
        console.log('价格数据已更新');
    } catch (error) {
        console.error('价格数据更新失败:', error);
    }
}

// 获取价格数据（模拟）
async function fetchPriceData() {
    // 这里可以替换为真实的API调用
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

// 监听来自popup的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'getPriceData') {
        chrome.storage.local.get(['currentPrice', 'priceChange', 'holderCount'], function(result) {
            sendResponse(result);
        });
        return true; // 保持消息通道开放
    }
    
    if (request.action === 'updateFortune') {
        // 处理运势更新
        handleFortuneUpdate(request.data);
        sendResponse({success: true});
    }
    
    if (request.action === 'updateIconColor') {
        // 更新图标颜色
        updateIconColor(request.color);
        sendResponse({success: true});
    }
    
    return true;
});

// 处理运势更新
function handleFortuneUpdate(fortuneData) {
    chrome.storage.local.set({
        dailyFortune: fortuneData
    });
    // 同时更新图标颜色
    if (fortuneData.color) {
        updateIconColor(fortuneData.color);
    }
}

// 更新图标颜色（根据运势）
function updateIconColor(color) {
    const colorMap = {
        '红': { badge: '🔴', badgeColor: '#e74c3c' },
        '绿': { badge: '🟢', badgeColor: '#27ae60' },
        '黑': { badge: '⚫', badgeColor: '#2d3436' }
    };
    
    const colorInfo = colorMap[color] || colorMap['绿'];
    
    // 使用badge显示运势颜色
    chrome.action.setBadgeText({ text: colorInfo.badge });
    chrome.action.setBadgeBackgroundColor({ color: colorInfo.badgeColor });
    
    // 保存当前图标颜色
    chrome.storage.local.set({ currentIconColor: color });
    
    console.log(`图标颜色已更新为: ${color}`);
}

// 每日更新图标颜色
function updateDailyIconColor() {
    const today = new Date().toDateString();
    const fortuneKey = today + '_fortune';
    
    chrome.storage.local.get([fortuneKey], (result) => {
        if (result[fortuneKey]) {
            try {
                const fortune = JSON.parse(result[fortuneKey]);
                if (fortune.color) {
                    updateIconColor(fortune.color);
                }
            } catch (e) {
                console.error('解析运势数据失败:', e);
            }
        } else {
            // 如果没有运势数据，生成一个
            generateAndUpdateFortune();
        }
    });
}

// 生成并更新运势
function generateAndUpdateFortune() {
    // 这里可以调用popup.js中的运势生成逻辑
    // 为了简化，我们使用一个简单的哈希算法
    const today = new Date();
    const dateStr = today.toDateString();
    const hash = dateStr.split('').reduce((acc, char) => {
        return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    
    const colors = ['红', '绿', '黑'];
    const color = colors[Math.abs(hash) % colors.length];
    
    updateIconColor(color);
}

// 启动时更新图标颜色
chrome.runtime.onStartup.addListener(function() {
    console.log('TWS插件服务工作者启动');
    updateDailyIconColor();
});

// 插件安装时更新图标颜色
chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === 'install' || details.reason === 'update') {
        updateDailyIconColor();
    }
});

// 定期检查并更新图标颜色（每天更新一次）
function scheduleIconUpdate() {
    // 立即执行一次
    updateDailyIconColor();
    
    // 每24小时检查一次
    setInterval(() => {
        updateDailyIconColor();
    }, 24 * 60 * 60 * 1000);
}

// 启动定时更新
scheduleIconUpdate();

// 启动定时任务
schedulePriceUpdates();

chrome.runtime.onSuspend.addListener(function() {
    console.log('TWS插件服务工作者暂停');
});