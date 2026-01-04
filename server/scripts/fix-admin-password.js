import bcrypt from 'bcryptjs';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const USERS_FILE = join(__dirname, '../data/users.json');

/**
 * 修复admin账户密码
 * 用法: node server/scripts/fix-admin-password.js [username] [password]
 */

const fixPassword = async () => {
  const username = process.argv[2] || 'admin';
  const newPassword = process.argv[3] || 'admin123456';

  console.log(`\n🔧 正在修复账户 "${username}" 的密码...\n`);

  try {
    // 读取用户数据
    const users = JSON.parse(readFileSync(USERS_FILE, 'utf8'));

    // 查找用户
    const userIndex = users.findIndex(u => u.username === username && u.role === 'ADMIN');
    
    if (userIndex === -1) {
      console.error(`❌ 未找到管理员账户 "${username}"`);
      process.exit(1);
    }

    const user = users[userIndex];
    console.log(`找到账户: ${user.username} (${user.address})`);

    // 生成新的密码哈希
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    console.log(`生成新的密码哈希...`);

    // 更新密码哈希
    users[userIndex].passwordHash = newPasswordHash;
    users[userIndex].updatedAt = Date.now();

    // 保存文件
    writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');

    console.log('\n✅ 密码已更新！\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 更新后的账户信息：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`用户名: ${users[userIndex].username}`);
    console.log(`密码: ${newPassword}`);
    console.log(`角色: ${users[userIndex].role}`);
    console.log(`钱包地址: ${users[userIndex].address}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n现在可以使用新密码登录了！\n');

  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    console.error(error);
    process.exit(1);
  }
};

fixPassword();

