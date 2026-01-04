import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { put, getAll, NAMESPACES, initRocksDB, close } from '../utils/rocksdb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '../data');

// 备份文件路径
const BACKUP_DIR = join(DATA_DIR, 'backup');
const BACKUP_TIMESTAMP = Date.now();

/**
 * 创建备份
 */
const createBackup = () => {
  const backupPath = join(BACKUP_DIR, `backup_${BACKUP_TIMESTAMP}`);
  const fs = await import('fs');
  const { mkdirSync, copyFileSync } = fs;
  
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  const filesToBackup = [
    'users.json',
    'rawAssets.json',
    'sanitizedAssets.json',
    'history.json'
  ];
  
  console.log('📦 Creating backup...');
  for (const file of filesToBackup) {
    const src = join(DATA_DIR, file);
    if (existsSync(src)) {
      const dest = join(backupPath, file);
      copyFileSync(src, dest);
      console.log(`  ✓ Backed up ${file}`);
    }
  }
  
  return backupPath;
};

/**
 * 迁移用户数据
 */
const migrateUsers = async () => {
  const usersFile = join(DATA_DIR, 'users.json');
  if (!existsSync(usersFile)) {
    console.log('⚠️  users.json not found, skipping users migration');
    return 0;
  }
  
  try {
    const users = JSON.parse(readFileSync(usersFile, 'utf8'));
    console.log(`📊 Migrating ${users.length} users...`);
    
    let count = 0;
    for (const user of users) {
      if (user.address) {
        await put(NAMESPACES.USERS, user.address.toLowerCase(), user);
        count++;
      }
    }
    
    console.log(`  ✓ Migrated ${count} users`);
    return count;
  } catch (error) {
    console.error('❌ Error migrating users:', error);
    throw error;
  }
};

/**
 * 迁移原始资产数据
 */
const migrateRawAssets = async () => {
  const rawAssetsFile = join(DATA_DIR, 'rawAssets.json');
  if (!existsSync(rawAssetsFile)) {
    console.log('⚠️  rawAssets.json not found, skipping raw assets migration');
    return 0;
  }
  
  try {
    const assets = JSON.parse(readFileSync(rawAssetsFile, 'utf8'));
    console.log(`📊 Migrating ${assets.length} raw assets...`);
    
    let count = 0;
    for (const asset of assets) {
      if (asset.id) {
        await put(NAMESPACES.RAW_ASSETS, asset.id, asset);
        count++;
      }
    }
    
    console.log(`  ✓ Migrated ${count} raw assets`);
    return count;
  } catch (error) {
    console.error('❌ Error migrating raw assets:', error);
    throw error;
  }
};

/**
 * 迁移脱敏资产数据
 */
const migrateSanitizedAssets = async () => {
  const sanitizedAssetsFile = join(DATA_DIR, 'sanitizedAssets.json');
  if (!existsSync(sanitizedAssetsFile)) {
    console.log('⚠️  sanitizedAssets.json not found, skipping sanitized assets migration');
    return 0;
  }
  
  try {
    const assets = JSON.parse(readFileSync(sanitizedAssetsFile, 'utf8'));
    console.log(`📊 Migrating ${assets.length} sanitized assets...`);
    
    let count = 0;
    for (const asset of assets) {
      if (asset.id) {
        await put(NAMESPACES.SANITIZED_ASSETS, asset.id, asset);
        
        // 按资产类型建立索引（默认为房产）
        const assetType = asset.assetType || '房产';
        const typeKey = `${assetType}:${asset.id}`;
        await put(NAMESPACES.ASSETS_BY_TYPE, typeKey, asset.id);
        
        count++;
      }
    }
    
    console.log(`  ✓ Migrated ${count} sanitized assets`);
    return count;
  } catch (error) {
    console.error('❌ Error migrating sanitized assets:', error);
    throw error;
  }
};

/**
 * 迁移历史记录
 */
const migrateHistory = async () => {
  const historyFile = join(DATA_DIR, 'history.json');
  if (!existsSync(historyFile)) {
    console.log('⚠️  history.json not found, skipping history migration');
    return 0;
  }
  
  try {
    const history = JSON.parse(readFileSync(historyFile, 'utf8'));
    console.log(`📊 Migrating ${history.length} history records...`);
    
    let count = 0;
    for (const record of history) {
      if (record.url || record.timestamp) {
        const key = `${record.timestamp || Date.now()}_${count}`;
        await put('history', key, record);
        count++;
      }
    }
    
    console.log(`  ✓ Migrated ${count} history records`);
    return count;
  } catch (error) {
    console.error('❌ Error migrating history:', error);
    throw error;
  }
};

/**
 * 验证迁移结果
 */
const verifyMigration = async () => {
  console.log('\n🔍 Verifying migration...');
  
  const users = await getAll(NAMESPACES.USERS);
  const rawAssets = await getAll(NAMESPACES.RAW_ASSETS);
  const sanitizedAssets = await getAll(NAMESPACES.SANITIZED_ASSETS);
  
  console.log(`  Users: ${users.length}`);
  console.log(`  Raw Assets: ${rawAssets.length}`);
  console.log(`  Sanitized Assets: ${sanitizedAssets.length}`);
  
  return {
    users: users.length,
    rawAssets: rawAssets.length,
    sanitizedAssets: sanitizedAssets.length
  };
};

/**
 * 主迁移函数
 */
const migrate = async () => {
  console.log('🚀 Starting migration from JSON to RocksDB...\n');
  
  try {
    // 创建备份
    const backupPath = await createBackup();
    console.log(`\n✅ Backup created at: ${backupPath}\n`);
    
    // 初始化RocksDB
    await initRocksDB();
    
    // 执行迁移
    const userCount = await migrateUsers();
    const rawAssetCount = await migrateRawAssets();
    const sanitizedAssetCount = await migrateSanitizedAssets();
    const historyCount = await migrateHistory();
    
    // 验证
    const verification = await verifyMigration();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  Users: ${userCount}`);
    console.log(`  Raw Assets: ${rawAssetCount}`);
    console.log(`  Sanitized Assets: ${sanitizedAssetCount}`);
    console.log(`  History Records: ${historyCount}`);
    console.log(`\n💾 Backup location: ${backupPath}`);
    console.log('\n⚠️  Note: Original JSON files are preserved. You can delete them after verifying the migration.');
    
    await close();
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\n💡 To rollback, restore files from backup directory');
    await close();
    process.exit(1);
  }
};

// 运行迁移
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate();
}

export { migrate, createBackup, verifyMigration };

