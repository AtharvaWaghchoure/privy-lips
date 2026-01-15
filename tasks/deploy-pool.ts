import { task } from "hardhat/config";
import { getContractAddresses } from "./utils";

task("deploy-pool", "Deploy PrivateLiquidityPool")
  .addParam("token0", "Address of token0 (USDC)")
  .addParam("token1", "Address of token1 (WETH)")
  .addParam("registry", "Address of CommitmentRegistry")
  .setAction(async (taskArgs, hre) => {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying PrivateLiquidityPool with account:", deployer.address);

    const PrivateLiquidityPool = await hre.ethers.getContractFactory("PrivateLiquidityPool");
    const pool = await PrivateLiquidityPool.deploy(
      taskArgs.token0,
      taskArgs.token1,
      taskArgs.registry,
      deployer.address
    );
    await pool.waitForDeployment();

    const address = await pool.getAddress();
    console.log("PrivateLiquidityPool deployed to:", address);
    console.log("Set POOL_ADDRESS in .env:", address);

    // Set pool address in registry
    const CommitmentRegistry = await hre.ethers.getContractFactory("CommitmentRegistry");
    const registry = CommitmentRegistry.attach(taskArgs.registry);
    await registry.setPoolAddress(address);
    console.log("Pool address set in registry");

    return address;
  });

