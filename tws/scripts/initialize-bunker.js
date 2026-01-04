const anchor = require('@coral-xyz/anchor');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');
const config = require('../solana.config.js');

// TaiOneToken 铸造地址
const TaiOneToken_MINT = new PublicKey('ZRGboZN3K6JZYhGe8PHDcazwKuqhgp2tTG7h8G5fKGk');
// 向后兼容
const TWSCoin_MINT = TaiOneToken_MINT;

async function initializeBunker() {
  console.log('🚀 初始化地堡资产账户...\n');

  // 使用统一配置
  const cluster = config.CLUSTER;
  const rpcUrl = config.getRpcUrl();
  
  const connection = new Connection(rpcUrl, 'confirmed');
  console.log(`📡 网络: ${config.getNetworkName()} (${cluster})`);
  if (config.isProduction()) {
    console.log(`   ⚠️  警告: 这是主网操作!\n`);
  }

  // 加载钱包
  const walletPath = config.WALLET_PATH.replace('~', require('os').homedir());
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );

  // 加载程序
  const deploymentFile = path.join(__dirname, '../deployments/solana-' + cluster + '.json');
  if (!fs.existsSync(deploymentFile)) {
    console.error('❌ 部署信息文件不存在，请先运行: node scripts/deploy-solana.js');
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  const programId = new PublicKey(deployment.programId);
  
  const idlPath = path.join(__dirname, '../target/idl/tws_asset.json');
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
  
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(walletKeypair),
    { commitment: 'confirmed' }
  );
  anchor.setProvider(provider);

  const program = new anchor.Program(idl, programId, provider);

  // 初始化参数
  const bunkerId = process.env.BUNKER_ID ? parseInt(process.env.BUNKER_ID) : 1;
  const sectorCode = process.env.SECTOR_CODE || 'CN-NW-CAPITAL';
  const totalShares = process.env.TOTAL_SHARES ? parseInt(process.env.TOTAL_SHARES) : 80000;

  console.log('📝 初始化参数:');
  console.log('  地堡 ID:', bunkerId);
  console.log('  战区代码:', sectorCode);
  console.log('  总份额:', totalShares);

  // 计算 PDA
  const [bunkerPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('bunker'), Buffer.from(bunkerId.toString().padStart(8, '0'))],
    programId
  );

  console.log('\n📍 地堡 PDA:', bunkerPda.toString());

  try {
    // 调用初始化函数
    const tx = await program.methods
      .initializeBunker(
        new anchor.BN(bunkerId),
        sectorCode,
        new anchor.BN(totalShares)
      )
      .accounts({
        bunker: bunkerPda,
        twscoinMint: TaiOneToken_MINT,
        authority: walletKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log('\n✅ 初始化成功!');
    console.log('交易哈希:', tx);
    console.log('地堡账户:', bunkerPda.toString());

    // 查询账户信息
    const bunkerAccount = await program.account.bunker.fetch(bunkerPda);
    console.log('\n📊 地堡信息:');
    console.log('  管理员:', bunkerAccount.authority.toString());
    console.log('  地堡 ID:', bunkerAccount.bunkerId.toString());
    console.log('  战区代码:', bunkerAccount.sectorCode);
    console.log('  总份额:', bunkerAccount.totalShares.toString());
    console.log('  已铸造份额:', bunkerAccount.mintedShares.toString());
    console.log('  TaiOneToken Mint:', bunkerAccount.twscoinMint.toString());

  } catch (error) {
    console.error('\n❌ 初始化失败:', error);
    if (error.logs) {
      console.error('错误日志:', error.logs);
    }
    throw error;
  }
}

initializeBunker()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

