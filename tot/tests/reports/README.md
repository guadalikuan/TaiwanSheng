# 测试报告目录

此目录用于存储测试执行后生成的报告文件。

## 报告文件

- `report.html` - HTML格式的测试报告（可视化）
- `report.json` - JSON格式的测试报告（用于CI/CD集成）

## 生成报告

运行以下命令生成测试报告：

```bash
npm run test:full
```

或者：

```bash
anchor test
npm run test:generate-report
```

## 报告内容

报告包含：
- 测试概览（总数、通过、失败、跳过）
- 每个测试的详细结果
- 失败测试的错误信息
- 执行时间统计
