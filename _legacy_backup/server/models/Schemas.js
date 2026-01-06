import mongoose from 'mongoose';

// Time Schema (对应 time.json)
const timeSchema = new mongoose.Schema({
  targetTime: { type: Number, required: true },
  totalAdjustmentMs: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
  history: [{
    timestamp: { type: Number, default: Date.now },
    adjustment: Number,
    reason: String,
    source: String
  }]
}, { timestamps: true });

// Homepage Schema (对应 homepage.json)
const homepageSchema = new mongoose.Schema({
  omega: {
    etuTargetTime: Number,
    riskPremium: Number,
    alertMessage: String,
    events: [{
      id: String,
      text: String,
      impact: String,
      score: Number,
      reason: String,
      timestamp: Number
    }]
  },
  market: {
    currentPrice: Number,
    priceChange24h: Number,
    volume24h: Number,
    marketIndex: String,
    klineData: [{
      id: Number,
      timestamp: Number,
      open: Number,
      high: Number,
      low: Number,
      close: Number,
      volume: Number
    }],
    orderBook: {
      asks: [Array], // [price, amount]
      bids: [Array]
    },
    recentTrades: [{
      id: String,
      price: String,
      amount: String,
      type: String,
      time: String,
      timestamp: Number
    }]
  },
  map: {
    taiwan: {
      nodeCount: Number,
      logs: [{
        id: String,
        message: String,
        timestamp: Number,
        nodeId: String,
        city: String,
        location: { lat: Number, lng: Number },
        status: String,
        connectionType: String
      }]
    },
    mainland: {
      assetPoolValue: Number,
      unitCount: Number,
      logs: [{
        id: String,
        lot: String,
        location: String,
        timestamp: Number,
        assetId: String,
        nodeName: String,
        nodeLocation: String,
        value: Number,
        status: String
      }]
    },
    blockHeight: String
  }
}, { timestamps: true });

// 确保只创建单例数据
homepageSchema.statics.getSingleton = async function() {
  const doc = await this.findOne();
  if (doc) return doc;
  // 默认数据
  return await this.create({
    omega: {
      etuTargetTime: Date.now() + 1000 * 60 * 60 * 24 * 600,
      riskPremium: 142.5,
      alertMessage: '⚠ SYSTEM ALERT: GEOPOLITICAL TENSION RISING',
      events: []
    },
    market: {
      currentPrice: 142.85,
      priceChange24h: 12.4,
      volume24h: 4291002911,
      marketIndex: 'STRONG BUY',
      klineData: [],
      orderBook: { asks: [], bids: [] },
      recentTrades: []
    },
    map: {
      taiwan: { nodeCount: 12458, logs: [] },
      mainland: { assetPoolValue: 1425000000, unitCount: 42109, logs: [] },
      blockHeight: '8922104'
    }
  });
};

timeSchema.statics.getSingleton = async function() {
  const doc = await this.findOne();
  if (doc) return doc;
  // 默认数据
  return await this.create({
    targetTime: new Date('2027-12-31T00:00:00.000Z').getTime(),
    totalAdjustmentMs: 0,
    history: []
  });
};

export const Homepage = mongoose.model('Homepage', homepageSchema);
export const TimeConfig = mongoose.model('TimeConfig', timeSchema);
