// ============================================
// 文件: tests/generate-report.ts
// 测试报告生成脚本
// ============================================

import * as fs from "fs";
import * as path from "path";

/**
 * 生成测试报告
 * 
 * 从测试结果生成HTML和JSON格式的报告
 */
async function generateReport() {
  const reportsDir = path.join(__dirname, "reports");
  const mochawesomeDir = path.join(reportsDir, "mochawesome");

  // 确保报告目录存在
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  if (!fs.existsSync(mochawesomeDir)) {
    fs.mkdirSync(mochawesomeDir, { recursive: true });
  }

  console.log("📊 测试报告目录已创建:", reportsDir);
  console.log("📊 Mochawesome目录已创建:", mochawesomeDir);
}

// 执行
generateReport().catch(console.error);
