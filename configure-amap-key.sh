#!/bin/bash

# 高德地图 API Key 配置脚本

echo "🔧 高德地图 API Key 配置工具"
echo "=============================="
echo ""

# 检查 .env 文件是否存在
if [ ! -f .env ]; then
    echo "❌ .env 文件不存在，正在创建..."
    touch .env
fi

# 提示用户输入 API Key
echo "请输入您的高德地图 API Key:"
echo "（如果还没有，请访问 https://console.amap.com/ 获取）"
echo ""
read -p "API Key: " api_key

# 验证输入
if [ -z "$api_key" ]; then
    echo ""
    echo "❌ API Key 不能为空"
    exit 1
fi

# 备份 .env 文件
if [ -f .env ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ 已备份 .env 文件"
fi

# 检查是否已存在 VITE_AMAP_API_KEY
if grep -q "^VITE_AMAP_API_KEY=" .env; then
    # 更新现有的配置
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^VITE_AMAP_API_KEY=.*|VITE_AMAP_API_KEY=${api_key}|" .env
    else
        # Linux
        sed -i "s|^VITE_AMAP_API_KEY=.*|VITE_AMAP_API_KEY=${api_key}|" .env
    fi
    echo "✅ 已更新 VITE_AMAP_API_KEY"
else
    # 添加新配置
    echo "" >> .env
    echo "# 高德地图 API Key（用于更准确的中国地址搜索）" >> .env
    echo "# 获取方式：访问 https://console.amap.com/ 注册并创建应用，添加 Web服务 API Key" >> .env
    echo "VITE_AMAP_API_KEY=${api_key}" >> .env
    echo "✅ 已添加 VITE_AMAP_API_KEY"
fi

echo ""
echo "✅ 配置完成！"
echo ""
echo "📋 配置的 API Key 前缀: ${api_key:0:8}..."
echo ""
echo "💡 下一步:"
echo "   1. 重启开发服务器（Ctrl+C 停止，然后 npm run dev）"
echo "   2. 访问测试页面: http://localhost:5174/test-amap"
echo "   3. 应该显示 '✅ 已检测到高德地图 API Key 配置'"
echo ""

