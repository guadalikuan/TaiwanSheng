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

// 完整的新闻源列表
const NEWS_SOURCES = [
  // === 红色 (Red) - 大陆视角 ===
  { type: 'Red', name: '海峡飞虹中文网', section: '台湾新闻', url: 'https://www.itaiwannews.cn/news/taiwan-media' },
  { type: 'Red', name: '中国台湾网', section: '时政要闻', url: 'http://big5.chinataiwan.cn/gate/big5/www.chinataiwan.cn/xwzx/PoliticsNews/', encoding: 'big5' },
  { type: 'Red', name: '中国日报网', section: '要闻', url: 'https://china.chinadaily.com.cn/5bd5639ca3101a87ca8ff636' },
  { type: 'Red', name: '央视网', section: '新闻', url: 'https://news.cctv.com/?spm=C94212.PBZrLs0D62ld.EqC6QDfEmmsv.1' },
  { type: 'Red', name: '新华网', section: '新华台湾', url: 'https://www.news.cn/tw/' },
  { type: 'Red', name: '人民网', section: '台湾频道', url: 'http://tw.people.com.cn/' },
  { type: 'Red', name: '国台办', section: '新闻动态', url: 'http://www.gwytb.gov.cn/xwdt/' },
  { type: 'Red', name: '国防部', section: '新闻发言人', url: 'http://www.mod.gov.cn/gfbw/xwfyr/index.html' },
  { type: 'Red', name: '外交部', section: '外交部新闻', url: 'https://www.fmprc.gov.cn/wjbxw_new/' },

  // === 绿色 (Green) - 台湾本土/执政党视角 ===
  { type: 'Green', name: '自由时报', section: '政治', url: 'https://news.ltn.com.tw/list/breakingnews/politics' },
  { type: 'Green', name: '民报', section: '焦点新闻', url: 'https://www.peoplenews.tw/articles/category/hot-news' },
  { type: 'Green', name: '民视新闻网', section: '即时新闻', url: 'https://www.ftvnews.com.tw/realtime/' },
  { type: 'Green', name: '公视新闻网', section: '即时新闻', url: 'https://news.pts.org.tw/dailynews' },
  { type: 'Green', name: '激进新闻稿', section: '最新消息', url: 'https://statebuilding.tw/category/press-release/' },
  { type: 'Green', name: '中华民国国防部', section: '本部新闻', url: 'https://www.mnd.gov.tw/news/mndlist' },
  { type: 'Green', name: '中华民国大陆委员会', section: '政策与情势', url: 'https://www.mac.gov.tw/Content_List.aspx?n=ABBF62618F53F8DE' },
  { type: 'Green', name: '中华民国总统府', section: '新闻与活动', url: 'https://www.president.gov.tw/Page/35' },
  { type: 'Green', name: '行政院', section: '新闻与公告', url: 'https://www.ey.gov.tw/Page/26952B6BCAD013A7' },

  // === 蓝色 (Blue) - 国际/美日视角 ===
  { type: 'Blue', name: '纽约时报', section: '政治', url: 'https://www.nytimes.com/section/politics' },
  { type: 'Blue', name: '华盛顿邮报', section: '政治', url: 'https://www.washingtonpost.com/politics/' },
  { type: 'Blue', name: 'CNN', section: '政治', url: 'https://edition.cnn.com/politics' },
  { type: 'Blue', name: '美联社', section: '政治', url: 'https://apnews.com/politics' },
  { type: 'Blue', name: '彭博社', section: '政治', url: 'https://www.bloomberg.com/politics' },
  { type: 'Blue', name: 'BBC', section: '新闻', url: 'https://www.bbc.com/news' },
  { type: 'Blue', name: '美国国防部', section: '新闻', url: 'https://www.defense.gov/News/' }, // 修正了 URL (原为 war.gov)
  { type: 'Blue', name: '美国国务院', section: '新闻稿', url: 'https://www.state.gov/press-releases/' },
  { type: 'Blue', name: '美国印太司令部', section: '新闻', url: 'https://www.pacom.mil/Media/NEWS/' },
  { type: 'Blue', name: '参谋长联席会议', section: '新闻', url: 'https://www.jcs.mil/Media/News/' },
  { type: 'Blue', name: '美国空军', section: '新闻', url: 'https://www.af.mil/News/' },
  { type: 'Blue', name: '美国海军', section: '新闻', url: 'https://www.navy.mil/Press-Office/' },
  { type: 'Blue', name: '美国海军陆战队', section: '新闻', url: 'https://www.marines.mil/News/' },
  { type: 'Blue', name: 'Military Times', section: '新闻', url: 'https://www.militarytimes.com/news/' },
  { type: 'Blue', name: '日本防卫省', section: '新闻', url: 'https://www.mod.go.jp/j/press/news/index.html' },
  { type: 'Blue', name: '陆上自卫队', section: '活动报告', url: 'https://www.mod.go.jp/gsdf/news/index.html' },
  { type: 'Blue', name: '海上自卫队', section: '新闻稿', url: 'https://www.mod.go.jp/msdf/release/' },
  { type: 'Blue', name: '航空自卫队', section: '活动报告', url: 'https://www.mod.go.jp/asdf/report/' }
];

// 配置
const CONFIG = {
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
 * 随机选择新闻源
 * 从每种类型中随机选择 count 个源
 */
const selectRandomSources = (count = 1) => {
  const types = ['Red', 'Green', 'Blue'];
  const selected = [];
  
  types.forEach(type => {
    const sources = NEWS_SOURCES.filter(s => s.type === type);
    // 随机打乱并取前 count 个
    const shuffled = sources.sort(() => 0.5 - Math.random());
    selected.push(...shuffled.slice(0, count));
  });
  
  return selected;
};

/**
 * 抓取单个新闻源
 */
const fetchNewsFromSource = async (source) => {
  console.log(`📡 正在抓取 [${source.type}] ${source.name}...`);
  try {
    const response = await axios.get(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      responseType: 'arraybuffer',
      timeout: 10000 // 10秒超时
    });
    
    // 尝试从 HTML meta 标签中检测编码
    // 先用 UTF-8 解码前 1024 字节来查找 meta 标签
    const headBuffer = Buffer.from(response.data).slice(0, 1024);
    const headStr = headBuffer.toString('utf-8');
    
    let detectedEncoding = null;
    const charsetMatch = headStr.match(/<meta[^>]*charset=["']?([^"'>\s]+)["']?/i);
    if (charsetMatch) {
      detectedEncoding = charsetMatch[1].toLowerCase();
    } else {
      // 检查 content-type meta
      const contentTypeMatch = headStr.match(/<meta[^>]*http-equiv=["']?Content-Type["']?[^>]*content=["']?[^"']*charset=([^"'>\s]+)["']?/i);
      if (contentTypeMatch) {
        detectedEncoding = contentTypeMatch[1].toLowerCase();
      }
    }

    // 规范化编码名称
    if (detectedEncoding === 'gb2312') detectedEncoding = 'gbk'; // iconv-lite 处理 gbk 更好
    
    console.log(`   🔠 ${source.name} 编码检测: ${detectedEncoding || '未检测到'} (预设: ${source.encoding || '无'})`);

    // 决定最终使用的编码
    // 优先级: 显式配置 > 自动检测 > UTF-8
    let finalEncoding = 'utf-8';
    if (source.encoding) {
      finalEncoding = source.encoding;
    } else if (detectedEncoding && iconv.encodingExists(detectedEncoding)) {
      finalEncoding = detectedEncoding;
    }

    // 解码
    let html = iconv.decode(response.data, finalEncoding);
    
    const $ = cheerio.load(html);
    const newsList = [];
    
    // 通用抓取逻辑：提取所有链接文本
    // 针对不同网站可能需要优化，这里使用启发式过滤
    $('a').each((i, el) => {
      const title = $(el).text().trim().replace(/\s+/g, ' ');
      const href = $(el).attr('href');
      
      // 启发式过滤条件：
      // 1. 标题长度 > 10 (排除导航链接)
      // 2. 必须有 href
      // 3. 排除明显无关的链接 (如 javascript:, mailto:)
      // 4. 排除常见非新闻文本
      const invalidTexts = [
        'Skip to content', 'Skip to main content', 'Home', 'Contact', 'About', 
        'Search', 'Menu', 'Language', 'Privacy Policy', 'Terms of Use', 'Copyright',
        '首页', '联系我们', '关于我们', '搜索', '菜单', '语言', '隐私政策', '版权所有',
        '更多', 'More', 'Login', 'Sign up', '登录', '注册'
      ];
      
      const isInvalid = invalidTexts.some(t => title.includes(t)) || title.length < 5; // Relax length check if needed, but 10 is safer for news titles

      if (title.length >= 10 && href && !href.startsWith('javascript') && !href.startsWith('mailto') && !isInvalid) {
        
        // 补全 URL
        let fullUrl = href;
        if (!href.startsWith('http')) {
           try {
             const baseUrl = new URL(source.url).origin;
             fullUrl = new URL(href, baseUrl).toString();
           } catch (e) {
             // 如果 source.url 也是相对路径(不太可能)或者出错，保持原样
           }
        }
        
        newsList.push({ 
          source: source.name,
          type: source.type,
          title, 
          url: fullUrl 
        });
      }
    });
    
    // 去重并取前 3 条（避免单个源占用太多）
    const uniqueNews = [];
    const seen = new Set();
    for (const news of newsList) {
      if (!seen.has(news.title)) {
        seen.add(news.title);
        uniqueNews.push(news);
      }
    }
    
    console.log(`   ✅ ${source.name} 获取到 ${uniqueNews.length} 条新闻`);
    return uniqueNews.slice(0, 3);
    
  } catch (error) {
    console.error(`   ❌ ${source.name} 抓取失败: ${error.message}`);
    return [];
  }
};

/**
 * 抓取新闻列表（聚合多个源）
 */
const fetchNewsList = async () => {
  // 每次随机选择红蓝绿各2个源进行抓取，保证视角平衡且不造成过大负载 (共6个源)
  const selectedSources = selectRandomSources(2);
  console.log(`🎯 本轮选中源: ${selectedSources.map(s => s.name).join(', ')}`);
  
  const allNews = [];
  
  // 并行抓取
  const promises = selectedSources.map(source => fetchNewsFromSource(source));
  const results = await Promise.all(promises);
  
  results.forEach(newsItems => {
    allNews.push(...newsItems);
  });
  
  return allNews;
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
  console.log('🔍 开始扫描新闻源...');
  
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
      source: news.source,
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

