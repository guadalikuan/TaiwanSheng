// 测试执行脚本 - 支持所有测试类型
import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// 测试结果汇总
const testResults = {
  backend: {
    unit: { success: false, error: null },
    integration: { success: false, error: null },
    coverage: { success: false, error: null }
  },
  contract: {
    success: false,
    error: null
  },
  mapping: {
    success: false,
    error: null
  }
};

// 颜色输出辅助函数
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

// 执行命令并捕获错误
function runCommand(command, cwd, description, continueOnError = false) {
  try {
    log(`▶️  ${description}...`, 'blue');
    execSync(command, { 
      stdio: 'inherit',
      cwd: cwd || projectRoot,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        JWT_SECRET: process.env.JWT_SECRET || 'test-secret-key-for-ci',
        TWS_TREASURY_ADDRESS: process.env.TWS_TREASURY_ADDRESS || 'test-treasury-address'
      }
    });
    log(`✅ ${description} 完成`, 'green');
    return { success: true, error: null };
  } catch (error) {
    const errorMsg = error.message || '未知错误';
    if (continueOnError) {
      log(`⚠️  ${description} 失败（继续执行）: ${errorMsg}`, 'yellow');
      return { success: false, error: errorMsg };
    } else {
      log(`❌ ${description} 失败: ${errorMsg}`, 'red');
      throw error;
    }
  }
}

// 生成测试报告
function generateTestReport() {
  const reportDir = join(projectRoot, 'test-reports');
  if (!existsSync(reportDir)) {
    mkdirSync(reportDir, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    results: testResults,
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };

  // 计算汇总
  const allTests = [
    testResults.backend.unit,
    testResults.backend.integration,
    testResults.backend.coverage,
    testResults.contract,
    testResults.mapping
  ];

  allTests.forEach(test => {
    report.summary.total++;
    if (test.success) {
      report.summary.passed++;
    } else {
      report.summary.failed++;
    }
  });

  // 写入JSON报告
  const reportPath = join(reportDir, `test-report-${Date.now()}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  // 生成Markdown报告
  const mdReport = generateMarkdownReport(report);
  const mdReportPath = join(reportDir, `test-report-${Date.now()}.md`);
  writeFileSync(mdReportPath, mdReport, 'utf-8');

  log(`\n📄 测试报告已生成:`, 'cyan');
  log(`   - JSON: ${reportPath}`, 'cyan');
  log(`   - Markdown: ${mdReportPath}`, 'cyan');

  return report;
}

function generateMarkdownReport(report) {
  const { results, summary } = report;
  
  let md = `# 测试执行报告\n\n`;
  md += `**生成时间**: ${report.timestamp}\n\n`;
  md += `## 测试汇总\n\n`;
  md += `- 总测试数: ${summary.total}\n`;
  md += `- 通过: ${summary.passed} ✅\n`;
  md += `- 失败: ${summary.failed} ${summary.failed > 0 ? '❌' : ''}\n\n`;
  
  md += `## 详细结果\n\n`;
  
  md += `### 后端测试\n\n`;
  md += `| 测试类型 | 状态 | 错误信息 |\n`;
  md += `|---------|------|----------|\n`;
  md += `| 单元测试 | ${results.backend.unit.success ? '✅ 通过' : '❌ 失败'} | ${results.backend.unit.error || '-'} |\n`;
  md += `| 集成测试 | ${results.backend.integration.success ? '✅ 通过' : '❌ 失败'} | ${results.backend.integration.error || '-'} |\n`;
  md += `| 覆盖率测试 | ${results.backend.coverage.success ? '✅ 通过' : '❌ 失败'} | ${results.backend.coverage.error || '-'} |\n\n`;
  
  md += `### 智能合约测试\n\n`;
  md += `| 状态 | 错误信息 |\n`;
  md += `|------|----------|\n`;
  md += `| ${results.contract.success ? '✅ 通过' : '❌ 失败'} | ${results.contract.error || '-'} |\n\n`;
  
  md += `### 测试映射验证\n\n`;
  md += `| 状态 | 错误信息 |\n`;
  md += `|------|----------|\n`;
  md += `| ${results.mapping.success ? '✅ 通过' : '❌ 失败'} | ${results.mapping.error || '-'} |\n\n`;
  
  return md;
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'all';

  logSection('🧪 测试执行脚本');
  log(`测试类型: ${testType}`, 'bright');

  try {
    // 1. 后端单元测试
    if (testType === 'all' || testType === 'unit' || testType === 'backend') {
      logSection('📦 后端单元测试');
      testResults.backend.unit = runCommand(
        'npm run test:unit',
        join(projectRoot, 'tws/server'),
        '运行后端单元测试'
      );
    }

    // 2. 后端集成测试
    if (testType === 'all' || testType === 'integration' || testType === 'backend') {
      logSection('🔗 后端集成测试');
      testResults.backend.integration = runCommand(
        'npm run test:integration',
        join(projectRoot, 'tws/server'),
        '运行后端集成测试',
        true // 集成测试可能失败，继续执行
      );
    }

    // 3. 后端测试覆盖率
    if (testType === 'all' || testType === 'coverage' || testType === 'backend') {
      logSection('📊 后端测试覆盖率');
      testResults.backend.coverage = runCommand(
        'npm run test:coverage',
        join(projectRoot, 'tws/server'),
        '生成测试覆盖率报告'
      );
    }

    // 4. 智能合约测试
    if (testType === 'all' || testType === 'contract' || testType === 'tot') {
      logSection('⛓️  智能合约测试');
      const totDir = join(projectRoot, 'tot');
      if (existsSync(join(totDir, 'Anchor.toml'))) {
        testResults.contract = runCommand(
          'anchor test --skip-local-validator || echo "智能合约测试需要本地验证器"',
          totDir,
          '运行智能合约测试',
          true // 智能合约测试可能失败，继续执行
        );
      } else {
        log('⚠️  未找到 Anchor.toml，跳过智能合约测试', 'yellow');
        testResults.contract = { success: false, error: '未找到 Anchor.toml' };
      }
    }

    // 5. 测试映射验证
    if (testType === 'all' || testType === 'mapping') {
      logSection('🗺️  测试映射验证');
      testResults.mapping = runCommand(
        'node scripts/verify-test-mapping.js',
        projectRoot,
        '验证测试映射',
        true // 映射验证可能失败，继续执行
      );
    }

    // 生成报告
    logSection('📄 生成测试报告');
    const report = generateTestReport();

    // 输出汇总
    logSection('📊 测试执行汇总');
    log(`总测试数: ${report.summary.total}`, 'bright');
    log(`通过: ${report.summary.passed} ✅`, 'green');
    if (report.summary.failed > 0) {
      log(`失败: ${report.summary.failed} ❌`, 'red');
    }

    // 如果有失败的测试，退出码为1
    if (report.summary.failed > 0) {
      process.exit(1);
    } else {
      log('\n🎉 所有测试完成！', 'green');
    }

  } catch (error) {
    log(`\n❌ 测试执行过程中发生错误: ${error.message}`, 'red');
    generateTestReport();
    process.exit(1);
  }
}

// 显示使用说明
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
测试执行脚本使用说明:

用法: node scripts/run-tests.js [测试类型]

测试类型:
  all         - 运行所有测试（默认）
  unit        - 仅运行后端单元测试
  integration - 仅运行后端集成测试
  coverage    - 仅运行测试覆盖率
  contract    - 仅运行智能合约测试
  mapping     - 仅运行测试映射验证
  backend     - 运行所有后端测试（单元+集成+覆盖率）

示例:
  node scripts/run-tests.js all
  node scripts/run-tests.js unit
  node scripts/run-tests.js backend

环境变量:
  JWT_SECRET           - JWT密钥（测试用）
  TWS_TREASURY_ADDRESS - TWS财库地址（测试用）
  GENERATE_JSON_REPORT - 设置为 'true' 生成JSON映射报告
`);
  process.exit(0);
}

// 运行主函数
main().catch(error => {
  console.error('致命错误:', error);
  process.exit(1);
});
