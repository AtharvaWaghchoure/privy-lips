import { task } from "hardhat/config";

/**
 * Deploy all contracts with mock ERC20 tokens for testing
 * This is useful when you don't have real USDC/WETH addresses on testnet
 */
task("deploy-with-mocks", "Deploy all contracts with mock ERC20 tokens")
  .setAction(async (taskArgs, hre) => {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying all contracts with mock tokens...");
    console.log("Deployer address:", deployer.address);
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:", hre.ethers.utils.formatEther(balance), "MNT");

    // 0. Deploy mock ERC20 tokens
    console.log("\n0. Deploying mock ERC20 tokens...");
    const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
    const token0 = await ERC20Mock.deploy("USDC", "USDC", 6);
    const token1 = await ERC20Mock.deploy("WETH", "WETH", 18);
    await token0.deployed();
    await token1.deployed();
    console.log("Mock USDC deployed to:", token0.address);
    console.log("Mock WETH deployed to:", token1.address);

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
      token0.address,
      token1.address,
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

    // 6. Deploy SP1VerifierAdapter (optional - for production SP1 verification)
    // Note: For MVP/testing, contracts will use fallback verification
    // Set SP1_VERIFIER_ADDRESS env var to deploy with real SP1 verifier
    let sp1VerifierAdapterAddress = "0x0000000000000000000000000000000000000000";
    const sp1VerifierAddress = process.env.SP1_VERIFIER_ADDRESS;
    
    if (sp1VerifierAddress && sp1VerifierAddress !== "0x0000000000000000000000000000000000000000") {
      console.log("\n6. Deploying SP1VerifierAdapter...");
      const SP1VerifierAdapter = await hre.ethers.getContractFactory("SP1VerifierAdapter");
      const sp1Adapter = await SP1VerifierAdapter.deploy(sp1VerifierAddress);
      await sp1Adapter.deployed();
      sp1VerifierAdapterAddress = sp1Adapter.address;
      console.log("SP1VerifierAdapter deployed to:", sp1VerifierAdapterAddress);
      
      // Set SP1 verifier in contracts
      console.log("\n7. Configuring SP1 verifier in contracts...");
      await disclosure.setSP1Verifier(sp1VerifierAdapterAddress);
      console.log("SP1 verifier set in SelectiveDisclosure");
      await kycRegistry.setSP1Verifier(sp1VerifierAdapterAddress);
      console.log("SP1 verifier set in ZKKYCRegistry");
    } else {
      console.log("\n6. Skipping SP1VerifierAdapter deployment (using fallback verification)");
      console.log("   To enable SP1 verification, set SP1_VERIFIER_ADDRESS env var");
    }

    console.log("\n=== Deployment Summary ===");
    console.log("Mock USDC:", token0.address);
    console.log("Mock WETH:", token1.address);
    console.log("CommitmentRegistry:", registryAddress);
    console.log("PrivateLiquidityPool:", poolAddress);
    console.log("YieldAccumulator:", accumulatorAddress);
    console.log("SelectiveDisclosure:", disclosureAddress);
    console.log("ZKKYCRegistry:", kycRegistryAddress);
    if (sp1VerifierAdapterAddress !== "0x0000000000000000000000000000000000000000") {
      console.log("SP1VerifierAdapter:", sp1VerifierAdapterAddress);
    }

    console.log("\n=== Add these to your .env file ===");
    console.log(`MOCK_USDC_ADDRESS=${token0.address}`);
    console.log(`MOCK_WETH_ADDRESS=${token1.address}`);
    console.log(`COMMITMENT_REGISTRY_ADDRESS=${registryAddress}`);
    console.log(`POOL_ADDRESS=${poolAddress}`);
    console.log(`YIELD_ACCUMULATOR_ADDRESS=${accumulatorAddress}`);
    console.log(`SELECTIVE_DISCLOSURE_ADDRESS=${disclosureAddress}`);
    console.log(`ZK_KYC_REGISTRY_ADDRESS=${kycRegistryAddress}`);
    if (sp1VerifierAdapterAddress !== "0x0000000000000000000000000000000000000000") {
      console.log(`SP1_VERIFIER_ADAPTER_ADDRESS=${sp1VerifierAdapterAddress}`);
    }

    console.log("\n=== View on Mantle Sepolia Explorer ===");
    console.log(`https://sepolia.mantlescan.xyz/address/${poolAddress}`);
  });

