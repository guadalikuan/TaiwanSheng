#!/bin/bash

# 设置高德地图 API Key 的辅助脚本

API_KEY="$1"

if [ -z "$API_KEY" ]; then
    echo "❌ 错误: 未提供 API Key"
    echo "使用方法: ./set-amap-key.sh YOUR_API_KEY"
    exit 1
fi

# 备份 .env 文件
if [ -f .env ]; then
    BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"
    cp .env "$BACKUP_FILE"
    echo "✅ 已备份 .env 文件到: $BACKUP_FILE"
fi

# 检查操作系统类型
if [[ "$OSTYPE" == "darwin"* ]]; then
    SED_CMD="sed -i ''"
else
    SED_CMD="sed -i"
fi

# 检查是否已存在 VITE_AMAP_API_KEY
if grep -q "^VITE_AMAP_API_KEY=" .env 2>/dev/null; then
    # 更新现有的配置
    $SED_CMD "s|^VITE_AMAP_API_KEY=.*|VITE_AMAP_API_KEY=${API_KEY}|" .env
    echo "✅ 已更新 VITE_AMAP_API_KEY"
else
    # 添加新配置
    echo "" >> .env
    echo "# 高德地图 API Key（用于更准确的中国地址搜索）" >> .env
    echo "# 获取方式：访问 https://console.amap.com/ 注册并创建应用，添加 Web服务 API Key" >> .env
    echo "VITE_AMAP_API_KEY=${API_KEY}" >> .env
    echo "✅ 已添加 VITE_AMAP_API_KEY"
fi

echo ""
echo "✅ 配置完成！"
echo "📋 API Key 前缀: ${API_KEY:0:8}..."
echo ""
echo "💡 下一步:"
echo "   1. 重启开发服务器（Ctrl+C 停止，然后 npm run dev）"
echo "   2. 访问测试页面验证: http://localhost:5174/test-amap"

