import { saveRawAsset, saveSanitizedAsset, updateAssetStatus } from '../utils/storage.js';
import { wrapAsset } from '../utils/assetWrapperFactory.js';
import { saveUser } from '../utils/userStorage.js';
import { generateMnemonic, getAddressFromMnemonic } from '../utils/web3.js';
import { ROLES } from '../utils/roles.js';
import bcrypt from 'bcryptjs';

/**
 * 生成种子数据脚本
 * 用于填充初始数据，让系统看起来更活跃
 */

// 城市列表
const CITIES = ['西安', '咸阳', '宝鸡', '商洛', '汉中', '安康', '延安', '榆林'];

// 生成随机数字
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// 生成随机资产
const generateRandomAsset = (index) => {
  const city = CITIES[random(0, CITIES.length - 1)];
  const area = random(80, 200);
  const debtPrice = random(50, 500);
  
  const rawAsset = {
    id: `seed_${Date.now()}_${index}`,
    ownerName: `测试用户${index}`,
    ownerId: String(random(1000, 9999)),
    contactPhone: `139${String(random(10000000, 99999999))}`,
    projectName: `${city}·测试项目${index}号`,
    city,
    district: '测试区',
    address: `测试路${index}号`,
    roomNumber: `${random(1, 30)}${random(1, 3)}${random(1, 4)}`,
    area,
    marketValuation: debtPrice * 1.5,
    debtAmount: debtPrice,
    proofDocs: [],
    timestamp: Date.now() - random(0, 30 * 24 * 60 * 60 * 1000) // 随机时间，最近30天内
  };
  
  return rawAsset;
};

// 生成随机用户
const generateRandomUser = (index) => {
  const mnemonic = generateMnemonic();
  const address = getAddressFromMnemonic(mnemonic);
  
  return {
    address,
    username: `testuser${index}`,
    passwordHash: bcrypt.hashSync('Test123456', 10),
    encryptedMnemonic: mnemonic, // 简化处理
    role: ROLES.USER,
    profile: {
      displayName: `测试用户${index}`,
      avatar: ''
    },
    lastLogin: Date.now() - random(0, 7 * 24 * 60 * 60 * 1000)
  };
};

// 生成交易记录（模拟）
const generateTransactionRecord = (index) => {
  return {
    id: `tx_${Date.now()}_${index}`,
    assetId: `seed_${random(1, 100)}`,
    buyerId: `user_${random(1, 50)}`,
    sellerId: `user_${random(1, 50)}`,
    amount: random(100, 10000),
    txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
    timestamp: Date.now() - random(0, 60 * 24 * 60 * 60 * 1000),
    status: 'completed'
  };
};

/**
 * 生成所有种子数据
 */
const generateSeedData = async () => {
  console.log('🌱 开始生成种子数据...\n');
  
  try {
    // 1. 生成资产（500个）
    console.log('📦 生成资产数据...');
    const assets = [];
    for (let i = 1; i <= 500; i++) {
      const rawAsset = generateRandomAsset(i);
      saveRawAsset(rawAsset);
      
      const sanitizedAsset = wrapAsset(rawAsset);
      sanitizedAsset.id = rawAsset.id;
      
      // 随机设置状态
      const statuses = ['MINTING', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'LOCKED'];
      sanitizedAsset.status = statuses[random(0, statuses.length - 1)];
      
      saveSanitizedAsset(sanitizedAsset);
      
      // 如果是AVAILABLE状态，更新状态以包含审核信息
      if (sanitizedAsset.status === 'AVAILABLE') {
        updateAssetStatus(sanitizedAsset.id, 'AVAILABLE', {
          reviewedBy: 'system',
          reviewNotes: 'Seed data',
          reviewedAt: Date.now() - random(0, 7 * 24 * 60 * 60 * 1000)
        });
      }
      
      assets.push({ raw: rawAsset, sanitized: sanitizedAsset });
      
      if (i % 100 === 0) {
        console.log(`   已生成 ${i} 个资产...`);
      }
    }
    console.log(`✅ 已生成 ${assets.length} 个资产\n`);
    
    // 2. 生成用户（200个）
    console.log('👥 生成用户数据...');
    for (let i = 1; i <= 200; i++) {
      const user = generateRandomUser(i);
      saveUser(user);
      
      if (i % 50 === 0) {
        console.log(`   已生成 ${i} 个用户...`);
      }
    }
    console.log(`✅ 已生成 200 个用户\n`);
    
    // 3. 生成交易记录（1000条）
    console.log('💸 生成交易记录...');
    const transactions = [];
    for (let i = 1; i <= 1000; i++) {
      transactions.push(generateTransactionRecord(i));
    }
    // 这里应该保存到数据库或文件
    console.log(`✅ 已生成 ${transactions.length} 条交易记录\n`);
    
    // 4. 生成活跃特工数据（50个）
    console.log('🕵️ 生成特工数据...');
    const agents = [];
    for (let i = 1; i <= 50; i++) {
      agents.push({
        id: `agent_${i}`,
        userId: `user_${random(1, 200)}`,
        level: random(1, 10),
        totalEarnings: random(100, 10000),
        referrals: random(0, 20),
        joinedAt: Date.now() - random(0, 90 * 24 * 60 * 60 * 1000)
      });
    }
    console.log(`✅ 已生成 ${agents.length} 个特工数据\n`);
    
    console.log('🎉 种子数据生成完成！');
    console.log('\n生成统计:');
    console.log(`  - 资产: ${assets.length} 个`);
    console.log(`  - 用户: 200 个`);
    console.log(`  - 交易记录: ${transactions.length} 条`);
    console.log(`  - 特工: ${agents.length} 个`);
    
  } catch (error) {
    console.error('❌ 生成种子数据失败:', error);
    process.exit(1);
  }
};

// 执行生成
generateSeedData().then(() => {
  console.log('\n✅ 脚本执行完成');
  process.exit(0);
}).catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});


