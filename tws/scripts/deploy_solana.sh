#!/bin/bash

# 设置出错立即停止
set -e

echo "=== 开始 Solana 智能合约部署流程 ==="

# 1. 检查环境
if ! command -v solana &> /dev/null; then
    echo "❌ 未检测到 Solana CLI，请先安装: sh -c \"\$(curl -sSfL https://release.solana.com/v1.18.0/install)\""
    exit 1
fi

if ! command -v anchor &> /dev/null; then
    echo "❌ 未检测到 Anchor，请先安装: cargo install --git https://github.com/coral-xyz/anchor avm --locked"
    exit 1
fi

# 2. 配置网络 (Devnet)
echo "🌐 配置网络为 Devnet..."
solana config set --url devnet

# 3. 确保有钱包
if [ ! -f ~/.config/solana/id.json ]; then
    echo "🔑 未检测到钱包，正在创建..."
    solana-keygen new --no-bip39-passphrase
    echo "💸 正在领取空投测试币..."
    solana airdrop 2
fi

# --- 新增：创建测试代币 testTWS ---
echo "🪙 正在创建全新的测试代币 'testTWS'..."
# 创建代币并获取 Mint Address
# 注意：需要安装 spl-token，通常随 solana 工具集一起安装
if ! command -v spl-token &> /dev/null; then
    echo "❌ 未检测到 spl-token，尝试安装..."
    cargo install spl-token-cli || echo "⚠️ 安装失败，请手动安装 spl-token-cli"
fi

TEST_TOKEN_MINT=$(spl-token create-token --output json | grep -oP '(?<="mint": ")[^"]+')

if [ -z "$TEST_TOKEN_MINT" ]; then
    # 备用方案：如果 grep json 失败，尝试直接解析文本输出
    TEST_TOKEN_MINT=$(spl-token create-token | grep "Creating token" | awk '{print $3}')
fi

if [ -z "$TEST_TOKEN_MINT" ]; then
    echo "❌ 创建代币失败，请检查 spl-token 命令是否可用"
    exit 1
fi

echo "✅ Created Token: testTWS ($TEST_TOKEN_MINT)"

echo "💰 正在为您的钱包铸造 1,000,000 testTWS..."
spl-token create-account $TEST_TOKEN_MINT
spl-token mint $TEST_TOKEN_MINT 1000000

# 4. 构建程序
echo "🔨 正在构建合约..."

# 确保 avm 正确使用
if command -v avm &> /dev/null; then
    echo "🔧 配置 Anchor Version Manager..."
    avm use latest
fi

# 切换到项目根目录（假设脚本在 scripts/ 目录下运行）
# 获取脚本所在目录的上一级目录
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$PROJECT_ROOT"
echo "📂 切换到工作目录: $PROJECT_ROOT"

# --- 更新合约中的代币 Mint 地址 ---
echo "📝 更新合约中的代币 Mint 地址为 testTWS..."
# 替换 lib.rs 中的硬编码地址
# 这里的旧地址是您之前提供的 aZRG...
sed -i "s/pubkey!(\"ZRGboZN3K6JZYhGe8PHDcazwKuqhgp2tTG7h8G5fKGk\")/pubkey!(\"$TEST_TOKEN_MINT\")/g" programs/tws-asset/src/lib.rs

anchor build

# 5. 获取程序 ID
echo "🆔 获取程序 ID..."
PROGRAM_ID=$(solana address -k target/deploy/tws_asset-keypair.json)
echo "程序 ID: $PROGRAM_ID"

# 6. 替换 lib.rs 中的 ID
echo "📝 更新 lib.rs 中的 declare_id..."
# 使用 sed 替换 (Linux/Mac)
sed -i "s/declare_id!(\".*\");/declare_id!(\"$PROGRAM_ID\");/" programs/tws-asset/src/lib.rs

# 7. 再次构建 (因为 ID 变了)
echo "🔨 再次构建以确保存入正确的 ID..."
anchor build

# 8. 部署
echo "🚀 正在部署到 Solana Devnet..."
anchor deploy

echo "✅ 部署成功！"
echo "请记录以上 Program Id，并在前端代码中更新配置。"
