import cron from 'node-cron';

/**
 * Oracle预言机服务
 * 抓取权威媒体关键词，触发链上事件
 */

// 关键词列表（触发统一的关键词）
const TRIGGER_KEYWORDS = [
  '联合利剑',
  '封锁',
  '统一',
  'reunification',
  '台海',
  '军事演习',
  '实弹射击'
];

// 权威媒体RSS源（示例）
const NEWS_SOURCES = [
  {
    name: '新华社',
    url: 'http://www.xinhuanet.com/politics/news_politics.xml',
    type: 'rss'
  },
  {
    name: '央视军事',
    url: 'https://tv.cctv.com/lm/junshijishi/index.shtml',
    type: 'html'
  }
];

/**
 * 检查文本中是否包含触发关键词
 * @param {string} text - 要检查的文本
 * @returns {Array<string>} 匹配的关键词列表
 */
export const checkKeywords = (text) => {
  if (!text) return [];
  
  const matched = [];
  const lowerText = text.toLowerCase();
  
  for (const keyword of TRIGGER_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matched.push(keyword);
    }
  }
  
  return matched;
};

/**
 * 抓取新闻内容（简化版，实际应使用RSS解析库）
 * @param {string} sourceUrl - 新闻源URL
 * @returns {Promise<Array<string>>} 新闻标题列表
 */
export const fetchNews = async (sourceUrl) => {
  try {
    // 这里应该使用实际的RSS解析库，如rss-parser
    // 为了演示，返回模拟数据
    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    
    // 简单提取标题（实际应使用RSS解析）
    const titles = [];
    const titleRegex = /<title>(.*?)<\/title>/gi;
    let match;
    while ((match = titleRegex.exec(text)) !== null) {
      titles.push(match[1]);
    }
    
    return titles;
  } catch (error) {
    console.error('抓取新闻失败:', error);
    return [];
  }
};

/**
 * 扫描所有新闻源，检查关键词
 * @returns {Promise<Array<Object>>} 匹配结果
 */
export const scanNewsSources = async () => {
  const results = [];
  
  for (const source of NEWS_SOURCES) {
    try {
      console.log(`📰 扫描 ${source.name}...`);
      const titles = await fetchNews(source.url);
      
      for (const title of titles) {
        const matchedKeywords = checkKeywords(title);
        if (matchedKeywords.length > 0) {
          results.push({
            source: source.name,
            title,
            keywords: matchedKeywords,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error(`扫描 ${source.name} 失败:`, error);
    }
  }
  
  return results;
};

/**
 * 触发链上统一事件
 * @param {string} keyword - 触发关键词
 * @returns {Promise<Object>} 交易结果
 */
export const triggerUnification = async (keyword) => {
  try {
    // 这里应该调用Oracle合约的externalTrigger函数
    // 需要导入blockchain服务
    const { default: blockchainService } = await import('./blockchain.js');
    
    // 注意：实际实现需要Oracle合约地址和ABI
    console.log('🚨 触发统一事件:', keyword);
    
    // 模拟触发（实际应调用合约）
    return {
      success: true,
      keyword,
      timestamp: new Date().toISOString(),
      message: 'Unification event triggered (simulated)'
    };
  } catch (error) {
    console.error('触发统一事件失败:', error);
    throw error;
  }
};

/**
 * 启动定时扫描任务
 * @param {Function} callback - 发现关键词时的回调
 */
export const startScanning = (callback) => {
  // 每30分钟扫描一次
  cron.schedule('*/30 * * * *', async () => {
    console.log('🔍 开始扫描新闻源...');
    
    try {
      const results = await scanNewsSources();
      
      if (results.length > 0) {
        console.log(`⚠️ 发现 ${results.length} 条匹配新闻!`);
        
        for (const result of results) {
          console.log(`   来源: ${result.source}`);
          console.log(`   标题: ${result.title}`);
          console.log(`   关键词: ${result.keywords.join(', ')}`);
          
          // 触发统一事件
          try {
            await triggerUnification(result.keywords[0]);
            
            // 调用回调
            if (callback) {
              callback(result);
            }
          } catch (error) {
            console.error('触发事件失败:', error);
          }
        }
      } else {
        console.log('✅ 未发现触发关键词');
      }
    } catch (error) {
      console.error('扫描任务失败:', error);
    }
  });
  
  console.log('✅ Oracle扫描任务已启动（每30分钟执行一次）');
};

/**
 * 手动触发扫描（用于测试）
 */
export const manualScan = async () => {
  console.log('🔍 手动触发扫描...');
  const results = await scanNewsSources();
  return results;
};


