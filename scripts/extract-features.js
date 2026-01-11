// ============================================
// 文件: scripts/extract-features.js
// 功能: 自动扫描代码，提取所有功能点
// ============================================

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// 功能点存储
const features = {
  backend: [],
  frontend: [],
  smartContract: [],
};

// 模块代码映射
const MODULE_CODES = {
  'auth.js': 'AUTH',
  'users.js': 'USER',
  'arsenal.js': 'ARS',
  'assetPool.js': 'APOOL',
  'auction.js': 'AUC',
  'prediction.js': 'PRED',
  'techProject.js': 'TECH',
  'investments.js': 'INV',
  'myAssets.js': 'MYASSET',
  'market.js': 'MKT',
  'ancestor.js': 'ANC',
  'rwaTrade.js': 'RWA',
  'totPurchase.js': 'TOTP',
  'mapActions.js': 'MAP',
  'leaderboard.js': 'LB',
  'referral.js': 'REF',
  'payment.js': 'PAY',
  'admin.js': 'ADMIN',
  'homepage.js': 'HOME',
  'open.js': 'OPEN',
  'oracle.js': 'ORACLE',
  'token.js': 'TOKEN',
  'bunker.js': 'BUNKER',
  'sse.js': 'SSE',
};

/**
 * 提取路由文件中的API端点
 */
function extractRouteFeatures(filePath, fileName) {
  const content = readFileSync(filePath, 'utf-8');
  const moduleCode = MODULE_CODES[fileName] || 'UNKNOWN';
  const features = [];
  
  // 匹配 router.get/post/put/delete/patch
  const routePattern = /router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
  let match;
  let index = 1;
  
  while ((match = routePattern.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const path = match[2];
    
    // 查找函数定义（可能是async函数）
    const afterMatch = content.substring(match.index);
    const funcMatch = afterMatch.match(/(?:async\s+)?(?:function\s+)?\s*\([^)]*\)\s*=>|async\s*\([^)]*\)\s*=>/);
    
    // 尝试提取注释中的功能描述
    const beforeMatch = content.substring(0, match.index);
    const commentMatch = beforeMatch.match(/(?:\/\*\*[\s\S]*?\*\/|\/\/[^\n]*)/g);
    let description = '';
    if (commentMatch && commentMatch.length > 0) {
      const lastComment = commentMatch[commentMatch.length - 1];
      description = lastComment.replace(/\/\*\*|\*\/|\/\/|\*/g, '').trim();
    }
    
    const featureId = `F-${moduleCode}-${String(index).padStart(3, '0')}-v1.0`;
    
    features.push({
      id: featureId,
      type: 'API',
      module: moduleCode,
      method,
      path,
      description: description || `${method} ${path}`,
      file: `server/routes/${fileName}`,
      line: content.substring(0, match.index).split('\n').length,
      version: 'v1.0',
      status: 'active',
    });
    
    index++;
  }
  
  return features;
}

/**
 * 提取智能合约指令
 */
function extractContractFeatures(filePath, fileName) {
  const content = readFileSync(filePath, 'utf-8');
  const features = [];
  
  // 匹配 pub fn 函数定义
  const fnPattern = /pub\s+fn\s+(\w+)\s*\([^)]*\)\s*->\s*Result<[^>]+>/g;
  let match;
  let index = 1;
  
  // 提取模块名（从文件路径）
  const moduleName = fileName.replace('.rs', '').toUpperCase();
  
  while ((match = fnPattern.exec(content)) !== null) {
    const fnName = match[1];
    
    // 查找函数注释
    const beforeMatch = content.substring(0, match.index);
    const commentMatch = beforeMatch.match(/(?:\/\/![\s\S]*?)(?=\n\s*pub\s+fn|\Z)/);
    let description = '';
    if (commentMatch) {
      description = commentMatch[0].replace(/\/\/!/g, '').trim();
    }
    
    const featureId = `F-TOT-${moduleName}-${String(index).padStart(3, '0')}-v1.0`;
    
    features.push({
      id: featureId,
      type: 'CONTRACT',
      module: `TOT-${moduleName}`,
      function: fnName,
      description: description || fnName,
      file: `tot/src/instructions/${fileName}`,
      line: content.substring(0, match.index).split('\n').length,
      version: 'v1.0',
      status: 'active',
    });
    
    index++;
  }
  
  return features;
}

/**
 * 扫描目录
 */
function scanDirectory(dir, relativePath = '') {
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      // 跳过node_modules、.git等目录
      if (!['node_modules', '.git', 'target', 'dist', 'build', 'coverage'].includes(entry)) {
        scanDirectory(fullPath, join(relativePath, entry));
      }
    } else if (stat.isFile()) {
      // 处理路由文件
      if (relativePath.includes('server/routes') && entry.endsWith('.js')) {
        const routeFeatures = extractRouteFeatures(fullPath, entry);
        features.backend.push(...routeFeatures);
      }
      
      // 处理智能合约文件
      if (relativePath.includes('tot/src/instructions') && entry.endsWith('.rs')) {
        const contractFeatures = extractContractFeatures(fullPath, entry);
        features.smartContract.push(...contractFeatures);
      }
    }
  }
}

/**
 * 生成功能清单Markdown
 */
function generateFeatureInventory() {
  let md = `# 项目功能清单

## 版本信息
- 文档版本: v1.0
- 最后更新: ${new Date().toISOString()}
- 维护者: TWS Development Team

## 功能统计
- 总功能数: ${features.backend.length + features.smartContract.length + features.frontend.length}
- 后端API: ${features.backend.length}
- 智能合约: ${features.smartContract.length}
- 前端功能: ${features.frontend.length}
- 已实现: ${features.backend.length + features.smartContract.length + features.frontend.length}
- 待实现: 0
- 已废弃: 0

## 功能分类

`;

  // 按模块分组后端功能
  const backendByModule = {};
  features.backend.forEach(f => {
    if (!backendByModule[f.module]) {
      backendByModule[f.module] = [];
    }
    backendByModule[f.module].push(f);
  });

  md += `### 后端API模块\n\n`;
  Object.keys(backendByModule).sort().forEach(module => {
    md += `#### ${module}模块\n\n`;
    backendByModule[module].forEach(f => {
      md += `- **${f.id}**: ${f.method} ${f.path} - ${f.description}\n`;
      md += `  - 文件: \`${f.file}\`\n`;
      md += `  - 版本: ${f.version}\n`;
      md += `  - 状态: ${f.status}\n\n`;
    });
  });

  // 按模块分组智能合约功能
  const contractByModule = {};
  features.smartContract.forEach(f => {
    const module = f.module.split('-')[1] || 'UNKNOWN';
    if (!contractByModule[module]) {
      contractByModule[module] = [];
    }
    contractByModule[module].push(f);
  });

  md += `### 智能合约模块\n\n`;
  Object.keys(contractByModule).sort().forEach(module => {
    md += `#### ${module}模块\n\n`;
    contractByModule[module].forEach(f => {
      md += `- **${f.id}**: ${f.function} - ${f.description}\n`;
      md += `  - 文件: \`${f.file}\`\n`;
      md += `  - 版本: ${f.version}\n`;
      md += `  - 状态: ${f.status}\n\n`;
    });
  });

  // 详细功能描述
  md += `## 详细功能描述\n\n`;
  
  [...features.backend, ...features.smartContract].forEach(f => {
    md += `### ${f.id}\n\n`;
    md += `- **功能名称**: ${f.description}\n`;
    md += `- **所属模块**: ${f.module}\n`;
    md += `- **版本号**: ${f.version}\n`;
    md += `- **文件路径**: \`${f.file}\`\n`;
    if (f.type === 'API') {
      md += `- **HTTP方法**: ${f.method}\n`;
      md += `- **API路径**: ${f.path}\n`;
    } else if (f.type === 'CONTRACT') {
      md += `- **函数名**: ${f.function}\n`;
    }
    md += `- **状态**: ${f.status}\n\n`;
  });

  return md;
}

/**
 * 生成功能清单JSON
 */
function generateFeatureJSON() {
  return JSON.stringify({
    version: '1.0',
    generatedAt: new Date().toISOString(),
    features: {
      backend: features.backend,
      smartContract: features.smartContract,
      frontend: features.frontend,
    },
  }, null, 2);
}

// 主函数
function main() {
  console.log('🔍 开始扫描项目功能点...');
  
  // 扫描后端路由
  const routesDir = join(projectRoot, 'tws/server/routes');
  if (statSync(routesDir).isDirectory()) {
    scanDirectory(routesDir, 'server/routes');
  }
  
  // 扫描智能合约
  const instructionsDir = join(projectRoot, 'tot/src/instructions');
  try {
    if (statSync(instructionsDir).isDirectory()) {
      scanDirectory(instructionsDir, 'tot/src/instructions');
    }
  } catch (error) {
    console.warn('智能合约目录不存在，跳过:', error.message);
  }
  
  console.log(`✅ 扫描完成:`);
  console.log(`   - 后端API: ${features.backend.length}个`);
  console.log(`   - 智能合约: ${features.smartContract.length}个`);
  console.log(`   - 前端功能: ${features.frontend.length}个`);
  
  // 生成文档
  const docsDir = join(projectRoot, 'docs');
  try {
    mkdirSync(docsDir, { recursive: true });
  } catch (error) {
    // 目录已存在，忽略错误
  }
  
  const inventoryMd = generateFeatureInventory();
  const inventoryJson = generateFeatureJSON();
  
  writeFileSync(join(docsDir, 'FEATURE_INVENTORY.md'), inventoryMd, 'utf-8');
  writeFileSync(join(docsDir, 'FEATURE_INVENTORY.json'), inventoryJson, 'utf-8');
  
  console.log('✅ 功能清单文档已生成:');
  console.log(`   - docs/FEATURE_INVENTORY.md`);
  console.log(`   - docs/FEATURE_INVENTORY.json`);
}

main();
