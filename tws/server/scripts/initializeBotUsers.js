import { initializeBotUsers } from '../utils/botBehaviorSimulator.js';
import { getBotUserStats } from '../utils/botUserManager.js';

/**
 * 初始化机器人用户池脚本
 * 用于系统启动时创建初始机器人用户
 */

const INITIAL_BOT_COUNT = 25; // 初始机器人数量（20-30之间）

const main = async () => {
  console.log('🤖 Initializing bot user pool...\n');
  
  try {
    // 初始化机器人用户
    const createdBots = await initializeBotUsers(INITIAL_BOT_COUNT);
    
    // 获取统计信息
    const stats = getBotUserStats();
    
    console.log('\n📊 Bot User Statistics:');
    console.log(`  Total: ${stats.total}`);
    console.log(`  Active: ${stats.active}`);
    console.log(`  By Role:`);
    console.log(`    USER: ${stats.byRole.USER}`);
    console.log(`    SUBMITTER: ${stats.byRole.SUBMITTER}`);
    console.log(`  By Activity Level:`);
    console.log(`    High: ${stats.byActivityLevel.high}`);
    console.log(`    Medium: ${stats.byActivityLevel.medium}`);
    console.log(`    Low: ${stats.byActivityLevel.low}`);
    
    console.log('\n✅ Bot user pool initialization completed!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing bot users:', error);
    process.exit(1);
  }
};

// 执行
main();

