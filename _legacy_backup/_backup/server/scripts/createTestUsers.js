import { saveUser, getUserByUsername } from '../utils/userStorage.js';
import { generateMnemonic, getAddressFromMnemonic, encryptPrivateKey } from '../utils/web3.js';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 创建测试用户脚本
 * 用于快速创建各种角色的测试账号
 */

const testUsers = [
  {
    username: 'testuser',
    password: 'Test123456',
    role: 'USER',
    description: '普通用户 - 浏览、查看资产'
  },
  {
    username: 'submitter1',
    password: 'Submit123456',
    role: 'SUBMITTER',
    description: '提交者 - 提交资产入库申请'
  },
  {
    username: 'reviewer1',
    password: 'Review123456',
    role: 'REVIEWER',
    description: '审核者 - 审核待审核资产'
  },
  {
    username: 'admin',
    password: 'Admin123456',
    role: 'ADMIN',
    description: '管理员 - 全部权限'
  }
];

const createTestUsers = async () => {
  console.log('🚀 开始创建测试用户...\n');
  
  const results = [];
  
  for (const userData of testUsers) {
    try {
      // 检查用户是否已存在
      const existingUser = getUserByUsername(userData.username);
      if (existingUser) {
        console.log(`⚠️  用户 ${userData.username} 已存在，跳过创建`);
        results.push({
          username: userData.username,
          status: 'skipped',
          reason: 'User already exists'
        });
        continue;
      }
      
      // 生成助记符和钱包地址
      const mnemonic = generateMnemonic();
      const address = getAddressFromMnemonic(mnemonic);
      
      // 加密密码
      const passwordHash = await bcrypt.hash(userData.password, 10);
      
      // 加密助记符（使用密码作为密钥）
      const encryptedMnemonic = encryptPrivateKey(mnemonic, userData.password);
      
      // 创建用户数据
      const user = {
        address,
        username: userData.username,
        passwordHash,
        encryptedMnemonic,
        role: userData.role,
        profile: {
          displayName: userData.username,
          avatar: ''
        },
        lastLogin: null
      };
      
      // 保存用户
      const savedUser = saveUser(user);
      
      console.log(`✅ 成功创建用户: ${userData.username}`);
      console.log(`   角色: ${userData.role}`);
      console.log(`   描述: ${userData.description}`);
      console.log(`   钱包地址: ${address}`);
      console.log(`   助记符: ${mnemonic}`);
      console.log(`   密码: ${userData.password}`);
      console.log('   ---');
      
      results.push({
        username: userData.username,
        status: 'created',
        address,
        role: userData.role
      });
      
    } catch (error) {
      console.error(`❌ 创建用户 ${userData.username} 失败:`, error.message);
      results.push({
        username: userData.username,
        status: 'failed',
        error: error.message
      });
    }
  }
  
  console.log('\n📊 创建结果汇总:');
  console.log('='.repeat(50));
  const created = results.filter(r => r.status === 'created').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const failed = results.filter(r => r.status === 'failed').length;
  
  console.log(`✅ 成功创建: ${created} 个`);
  console.log(`⚠️  已存在跳过: ${skipped} 个`);
  console.log(`❌ 创建失败: ${failed} 个`);
  console.log('='.repeat(50));
  
  console.log('\n📝 测试账号信息:');
  console.log('='.repeat(50));
  results.forEach(result => {
    if (result.status === 'created') {
      const userData = testUsers.find(u => u.username === result.username);
      console.log(`\n用户名: ${result.username}`);
      console.log(`密码: ${userData.password}`);
      console.log(`角色: ${result.role}`);
      console.log(`钱包地址: ${result.address}`);
    }
  });
  console.log('='.repeat(50));
  
  console.log('\n✨ 测试用户创建完成！');
};

// 运行脚本
createTestUsers().catch(error => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});

