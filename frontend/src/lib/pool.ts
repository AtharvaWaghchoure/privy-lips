import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "./contracts";
import { generateCommitment, generateNullifier } from "./commitments";

// Import ABIs
import PrivateLiquidityPoolABI from "./abis/PrivateLiquidityPool.json";
import ERC20MockABI from "./abis/ERC20Mock.json";
import SelectiveDisclosureABI from "./abis/SelectiveDisclosure.json";
import YieldAccumulatorABI from "./abis/YieldAccumulator.json";
import ZKKYCRegistryABI from "./abis/ZKKYCRegistry.json";
import CommitmentRegistryABI from "./abis/CommitmentRegistry.json";

export interface DepositParams {
  amount0: string; // USDC amount (in token units, e.g., "1000000" for 1 USDC with 6 decimals)
  amount1: string; // WETH amount (in token units, e.g., "1000000000000000000" for 1 WETH)
  signer: ethers.Signer;
}

export interface DepositResult {
  commitment: string;
  liquidity: string;
  txHash: string;
  secret: string; // hex-encoded secret for withdrawal
}

/**
 * Deposit liquidity privately to the pool
 */
export async function depositLiquidity(params: DepositParams): Promise<DepositResult> {
  const { amount0, amount1, signer } = params;
  
  // Convert amounts to BigNumber
  const amount0BN = ethers.BigNumber.from(amount0);
  const amount1BN = ethers.BigNumber.from(amount1);

  // Generate commitment (mock for MVP - in production would use SP1 proof)
  const secret = ethers.utils.randomBytes(32);
  const totalAmount = amount0BN.add(amount1BN);
  const commitment = generateCommitment(totalAmount.toBigInt(), secret);
  
  // Store secret for later withdrawal (in production, this would be encrypted)
  // Note: For MVP, we return the secret in the result. In production, this should be handled more securely.
  const secretHex = ethers.utils.hexlify(secret);

  // Get contract instances
  const pool = new ethers.Contract(
    CONTRACT_ADDRESSES.PRIVATE_LIQUIDITY_POOL,
    PrivateLiquidityPoolABI,
    signer
  );

  const token0 = new ethers.Contract(
    CONTRACT_ADDRESSES.MOCK_USDC,
    ERC20MockABI,
    signer
  );

  const token1 = new ethers.Contract(
    CONTRACT_ADDRESSES.MOCK_WETH,
    ERC20MockABI,
    signer
  );

  // Approve tokens
  if (amount0BN.gt(0)) {
    const approve0Tx = await token0.approve(CONTRACT_ADDRESSES.PRIVATE_LIQUIDITY_POOL, amount0BN);
    await approve0Tx.wait();
  }

  if (amount1BN.gt(0)) {
    const approve1Tx = await token1.approve(CONTRACT_ADDRESSES.PRIVATE_LIQUIDITY_POOL, amount1BN);
    await approve1Tx.wait();
  }

  // Deposit with commitment
  const proof = "0x"; // Mock proof for MVP
  const depositTx = await pool.deposit(commitment, amount0BN, amount1BN, proof);
  const receipt = await depositTx.wait();

  // Get liquidity from event
  const depositEvent = receipt.events?.find((e: any) => e.event === "Deposit");
  const liquidity = depositEvent?.args?.liquidity?.toString() || "0";

  return {
    commitment,
    liquidity,
    txHash: receipt.transactionHash,
    secret: secretHex,
  };
}

/**
 * Get pool reserves
 */
export async function getPoolReserves(provider: ethers.providers.Provider) {
  const pool = new ethers.Contract(
    CONTRACT_ADDRESSES.PRIVATE_LIQUIDITY_POOL,
    PrivateLiquidityPoolABI,
    provider
  );

  const [reserve0, reserve1] = await pool.getReserves();
  return {
    reserve0: reserve0.toString(),
    reserve1: reserve1.toString(),
  };
}

/**
 * Mint test tokens (for testing)
 */
export async function mintTestTokens(
  signer: ethers.Signer,
  amount0: string,
  amount1: string
) {
  const token0 = new ethers.Contract(
    CONTRACT_ADDRESSES.MOCK_USDC,
    ERC20MockABI,
    signer
  );

  const token1 = new ethers.Contract(
    CONTRACT_ADDRESSES.MOCK_WETH,
    ERC20MockABI,
    signer
  );

  const address = await signer.getAddress();

  const mint0Tx = await token0.mint(address, amount0);
  await mint0Tx.wait();

  const mint1Tx = await token1.mint(address, amount1);
  await mint1Tx.wait();
}

export interface WithdrawParams {
  commitment: string;
  secret: Uint8Array; // Secret used to generate the commitment
  liquidity: string; // LP tokens to withdraw
  signer: ethers.Signer;
}

export interface WithdrawResult {
  amount0: string;
  amount1: string;
  txHash: string;
  nullifier: string;
}

/**
 * Withdraw liquidity privately from the pool
 */
export async function withdrawLiquidity(params: WithdrawParams): Promise<WithdrawResult> {
  const { commitment, secret, liquidity, signer } = params;
  
  const liquidityBN = ethers.BigNumber.from(liquidity);
  
  // Generate nullifier
  const nullifier = generateNullifier(commitment, secret);
  
  // Get contract instance
  const pool = new ethers.Contract(
    CONTRACT_ADDRESSES.PRIVATE_LIQUIDITY_POOL,
    PrivateLiquidityPoolABI,
    signer
  );
  
  // Withdraw with proof
  const proof = "0x"; // Mock proof for MVP
  const withdrawTx = await pool.withdraw(
    commitment,
    nullifier,
    liquidityBN,
    proof
  );
  const receipt = await withdrawTx.wait();
  
  // Get amounts from event
  const withdrawEvent = receipt.events?.find((e: any) => e.event === "Withdrawal");
  const amount0 = withdrawEvent?.args?.amount0?.toString() || "0";
  const amount1 = withdrawEvent?.args?.amount1?.toString() || "0";
  
  return {
    amount0,
    amount1,
    txHash: receipt.transactionHash,
    nullifier,
  };
}

/**
 * Get user's LP token balance
 */
export async function getUserLPBalance(
  provider: ethers.providers.Provider,
  userAddress: string
): Promise<string> {
  const pool = new ethers.Contract(
    CONTRACT_ADDRESSES.PRIVATE_LIQUIDITY_POOL,
    PrivateLiquidityPoolABI,
    provider
  );
  
  const balance = await pool.balanceOf(userAddress);
  return balance.toString();
}

/**
 * Get commitment LP tokens (how much liquidity is associated with a commitment)
 */
export async function getCommitmentLPTokens(
  provider: ethers.providers.Provider,
  commitment: string
): Promise<string> {
  const pool = new ethers.Contract(
    CONTRACT_ADDRESSES.PRIVATE_LIQUIDITY_POOL,
    PrivateLiquidityPoolABI,
    provider
  );
  
  const tokens = await pool.commitmentLPTokens(commitment);
  return tokens.toString();
}

export interface YieldProofParams {
  commitment: string;
  startTime: number;
  endTime: number;
  minYield: string;
  maxYield: string;
  signer: ethers.Signer;
}

export interface TaxReportResult {
  reportId: string;
  txHash: string;
}

/**
 * Get yield for a commitment
 */
export async function getCommitmentYield(
  provider: ethers.providers.Provider,
  commitment: string
): Promise<{ yield: string; lastUpdate: number }> {
  const accumulator = new ethers.Contract(
    CONTRACT_ADDRESSES.YIELD_ACCUMULATOR,
    YieldAccumulatorABI,
    provider
  );

  const [yieldAmount, lastUpdate] = await accumulator.getYield(commitment);
  return {
    yield: yieldAmount.toString(),
    lastUpdate: lastUpdate.toNumber(),
  };
}

/**
 * Get yield in a time range
 */
export async function getYieldInRange(
  provider: ethers.providers.Provider,
  commitment: string,
  startTime: number,
  endTime: number
): Promise<string> {
  const accumulator = new ethers.Contract(
    CONTRACT_ADDRESSES.YIELD_ACCUMULATOR,
    YieldAccumulatorABI,
    provider
  );

  const yieldAmount = await accumulator.getYieldInRange(commitment, startTime, endTime);
  return yieldAmount.toString();
}

/**
 * Generate fees by performing a small swap (for testing)
 * This creates fees that can then be accrued as yield
 */
export async function generateFeesViaSwap(
  signer: ethers.Signer,
  amountIn: string // Amount of token0 to swap (will generate fees)
): Promise<string> {
  const pool = new ethers.Contract(
    CONTRACT_ADDRESSES.PRIVATE_LIQUIDITY_POOL,
    PrivateLiquidityPoolABI,
    signer
  );

  const token0 = new ethers.Contract(
    CONTRACT_ADDRESSES.MOCK_USDC,
    ERC20MockABI,
    signer
  );

  const amountInBN = ethers.BigNumber.from(amountIn);
  
  // Approve token
  const approveTx = await token0.approve(CONTRACT_ADDRESSES.PRIVATE_LIQUIDITY_POOL, amountInBN);
  await approveTx.wait();

  // Get current reserves to calculate output
  const [reserve0, reserve1] = await pool.getReserves();
  
  // Calculate output using constant product formula (with fee)
  // amountOut = (amountIn * 997 * reserve1) / (reserve0 * 1000 + amountIn * 997)
  const amountInWithFee = amountInBN.mul(997); // 0.3% fee
  const numerator = amountInWithFee.mul(reserve1);
  const denominator = reserve0.mul(1000).add(amountInWithFee);
  const amountOut = numerator.div(denominator);

  // Perform swap: swap token0 for token1
  const swapTx = await pool.swap(
    amountInBN, // amount0In
    ethers.BigNumber.from(0), // amount1In
    ethers.BigNumber.from(0), // amount0Out
    amountOut, // amount1Out
    await signer.getAddress() // to
  );
  
  const receipt = await swapTx.wait();
  return receipt.transactionHash;
}

/**
 * Check commitment shares and fees before accruing yield
 */
export async function checkCommitmentStatus(
  provider: ethers.providers.Provider,
  commitment: string
): Promise<{
  hasCommitment: boolean;
  shares: string;
  fees0: string;
  fees1: string;
  totalSupply: string;
}> {
  const registry = new ethers.Contract(
    CONTRACT_ADDRESSES.COMMITMENT_REGISTRY,
    require("./abis/CommitmentRegistry.json"),
    provider
  );

  const pool = new ethers.Contract(
    CONTRACT_ADDRESSES.PRIVATE_LIQUIDITY_POOL,
    PrivateLiquidityPoolABI,
    provider
  );

  const accumulator = new ethers.Contract(
    CONTRACT_ADDRESSES.YIELD_ACCUMULATOR,
    YieldAccumulatorABI,
    provider
  );

  const hasCommitment = await registry.commitments(commitment);
  const shares = await registry.commitmentToShares(commitment);
  const [fees0, fees1] = await pool.getAccumulatedFees();
  const totalSupply = await pool.totalSupply();

  return {
    hasCommitment,
    shares: shares.toString(),
    fees0: fees0.toString(),
    fees1: fees1.toString(),
    totalSupply: totalSupply.toString(),
  };
}

/**
 * Accrue yield for a commitment (for testing)
 * Note: In production, this would be called automatically by a keeper
 */
export async function accrueYieldForCommitment(
  signer: ethers.Signer,
  commitment: string
): Promise<string> {
  const accumulator = new ethers.Contract(
    CONTRACT_ADDRESSES.YIELD_ACCUMULATOR,
    YieldAccumulatorABI,
    signer
  );

  // Check status first
  const provider = signer.provider;
  if (provider) {
    const status = await checkCommitmentStatus(provider, commitment);
    if (!status.hasCommitment) {
      throw new Error("Commitment not found in registry");
    }
    if (status.shares === "0") {
      throw new Error("Commitment has no shares. Make sure deposit was successful.");
    }
    if (status.fees0 === "0" && status.fees1 === "0") {
      throw new Error("No fees accumulated. Generate fees via swap first.");
    }
  }

  const tx = await accumulator.accrueYield(commitment);
  const receipt = await tx.wait();
  
  // Get yield from event
  const yieldEvent = receipt.events?.find((e: any) => e.event === "YieldAccrued");
  const yieldAmount = yieldEvent?.args?.yieldAmount?.toString() || "0";
  
  return yieldAmount;
}

/**
 * Verify yield proof
 */
export async function verifyYieldProof(
  signer: ethers.Signer,
  commitment: string,
  minYield: string,
  maxYield: string
): Promise<boolean> {
  const disclosure = new ethers.Contract(
    CONTRACT_ADDRESSES.SELECTIVE_DISCLOSURE,
    SelectiveDisclosureABI,
    signer
  );

  const proof = "0x"; // Mock proof for MVP
  const publicInputs = "0x"; // Mock public inputs for MVP

  try {
    const verified = await disclosure.verifyYieldProof(
      commitment,
      minYield,
      maxYield,
      proof,
      publicInputs
    );
    return verified;
  } catch (error) {
    console.error("Proof verification failed:", error);
    return false;
  }
}

/**
 * Generate tax report with selective disclosure
 */
export async function generateTaxReport(
  params: YieldProofParams
): Promise<TaxReportResult> {
  const { commitment, startTime, endTime, minYield, maxYield, signer } = params;

  // Verify commitment exists in registry before attempting to generate report
  const provider = signer.provider;
  if (!provider) {
    throw new Error("No provider available");
  }

  // Check if commitment exists
  const registry = new ethers.Contract(
    CONTRACT_ADDRESSES.COMMITMENT_REGISTRY,
    CommitmentRegistryABI,
    provider
  );

  const commitmentExists = await registry.commitments(commitment);
  if (!commitmentExists) {
    throw new Error(
      `Commitment ${commitment.slice(0, 10)}...${commitment.slice(-8)} not found in registry. ` +
      `Make sure the deposit was successful and the commitment was registered. ` +
      `You may need to make a deposit first, or check that you're using the correct commitment hash.`
    );
  }

  const disclosure = new ethers.Contract(
    CONTRACT_ADDRESSES.SELECTIVE_DISCLOSURE,
    SelectiveDisclosureABI,
    signer
  );

  const proof = "0x"; // Mock proof for MVP
  const publicInputs = "0x"; // Mock public inputs for MVP

  const tx = await disclosure.generateTaxReport(
    commitment,
    startTime,
    endTime,
    minYield,
    maxYield,
    proof,
    publicInputs
  );

  const receipt = await tx.wait();

  // Get report ID from event
  const reportEvent = receipt.events?.find((e: any) => e.event === "TaxReportGenerated");
  const reportId = reportEvent?.args?.reportId || ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["bytes32", "uint256", "uint256", "uint256", "uint256", "uint256", "address"],
      [commitment, startTime, endTime, minYield, maxYield, receipt.blockNumber, await signer.getAddress()]
    )
  );

  return {
    reportId,
    txHash: receipt.transactionHash,
  };
}

/**
 * Get tax report by ID
 */
export async function getTaxReport(
  provider: ethers.providers.Provider,
  reportId: string
) {
  const disclosure = new ethers.Contract(
    CONTRACT_ADDRESSES.SELECTIVE_DISCLOSURE,
    SelectiveDisclosureABI,
    provider
  );

  const report = await disclosure.getTaxReport(reportId);
  return {
    commitment: report.commitment,
    startTime: report.startTime.toNumber(),
    endTime: report.endTime.toNumber(),
    minYield: report.minYield.toString(),
    maxYield: report.maxYield.toString(),
    verified: report.verified,
  };
}

export interface PoolInfo {
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  token0Address: string;
  token1Address: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Decimals: number;
  token1Decimals: number;
}

/**
 * Get comprehensive pool information
 */
export async function getPoolInfo(provider: ethers.providers.Provider): Promise<PoolInfo> {
  const pool = new ethers.Contract(
    CONTRACT_ADDRESSES.PRIVATE_LIQUIDITY_POOL,
    PrivateLiquidityPoolABI,
    provider
  );

  const [reserve0, reserve1] = await pool.getReserves();
  const totalSupply = await pool.totalSupply();
  const token0Address = await pool.token0();
  const token1Address = await pool.token1();

  // Get token info
  const token0 = new ethers.Contract(token0Address, ERC20MockABI, provider);
  const token1 = new ethers.Contract(token1Address, ERC20MockABI, provider);
  
  const token0Symbol = await token0.symbol();
  const token1Symbol = await token1.symbol();
  const token0Decimals = await token0.decimals();
  const token1Decimals = await token1.decimals();

  return {
    reserve0: reserve0.toString(),
    reserve1: reserve1.toString(),
    totalSupply: totalSupply.toString(),
    token0Address,
    token1Address,
    token0Symbol,
    token1Symbol,
    token0Decimals,
    token1Decimals,
  };
}

export type KYCTier = "Anonymous" | "Pseudonymous" | "Institutional";

export interface UserKYCInfo {
  tier: KYCTier;
  commitment: string;
  depositLimit: string;
  currentDeposits: string;
  canDeposit: boolean;
}

/**
 * Get user's KYC information
 */
export async function getUserKYCInfo(
  provider: ethers.providers.Provider,
  userAddress: string
): Promise<UserKYCInfo> {
  const kycRegistry = new ethers.Contract(
    CONTRACT_ADDRESSES.ZK_KYC_REGISTRY,
    ZKKYCRegistryABI,
    provider
  );

  const [tier, commitment] = await kycRegistry.getUserKYC(userAddress);
  const tierLimit = await kycRegistry.getTierLimit(tier);
  const currentDeposits = await kycRegistry.userTotalDeposits(userAddress);

  // Check if user can deposit (test with 0 amount to get limit)
  const [canDeposit, limit] = await kycRegistry.canDeposit(userAddress, 0);

  return {
    tier: ["Anonymous", "Pseudonymous", "Institutional"][tier] as KYCTier,
    commitment: commitment === ethers.constants.HashZero ? "" : commitment,
    depositLimit: tierLimit.toString(),
    currentDeposits: currentDeposits.toString(),
    canDeposit: true, // Always true for checking limit
  };
}

/**
 * Register KYC commitment
 */
export async function registerKYCCommitment(
  signer: ethers.Signer,
  tier: KYCTier,
  ageVerified: boolean = true,
  jurisdictionCompliant: boolean = true,
  accreditedInvestor: boolean = false
): Promise<{ commitment: string; txHash: string }> {
  const kycRegistry = new ethers.Contract(
    CONTRACT_ADDRESSES.ZK_KYC_REGISTRY,
    ZKKYCRegistryABI,
    signer
  );

  // Generate commitment (mock for MVP - in production would use SP1 proof)
  const secret = ethers.utils.randomBytes(32);
  const commitment = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["uint8", "bool", "bool", "bool", "bytes32"],
      [
        ["Anonymous", "Pseudonymous", "Institutional"].indexOf(tier),
        ageVerified,
        jurisdictionCompliant,
        accreditedInvestor,
        ethers.utils.hexlify(secret),
      ]
    )
  );

  // Convert tier to enum
  const tierEnum = ["Anonymous", "Pseudonymous", "Institutional"].indexOf(tier);

  // Prepare attributes
  const attributes = {
    ageVerified,
    jurisdictionCompliant,
    accreditedInvestor,
  };

  const proof = "0x"; // Mock proof for MVP
  const publicInputs = "0x"; // Mock public inputs for MVP

  const tx = await kycRegistry.registerKYCCommitment(
    commitment,
    tierEnum,
    proof,
    publicInputs,
    attributes
  );

  const receipt = await tx.wait();

  return {
    commitment,
    txHash: receipt.transactionHash,
  };
}

/**
 * Check if user can deposit a certain amount
 */
export async function checkDepositLimit(
  provider: ethers.providers.Provider,
  userAddress: string,
  amount: string
): Promise<{ allowed: boolean; limit: string; currentDeposits: string }> {
  const kycRegistry = new ethers.Contract(
    CONTRACT_ADDRESSES.ZK_KYC_REGISTRY,
    ZKKYCRegistryABI,
    provider
  );

  const amountBN = ethers.BigNumber.from(amount);
  const [allowed, limit] = await kycRegistry.canDeposit(userAddress, amountBN);
  const currentDeposits = await kycRegistry.userTotalDeposits(userAddress);

  return {
    allowed,
    limit: limit.toString(),
    currentDeposits: currentDeposits.toString(),
  };
}

export interface UserPoolStats {
  lpBalance: string;
  commitments: number;
  totalDeposited: {
    amount0: string;
    amount1: string;
  };
  tokenBalances: {
    token0: string;
    token1: string;
  };
}

/**
 * Get user's pool statistics
 */
export async function getUserPoolStats(
  provider: ethers.providers.Provider,
  userAddress: string
): Promise<UserPoolStats> {
  const pool = new ethers.Contract(
    CONTRACT_ADDRESSES.PRIVATE_LIQUIDITY_POOL,
    PrivateLiquidityPoolABI,
    provider
  );

  const lpBalance = await pool.balanceOf(userAddress);
  
  // Get token addresses
  const token0Address = await pool.token0();
  const token1Address = await pool.token1();
  
  // Get token balances
  const token0 = new ethers.Contract(token0Address, ERC20MockABI, provider);
  const token1 = new ethers.Contract(token1Address, ERC20MockABI, provider);
  
  const token0Balance = await token0.balanceOf(userAddress);
  const token1Balance = await token1.balanceOf(userAddress);
  
  // Get commitments from storage
  // Note: getCommitments now requires walletAddress
  // This function is used internally and may need walletAddress passed in
  // For now, using legacy function for backward compatibility
  const { getCommitmentsLegacy } = await import("./storage");
  const commitments = getCommitmentsLegacy();
  
  // Calculate total deposited amounts from stored commitments
  let totalAmount0 = ethers.BigNumber.from(0);
  let totalAmount1 = ethers.BigNumber.from(0);
  
  commitments.forEach(c => {
    totalAmount0 = totalAmount0.add(c.amount0);
    totalAmount1 = totalAmount1.add(c.amount1);
  });

  return {
    lpBalance: lpBalance.toString(),
    commitments: commitments.length,
    totalDeposited: {
      amount0: totalAmount0.toString(),
      amount1: totalAmount1.toString(),
    },
    tokenBalances: {
      token0: token0Balance.toString(),
      token1: token1Balance.toString(),
    },
  };
}
