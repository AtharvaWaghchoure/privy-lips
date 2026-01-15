import { ethers } from "ethers";

// Contract addresses on Mantle Sepolia Testnet
// Latest deployment (Production-ready with SP1 integration)
export const CONTRACT_ADDRESSES = {
  // Mock Tokens
  MOCK_USDC: process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS || "0xCA0c9a09a0926E21a2B7fC31CF3244f310f3eDa1",
  MOCK_WETH: process.env.NEXT_PUBLIC_MOCK_WETH_ADDRESS || "0x585D41f5175C9c25317065d3e91dA3A62a34eBF4",

  // Core Contracts
  COMMITMENT_REGISTRY: process.env.NEXT_PUBLIC_COMMITMENT_REGISTRY_ADDRESS || "0x0030207E8FC159b104d017b042e2EE7b1f6eAc30",
  PRIVATE_LIQUIDITY_POOL: process.env.NEXT_PUBLIC_POOL_ADDRESS || "0x17a14fA7f90CAB24561F3eB9F7854aE667fEC2E4",
  YIELD_ACCUMULATOR: process.env.NEXT_PUBLIC_YIELD_ACCUMULATOR_ADDRESS || "0xDD3b8164B11006ce289a6E1E310782611fd83Add",
  SELECTIVE_DISCLOSURE: process.env.NEXT_PUBLIC_SELECTIVE_DISCLOSURE_ADDRESS || "0x8Af45a8854dA5Fe5193D87678Acd579a01F15ca1",
  ZK_KYC_REGISTRY: process.env.NEXT_PUBLIC_ZK_KYC_REGISTRY_ADDRESS || "0x0ee7210B4b74E536A222C18c26Cf2B25e141103e",
  
  // SP1 Verifier (Optional - set to enable SP1 verification)
  SP1_VERIFIER_ADAPTER: process.env.NEXT_PUBLIC_SP1_VERIFIER_ADAPTER_ADDRESS || "",
};

export function getContract(address: string, abi: any, provider: ethers.providers.Provider) {
  return new ethers.Contract(address, abi, provider);
}

// Contract ABIs will be exported here after compilation
export const ABIS = {
  // Will be populated from compiled contracts
};

