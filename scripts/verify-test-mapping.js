// 验证测试用例与功能点编号的对应关系
import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// 读取功能清单
const featureInventory = JSON.parse(
  readFileSync(join(projectRoot, 'docs/FEATURE_INVENTORY.json'), 'utf-8')
);

// 递归查找所有测试文件
function findTestFiles(dir, fileList = []) {
  try {
    const files = readdirSync(dir);
    files.forEach(file => {
      const filePath = join(dir, file);
      const stat = statSync(filePath);
      if (stat.isDirectory()) {
        // 跳过 node_modules 和其他不需要的目录
        if (!file.startsWith('.') && file !== 'node_modules' && file !== 'coverage') {
          findTestFiles(filePath, fileList);
        }
      } else if (file.endsWith('.test.js') || file.endsWith('.test.ts')) {
        fileList.push(filePath);
      }
    });
  } catch (error) {
    // 忽略无法访问的目录
  }
  return fileList;
}

// 查找所有测试文件（后端和智能合约）
const backendTestFiles = findTestFiles(join(projectRoot, 'tws/server/tests'));
const contractTestFiles = findTestFiles(join(projectRoot, 'tot/tests'));
const testFiles = [...backendTestFiles, ...contractTestFiles];

console.log('🔍 验证测试用例与功能点映射...\n');

const featureIds = new Set();
featureInventory.features.backend.forEach(f => featureIds.add(f.id));
featureInventory.features.smartContract.forEach(f => featureIds.add(f.id));

const mappedFeatures = new Set();
const unmappedFeatures = new Set(featureIds);

// 扫描测试文件中的功能点编号
for (const testFile of testFiles) {
  const content = readFileSync(testFile, 'utf-8');
  const matches = content.match(/F-[A-Z]+-\d+-v\d+\.\d+/g);
  
  if (matches) {
    matches.forEach(match => {
      if (featureIds.has(match)) {
        mappedFeatures.add(match);
        unmappedFeatures.delete(match);
      }
    });
  }
}

console.log(`✅ 已映射的功能点: ${mappedFeatures.size}/${featureIds.size}`);
console.log(`❌ 未映射的功能点: ${unmappedFeatures.size}\n`);

if (unmappedFeatures.size > 0) {
  console.log('未映射的功能点列表:');
  Array.from(unmappedFeatures).slice(0, 10).forEach(f => {
    console.log(`  - ${f}`);
  });
  if (unmappedFeatures.size > 10) {
    console.log(`  ... 还有 ${unmappedFeatures.size - 10} 个`);
  }
}

const coverage = featureIds.size > 0 
  ? ((mappedFeatures.size / featureIds.size) * 100).toFixed(2)
  : '0.00';
console.log(`\n📊 测试映射覆盖率: ${coverage}%`);
console.log(`📁 扫描的测试文件数: ${testFiles.length}`);
console.log(`   - 后端测试: ${backendTestFiles.length}`);
console.log(`   - 智能合约测试: ${contractTestFiles.length}`);

// 生成详细报告
const report = {
  timestamp: new Date().toISOString(),
  totalFeatures: featureIds.size,
  mappedFeatures: mappedFeatures.size,
  unmappedFeatures: unmappedFeatures.size,
  coverage: parseFloat(coverage),
  testFiles: {
    backend: backendTestFiles.length,
    contract: contractTestFiles.length,
    total: testFiles.length
  },
  unmappedFeatureList: Array.from(unmappedFeatures).slice(0, 50)
};

// 输出JSON报告（如果环境变量要求）
if (process.env.GENERATE_JSON_REPORT === 'true') {
  writeFileSync(
    join(projectRoot, 'test-mapping-report.json'),
    JSON.stringify(report, null, 2),
    'utf-8'
  );
  console.log('\n📄 JSON报告已生成: test-mapping-report.json');
}

if (unmappedFeatures.size > 0) {
  console.log('\n⚠️  存在未映射的功能点，测试映射验证失败');
  process.exit(1);
} else {
  console.log('\n✅ 所有功能点都已映射到测试用例');
}
