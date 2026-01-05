import bcrypt from 'bcryptjs';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const USERS_FILE = join(__dirname, '../data/users.json');

/**
 * 修复所有admin账户的密码
 * 用法: node server/scripts/fix-all-admin-passwords.js [password]
 */

const fixAllPasswords = async () => {
  const newPassword = process.argv[2] || 'admin123456';

  console.log(`\n🔧 正在修复所有admin账户的密码...\n`);

  try {
    // 读取用户数据
    const users = JSON.parse(readFileSync(USERS_FILE, 'utf8'));

    // 查找所有admin账户
    const adminIndices = [];
    users.forEach((user, index) => {
      if (user.username === 'admin' && user.role === 'ADMIN') {
        adminIndices.push(index);
      }
    });

    if (adminIndices.length === 0) {
      console.error('❌ 未找到任何admin账户');
      process.exit(1);
    }

    console.log(`找到 ${adminIndices.length} 个admin账户，正在更新密码...\n`);

    // 生成新的密码哈希
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // 更新所有admin账户的密码
    adminIndices.forEach((index) => {
      const user = users[index];
      console.log(`更新账户: ${user.username} (${user.address})`);
      users[index].passwordHash = newPasswordHash;
      users[index].updatedAt = Date.now();
    });

    // 保存文件
    writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');

    console.log('\n✅ 所有admin账户的密码已更新！\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 更新后的账户信息：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`用户名: admin`);
    console.log(`密码: ${newPassword}`);
    console.log(`角色: ADMIN`);
    console.log(`已更新 ${adminIndices.length} 个账户`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n现在可以使用新密码登录了！\n');

  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    console.error(error);
    process.exit(1);
  }
};

fixAllPasswords();

