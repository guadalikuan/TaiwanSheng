const anchor = require('@coral-xyz/anchor');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');
const config = require('../solana.config.js');

// TWSCoin 铸造地址
const TWSCoin_MINT = new PublicKey('ZRGboZN3K6JZYhGe8PHDcazwKuqhgp2tTG7h8G5fKGk');

async function initializeAuction() {
  console.log('🚀 初始化拍卖资产账户...\n');

  // 连接到 Solana 网络
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
  const assetId = process.env.ASSET_ID ? parseInt(process.env.ASSET_ID) : 1;
  const startPrice = process.env.START_PRICE ? parseInt(process.env.START_PRICE) : 1000; // 1000 TWSCoin (最小单位)
  const tauntMessage = process.env.TAUNT_MESSAGE || '此房产已被TWS接管';
  const treasuryAddress = process.env.TREASURY_ADDRESS || walletKeypair.publicKey.toString();

  console.log('📝 初始化参数:');
  console.log('  资产 ID:', assetId);
  console.log('  起拍价:', startPrice, 'TWSCoin');
  console.log('  留言:', tauntMessage);
  console.log('  财库地址:', treasuryAddress);

  // 计算 PDA
  const [auctionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('auction'), Buffer.from(assetId.toString().padStart(8, '0'))],
    programId
  );

  console.log('\n📍 拍卖 PDA:', auctionPda.toString());

  try {
    // 调用初始化函数
    const tx = await program.methods
      .initializeAuction(
        new anchor.BN(assetId),
        new anchor.BN(startPrice),
        tauntMessage
      )
      .accounts({
        auction: auctionPda,
        twscoinMint: TWSCoin_MINT,
        treasury: new PublicKey(treasuryAddress),
        authority: walletKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log('\n✅ 初始化成功!');
    console.log('交易哈希:', tx);
    console.log('拍卖账户:', auctionPda.toString());

    // 查询账户信息
    const auctionAccount = await program.account.auctionAsset.fetch(auctionPda);
    console.log('\n📊 拍卖信息:');
    console.log('  当前房主:', auctionAccount.owner.toString());
    console.log('  当前价格:', auctionAccount.price.toString(), 'TWSCoin');
    console.log('  留言:', auctionAccount.tauntMessage);
    console.log('  资产 ID:', auctionAccount.assetId.toString());
    console.log('  TWSCoin Mint:', auctionAccount.twscoinMint.toString());
    console.log('  财库地址:', auctionAccount.treasury.toString());

    // 计算最低出价
    const currentPrice = BigInt(auctionAccount.price.toString());
    const minRequired = currentPrice * BigInt(110) / BigInt(100);
    console.log('\n💰 最低出价:', minRequired.toString(), 'TWSCoin (当前价格 + 10%)');

  } catch (error) {
    console.error('\n❌ 初始化失败:', error);
    if (error.logs) {
      console.error('错误日志:', error.logs);
    }
    throw error;
  }
}

initializeAuction()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


