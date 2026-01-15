import { task } from "hardhat/config";
import { getContractAddresses } from "./utils";

task("deploy-all", "Deploy all contracts")
  .addParam("token0", "Address of token0 (USDC)")
  .addParam("token1", "Address of token1 (WETH)")
  .setAction(async (taskArgs, hre) => {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying all contracts with account:", deployer.address);
    console.log("Balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

    // 1. Deploy CommitmentRegistry
    console.log("\n1. Deploying CommitmentRegistry...");
    const CommitmentRegistry = await hre.ethers.getContractFactory("CommitmentRegistry");
    const registry = await CommitmentRegistry.deploy(deployer.address);
    await registry.deployed();
    const registryAddress = registry.address;
    console.log("CommitmentRegistry deployed to:", registryAddress);

    // 2. Deploy PrivateLiquidityPool
    console.log("\n2. Deploying PrivateLiquidityPool...");
    const PrivateLiquidityPool = await hre.ethers.getContractFactory("PrivateLiquidityPool");
    const pool = await PrivateLiquidityPool.deploy(
      taskArgs.token0,
      taskArgs.token1,
      registryAddress,
      deployer.address
    );
    await pool.deployed();
    const poolAddress = pool.address;
    console.log("PrivateLiquidityPool deployed to:", poolAddress);

    // Set pool address in registry
    await registry.setPoolAddress(poolAddress);
    console.log("Pool address set in registry");

    // 3. Deploy YieldAccumulator
    console.log("\n3. Deploying YieldAccumulator...");
    const YieldAccumulator = await hre.ethers.getContractFactory("YieldAccumulator");
    const accumulator = await YieldAccumulator.deploy(
      poolAddress,
      registryAddress,
      deployer.address
    );
    await accumulator.deployed();
    const accumulatorAddress = accumulator.address;
    console.log("YieldAccumulator deployed to:", accumulatorAddress);

    // 4. Deploy SelectiveDisclosure
    console.log("\n4. Deploying SelectiveDisclosure...");
    const SelectiveDisclosure = await hre.ethers.getContractFactory("SelectiveDisclosure");
    const disclosure = await SelectiveDisclosure.deploy(
      accumulatorAddress,
      registryAddress,
      deployer.address
    );
    await disclosure.deployed();
    const disclosureAddress = disclosure.address;
    console.log("SelectiveDisclosure deployed to:", disclosureAddress);

    // 5. Deploy ZKKYCRegistry
    console.log("\n5. Deploying ZKKYCRegistry...");
    const ZKKYCRegistry = await hre.ethers.getContractFactory("ZKKYCRegistry");
    const kycRegistry = await ZKKYCRegistry.deploy(deployer.address);
    await kycRegistry.deployed();
    const kycRegistryAddress = kycRegistry.address;
    console.log("ZKKYCRegistry deployed to:", kycRegistryAddress);

    console.log("\n=== Deployment Summary ===");
    console.log("CommitmentRegistry:", registryAddress);
    console.log("PrivateLiquidityPool:", poolAddress);
    console.log("YieldAccumulator:", accumulatorAddress);
    console.log("SelectiveDisclosure:", disclosureAddress);
    console.log("ZKKYCRegistry:", kycRegistryAddress);

    console.log("\nAdd these to your .env file:");
    console.log(`COMMITMENT_REGISTRY_ADDRESS=${registryAddress}`);
    console.log(`POOL_ADDRESS=${poolAddress}`);
    console.log(`YIELD_ACCUMULATOR_ADDRESS=${accumulatorAddress}`);
    console.log(`SELECTIVE_DISCLOSURE_ADDRESS=${disclosureAddress}`);
    console.log(`ZK_KYC_REGISTRY_ADDRESS=${kycRegistryAddress}`);
  });

