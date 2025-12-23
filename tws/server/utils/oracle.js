import cron from 'node-cron';
import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import SparkClient from './spark.js';
import { 
  readHomepageData, 
  writeHomepageData
} from './homepageStorage.js';
import { adjustTime } from './timeManager.js';
import { pushUpdate } from './sseManager.js';
import { v4 as uuidv4 } from 'uuid';
import { isDuplicate, addToHistory } from './historyManager.js';

// 配置
const CONFIG = {
  sourceUrl: 'http://big5.chinataiwan.cn/gate/big5/www.chinataiwan.cn/xwzx/PoliticsNews/',
  scanInterval: '0 * * * *', // 每小时执行一次
  spark: {
    appId: 'befd8e29',
    apiSecret: 'MDUyMjNjNDQ2NzU4ZTU0ZmRiYzQwZGVl',
    apiKey: '567f8c80dd38d569b5463e98cd33bae5',
    domain: '4.0Ultra' // Spark Ultra-32K
  }
};

// 本地关键词库（兜底用）
const KEYWORDS = {
  accelerate: [
    '统一', '收复', '解放', '演习', '实弹', '封锁', '警告', '严厉', '反制', '联合利剑', '遏制',
    '强军', '扩武', '防卫', '武器', '备战', '巡航', '驱离', '挑衅', '外部势力', '干涉', '独立'
  ],
  decelerate: [
    '和平', '交流', '合作', '惠台', '发展', '融合', '同胞', '善意', '对话',
    '两岸一家亲', '经贸', '文化', '访问', '团圆', '互信'
  ]
};

// 初始化 Spark 客户端
const sparkClient = new SparkClient(CONFIG.spark);

/**
 * 抓取新闻列表
 */
const fetchNewsList = async () => {
  try {
    const response = await axios.get(CONFIG.sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      responseType: 'arraybuffer' // Handle encoding if needed, though axios handles utf8 usually
    });
    
    // big5.chinataiwan.cn returns Big5 content
    // Decode buffer using iconv-lite
    // Check content-type or infer. It's usually big5.
    const html = iconv.decode(response.data, 'big5');
    const $ = cheerio.load(html);
    
    const newsList = [];
    
    // Selector needs to be adjusted based on actual site structure. 
    // Inspecting typical structure for chinataiwan.cn
    // Assuming structure based on common patterns or simple list
    // This selector is a guess and should be robust or I should ask user to verify if it fails.
    // Let's try a generic list selector often used in news sites
    // 通常是 ul.list_01 li 或者类似的
    // 这里先用比较宽泛的选择器抓取链接
    $('a').each((i, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr('href');
      
      // 简单过滤：标题长度大于10，且链接有效
      if (title.length > 10 && href && href.indexOf('.htm') > -1) {
        // Fix relative URLs
        let fullUrl = href;
        if (!href.startsWith('http')) {
           // Base is http://big5.chinataiwan.cn/gate/big5/www.chinataiwan.cn/xwzx/PoliticsNews/
           // But href might be relative to root or current dir.
           // Let's assume relative to current dir for simplicity or resolve it properly.
           const baseUrl = 'http://big5.chinataiwan.cn/gate/big5/www.chinataiwan.cn/xwzx/PoliticsNews/';
           fullUrl = new URL(href, baseUrl).toString();
        }
        
        newsList.push({ title, url: fullUrl });
      }
    });
    
    // 去重并取前5条
    const uniqueNews = [];
    const seen = new Set();
    for (const news of newsList) {
      if (!seen.has(news.title)) {
        seen.add(news.title);
        uniqueNews.push(news);
      }
    }
    
    return uniqueNews.slice(0, 5);
  } catch (error) {
    console.error('Fetch news list failed:', error.message);
    return [];
  }
};

/**
 * AI 分析单条新闻
 */
const analyzeNewsWithSpark = async (news) => {
  const prompt = [
    {
      role: 'user',
      content: `你是地缘政治情感分析专家。请分析以下新闻标题的情感倾向和紧张程度：
"${news.title}"

任务：
1. 分析此消息对台海局势的影响。
2. 打分：0-100分。
   - 0-40分：局势缓和/正面交流（0分代表极度和平）。
   - 41-59分：中性/无明显波动。
   - 60-100分：局势紧张/负面冲突（100分代表极度紧张）。
3. 用简短的一句话解释理由。

请仅返回标准的 JSON 格式，不要包含 Markdown 标记：
{"score": number, "reason": "string"}
`
    }
  ];

  try {
    const result = await sparkClient.chat(prompt);
    // 清理可能存在的 markdown 代码块标记
    const jsonStr = result.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error(`Spark analysis failed for "${news.title}":`, error.message);
    return null; // Fallback signal
  }
};

/**
 * 本地关键词分析 (兜底)
 */
const analyzeNewsLocal = (news) => {
  let score = 50;
  let reason = "常规报道";
  
  for (const word of KEYWORDS.accelerate) {
    if (news.title.includes(word)) {
      score += 10;
      reason = `包含关键词"${word}"，判定为局势紧张`;
    }
  }
  
  for (const word of KEYWORDS.decelerate) {
    if (news.title.includes(word)) {
      score -= 10;
      reason = `包含关键词"${word}"，判定为局势缓和`;
    }
  }
  
  // Clamp score
  score = Math.max(0, Math.min(100, score));
  
  return { score, reason };
};

/**
 * 主扫描逻辑
 */
export const scanNewsSources = async () => {
  console.log('🔍 开始扫描红色源头 (中国台湾网)...');
  
  const newsList = await fetchNewsList();
  if (newsList.length === 0) {
    console.log('⚠️ 未获取到新闻');
    return [];
  }
  
  const results = [];
  let totalTimeAdjustment = 0; // 毫秒
  
  for (const news of newsList) {
    // 检查是否已处理过（去重：布隆过滤器 + 历史记录）
    if (isDuplicate(news.url)) {
      console.log(`♻️ 跳过已处理新闻: ${news.title.substring(0, 20)}...`);
      continue;
    }
    
    let analysis = await analyzeNewsWithSpark(news);
    let method = 'AI';
    
    if (!analysis) {
      console.log(`⚠️ AI 分析失败，切换至本地关键词分析: "${news.title.substring(0, 20)}..."`);
      analysis = analyzeNewsLocal(news);
      method = 'Local';
    }
    
    const { score, reason } = analysis;

    console.log(`   📄 [${method}] 分析结果: 评分 ${score} | 理由: ${reason}`);
    
    // 计算时间调整
    // 60-100: 加速。每1分加速1小时。
    // 0-40: 延后。每1分延后1小时。
    let adjustmentHours = 0;
    if (score >= 60) {
      adjustmentHours = -(score - 60); // 负值代表倒计时减少（加速）
    } else if (score <= 40) {
      adjustmentHours = (40 - score); // 正值代表倒计时增加（延后）
    }
    
    console.log(`   ⏱️ 单条调整: ${adjustmentHours}小时`);

    const adjustmentMs = adjustmentHours * 60 * 60 * 1000;
    totalTimeAdjustment += adjustmentMs;
    
    results.push({
      source: '中国台湾网',
      title: news.title,
      score,
      reason,
      method,
      adjustmentHours,
      timestamp: new Date().toISOString()
    });

    // 记录到历史（去重用）
    addToHistory({
      url: news.url,
      title: news.title,
      timestamp: Date.now(),
      analysis: { score, reason }
    });
    
    // 始终记录事件，无论是否有显著影响
    // 写入 homepage.json 的 events
    const data = readHomepageData();
    
    // 格式化 impact 字符串
    let impactStr = 'NEUTRAL';
    if (adjustmentHours > 0) impactStr = `+${adjustmentHours}h`;
    else if (adjustmentHours < 0) impactStr = `${adjustmentHours}h`;
    
    const newEvent = {
      id: uuidv4(),
      text: news.title, // 只保留标题，时间在 impact 显示
      impact: impactStr,
      score: score,
      reason: reason,
      timestamp: Date.now()
    };
    
    data.omega.events.unshift(newEvent);
    if (data.omega.events.length > 20) data.omega.events.pop(); // Keep last 20
    writeHomepageData(data);
  }
  
  // 更新总时间偏移
  if (totalTimeAdjustment !== 0) {
    const newTarget = adjustTime(totalTimeAdjustment, 'AI Analysis', 'Oracle');
    console.log(`⏱️ 倒计时调整: ${totalTimeAdjustment / (3600000)} 小时`);
    
    // 读取最新事件
    const data = readHomepageData();
    
    // 推送 SSE 更新 (包含事件更新)
    pushUpdate('omega', 'update', {
      etuTargetTime: newTarget,
      events: data.omega.events
    });
  } else {
    console.log('⚖️ 综合分析结果: 局势平稳，倒计时无调整');
  }
  
  return results;
};

/**
 * 启动定时任务
 */
export const startScanning = () => {
  // 立即执行一次扫描，以便启动时就能看到效果
  console.log('🚀 服务器启动，立即触发首次扫描...');
  scanNewsSources().catch(err => console.error('Initial scan failed:', err));

  cron.schedule(CONFIG.scanInterval, async () => {
    try {
      await scanNewsSources();
    } catch (error) {
      console.error('Scheduled scan failed:', error);
    }
  });
  console.log(`✅ Oracle 定时扫描已启动 (Cron: ${CONFIG.scanInterval})`);
};

/**
 * 手动扫描导出
 */
export const manualScan = async () => {
  return await scanNewsSources();
};

/**
 * 兼容旧接口
 */
export const checkKeywords = (text) => {
  return []; // Deprecated logic
};

export const triggerUnification = async () => {};

