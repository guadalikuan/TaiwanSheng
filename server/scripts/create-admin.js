import bcrypt from 'bcryptjs';
import { generateMnemonic, getAddressFromMnemonic, encryptPrivateKey } from '../utils/web3.js';
import { saveUser } from '../utils/userStorage.js';
import { ROLES } from '../utils/roles.js';

/**
 * 创建管理员账户脚本
 * 用法: node server/scripts/create-admin.js [username] [password]
 */

const createAdmin = async () => {
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || 'admin123456';

  console.log('\n🔐 正在创建管理员账户...\n');

  // 验证密码强度
  if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(password)) {
    console.error('❌ 密码必须至少8个字符，包含字母和数字');
    process.exit(1);
  }

  try {
    // 生成助记符和钱包地址
    const mnemonic = generateMnemonic();
    const walletAddress = getAddressFromMnemonic(mnemonic);

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 加密助记符
    const encryptedMnemonic = encryptPrivateKey(mnemonic, password);

    // 创建用户数据
    const userData = {
      address: walletAddress,
      username,
      passwordHash,
      encryptedMnemonic,
      role: ROLES.ADMIN,
      profile: {
        displayName: username,
        avatar: ''
      },
      lastLogin: null
    };

    // 保存用户
    const savedUser = saveUser(userData);

    console.log('✅ 管理员账户创建成功！\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 账户信息：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`用户名: ${savedUser.username}`);
    console.log(`密码: ${password}`);
    console.log(`角色: ${savedUser.role}`);
    console.log(`钱包地址: ${savedUser.address}`);
    console.log('\n🔑 助记符（请妥善保存）：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(mnemonic);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  重要提示：');
    console.log('   1. 请妥善保管助记符，丢失后无法恢复');
    console.log('   2. 请使用此账户登录系统');
    console.log('   3. 登录后可以访问"账户管理"页面创建房地产开发商账户\n');

  } catch (error) {
    console.error('❌ 创建失败:', error.message);
    process.exit(1);
  }
};

createAdmin();

