// ============================================
// 文件: tests/run-all-tests.ts
// 测试执行脚本 - 按组执行所有测试并生成报告
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
    files: ["tests/tot-token.ts", "tests/initialize.test.ts"],
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
 * 执行测试组
 */
function runTestGroup(group: TestGroup, index: number): { success: boolean; output: string } {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`${group.name} (${index + 1}/${testGroups.length})`);
  console.log(`描述: ${group.description}`);
  console.log(`文件: ${group.files.join(", ")}`);
  console.log(`${"=".repeat(80)}\n`);

  const filesArg = group.files.join(" ");
  
  try {
    // 使用anchor test执行测试
    const output = execSync(
      `anchor test --skip-local-validator ${filesArg}`,
      { 
        encoding: "utf-8",
        cwd: path.join(__dirname, ".."),
        stdio: "pipe"
      }
    );
    
    console.log(output);
    return { success: true, output };
  } catch (error: any) {
    const errorOutput = error.stdout?.toString() || error.message || error.toString();
    console.error("❌ 测试组执行失败:");
    console.error(errorOutput);
    return { success: false, output: errorOutput };
  }
}

/**
 * 主执行函数
 */
async function main() {
  console.log("🚀 开始执行TOT项目全面测试");
  console.log(`📅 执行时间: ${new Date().toLocaleString("zh-CN")}\n`);

  const results: Array<{ group: TestGroup; success: boolean; output: string }> = [];
  const startTime = Date.now();

  // 逐个执行测试组
  for (let i = 0; i < testGroups.length; i++) {
    const group = testGroups[i];
    const result = runTestGroup(group, i);
    results.push({ group, ...result });
    
    // 短暂延迟，确保输出清晰
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const endTime = Date.now();
  const totalTime = ((endTime - startTime) / 1000).toFixed(2);

  // 生成总结
  console.log(`\n${"=".repeat(80)}`);
  console.log("📊 测试执行总结");
  console.log(`${"=".repeat(80)}`);
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  
  console.log(`总测试组数: ${testGroups.length}`);
  console.log(`✅ 成功: ${successCount}`);
  console.log(`❌ 失败: ${failCount}`);
  console.log(`⏱️  总耗时: ${totalTime}秒\n`);

  // 显示每个组的详细结果
  results.forEach((result, index) => {
    const status = result.success ? "✅" : "❌";
    console.log(`${status} ${result.group.name}`);
  });

  // 生成报告
  console.log(`\n${"=".repeat(80)}`);
  console.log("📝 生成测试报告...");
  console.log(`${"=".repeat(80)}\n`);

  // 这里可以调用报告生成逻辑
  // 由于anchor test会自动生成报告，我们只需要合并和格式化

  console.log("✅ 测试执行完成！");
  console.log(`📁 报告位置: tests/reports/`);
}

// 执行
main().catch(console.error);
