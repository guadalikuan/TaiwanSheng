/* 
 * ============================================
 * 价格锚定功能已禁用
 * ============================================
 * 此文件包含价格锚定功能的实现代码，但当前版本已禁用此功能。
 * 如需重新启用，请：
 * 1. 在 manifest.json 中取消注释 content_scripts 配置
 * 2. 在 manifest.json 中添加电商网站的 host_permissions
 * 3. 在 background.js 中取消注释相关代码
 * ============================================
 */

// TWS/TWD 汇率（示例汇率，可根据实际情况调整）
const TWS_EXCHANGE_RATE = 0.01; // 1 TWD = 0.01 TWS

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
    console.log(`[TWS价格锚定] ${message}`, data);
}

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
        '.amount',
        '.prdPriceArea',
        '.prdPriceArea .price',
        '.goodsPrice',
        '.goods-price',
        '.productPrice',
        '.product-price',
        'span[class*="price"]',
        'div[class*="price"]',
        '.NT',
        '.nt'
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
    ],
    // 添加更多购物网站支持
    'yahoo.com.tw': [
        '.HeroInfo__price___',
        '.PriceBox__price___',
        '.price',
        '[data-price]',
        '.amount',
        '.ProductPrice',
        '.product-price'
    ],
    'books.com.tw': [
        '.price',
        '.set2',
        '.mod_price',
        '.price_box',
        '.cash',
        '.book-price'
    ],
    'udn.com': [
        '.price',
        '.product-price',
        '[data-price]'
    ],
    'rakuten.com.tw': [
        '.price',
        '.product-price',
        '[data-price]'
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
    /售价\s*[:：]\s*([0-9,]+(?:\.\d{1,2})?)/g, // 售价: 1,234
    /([0-9,]+(?:\.\d{1,2})?)\s*$/g,     // 纯数字结尾（如：1,234）
    /^([0-9,]+(?:\.\d{1,2})?)$/g        // 纯数字（如：1234）
];

// 初始化价格锚定功能
function initializePriceAnchor() {
    // 检查当前网站是否支持价格锚定
    const currentHost = window.location.hostname;
    const supportedSites = Object.keys(PRICE_SELECTORS);
    
    if (!supportedSites.some(site => currentHost.includes(site))) {
        console.log('[TWS价格锚定] 当前网站不支持:', currentHost);
        return; // 不在支持的网站列表中
    }
    
    console.log('[TWS价格锚定] 检测到支持的电商网站:', currentHost);
    
    // 监听存储变化，实时更新价格锚定状态（兼容Edge和Chrome）
    const browser = typeof chrome !== 'undefined' ? chrome : typeof browser !== 'undefined' ? browser : null;
    if (!browser) {
        console.error('[TWS价格锚定] 无法访问浏览器API');
        return;
    }
    
    browser.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.priceAnchorEnabled) {
            if (changes.priceAnchorEnabled.newValue) {
                enablePriceAnchor();
            } else {
                disablePriceAnchor();
            }
        }
    });
    
    // 初始检查是否启用价格锚定（默认启用）
    browser.storage.local.get(['priceAnchorEnabled'], function(result) {
        // 如果未设置，默认为true（启用）
        const enabled = result.priceAnchorEnabled !== false;
        
        console.log('[TWS价格锚定] 状态检查:', enabled ? '启用' : '禁用');
        
        if (enabled) {
            // 延迟执行，确保DOM完全加载
            setTimeout(() => {
                enablePriceAnchor();
            }, 500);
        } else {
            console.log('[TWS价格锚定] 功能已禁用');
        }
    });
}

// 防抖函数（优化性能）
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 启用价格锚定（优化版，带性能优化）
function enablePriceAnchor() {
    // 检查是否已经启用（避免重复启用）
    if (window.priceAnchorEnabled) {
        console.log('[TWS价格锚定] 已启用，跳过重复初始化');
        // #region agent log
        debugLog('content.js:99', '跳过重复启用', {});
        // #endregion
        return;
    }
    
    // #region agent log
    debugLog('content.js:99', 'enablePriceAnchor开始', {
        bodyExists: !!document.body,
        readyState: document.readyState
    });
    // #endregion
    
    console.log('[TWS价格锚定] 启用功能');
    window.priceAnchorEnabled = true;
    
    // 立即处理现有价格元素
    processExistingPrices();
    
    // 防抖处理新节点（避免频繁处理导致性能问题）
    const debouncedProcessNewNodes = debounce((nodes) => {
        processNewNodes(nodes);
    }, 300);
    
    // 监听DOM变化，处理动态加载的价格（优化：限制监听范围）
    const observer = new MutationObserver(function(mutations) {
        // #region agent log
        if (mutations.length > 10) {
            debugLog('content.js:106', '大量DOM变化', {
                mutationCount: mutations.length,
                addedNodesCount: mutations.reduce((sum, m) => sum + m.addedNodes.length, 0)
            });
        }
        // #endregion
        
        const addedNodes = [];
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                Array.from(mutation.addedNodes).forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        addedNodes.push(node);
                    }
                });
            }
        });
        
        // 使用防抖处理，避免频繁执行
        if (addedNodes.length > 0) {
            debouncedProcessNewNodes(addedNodes);
        }
    });
    
    if (document.body) {
        // 优化：只监听主要内容区域，而不是整个body
        const mainContent = document.querySelector('main, #main, .main, .content, [role="main"]') || document.body;
        
        observer.observe(mainContent, {
            childList: true,
            subtree: true
        });
        
        // 保存observer以便后续禁用
        window.priceAnchorObserver = observer;
        console.log('[TWS价格锚定] DOM监听器已启动');
        
        // #region agent log
        debugLog('content.js:114', 'DOM监听器启动', {
            observeTarget: mainContent.tagName + (mainContent.className ? '.' + mainContent.className.split(' ')[0] : ''),
            isBody: mainContent === document.body
        });
        // #endregion
    } else {
        console.warn('[TWS价格锚定] document.body不存在，等待DOM加载');
        // #region agent log
        debugLog('content.js:120', 'body不存在，延迟重试', {});
        // #endregion
        // 如果body不存在，等待一下再试
        setTimeout(() => {
            if (document.body && !window.priceAnchorObserver) {
                enablePriceAnchor();
            }
        }, 1000);
    }
}

// 禁用价格锚定
function disablePriceAnchor() {
    console.log('[TWS价格锚定] 禁用功能');
    
    window.priceAnchorEnabled = false;
    
    if (window.priceAnchorObserver) {
        window.priceAnchorObserver.disconnect();
        window.priceAnchorObserver = null;
    }
    
    // 移除所有TWS价格显示
    const twsPriceElements = document.querySelectorAll('.tws-price-anchor');
    console.log(`[TWS价格锚定] 移除 ${twsPriceElements.length} 个TWS价格元素`);
    twsPriceElements.forEach(element => {
        element.remove();
    });
    
    // 移除所有问号提示
    const tooltipElements = document.querySelectorAll('.tws-price-tooltip');
    tooltipElements.forEach(element => {
        element.remove();
    });
    
    // 清除已处理标记，以便重新启用时可以重新处理
    document.querySelectorAll('.tws-processed').forEach(el => {
        el.classList.remove('tws-processed');
    });
}

// 通用价格元素查找（当选择器匹配失败时使用）
function findPriceElementsGeneric() {
    // 查找包含价格模式的文本节点和元素
    const priceElements = [];
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
        {
            acceptNode: function(node) {
                // 跳过已处理的元素
                if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('tws-processed')) {
                    return NodeFilter.FILTER_REJECT;
                }
                // 跳过script和style标签
                if (node.nodeType === Node.ELEMENT_NODE && 
                    (node.tagName === 'SCRIPT' || node.tagName === 'STYLE')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );
    
    let node;
    let checkedCount = 0;
    const maxChecks = 500; // 限制检查数量，避免性能问题
    
    while ((node = walker.nextNode()) && checkedCount < maxChecks) {
        checkedCount++;
        
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            const price = extractPrice(text);
            if (price && price >= 10 && price < 10000000) {
                // 找到价格，获取父元素
                let parent = node.parentElement;
                if (parent && !parent.classList.contains('tws-processed')) {
                    priceElements.push(parent);
                    parent.classList.add('tws-processed');
                }
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const text = node.textContent.trim();
            if (text.length > 0 && text.length < 50) {
                const price = extractPrice(text);
                if (price && price >= 10 && price < 10000000) {
                    if (!node.classList.contains('tws-processed')) {
                        priceElements.push(node);
                    }
                }
            }
        }
    }
    
    // #region agent log
    debugLog('content.js:findPriceElementsGeneric', '通用价格查找完成', {
        checkedNodes: checkedCount,
        foundPrices: priceElements.length
    });
    // #endregion
    
    return priceElements;
}

// 处理现有价格元素（优化版，带调试日志和通用查找）
function processExistingPrices() {
    const currentHost = window.location.hostname;
    const selectors = getPriceSelectors(currentHost);
    
    // #region agent log
    debugLog('content.js:203', 'processExistingPrices开始', {
        hostname: currentHost,
        selectorCount: selectors.length,
        selectors: selectors.slice(0, 5) // 只记录前5个
    });
    // #endregion
    
    let totalFound = 0;
    let totalProcessed = 0;
    
    // 首先尝试使用预定义的选择器
    if (selectors.length > 0) {
        console.log('[TWS价格锚定] 开始处理价格元素，网站:', currentHost, '选择器数量:', selectors.length);
        
        selectors.forEach((selector, index) => {
            try {
                const startTime = performance.now();
                const priceElements = document.querySelectorAll(selector);
                const queryTime = performance.now() - startTime;
                
                totalFound += priceElements.length;
                
                // #region agent log
                if (index < 5) { // 只记录前5个选择器的详细信息
                    debugLog(`content.js:217-${index}`, '选择器查询结果', {
                        selector: selector,
                        foundCount: priceElements.length,
                        queryTime: queryTime.toFixed(2),
                        sampleTexts: Array.from(priceElements).slice(0, 3).map(el => ({
                            text: el.textContent.trim().substring(0, 50),
                            className: el.className,
                            tagName: el.tagName
                        }))
                    });
                }
                // #endregion
                
                if (priceElements.length > 0) {
                    console.log(`[TWS价格锚定] 选择器 "${selector}" 找到 ${priceElements.length} 个元素`);
                }
                
                priceElements.forEach((element, elIndex) => {
                    if (elIndex < 3) { // 只记录前3个元素的处理详情
                        // #region agent log
                        debugLog(`content.js:226-${index}-${elIndex}`, '处理价格元素前', {
                            text: element.textContent.trim().substring(0, 100),
                            className: element.className,
                            tagName: element.tagName,
                            isProcessed: element.classList.contains('tws-processed')
                        });
                        // #endregion
                    }
                    
                    if (processPriceElement(element)) {
                        totalProcessed++;
                        if (elIndex < 3) {
                            // #region agent log
                            debugLog(`content.js:227-${index}-${elIndex}`, '价格元素处理成功', {
                                text: element.textContent.trim().substring(0, 50)
                            });
                            // #endregion
                        }
                    } else if (elIndex < 3) {
                        const text = element.textContent.trim();
                        const price = extractPrice(text);
                        // #region agent log
                        debugLog(`content.js:227-${index}-${elIndex}`, '价格元素处理失败', {
                            text: text.substring(0, 100),
                            extractedPrice: price,
                            reason: !text ? 'empty' : !price ? 'no-price' : 'other'
                        });
                        // #endregion
                    }
                });
            } catch (e) {
                console.error(`[TWS价格锚定] 选择器 "${selector}" 执行失败:`, e);
                // #region agent log
                debugLog(`content.js:231-${index}`, '选择器执行错误', {
                    selector: selector,
                    error: e.message
                });
                // #endregion
            }
        });
    }
    
    // 如果选择器方法没有找到价格，尝试通用方法（仅在找到0个元素时）
    if (totalFound === 0 && selectors.length > 0) {
        console.log('[TWS价格锚定] 选择器未找到元素，尝试通用方法...');
        // #region agent log
        debugLog('content.js:generic-fallback', '使用通用价格查找', {});
        // #endregion
        
        const genericElements = findPriceElementsGeneric();
        totalFound += genericElements.length;
        
        genericElements.forEach(element => {
            if (processPriceElement(element)) {
                totalProcessed++;
            }
        });
    }
    
    // #region agent log
    debugLog('content.js:236', 'processExistingPrices完成', {
        totalFound: totalFound,
        totalProcessed: totalProcessed,
        successRate: totalFound > 0 ? (totalProcessed / totalFound * 100).toFixed(1) + '%' : '0%',
        usedGeneric: totalFound > 0 && selectors.length > 0 && document.querySelectorAll(selectors[0]).length === 0
    });
    // #endregion
    
    console.log(`[TWS价格锚定] 处理完成: 找到 ${totalFound} 个元素，成功处理 ${totalProcessed} 个价格`);
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

// 处理单个价格元素（带调试日志）
function processPriceElement(priceElement) {
    // 检查是否已经处理过
    if (priceElement.classList.contains('tws-processed')) {
        return false;
    }
    
    // 检查元素是否可见
    if (priceElement.offsetParent === null && priceElement.style.display === 'none') {
        return false;
    }
    
    const originalText = priceElement.textContent.trim();
    if (!originalText) {
        return false;
    }
    
    const price = extractPrice(originalText);
    
    // #region agent log
    if (Math.random() < 0.1) { // 随机采样10%的日志，避免日志过多
        debugLog('content.js:270', 'processPriceElement', {
            text: originalText.substring(0, 50),
            extractedPrice: price,
            className: priceElement.className,
            tagName: priceElement.tagName
        });
    }
    // #endregion
    
    if (price && price > 0) {
        // 标记为已处理
        priceElement.classList.add('tws-processed');
        
        // 计算TWS价格
        const twsPrice = calculateTWSPrice(price);
        
        // 创建TWS价格显示
        createTWSPriceDisplay(priceElement, twsPrice, price);
        return true;
    }
    
    return false;
}

// 从文本中提取价格（增强版，改进识别算法）
function extractPrice(text) {
    // 清理文本
    const cleanText = text.trim().replace(/\s+/g, ' ');
    
    // 过滤掉明显不是价格的大数字（如年份、ID等）
    if (cleanText.length > 50) {
        return null;
    }
    
    // 检查是否包含常见价格关键词
    const priceKeywords = ['价格', '售价', '定价', '特价', '优惠价', '原价', '现价', 'NT$', '$', '元', 'NT', 'TWD', '台币'];
    const hasPriceKeyword = priceKeywords.some(keyword => cleanText.includes(keyword));
    
    // 如果没有价格关键词且文本长度超过20个字符，可能不是价格
    if (!hasPriceKeyword && cleanText.length > 20) {
        return null;
    }
    
    // 排除明显不是价格的文本
    const excludePatterns = [
        /\d{4}年/,  // 年份
        /ID[:\s]*\d+/,  // ID
        /编号[:\s]*\d+/,  // 编号
        /第\d+页/,  // 页码
        /\d+%/,  // 百分比（单独出现时）
    ];
    
    if (excludePatterns.some(pattern => pattern.test(cleanText))) {
        return null;
    }
    
    let bestMatch = null;
    let bestPrice = null;
    let bestConfidence = 0;
    
    // 使用多种模式匹配价格
    PRICE_PATTERNS.forEach(pattern => {
        const matches = [...cleanText.matchAll(pattern)];
        matches.forEach(match => {
            const priceStr = match[1].replace(/,/g, '');
            const price = parseFloat(priceStr);
            
            // 验证价格合理性（台币价格通常在10到1000000之间）
            if (price && price >= 10 && price < 10000000) {
                let confidence = 1;
                
                // 提高包含价格关键词的匹配的置信度
                if (hasPriceKeyword) {
                    confidence += 0.5;
                }
                
                // 提高匹配长度较长的置信度
                confidence += match[0].length / 20;
                
                // 如果价格在常见范围内，提高置信度
                if (price >= 100 && price <= 100000) {
                    confidence += 0.3;
                }
                
                if (confidence > bestConfidence) {
                    bestMatch = match;
                    bestPrice = price;
                    bestConfidence = confidence;
                }
            }
        });
    });
    
    // 如果置信度太低，返回null
    if (bestConfidence < 0.5) {
        return null;
    }
    
    return bestPrice;
}

// 计算TWS价格
function calculateTWSPrice(twdPrice) {
    return (twdPrice * TWS_EXCHANGE_RATE).toFixed(1);
}

// 创建TWS价格显示（增强版，使用CSS类）
function createTWSPriceDisplay(originalElement, twsPrice, originalPrice) {
    // 检查是否已经存在TWS价格显示
    const existingAnchor = originalElement.parentNode?.querySelector('.tws-price-anchor');
    if (existingAnchor) {
        return; // 已存在，不重复创建
    }
    
    // 创建TWS价格容器
    const twsContainer = document.createElement('div');
    twsContainer.className = 'tws-price-anchor';
    
    // 创建TWS价格文本（使用金色突出显示）
    const twsText = document.createElement('span');
    twsText.textContent = `TWS$ ${twsPrice}`;
    twsText.style.cssText = 'font-weight: 900; color: #fbbf24; margin-right: 6px;';
    twsContainer.appendChild(twsText);
    
    // 创建会员价标签
    const memberTag = document.createElement('span');
    memberTag.textContent = '(会员价)';
    memberTag.style.cssText = 'font-size: 10px; opacity: 0.8; color: #06b6d4; margin-right: 6px;';
    twsContainer.appendChild(memberTag);
    
    // 创建问号图标（风险提示）
    const questionMark = document.createElement('span');
    questionMark.textContent = '?';
    questionMark.className = 'tws-tooltip-trigger';
    questionMark.style.cssText = `
        font-size: 11px;
        opacity: 0.7;
        cursor: help;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        background: rgba(6,182,212,0.2);
        color: #06b6d4;
        border: 1px solid rgba(6,182,212,0.3);
        transition: all 0.2s ease;
    `;
    twsContainer.appendChild(questionMark);
    
    // 问号悬停效果
    questionMark.addEventListener('mouseenter', function() {
        this.style.opacity = '1';
        this.style.background = 'rgba(6,182,212,0.3)';
        this.style.transform = 'scale(1.1)';
    });
    
    questionMark.addEventListener('mouseleave', function() {
        this.style.opacity = '0.7';
        this.style.background = 'rgba(6,182,212,0.2)';
        this.style.transform = 'scale(1)';
    });
    
    // 插入到原价格元素后面
    if (originalElement.parentNode) {
        // 尝试插入到价格元素后面，如果失败则插入到父元素末尾
        try {
            originalElement.parentNode.insertBefore(twsContainer, originalElement.nextSibling);
        } catch (e) {
            originalElement.parentNode.appendChild(twsContainer);
        }
    }
    
    // 创建工具提示
    createTooltip(twsContainer, originalPrice, twsPrice);
}

// 创建工具提示（优化版）
function createTooltip(container, originalPrice, twsPrice) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tws-price-tooltip';
    
    tooltip.innerHTML = `
        <div style="font-weight: bold; color: #fbbf24; margin-bottom: 6px; font-size: 13px;">
            ⚠️ 战时台币汇率波动风险提示
        </div>
        <div style="margin-bottom: 4px; color: #e2e8f0;">
            <span style="color: var(--muted, #8b949e);">原价:</span> 
            <strong style="color: #e2e8f0;">NT$ ${originalPrice.toLocaleString('zh-TW')}</strong>
        </div>
        <div style="margin-bottom: 6px; color: #e2e8f0;">
            <span style="color: var(--muted, #8b949e);">TWS会员价:</span> 
            <strong style="color: #fbbf24;">TWS$ ${twsPrice}</strong>
        </div>
        <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(6,182,212,0.2); color: #06b6d4; font-size: 11px;">
            💡 持有 TWS 可锁定购买力，规避汇率波动风险
        </div>
    `;
    
    container.appendChild(tooltip);
    
    // 鼠标悬停显示工具提示
    let showTimeout;
    let hideTimeout;
    
    container.addEventListener('mouseenter', function() {
        clearTimeout(hideTimeout);
        showTimeout = setTimeout(() => {
            tooltip.style.display = 'block';
            // 添加淡入动画
            tooltip.style.opacity = '0';
            tooltip.style.transform = 'translateY(5px)';
            setTimeout(() => {
                tooltip.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                tooltip.style.opacity = '1';
                tooltip.style.transform = 'translateY(0)';
            }, 10);
        }, 200); // 延迟200ms显示，避免鼠标快速划过时闪烁
    });
    
    container.addEventListener('mouseleave', function() {
        clearTimeout(showTimeout);
        hideTimeout = setTimeout(() => {
            tooltip.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
            tooltip.style.opacity = '0';
            tooltip.style.transform = 'translateY(5px)';
            setTimeout(() => {
                tooltip.style.display = 'none';
            }, 150);
        }, 100);
    });
}

// 监听来自popup的消息（兼容Edge和Chrome）
const browser = typeof chrome !== 'undefined' ? chrome : typeof browser !== 'undefined' ? browser : null;

if (browser && browser.runtime && browser.runtime.onMessage) {
    browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
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
}

// 页面加载完成后初始化（增强版，兼容SPA应用）
function startPriceAnchor() {
    // 等待页面完全加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initializePriceAnchor, 300);
        });
    } else {
        // 如果页面已经加载，延迟一点确保DOM稳定
        setTimeout(initializePriceAnchor, 300);
    }
}

// 立即开始初始化
startPriceAnchor();

// 监听页面可见性变化（SPA应用切换页面时）
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.priceAnchorEnabled) {
        // 页面重新可见时，重新处理价格
        console.log('[TWS价格锚定] 页面重新可见，重新处理价格');
        setTimeout(() => {
            processExistingPrices();
        }, 500);
    }
});

// 监听URL变化（SPA应用）
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        console.log('[TWS价格锚定] URL变化，重新初始化');
        // 清除已处理标记
        document.querySelectorAll('.tws-processed').forEach(el => {
            el.classList.remove('tws-processed');
        });
        // 重新初始化
        setTimeout(initializePriceAnchor, 500);
    }
}).observe(document, {subtree: true, childList: true});