import { scanNewsSources } from '../utils/oracle.js';

/**
 * 测试脚本：验证 Spark API 接入、新闻抓取及分析流程
 * 
 * 使用方法：
 * cd d:\三大赛\李宽TWS\TaiwanSheng\tws\server
 * node scripts/test-oracle-flow.js
 */

const runTest = async () => {
  console.log('🧪 开始测试 Oracle 完整流程...');
  console.log('==================================================');

  try {
    // 1. 触发扫描
    // scanNewsSources 内部包含了：
    // - fetchNewsList (抓取)
    // - analyzeNewsWithSpark (AI分析)
    // - analyzeNewsLocal (兜底)
    // - 计算时间调整
    // - 更新 homepage.json (会被测试产生的数据污染，但在开发环境可接受)
    
    console.log('步骤 1: 调用 scanNewsSources()...');
    const start = Date.now();
    const results = await scanNewsSources();
    const duration = (Date.now() - start) / 1000;

    console.log('==================================================');
    console.log(`✅ 流程执行完成，耗时: ${duration.toFixed(2)}秒`);
    console.log(`📊 抓取并分析新闻数量: ${results.length}`);

    if (results.length > 0) {
      console.log('\n📝 详细结果分析:');
      results.forEach((res, index) => {
        console.log(`\n[新闻 #${index + 1}]`);
        console.log(`  标题: ${res.title}`);
        console.log(`  方法: ${res.method} ${res.method === 'AI' ? '🤖' : '🏠'}`);
        console.log(`  评分: ${res.score} / 100`);
        console.log(`  理由: ${res.reason}`);
        console.log(`  调整: ${res.adjustmentHours} 小时`);
      });

      // 验证 AI 是否生效
      const aiCount = results.filter(r => r.method === 'AI').length;
      console.log('\n--------------------------------------------------');
      if (aiCount > 0) {
        console.log(`🎉 成功: ${aiCount} 条新闻通过 Spark AI 完成分析。API 接入正常！`);
      } else {
        console.log('⚠️ 警告: 所有新闻均通过本地规则分析。Spark AI 可能连接失败或超时。');
        console.log('建议检查：');
        console.log('1. API Key/Secret 是否正确');
        console.log('2. 网络是否能连接 wss://spark-api.xf-yun.com');
        console.log('3. 是否有配额限制');
      }
    } else {
      console.log('❌ 错误: 未抓取到任何新闻。');
      console.log('可能原因:');
      console.log('1. 目标网站 (chinataiwan.cn) 无法访问');
      console.log('2. 页面结构变更导致 cheerio 选择器失效');
    }

  } catch (error) {
    console.error('\n❌ 测试过程中发生致命错误:', error);
  }
  
  // 强制退出，因为 oracle.js 可能启动了 cron 任务或其他挂起的句柄
  process.exit(0);
};

runTest();
