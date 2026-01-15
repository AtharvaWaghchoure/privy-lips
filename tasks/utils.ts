import { ethers } from "hardhat";

export async function getContractAddresses() {
  // This will be populated after deployment
  return {
    COMMITMENT_REGISTRY: process.env.COMMITMENT_REGISTRY_ADDRESS || "",
    PRIVATE_LIQUIDITY_POOL: process.env.POOL_ADDRESS || "",
    YIELD_ACCUMULATOR: process.env.YIELD_ACCUMULATOR_ADDRESS || "",
    SELECTIVE_DISCLOSURE: process.env.SELECTIVE_DISCLOSURE_ADDRESS || "",
    ZK_KYC_REGISTRY: process.env.ZK_KYC_REGISTRY_ADDRESS || "",
  };
}

export async function waitForDeployment(tx: any) {
  const receipt = await tx.wait();
  console.log(`Deployed at: ${receipt.contractAddress}`);
  return receipt.contractAddress;
}

