import {
  updateOmegaData,
  updateMarketData,
  addKlinePoint,
  updateOrderBook,
  updateMapData
} from '../utils/homepageStorage.js';

/**
 * 初始化首页数据脚本
 * 生成初始K线数据、订单簿等
 */

const initHomepageData = async () => {
  console.log('🚀 开始初始化首页数据...\n');

  try {
    // 1. 初始化Omega数据
    console.log('📊 初始化Omega数据...');
    const omegaData = {
      etuTargetTime: Date.now() + 1000 * 60 * 60 * 24 * 600, // 600天后
      riskPremium: 142.5,
      events: [],
      alertMessage: '⚠ SYSTEM ALERT: GEOPOLITICAL TENSION RISING'
    };
    updateOmegaData(omegaData);
    console.log('✅ Omega数据初始化完成');

    // 2. 初始化Market数据 - 生成60个K线数据点
    console.log('📈 初始化Market数据...');
    let price = 102.4;
    const klineData = [];
    
    for (let i = 0; i < 60; i += 1) {
      const open = price;
      const close = price + (Math.random() - 0.4) * 2;
      const high = Math.max(open, close) + Math.random();
      const low = Math.min(open, close) - Math.random();
      const volume = Math.random() * 1000;
      
      klineData.push({
        id: i,
        timestamp: Date.now() - (60 - i) * 24 * 60 * 60 * 1000, // 过去60天
        open,
        high,
        low,
        close,
        volume
      });
      
      price = close;
    }

    const marketData = {
      currentPrice: 142.85,
      priceChange24h: 12.4,
      volume24h: 4291002911,
      marketIndex: 'STRONG BUY',
      klineData,
      orderBook: {
        asks: [
          { price: 143.5, amount: 1.2345 },
          { price: 143.2, amount: 2.3456 },
          { price: 143.1, amount: 3.4567 },
          { price: 143.05, amount: 4.5678 },
          { price: 142.9, amount: 5.6789 }
        ],
        bids: [
          { price: 142.8, amount: 10.1234 },
          { price: 142.75, amount: 15.2345 },
          { price: 142.6, amount: 20.3456 },
          { price: 142.4, amount: 25.4567 },
          { price: 142.0, amount: 30.5678 },
          { price: 141.5, amount: 35.6789 },
          { price: 140.0, amount: 40.7890 }
        ]
      },
      recentTrades: []
    };
    
    updateMarketData(marketData);
    console.log('✅ Market数据初始化完成（60个K线数据点）');

    // 3. 初始化Map数据
    console.log('🗺️  初始化Map数据...');
    const mapData = {
      taiwan: {
        nodeCount: 12458,
        logs: []
      },
      mainland: {
        assetPoolValue: 1425000000,
        unitCount: 42109,
        logs: []
      },
      blockHeight: '8922104'
    };
    
    updateMapData(mapData);
    console.log('✅ Map数据初始化完成');

    console.log('\n✨ 首页数据初始化完成！');
    console.log('\n📝 数据文件位置: server/data/homepage.json');
    console.log('💡 提示: 数据会在运行时自动更新');

  } catch (error) {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  }
};

// 运行脚本
initHomepageData().catch(error => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});

