// ============================================
// 文件: tests/execute-tests.ts
// 测试执行脚本 - 检查环境并执行所有测试
// ============================================

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

/**
 * 测试组配置
 */
interface TestGroup {
  name: string;
  files: string[];
  description: string;
}

const testGroups: TestGroup[] = [
  {
    name: "组1: 基础初始化测试",
    files: ["tests/initialize.test.ts"],
    description: "基础测试套件和初始化相关测试",
  },
  {
    name: "组2: 池子和铸造测试",
    files: ["tests/pools.test.ts", "tests/mint.test.ts"],
    description: "所有5个池子的初始化和铸造测试",
  },
  {
    name: "组3: 持有者和税率管理测试",
    files: ["tests/holder.test.ts", "tests/tax.test.ts"],
    description: "持有者管理和税率配置测试",
  },
  {
    name: "组4: 转账和税率计算测试",
    files: ["tests/transfer.test.ts", "tests/tax-calculation.test.ts"],
    description: "带税转账和税率计算测试",
  },
  {
    name: "组5: 管理员和错误测试",
    files: ["tests/admin.test.ts", "tests/errors.test.ts", "tests/boundary.test.ts"],
    description: "管理员功能和错误场景测试",
  },
];

/**
 * 检查环境
 */
function checkEnvironment(): { anchorInstalled: boolean; envConfigured: boolean } {
  try {
    execSync("anchor --version", { stdio: "ignore" });
    return { anchorInstalled: true, envConfigured: !!process.env.ANCHOR_PROVIDER_URL };
  } catch {
    return { anchorInstalled: false, envConfigured: false };
  }
}

/**
 * 执行测试组
 */
function runTestGroup(group: TestGroup, index: number): { success: boolean; output: string; error?: string } {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`📦 ${group.name} (${index + 1}/${testGroups.length})`);
  console.log(`📝 描述: ${group.description}`);
  console.log(`📄 文件: ${group.files.join(", ")}`);
  console.log(`${"=".repeat(80)}\n`);

  const filesArg = group.files.join(" ");
  
  try {
    // 尝试使用anchor test
    const output = execSync(
      `anchor test --skip-local-validator ${filesArg}`,
      { 
        encoding: "utf-8",
        cwd: path.join(__dirname, ".."),
        stdio: "pipe",
        env: { ...process.env }
      }
    );
    
    console.log("✅ 测试组执行成功");
    console.log(output);
    return { success: true, output };
  } catch (error: any) {
    const errorOutput = error.stdout?.toString() || error.stderr?.toString() || error.message || error.toString();
    console.error("❌ 测试组执行失败");
    console.error(errorOutput);
    return { success: false, output: errorOutput, error: errorOutput };
  }
}

/**
 * 生成测试报告
 */
function generateReport(results: Array<{ group: TestGroup; success: boolean; output: string; error?: string }>, totalTime: number) {
  const reportsDir = path.join(__dirname, "reports");
  const reportJson = {
    stats: {
      suites: testGroups.length,
      tests: 0, // 需要从实际测试结果中统计
      passes: 0,
      pending: 0,
      failures: results.filter(r => !r.success).length,
      start: new Date().toISOString(),
      end: new Date().toISOString(),
      duration: totalTime,
    },
    results: results.map((result, index) => ({
      uuid: `group-${index + 1}`,
      title: result.group.name,
      fullFile: result.group.files.join(", "),
      file: result.group.files[0],
      duration: 0,
      suites: [],
      tests: [],
      passes: result.success ? 1 : 0,
      failures: result.success ? 0 : 1,
      pending: 0,
      skipped: 0,
      hasTests: true,
      hasSuites: false,
      hasPasses: result.success,
      hasFailures: !result.success,
      hasPending: false,
      hasSkipped: false,
    })),
  };

  // 保存JSON报告
  const jsonPath = path.join(reportsDir, "report.json");
  fs.writeFileSync(jsonPath, JSON.stringify(reportJson, null, 2));
  console.log(`\n📄 JSON报告已生成: ${jsonPath}`);

  // 生成HTML报告（简化版）
  const htmlReport = generateHTMLReport(reportJson, results);
  const htmlPath = path.join(reportsDir, "report.html");
  fs.writeFileSync(htmlPath, htmlReport);
  console.log(`📄 HTML报告已生成: ${htmlPath}`);
}

/**
 * 生成HTML报告
 */
function generateHTMLReport(_reportJson: any, results: Array<any>): string {
  const passCount = results.filter(r => r.success).length;
  const failCount = results.length - passCount;
  const passRate = ((passCount / results.length) * 100).toFixed(1);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TOT项目测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .stat-card { flex: 1; padding: 15px; border-radius: 5px; text-align: center; }
        .stat-card.pass { background: #4CAF50; color: white; }
        .stat-card.fail { background: #f44336; color: white; }
        .stat-card.total { background: #2196F3; color: white; }
        .stat-card.rate { background: #FF9800; color: white; }
        .stat-number { font-size: 2em; font-weight: bold; }
        .stat-label { margin-top: 5px; }
        .test-group { margin: 20px 0; padding: 15px; border-left: 4px solid #ddd; background: #f9f9f9; }
        .test-group.pass { border-left-color: #4CAF50; }
        .test-group.fail { border-left-color: #f44336; }
        .test-group h3 { margin-top: 0; }
        .error { background: #ffebee; padding: 10px; border-radius: 4px; margin-top: 10px; font-family: monospace; font-size: 0.9em; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; font-weight: bold; }
        .status-pass { color: #4CAF50; font-weight: bold; }
        .status-fail { color: #f44336; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 TOT项目测试报告</h1>
        <p><strong>生成时间:</strong> ${new Date().toLocaleString("zh-CN")}</p>
        
        <div class="summary">
            <div class="stat-card total">
                <div class="stat-number">${results.length}</div>
                <div class="stat-label">测试组总数</div>
            </div>
            <div class="stat-card pass">
                <div class="stat-number">${passCount}</div>
                <div class="stat-label">通过</div>
            </div>
            <div class="stat-card fail">
                <div class="stat-number">${failCount}</div>
                <div class="stat-label">失败</div>
            </div>
            <div class="stat-card rate">
                <div class="stat-number">${passRate}%</div>
                <div class="stat-label">通过率</div>
            </div>
        </div>

        <h2>测试组详情</h2>
        ${results.map((result) => `
        <div class="test-group ${result.success ? 'pass' : 'fail'}">
            <h3>${result.success ? '✅' : '❌'} ${result.group.name}</h3>
            <p><strong>描述:</strong> ${result.group.description}</p>
            <p><strong>测试文件:</strong> ${result.group.files.join(", ")}</p>
            ${result.error ? `<div class="error"><strong>错误信息:</strong><br>${result.error.replace(/\n/g, '<br>')}</div>` : ''}
        </div>
        `).join('')}

        <h2>测试统计表</h2>
        <table>
            <thead>
                <tr>
                    <th>测试组</th>
                    <th>状态</th>
                    <th>文件数</th>
                    <th>描述</th>
                </tr>
            </thead>
            <tbody>
                ${results.map(result => `
                <tr>
                    <td>${result.group.name}</td>
                    <td class="status-${result.success ? 'pass' : 'fail'}">${result.success ? '✅ 通过' : '❌ 失败'}</td>
                    <td>${result.group.files.length}</td>
                    <td>${result.group.description}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>`;
}

/**
 * 主执行函数
 */
async function main() {
  console.log("🚀 TOT项目全面测试执行");
  console.log(`📅 执行时间: ${new Date().toLocaleString("zh-CN")}\n`);

  // 检查环境
  const env = checkEnvironment();
  if (!env.anchorInstalled) {
    console.log("⚠️  警告: Anchor CLI未安装");
    console.log("   请先安装Anchor: cargo install --git https://github.com/coral-xyz/anchor avm --locked --force");
    console.log("   然后安装Anchor版本: avm install latest && avm use latest\n");
  }

  if (!env.envConfigured) {
    console.log("⚠️  警告: ANCHOR_PROVIDER_URL环境变量未设置");
    console.log("   测试可能需要连接到Solana网络（devnet/localnet）\n");
  }

  const results: Array<{ group: TestGroup; success: boolean; output: string; error?: string }> = [];
  const startTime = Date.now();

  // 逐个执行测试组
  for (let i = 0; i < testGroups.length; i++) {
    const group = testGroups[i];
    const result = runTestGroup(group, i);
    results.push({ group, ...result });
    
    // 短暂延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const endTime = Date.now();
  const totalTime = ((endTime - startTime) / 1000);

  // 生成总结
  console.log(`\n${"=".repeat(80)}`);
  console.log("📊 测试执行总结");
  console.log(`${"=".repeat(80)}`);
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  const passRate = ((successCount / results.length) * 100).toFixed(1);
  
  console.log(`总测试组数: ${testGroups.length}`);
  console.log(`✅ 成功: ${successCount}`);
  console.log(`❌ 失败: ${failCount}`);
  console.log(`📈 通过率: ${passRate}%`);
  console.log(`⏱️  总耗时: ${totalTime.toFixed(2)}秒\n`);

  // 显示每个组的详细结果
  console.log("详细结果:");
  results.forEach((result, index) => {
    const status = result.success ? "✅" : "❌";
    console.log(`  ${status} [${index + 1}] ${result.group.name}`);
  });

  // 生成报告
  console.log(`\n${"=".repeat(80)}`);
  console.log("📝 生成测试报告...");
  console.log(`${"=".repeat(80)}\n`);

  generateReport(results, totalTime);

  console.log(`\n✅ 测试执行完成！`);
  console.log(`📁 报告位置: tests/reports/`);
  console.log(`   - report.html (HTML格式)`);
  console.log(`   - report.json (JSON格式)`);
}

// 执行
main().catch(console.error);
