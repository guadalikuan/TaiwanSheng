// 生成测试文件模板脚本
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// 读取功能清单
const featureInventory = JSON.parse(
  readFileSync(join(projectRoot, 'docs/FEATURE_INVENTORY.json'), 'utf-8')
);

// 模块代码到路由文件的映射
const MODULE_TO_ROUTE = {
  'AUTH': 'auth.js',
  'USER': 'users.js',
  'ARS': 'arsenal.js',
  'APOOL': 'assetPool.js',
  'AUC': 'auction.js',
  'PRED': 'prediction.js',
  'TECH': 'techProject.js',
  'INV': 'investments.js',
  'MYASSET': 'myAssets.js',
  'MKT': 'market.js',
  'ANC': 'ancestor.js',
  'RWA': 'rwaTrade.js',
  'TOTP': 'totPurchase.js',
  'MAP': 'mapActions.js',
  'LB': 'leaderboard.js',
  'REF': 'referral.js',
  'PAY': 'payment.js',
  'ADMIN': 'admin.js',
  'HOME': 'homepage.js',
  'OPEN': 'open.js',
  'ORACLE': 'oracle.js',
  'TOKEN': 'token.js',
  'BUNKER': 'bunker.js',
  'SSE': 'sse.js',
};

// 生成测试文件模板
function generateTestTemplate(moduleCode, features) {
  const routeFile = MODULE_TO_ROUTE[moduleCode] || `${moduleCode.toLowerCase()}.js`;
  const testFileName = routeFile.replace('.js', '.test.js');
  const testFilePath = join(projectRoot, 'tws/server/tests/unit/routes', testFileName);
  
  if (existsSync(testFilePath)) {
    console.log(`⏭️  跳过已存在的测试文件: ${testFileName}`);
    return;
  }

  let template = `// ${moduleCode}模块路由测试
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import ${moduleCode.toLowerCase()}Routes from '../../routes/${routeFile}';
import { testUsers } from '../../fixtures/testUsers.js';

const app = express();
app.use(express.json());
app.use('/api/${moduleCode.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase()}', ${moduleCode.toLowerCase()}Routes);

`;

  // 为每个功能点生成测试套件
  features.forEach(feature => {
    const featureName = feature.description.split('\n')[0].trim() || feature.path;
    template += `describe('${feature.id}: ${featureName}', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该成功执行${featureName}', async () => {
    // TODO: 实现测试用例
    // Mock必要的依赖
    // 发送请求
    // 验证响应
  });

  it('应该处理错误情况', async () => {
    // TODO: 实现错误处理测试
  });
});

`;
  });

  writeFileSync(testFilePath, template, 'utf-8');
  console.log(`✅ 生成测试文件: ${testFileName}`);
}

// 主函数
async function main() {
  console.log('🔧 生成测试文件模板...\n');

  // 按模块分组功能点
  const featuresByModule = {};
  featureInventory.features.backend.forEach(f => {
    if (!featuresByModule[f.module]) {
      featuresByModule[f.module] = [];
    }
    featuresByModule[f.module].push(f);
  });

  // 为每个模块生成测试文件
  for (const [module, features] of Object.entries(featuresByModule)) {
    generateTestTemplate(module, features);
  }

  console.log('\n✅ 测试文件模板生成完成！');
}

main().catch(console.error);
