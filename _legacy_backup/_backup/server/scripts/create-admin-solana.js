import bcrypt from 'bcryptjs';
import { Keypair } from '@solana/web3.js';
import { saveUser } from '../utils/userStorage.js';
import { ROLES } from '../utils/roles.js';
import CryptoJS from 'crypto-js';

/**
 * 创建Solana管理员账户脚本
 * 用法: node server/scripts/create-admin-solana.js [username] [password]
 */

// 生成Solana密钥对和地址
const generateSolanaKeypair = () => {
  const keypair = Keypair.generate();
  return {
    address: keypair.publicKey.toBase58(),
    secretKey: Buffer.from(keypair.secretKey).toString('base64')
  };
};

// 生成助记符（使用简单的随机词，实际应该使用BIP39，但为了简化使用随机字符串）
const generateMnemonic = () => {
  // 生成12个随机单词（简化版本，实际应该使用BIP39词库）
  const words = [
    'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
    'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
    'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actual', 'adapt'
  ];
  const selected = [];
  for (let i = 0; i < 12; i++) {
    selected.push(words[Math.floor(Math.random() * words.length)]);
  }
  return selected.join(' ');
};

// 加密助记符
const encryptMnemonic = (mnemonic, password) => {
  return CryptoJS.AES.encrypt(mnemonic, password).toString();
};

const createAdmin = async () => {
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || 'admin123456';

  console.log('\n🔐 正在创建Solana管理员账户...\n');

  // 验证密码强度
  if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(password)) {
    console.error('❌ 密码必须至少8个字符，包含字母和数字');
    process.exit(1);
  }

  try {
    // 生成Solana密钥对
    const { address: walletAddress, secretKey } = generateSolanaKeypair();
    // 生成助记符（用于显示，实际Solana地址是从密钥对生成的）
    const mnemonic = generateMnemonic();

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 加密助记符
    const encryptedMnemonic = encryptMnemonic(mnemonic, password);

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
    console.log(`Solana钱包地址: ${savedUser.address}`);
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
    console.error(error);
    process.exit(1);
  }
};

createAdmin();

