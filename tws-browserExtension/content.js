// TWS/TWD 汇率（示例汇率，可根据实际情况调整）
const TWS_EXCHANGE_RATE = 0.01; // 1 TWD = 0.01 TWS

// 电商网站价格选择器（增强版）
const PRICE_SELECTORS = {
    'pchome.com.tw': [
        '.price',
        '.Price',
        '[data-price]',
        '.prod_price',
        '.price-value',
        '.price_area',
        '.price_box',
        '.cash',
        '.amount'
    ],
    'momoshop.com.tw': [
        '.prdPrice',
        '.money',
        '.price',
        '[data-price]',
        '.priceArea',
        '.price_area',
        '.cash',
        '.amount'
    ],
    'shopee.tw': [
        '.pqTWkA',
        '.Ybrg9j',
        '.WTFwws',
        '.pmmxKx',
        '.shopee-search-item-result__items',
        '.product-price',
        '.price'
    ],
    'yahoo.com.tw': [
        '.HeroInfo__price___',
        '.PriceBox__price___',
        '.price',
        '[data-price]',
        '.amount'
    ],
    'books.com.tw': [
        '.price',
        '.set2',
        '.mod_price',
        '.price_box',
        '.cash'
    ],
    'ruten.com.tw': [
        '.rt-product-price',
        '.price',
        '.product-price',
        '.amount'
    ]
};

// 价格提取模式增强
const PRICE_PATTERNS = [
    /NT\$\s*([0-9,]+(?:\.\d{1,2})?)/g,  // NT$ 1,234
    /\$\s*([0-9,]+(?:\.\d{1,2})?)/g,    // $ 1,234
    /([0-9,]+(?:\.\d{1,2})?)\s*元/g,     // 1,234元
    /([0-9,]+(?:\.\d{1,2})?)\s*NT/g,    // 1,234NT
    /([0-9,]+(?:\.\d{1,2})?)\s*TWD/g,   // 1,234TWD
    /价格\s*[:：]\s*([0-9,]+(?:\.\d{1,2})?)/g, // 价格: 1,234
    /售价\s*[:：]\s*([0-9,]+(?:\.\d{1,2})?)/g  // 售价: 1,234
];

// 初始化价格锚定功能
function initializePriceAnchor() {
    // 检查当前网站是否支持价格锚定
    const currentHost = window.location.hostname;
    const supportedSites = Object.keys(PRICE_SELECTORS);
    
    if (!supportedSites.some(site => currentHost.includes(site))) {
        return; // 不在支持的网站列表中
    }
    
    // 监听存储变化，实时更新价格锚定状态
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.priceAnchorEnabled) {
            if (changes.priceAnchorEnabled.newValue) {
                enablePriceAnchor();
            } else {
                disablePriceAnchor();
            }
        }
    });
    
    // 初始检查是否启用价格锚定
    chrome.storage.local.get(['priceAnchorEnabled'], function(result) {
        if (result.priceAnchorEnabled) {
            enablePriceAnchor();
        }
    });
}

// 启用价格锚定
function enablePriceAnchor() {
    console.log('启用TWS价格锚定功能');
    
    // 立即处理现有价格元素
    processExistingPrices();
    
    // 监听DOM变化，处理动态加载的价格
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                processNewNodes(mutation.addedNodes);
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // 保存observer以便后续禁用
    window.priceAnchorObserver = observer;
}

// 禁用价格锚定
function disablePriceAnchor() {
    console.log('禁用TWS价格锚定功能');
    
    if (window.priceAnchorObserver) {
        window.priceAnchorObserver.disconnect();
    }
    
    // 移除所有TWS价格显示
    const twsPriceElements = document.querySelectorAll('.tws-price-anchor');
    twsPriceElements.forEach(element => {
        element.remove();
    });
    
    // 移除所有问号提示
    const tooltipElements = document.querySelectorAll('.tws-price-tooltip');
    tooltipElements.forEach(element => {
        element.remove();
    });
}

// 处理现有价格元素
function processExistingPrices() {
    const currentHost = window.location.hostname;
    const selectors = getPriceSelectors(currentHost);
    
    selectors.forEach(selector => {
        const priceElements = document.querySelectorAll(selector);
        priceElements.forEach(processPriceElement);
    });
}

// 处理新添加的节点
function processNewNodes(nodes) {
    nodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const currentHost = window.location.hostname;
            const selectors = getPriceSelectors(currentHost);
            
            selectors.forEach(selector => {
                const priceElements = node.querySelectorAll ? node.querySelectorAll(selector) : [];
                priceElements.forEach(processPriceElement);
                
                // 如果节点本身匹配选择器
                if (node.matches && node.matches(selector)) {
                    processPriceElement(node);
                }
            });
        }
    });
}

// 获取当前网站的价格选择器
function getPriceSelectors(hostname) {
    for (const site in PRICE_SELECTORS) {
        if (hostname.includes(site)) {
            return PRICE_SELECTORS[site];
        }
    }
    return [];
}

// 处理单个价格元素
function processPriceElement(priceElement) {
    // 检查是否已经处理过
    if (priceElement.classList.contains('tws-processed')) {
        return;
    }
    
    const originalText = priceElement.textContent.trim();
    const price = extractPrice(originalText);
    
    if (price && price > 0) {
        // 标记为已处理
        priceElement.classList.add('tws-processed');
        
        // 计算TWS价格
        const twsPrice = calculateTWSPrice(price);
        
        // 创建TWS价格显示
        createTWSPriceDisplay(priceElement, twsPrice, price);
    }
}

// 从文本中提取价格（增强版）
function extractPrice(text) {
    // 过滤掉明显不是价格的大数字（如年份、ID等）
    if (text.length > 50) {
        return null; // 文本太长，可能不是价格
    }
    
    // 检查是否包含常见价格关键词
    const priceKeywords = ['价格', '售价', '定价', '特价', '优惠价', '原价', '现价', 'NT$', '$', '元', 'NT', 'TWD'];
    const hasPriceKeyword = priceKeywords.some(keyword => text.includes(keyword));
    
    // 如果没有价格关键词且文本长度超过20个字符，可能不是价格
    if (!hasPriceKeyword && text.length > 20) {
        return null;
    }
    
    let bestMatch = null;
    let bestPrice = null;
    
    // 使用多种模式匹配价格
    PRICE_PATTERNS.forEach(pattern => {
        const matches = [...text.matchAll(pattern)];
        matches.forEach(match => {
            const priceStr = match[1].replace(/,/g, '');
            const price = parseFloat(priceStr);
            
            // 验证价格合理性
            if (price && price > 0 && price < 10000000) { // 合理的价格范围
                if (!bestMatch || match[0].length > bestMatch[0].length) {
                    bestMatch = match;
                    bestPrice = price;
                }
            }
        });
    });
    
    return bestPrice;
}

// 计算TWS价格
function calculateTWSPrice(twdPrice) {
    return (twdPrice * TWS_EXCHANGE_RATE).toFixed(1);
}

// 创建TWS价格显示（增强版）
function createTWSPriceDisplay(originalElement, twsPrice, originalPrice) {
    // 创建TWS价格容器
    const twsContainer = document.createElement('div');
    twsContainer.className = 'tws-price-anchor';
    twsContainer.style.cssText = `
        display: inline-flex;
        align-items: center;
        margin-left: 8px;
        padding: 4px 8px;
        background: linear-gradient(135deg, #27ae60, #2ecc71);
        color: white;
        border-radius: 6px;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        position: relative;
        box-shadow: 0 2px 8px rgba(39, 174, 96, 0.3);
        transition: all 0.3s ease;
        border: 1px solid #27ae60;
        animation: twsPulse 2s infinite;
    `;
    
    // 创建TWS图标
    const twsIcon = document.createElement('span');
    twsIcon.textContent = '💰';
    twsIcon.style.cssText = `
        font-size: 14px;
        margin-right: 4px;
    `;
    twsContainer.appendChild(twsIcon);
    
    // 创建TWS价格文本
    const twsText = document.createElement('span');
    twsText.textContent = `TWS$ ${twsPrice}`;
    twsContainer.appendChild(twsText);
    
    // 创建会员价标签
    const memberTag = document.createElement('span');
    memberTag.textContent = '会员价';
    memberTag.style.cssText = `
        font-size: 9px;
        background: rgba(255, 255, 255, 0.2);
        padding: 1px 4px;
        border-radius: 3px;
        margin-left: 4px;
        opacity: 0.9;
    `;
    twsContainer.appendChild(memberTag);
    
    // 创建问号图标
    const questionMark = document.createElement('span');
    questionMark.textContent = '?';
    questionMark.style.cssText = `
        font-size: 10px;
        opacity: 0.8;
        cursor: help;
        margin-left: 4px;
        background: rgba(255, 255, 255, 0.2);
        width: 14px;
        height: 14px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
    `;
    twsContainer.appendChild(questionMark);
    
    // 悬停效果
    twsContainer.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-1px)';
        this.style.boxShadow = '0 4px 12px rgba(39, 174, 96, 0.5)';
    });
    
    twsContainer.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 2px 8px rgba(39, 174, 96, 0.3)';
    });
    
    // 点击效果
    twsContainer.addEventListener('click', function() {
        this.style.animation = 'twsClick 0.3s ease';
        setTimeout(() => {
            this.style.animation = 'twsPulse 2s infinite';
        }, 300);
    });
    
    // 插入到原价格元素后面
    if (originalElement.parentNode) {
        originalElement.parentNode.insertBefore(twsContainer, originalElement.nextSibling);
    }
    
    // 创建工具提示
    createTooltip(twsContainer, originalPrice, twsPrice);
}

// 创建工具提示
function createTooltip(container, originalPrice, twsPrice) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tws-price-tooltip';
    tooltip.style.cssText = `
        position: absolute;
        bottom: 100%;
        left: 0;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 11px;
        white-space: nowrap;
        z-index: 10000;
        display: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    
    tooltip.innerHTML = `
        <div><strong>战时台币汇率波动风险提示</strong></div>
        <div style="margin-top: 4px;">原价: NT$ ${originalPrice.toLocaleString()}</div>
        <div>TWS会员价: TWS$ ${twsPrice}</div>
        <div style="margin-top: 4px; color: #27ae60;">持有 TWS 可锁定购买力</div>
    `;
    
    container.appendChild(tooltip);
    
    // 鼠标悬停显示工具提示
    container.addEventListener('mouseenter', function() {
        tooltip.style.display = 'block';
    });
    
    container.addEventListener('mouseleave', function() {
        tooltip.style.display = 'none';
    });
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'togglePriceAnchor') {
        if (request.enabled) {
            enablePriceAnchor();
        } else {
            disablePriceAnchor();
        }
        sendResponse({success: true});
    }
    return true;
});

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePriceAnchor);
} else {
    initializePriceAnchor();
}