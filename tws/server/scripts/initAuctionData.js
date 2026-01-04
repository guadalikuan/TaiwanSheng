import { put, NAMESPACES, initRocksDB, close } from '../utils/rocksdb.js';
import config from '../solana.config.js';

/**
 * 初始化于北辰房产拍卖示例数据
 */
async function initAuctionData() {
  try {
    console.log('🚀 初始化拍卖数据...\n');
    
    // 初始化 RocksDB
    await initRocksDB();
    
    // 于北辰房产拍卖数据
    const auctionData = {
      assetId: 1,
      owner: 'TaiOneTreasury111111111111111111111111111111', // 初始为 TaiOne 财库
      price: '1000000000', // 1000 TaiOneToken (6 decimals = 1000.000000)
      minRequired: '1100000000', // 1100 TaiOneToken (最低出价)
      tauntMessage: '此房产已被TaiOne接管',
      assetName: '桃园·背骨将军府',
      originalOwner: '前台军少将 于北辰',
      location: '桃园市桃园区',
      createdAt: new Date().toISOString(),
      lastSeizedAt: new Date().toISOString(),
      twscoinMint: config.TAI_ONE_TOKEN.MINT, // TaiOneToken 铸造地址（从全局配置读取）
      treasury: 'TaiOneTreasury111111111111111111111111111111', // TaiOne 财库地址
      startPrice: '1000000000', // 起拍价
      status: 'active' // 拍卖状态
    };
    
    // 保存到 RocksDB
    await put(NAMESPACES.AUCTIONS, '1', auctionData);
    
    console.log('✅ 拍卖数据初始化成功！');
    console.log('\n📋 拍卖信息：');
    console.log(`   资产ID: ${auctionData.assetId}`);
    console.log(`   资产名称: ${auctionData.assetName}`);
    console.log(`   原主: ${auctionData.originalOwner}`);
    console.log(`   当前持有者: ${auctionData.owner}`);
    console.log(`   当前价格: ${parseFloat(auctionData.price) / 1000000} TaiOneToken`);
    console.log(`   最低出价: ${parseFloat(auctionData.minRequired) / 1000000} TaiOneToken`);
    console.log(`   状态: ${auctionData.status}`);
    
    // 关闭数据库连接
    await close();
    
    console.log('\n✨ 完成！');
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  }
}

// 运行初始化
initAuctionData();

