const anchor = require('@coral-xyz/anchor');
const { Connection, Keypair, PublicKey, SystemProgram } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');
const config = require('../solana.config.js');

// TaiOneToken 铸造地址
const TaiOneToken_MINT = new PublicKey('ZRGboZN3K6JZYhGe8PHDcazwKuqhgp2tTG7h8G5fKGk');
// 向后兼容
const TWSCoin_MINT = TaiOneToken_MINT;

async function main() {
  console.log('🚀 开始部署 TWS Asset 程序到 Solana...\n');

  // 使用统一配置
  const cluster = config.CLUSTER;
  const rpcUrl = config.getRpcUrl();
  
  const connection = new Connection(rpcUrl, 'confirmed');
  console.log(`📡 连接到 ${cluster} 网络: ${rpcUrl}`);
  console.log(`   网络名称: ${config.getNetworkName()}`);
  if (config.isProduction()) {
    console.log(`   ⚠️  警告: 这是主网部署，需要真实 SOL!\n`);
  }

  // 加载钱包
  const walletPath = config.WALLET_PATH.replace('~', require('os').homedir());
  
  if (!fs.existsSync(walletPath)) {
    console.error(`❌ 钱包文件不存在: ${walletPath}`);
    console.error('请先创建 Solana 钱包: solana-keygen new');
    process.exit(1);
  }

  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );

  console.log('💰 钱包地址:', walletKeypair.publicKey.toString());

  // 检查余额
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log('💵 余额:', (balance / 1e9).toFixed(4), 'SOL');

  if (balance < 0.1e9) {
    console.warn('⚠️  余额不足，可能需要更多 SOL 用于部署');
    if (cluster === 'devnet') {
      console.log('💡 在 devnet 上获取测试 SOL: solana airdrop 2');
    }
  }

  // 加载程序 ID
  const programIdPath = path.join(__dirname, '../target/deploy/tws_asset-keypair.json');
  let programId;
  
  if (fs.existsSync(programIdPath)) {
    const programKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(fs.readFileSync(programIdPath, 'utf-8')))
    );
    programId = programKeypair.publicKey;
    console.log('📦 程序 ID:', programId.toString());
  } else {
    console.error('❌ 程序密钥文件不存在:', programIdPath);
    console.error('请先运行: anchor build');
    process.exit(1);
  }

  // 加载 IDL
  const idlPath = path.join(__dirname, '../target/idl/tws_asset.json');
  if (!fs.existsSync(idlPath)) {
    console.error('❌ IDL 文件不存在:', idlPath);
    console.error('请先运行: anchor build');
    process.exit(1);
  }

  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
  
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(walletKeypair),
    { commitment: 'confirmed' }
  );
  anchor.setProvider(provider);

  const program = new anchor.Program(idl, programId, provider);

  console.log('\n✅ 程序加载成功!');
  console.log('程序 ID:', programId.toString());
  console.log('TaiOneToken 地址:', TaiOneToken_MINT.toString());

  // 保存部署信息
  const deploymentInfo = {
    network: cluster,
    deployedAt: new Date().toISOString(),
    deployer: walletKeypair.publicKey.toString(),
    programId: programId.toString(),
    twscoinMint: TaiOneToken_MINT.toString(),
    rpcUrl: rpcUrl,
  };

  const deploymentDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentDir, `solana-${cluster}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log('\n📄 部署信息已保存到:', deploymentFile);

  console.log('\n🎉 部署准备完成!');
  console.log('\n💡 下一步操作:');
  console.log('  1. 使用 initialize_bunker 初始化资产账户');
  console.log('  2. 使用 mint_bunker_shares 铸造资产份额');
  console.log('  3. 使用 trigger_unification 触发统一事件');
  console.log('  4. 使用 redeem_property 赎回资产（统一后）');
  console.log('\n📝 示例代码请参考: scripts/initialize-bunker.js');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ 部署失败:', error);
    if (error.message) {
      console.error('错误信息:', error.message);
    }
    process.exit(1);
  });

