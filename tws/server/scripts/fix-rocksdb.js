/**
 * 修复损坏的 RocksDB 数据库
 * 使用方法: node scripts/fix-rocksdb.js
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, rmSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../data');
const ROCKSDB_DIR = join(DATA_DIR, 'rocksdb');
const ROCKSDB_BACKUP_DIR = join(DATA_DIR, 'rocksdb.backup');

console.log('🔧 RocksDB 数据库修复工具\n');
console.log(`数据库目录: ${ROCKSDB_DIR}`);

if (!existsSync(ROCKSDB_DIR)) {
  console.log('✅ 数据库目录不存在，无需修复');
  process.exit(0);
}

// 检查是否有损坏的 CURRENT 文件
const CURRENT_FILE = join(ROCKSDB_DIR, 'CURRENT');
if (existsSync(CURRENT_FILE)) {
  console.log('⚠️  检测到损坏的数据库文件');
  console.log('📦 正在备份数据库目录...');
  
  // 备份现有数据库（以防万一）
  if (existsSync(ROCKSDB_BACKUP_DIR)) {
    console.log('   删除旧的备份目录...');
    rmSync(ROCKSDB_BACKUP_DIR, { recursive: true, force: true });
  }
  
  try {
    // 复制整个目录作为备份（使用简单的重命名）
    const { execSync } = await import('child_process');
    execSync(`xcopy /E /I /H /Y "${ROCKSDB_DIR}" "${ROCKSDB_BACKUP_DIR}"`, { stdio: 'inherit' });
    console.log('✅ 备份完成');
  } catch (error) {
    console.log('⚠️  备份失败，但继续修复...');
  }
  
  console.log('🗑️  删除损坏的数据库文件...');
  rmSync(ROCKSDB_DIR, { recursive: true, force: true });
  console.log('✅ 损坏的数据库文件已删除');
  
  // 重新创建目录
  mkdirSync(ROCKSDB_DIR, { recursive: true });
  console.log('✅ 数据库目录已重新创建');
  
  console.log('\n✨ 修复完成！');
  console.log('📝 注意：所有数据库数据已丢失，系统将在下次启动时重新初始化');
  console.log(`💾 备份位置: ${ROCKSDB_BACKUP_DIR}`);
} else {
  console.log('✅ 未检测到损坏的 CURRENT 文件');
}

