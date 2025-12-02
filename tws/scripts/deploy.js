const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 开始部署 TWS 智能合约...\n");

  // 获取部署账户
  const [deployer] = await hre.ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", (await hre.ethers.provider.getBalance(deployer.address)).toString(), "\n");

  // 部署参数
  const baseURI = process.env.CONTRACT_BASE_URI || "https://api.tws-project.io/metadata/";
  const platformWallet = process.env.PLATFORM_WALLET || deployer.address;

  // 1. 部署 TWS_Asset 合约
  console.log("📝 部署 TWS_Asset 合约...");
  const TWS_Asset = await hre.ethers.getContractFactory("TWS_Asset");
  const twsAsset = await TWS_Asset.deploy(baseURI, platformWallet);
  await twsAsset.waitForDeployment();
  const assetAddress = await twsAsset.getAddress();
  console.log("✅ TWS_Asset 部署成功!");
  console.log("   地址:", assetAddress, "\n");

  // 2. 部署 TWS_Oracle 合约
  console.log("🔮 部署 TWS_Oracle 合约...");
  const TWS_Oracle = await hre.ethers.getContractFactory("TWS_Oracle");
  const twsOracle = await TWS_Oracle.deploy(assetAddress);
  await twsOracle.waitForDeployment();
  const oracleAddress = await twsOracle.getAddress();
  console.log("✅ TWS_Oracle 部署成功!");
  console.log("   地址:", oracleAddress, "\n");

  // 3. 设置 Oracle 地址到 Asset 合约
  console.log("🔗 配置合约关联...");
  await twsAsset.setOracleAddress(oracleAddress);
  console.log("✅ Oracle 地址已设置到 Asset 合约\n");

  // 4. 保存部署信息
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      TWS_Asset: {
        address: assetAddress,
        transactionHash: twsAsset.deploymentTransaction()?.hash
      },
      TWS_Oracle: {
        address: oracleAddress,
        transactionHash: twsOracle.deploymentTransaction()?.hash
      }
    },
    config: {
      baseURI,
      platformWallet
    }
  };

  // 保存到文件
  const deploymentDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentDir, `${hre.network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("📄 部署信息已保存到:", deploymentFile, "\n");

  console.log("🎉 部署完成!");
  console.log("\n合约地址:");
  console.log("  TWS_Asset:", assetAddress);
  console.log("  TWS_Oracle:", oracleAddress);
  console.log("\n请将以上地址配置到环境变量中:");
  console.log("  VITE_CONTRACT_ADDRESS=", assetAddress);
  console.log("  ORACLE_CONTRACT_ADDRESS=", oracleAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

