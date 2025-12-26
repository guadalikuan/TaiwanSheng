/**
 * 创建管理员账号脚本
 * 用法: node scripts/createAdmin.js
 */

import bcrypt from 'bcryptjs';
import { 
  generateMnemonic, 
  getAddressFromMnemonic,
  encryptPrivateKey
} from '../utils/web3.js';
import { saveUser, getUserByUsername } from '../utils/userStorage.js';
import { ROLES } from '../utils/roles.js';

const createAdmin = async () => {
  const username = 'fanann';
  const password = 'gaoer5ban';
  const role = ROLES.ADMIN;

  try {
    // 检查用户名是否已存在
    const existingUser = getUserByUsername(username);
    if (existingUser) {
      console.log(`❌ 用户名 "${username}" 已存在！`);
      console.log(`   地址: ${existingUser.address}`);
      console.log(`   角色: ${existingUser.role}`);
      return;
    }

    // 生成助记符和钱包地址
    console.log('🔐 正在生成钱包...');
    const mnemonic = generateMnemonic();
    const walletAddress = getAddressFromMnemonic(mnemonic);

    // 加密密码
    console.log('🔒 正在加密密码...');
    const passwordHash = await bcrypt.hash(password, 10);

    // 加密助记符（使用密码作为密钥）
    console.log('🔐 正在加密助记符...');
    const encryptedMnemonic = encryptPrivateKey(mnemonic, password);

    // 创建用户数据
    const userData = {
      address: walletAddress,
      username,
      passwordHash,
      encryptedMnemonic,
      role,
      profile: {
        displayName: username,
        avatar: ''
      },
      lastLogin: null
    };

    // 保存用户
    console.log('💾 正在保存用户数据...');
    const savedUser = saveUser(userData);

    console.log('\n✅ 管理员账号创建成功！\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 账号信息:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   用户名: ${savedUser.username}`);
    console.log(`   角色: ${savedUser.role}`);
    console.log(`   钱包地址: ${savedUser.address}`);
    console.log(`   创建时间: ${new Date(savedUser.createdAt).toLocaleString('zh-CN')}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔑 助记符（请妥善保管）:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   ${mnemonic}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  重要提示:');
    console.log('   1. 请妥善保管助记符，丢失将无法恢复账号');
    console.log('   2. 可以使用用户名和密码登录');
    console.log('   3. 也可以使用助记符和密码登录');
    console.log('   4. 管理员可以访问审核台: /command');
    console.log('\n');

  } catch (error) {
    console.error('❌ 创建管理员账号失败:', error);
    process.exit(1);
  }
};

// 运行脚本
createAdmin();

