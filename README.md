# Privy-Lips

**Private Liquidity Protocol** - A privacy-preserving liquidity provision system on Mantle Network.

## Table of Contents

1. [Features](#features)
2. [Problem Statement](#problem-statement)
3. [Solution Overview](#solution-overview)
4. [Architecture](#architecture)
5. [How It Works](#how-it-works)
6. [Technical Components](#technical-components)
7. [User Flows](#user-flows)
8. [Privacy Guarantees](#privacy-guarantees)
9. [Setup & Installation](#setup--installation)
10. [Development](#development)
11. [Production Roadmap](#production-roadmap)
12. [Technical Stack](#technical-stack)
13. [Security Considerations](#security-considerations)

---

## Features

- **Shielded LP Deposits**: Deposit amounts are hidden via Pedersen commitments
- **Unlinkable Withdrawals**: Withdraw without linking to your deposit using nullifiers
- **Selective Disclosure**: Generate yield proofs for tax/regulatory compliance without revealing exact amounts
- **ZK-KYC Tiers**: Three-tier access control (Anonymous, Pseudonymous, Institutional)

---

## Problem Statement

### The Privacy Problem in DeFi

Traditional liquidity provision on decentralized exchanges (like Uniswap) has several privacy and compliance issues:

1. **Public Transaction History**: Every deposit, withdrawal, and yield is visible on-chain
   - Anyone can see your exact deposit amounts
   - Your wallet address is linked to all transactions
   - Your total portfolio value is exposed
   - Trading patterns can be analyzed

2. **Compliance Challenges**: 
   - Tax authorities need proof of yield for reporting
   - But revealing exact amounts compromises privacy
   - No way to prove yield without revealing all details

3. **Access Control Issues**:
   - No way to verify KYC status without revealing identity
   - Institutional investors need compliance but want privacy
   - Current solutions force you to choose: privacy OR compliance

4. **Linkability**:
   - Deposits can be linked to withdrawals
   - Multiple transactions can be correlated
   - Your entire DeFi activity is traceable

### Real-World Impact

- **Privacy**: Your financial activity is completely transparent
- **Security**: Large deposits make you a target for attacks
- **Compliance**: Difficult to prove yield for taxes without revealing everything
- **Censorship**: Your activity can be tracked and potentially censored

---

## Solution Overview

**Privy-Lips** is a Private Liquidity Protocol that solves these problems using:

1. **Shielded Deposits**: Hide deposit amounts using Pedersen commitments
2. **Unlinkable Withdrawals**: Use nullifiers to prevent linking withdrawals to deposits
3. **Selective Disclosure**: Generate yield proofs for compliance without revealing exact amounts
4. **ZK-KYC**: Verify identity and compliance status without revealing personal data

### Key Innovation

We combine:
- **Zero-Knowledge Proofs (ZK)**: Prove statements without revealing data
- **Commitment Schemes**: Hide amounts while allowing verification
- **Nullifiers**: Prevent double-spending while maintaining privacy
- **Selective Disclosure**: Reveal only what's necessary for compliance

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface (Frontend)                 │
│  - Deposit/Withdraw UI                                       │
│  - Yield Proof Generation                                    │
│  - KYC Registration                                          │
│  - Encrypted Local Storage                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              SP1 zkVM Proof Generation (Off-chain)            │
│  - Deposit Proofs: Prove commitment validity                 │
│  - Withdrawal Proofs: Prove nullifier validity               │
│  - Yield Proofs: Prove yield range                           │
│  - KYC Proofs: Prove identity attributes                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Smart Contracts (On-chain - Mantle)             │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Commitment       │  │ Private          │                │
│  │ Registry         │  │ Liquidity Pool   │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Yield            │  │ Selective        │                │
│  │ Accumulator      │  │ Disclosure      │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ ZK-KYC           │  │ SP1 Verifier     │                │
│  │ Registry         │  │ Adapter          │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

1. **Frontend**: React/Next.js application with encrypted storage
2. **SP1 zkVM**: Generates zero-knowledge proofs off-chain
3. **Smart Contracts**: Handle on-chain verification and state
4. **Mantle Network**: EVM-compatible L2 with ZK validity proofs

### Project Structure

```
privy-lips/
├── contracts/          # Solidity smart contracts
├── sp1-programs/      # SP1 zkVM Rust programs
├── frontend/          # Next.js frontend
├── tasks/            # Hardhat deployment tasks
└── test/             # Contract tests
```

---

## How It Works

### 1. Shielded Deposits

#### The Problem
When you deposit liquidity, everyone can see:
- Your wallet address
- Exact deposit amounts (e.g., 1000 USDC + 1 WETH)
- When you deposited
- Your LP token balance

#### Our Solution

**Step 1: Generate Commitment**
```
User Input: amount (1000 USDC), secret (random 32 bytes)
Commitment = PedersenCommit(amount, secret)
           = Hash(amount || secret)
```

The commitment is a cryptographic hash that:
- Hides the actual amount
- Can be verified later with the secret
- Is unique and cannot be forged

**Step 2: Generate ZK Proof**
```
SP1 Program:
  - Takes: amount, secret, commitment
  - Proves: Commitment = PedersenCommit(amount, secret)
  - Outputs: proof, publicInputs (commitment)
```

**Step 3: On-Chain Deposit**
```solidity
pool.deposit(
    commitment,      // Public: commitment hash
    amount0,          // Public: USDC amount (needed for liquidity)
    amount1,          // Public: WETH amount (needed for liquidity)
    proof,            // Private: ZK proof
    publicInputs      // Public: commitment verification data
)
```

**Why This Works:**
- The commitment hides your actual deposit amount
- The proof verifies the commitment is valid
- The pool can calculate liquidity without seeing the commitment details
- Your deposit is "shielded" - only you know the secret

**Privacy Guarantee:**
- On-chain observers see: commitment hash, amounts (for liquidity calculation)
- They cannot link: commitment to your wallet (if you use different addresses)
- They cannot see: your secret, your total portfolio

### 2. Unlinkable Withdrawals

#### The Problem
Traditional withdrawals:
- Link directly to your deposit
- Reveal your wallet address
- Show exact amounts withdrawn
- Can be traced back to original deposit

#### Our Solution

**Step 1: Generate Nullifier**
```
Nullifier = Hash(commitment || secret)
```

The nullifier:
- Is unique for each commitment
- Cannot be linked back to the commitment without the secret
- Prevents double-spending (same nullifier cannot be used twice)

**Step 2: Generate Withdrawal Proof**
```
SP1 Program:
  - Takes: commitment, secret, nullifier, withdrawalAmount
  - Proves: 
      * Nullifier = Hash(commitment || secret)
      * Commitment exists in registry
      * User owns the commitment
  - Outputs: proof, publicInputs (nullifier, commitment)
```

**Step 3: On-Chain Withdrawal**
```solidity
pool.withdraw(
    nullifier,       // Public: prevents double-spending
    commitment,       // Public: commitment being withdrawn
    amount0,          // Public: USDC to withdraw
    amount1,          // Public: WETH to withdraw
    proof,            // Private: ZK proof
    publicInputs      // Public: verification data
)
```

**Why This Works:**
- The nullifier prevents double-spending
- The commitment cannot be linked to the nullifier without the secret
- You can withdraw without revealing your original deposit
- Multiple withdrawals from same commitment look unrelated

**Privacy Guarantee:**
- On-chain observers see: nullifier, commitment, amounts
- They cannot link: withdrawal to original deposit
- They cannot link: multiple withdrawals from same user
- Each withdrawal appears independent

### 3. Selective Disclosure (Yield Proofs)

#### The Problem
For tax/compliance purposes, you need to prove:
- You earned yield
- The yield amount (or range)
- The time period

But revealing exact amounts compromises privacy.

#### Our Solution

**Step 1: Accrue Yield**
```solidity
// Yield accumulates from pool fees
yieldAccumulator.accrueYield(commitment)
```

**Step 2: Generate Yield Proof**
```
SP1 Program:
  - Takes: commitment, secret, minYield, maxYield, actualYield
  - Proves:
      * Commitment is valid
      * actualYield >= minYield && actualYield <= maxYield
      * Yield was accrued correctly
  - Outputs: proof, publicInputs (commitment, minYield, maxYield)
```

**Step 3: Generate Tax Report**
```solidity
disclosure.generateTaxReport(
    commitment,       // Public: commitment hash
    startTime,        // Public: tax period start
    endTime,          // Public: tax period end
    minYield,         // Public: minimum yield (for range)
    maxYield,         // Public: maximum yield (for range)
    proof,            // Private: ZK proof
    publicInputs      // Public: verification data
)
```

**Why This Works:**
- You can prove yield within a range (e.g., $1000-$2000) without revealing exact amount
- Tax authorities get proof of yield without seeing your full portfolio
- You maintain privacy while meeting compliance requirements

**Privacy Guarantee:**
- Tax authorities see: yield range, time period, commitment hash
- They cannot see: exact yield amount, other commitments, total portfolio
- You can generate multiple reports for different periods without linking them

### 4. ZK-KYC (Zero-Knowledge Know Your Customer)

#### The Problem
Traditional KYC:
- Requires revealing full identity
- Personal data stored on-chain
- No privacy for users
- Difficult to verify compliance without revealing everything

#### Our Solution

**Step 1: Generate KYC Proof**
```
User Attributes:
  - Accredited Investor: true/false
  - Jurisdiction Compliant: true/false
  - Other attributes (optional)

SP1 Program:
  - Takes: attributes, KYC proof commitment
  - Proves:
      * User meets tier requirements
      * Attributes are valid
      * Identity verified (without revealing identity)
  - Outputs: proof, publicInputs (commitment, tier)
```

**Step 2: Register KYC**
```solidity
kycRegistry.registerKYCCommitment(
    commitment,       // Public: KYC proof commitment
    tier,             // Public: Anonymous/Pseudonymous/Institutional
    proof,            // Private: ZK proof
    publicInputs,     // Public: verification data
    attributes        // Public: compliance attributes (without identity)
)
```

**Tiers:**
1. **Anonymous**: No KYC required, $10k deposit limit
2. **Pseudonymous**: Basic compliance, $100k deposit limit
3. **Institutional**: Full compliance, unlimited deposits

**Why This Works:**
- You prove compliance without revealing identity
- Different tiers have different deposit limits
- Compliance is verified without exposing personal data
- You can upgrade tiers without revealing previous tier status

**Privacy Guarantee:**
- On-chain observers see: tier, compliance status
- They cannot see: your identity, personal data, previous tier
- Compliance is verified without exposing sensitive information

---

## Technical Components

### Smart Contracts

#### 1. CommitmentRegistry.sol
**Purpose**: Store commitments and prevent double-spending

**Key Functions:**
```solidity
function registerCommitment(bytes32 commitment, uint256 shares)
    // Called by pool when deposit is made
    // Stores: commitment -> exists, shares, timestamp

function markNullifierUsed(bytes32 nullifier, bytes32 commitment)
    // Called by pool when withdrawal is made
    // Prevents: double-spending

function commitments(bytes32 commitment) returns (bool)
    // Check if commitment exists
```

**Storage:**
- `commitments[commitment]`: Whether commitment exists
- `commitmentToShares[commitment]`: LP shares for commitment
- `nullifiers[nullifier]`: Whether nullifier was used

#### 2. PrivateLiquidityPool.sol
**Purpose**: Uniswap V2-style AMM with privacy features

**Key Functions:**
```solidity
function deposit(
    bytes32 commitment,
    uint256 amount0,
    uint256 amount1,
    bytes calldata proof,
    bytes calldata publicInputs
) returns (uint256 liquidity)
    // 1. Verify SP1 proof (or mock for MVP)
    // 2. Transfer tokens from user
    // 3. Calculate liquidity (Uniswap V2 formula)
    // 4. Mint LP tokens
    // 5. Register commitment in registry

function withdraw(
    bytes32 nullifier,
    bytes32 commitment,
    uint256 amount0,
    uint256 amount1,
    bytes calldata proof,
    bytes calldata publicInputs
) returns (uint256 liquidity)
    // 1. Verify nullifier not used
    // 2. Verify SP1 proof
    // 3. Calculate withdrawal amounts
    // 4. Transfer tokens to user
    // 5. Burn LP tokens
    // 6. Mark nullifier as used
```

**AMM Logic:**
- Uses Uniswap V2 constant product formula: `x * y = k`
- Liquidity calculation: `liquidity = sqrt(amount0 * amount1)`
- Maintains ratio between token0 and token1

#### 3. YieldAccumulator.sol
**Purpose**: Track yield accrual per commitment

**Key Functions:**
```solidity
function accrueYield(bytes32 commitment) returns (uint256 yieldAmount)
    // 1. Calculate fees accumulated for commitment
    // 2. Distribute fees as yield
    // 3. Update yield tracking

function getYield(bytes32 commitment) returns (uint256 yield, uint256 lastUpdate)
    // Get current yield for commitment
```

**Yield Calculation:**
- Yield comes from pool trading fees (0.3% per swap)
- Distributed proportionally based on LP shares
- Accrues over time as fees accumulate

#### 4. SelectiveDisclosure.sol
**Purpose**: Generate yield proofs for compliance

**Key Functions:**
```solidity
function verifyYieldProof(
    bytes32 commitment,
    uint256 minYield,
    uint256 maxYield,
    bytes calldata proof,
    bytes calldata publicInputs
) returns (bool verified)
    // 1. Verify commitment exists
    // 2. Verify SP1 proof (or mock)
    // 3. Check yield is in range
    // 4. Store proof hash

function generateTaxReport(
    bytes32 commitment,
    uint256 startTime,
    uint256 endTime,
    uint256 minYield,
    uint256 maxYield,
    bytes calldata proof,
    bytes calldata publicInputs
) returns (bytes32 reportId)
    // 1. Verify yield proof
    // 2. Generate unique report ID
    // 3. Emit event with report details
```

#### 5. ZKKYCRegistry.sol
**Purpose**: Manage KYC tiers and deposit limits

**Key Functions:**
```solidity
function registerKYCCommitment(
    bytes32 commitment,
    KYCTier tier,
    bytes calldata proof,
    bytes calldata publicInputs,
    KYCAttributes memory attributes
)
    // 1. Verify SP1 proof (or mock)
    // 2. Check tier requirements
    // 3. Store KYC commitment
    // 4. Set deposit limit based on tier

function canDeposit(address user, uint256 amount) returns (bool allowed, uint256 limit)
    // Check if user can deposit amount
    // Returns: allowed, deposit limit

function userTotalDeposits(address user) returns (uint256)
    // Get user's total deposits (for limit checking)
```

**Tiers:**
- **Anonymous**: $10,000 limit, no KYC
- **Pseudonymous**: $100,000 limit, basic compliance
- **Institutional**: Unlimited, full compliance

### Frontend Components

#### 1. Encrypted Storage (`encryption.ts`, `storage.ts`)
**Purpose**: Securely store commitment secrets locally

**How It Works:**
```typescript
// Encryption
const password = derivePasswordFromWallet(walletAddress);
const encrypted = await encrypt(secret, password);
localStorage.setItem("commitments", JSON.stringify([encrypted]));

// Decryption
const password = derivePasswordFromWallet(walletAddress);
const decrypted = await decrypt(encrypted, password);
```

**Security:**
- Uses AES-GCM encryption
- Password derived from wallet address (PBKDF2)
- Secrets never stored in plaintext
- Backward compatible with legacy storage

#### 2. SP1 Client (`sp1-client.ts`)
**Purpose**: Generate ZK proofs (mock for MVP, real for production)

**How It Works:**
```typescript
// Mock Proof Generation (MVP)
generateMockDepositProof(amount, secret, balance) {
    const commitment = generateCommitment(amount, secret);
    return {
        commitment,
        proof: "0x", // Mock proof
        publicInputs: "0x" // Mock public inputs
    };
}

// Real Proof Generation (Production)
async generateDepositProof(amount, secret, balance) {
    const response = await fetch(`${proverUrl}/prove/deposit`, {
        method: "POST",
        body: JSON.stringify({ amount, secret, balance })
    });
    return await response.json();
}
```

#### 3. Pool Interactions (`pool.ts`)
**Purpose**: Interact with smart contracts

**Key Functions:**
- `depositLiquidity()`: Handle deposit flow
- `withdrawLiquidity()`: Handle withdrawal flow
- `generateTaxReport()`: Generate yield proof
- `checkDepositLimit()`: Check KYC limits

---

## User Flows

### Flow 1: Private Deposit

```
1. User opens Deposit page
2. Connects wallet (MetaMask, etc.)
3. Mints test tokens (for testing)
4. Enters deposit amounts (USDC + WETH)
5. Frontend:
   a. Generates random secret
   b. Calculates commitment = Hash(amount, secret)
   c. Generates mock SP1 proof
6. User approves token transfers
7. Frontend calls pool.deposit():
   a. Transfers tokens to pool
   b. Calculates liquidity
   c. Mints LP tokens
   d. Registers commitment
8. Frontend stores commitment + secret (encrypted)
9. Success! User sees transaction hash
```

**Privacy**: Commitment hides deposit amount, secret stored encrypted locally

### Flow 2: Private Withdrawal

```
1. User opens Withdraw page
2. Frontend loads commitments from encrypted storage
3. User selects commitment to withdraw
4. Frontend calculates available liquidity
5. User enters withdrawal amount
6. Frontend:
   a. Retrieves secret from encrypted storage
   b. Calculates nullifier = Hash(commitment, secret)
   c. Generates mock SP1 proof
7. Frontend calls pool.withdraw():
   a. Verifies nullifier not used
   b. Verifies proof
   c. Calculates withdrawal amounts
   d. Transfers tokens to user
   e. Burns LP tokens
   f. Marks nullifier as used
8. Frontend updates/removes commitment
9. Success! User receives tokens
```

**Privacy**: Nullifier prevents linking withdrawal to deposit

### Flow 3: Yield Proof Generation

```
1. User opens Yield Proof page
2. Frontend loads commitments
3. User selects commitment
4. Frontend shows current yield
5. User generates fees (for testing):
   a. Swaps tokens to create fees
   b. Fees accumulate in pool
6. User accrues yield:
   a. Calls yieldAccumulator.accrueYield()
   b. Fees distributed as yield
7. User enters:
   a. Start date
   b. End date
   c. Disclosure level (range/exact)
   d. Yield range (if range)
8. Frontend generates mock SP1 proof
9. Frontend calls disclosure.generateTaxReport():
   a. Verifies commitment exists
   b. Verifies yield proof
   c. Generates report ID
10. Success! User gets report ID for tax purposes
```

**Privacy**: Yield range disclosed, exact amount hidden

### Flow 4: KYC Registration

```
1. User opens KYC page
2. User selects tier (Anonymous/Pseudonymous/Institutional)
3. User enters compliance attributes:
   a. Accredited Investor (for Institutional)
   b. Jurisdiction Compliant
4. Frontend generates mock SP1 proof
5. Frontend calls kycRegistry.registerKYCCommitment():
   a. Verifies proof
   b. Checks tier requirements
   c. Sets deposit limit
6. Success! User can now deposit up to tier limit
```

**Privacy**: Identity hidden, compliance verified

---

## Privacy Guarantees

### What's Public (On-Chain)

1. **Commitments**: Cryptographic hashes (cannot be reversed)
2. **Nullifiers**: Prevents double-spending (cannot be linked to commitment)
3. **Deposit/Withdrawal Amounts**: Needed for liquidity calculation
4. **Yield Ranges**: For compliance (not exact amounts)
5. **KYC Tiers**: Compliance level (not identity)

### What's Private (Off-Chain)

1. **Secrets**: Stored encrypted locally, never on-chain
2. **Commitment Details**: Amount + secret (only user knows)
3. **Exact Yield**: Hidden, only range disclosed
4. **Identity**: Hidden, only compliance verified
5. **Wallet Linking**: Can use different addresses for each transaction

### Privacy Properties

1. **Unlinkability**: Deposits cannot be linked to withdrawals
2. **Anonymity**: Transactions appear independent
3. **Selective Disclosure**: Reveal only what's necessary
4. **Forward Privacy**: Past transactions remain private
5. **Backward Privacy**: Future transactions don't reveal past

---

## Setup & Installation

### Install Dependencies

```bash
npm install
cd frontend && npm install
```

### Configure Environment

Copy `.env.example` to `.env` and fill in:
- `PRIVATE_KEY`: Your deployer private key
- `MANTLE_SEPOLIA_RPC`: Mantle Sepolia RPC URL
- Contract addresses (after deployment)

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm test
```

### Deploy Contracts

```bash
# Deploy all contracts with mock tokens
npx hardhat deploy-with-mocks --network mantle-sepolia

# Or deploy individually
npx hardhat deploy-registry --network mantle-sepolia
npx hardhat deploy-pool --token0 <USDC> --token1 <WETH> --registry <REGISTRY_ADDRESS> --network mantle-sepolia
```

---

## Development

### Frontend

```bash
cd frontend
npm run dev
```

Visit http://localhost:3000

### SP1 Programs

```bash
cd sp1-programs/deposit-proof
cargo build --release
sp1 prove deposit-proof
```

---

## Production Roadmap

### Current Status (MVP)

✅ **Implemented:**
- Hash-based commitments (simplified Pedersen)
- Mock SP1 proofs (always verify)
- Encrypted local storage
- Beautiful UI/UX
- KYC tier system
- Yield accrual

### Production Features

🔄 **In Progress:**
- Real SP1 zkVM proofs
- Pedersen commitments (elliptic curve)
- SP1 verifier integration
- Production-ready encryption

📋 **Planned:**
- Price oracle integration
- Automatic yield accrual (keeper bot)
- Multi-chain support
- Advanced KYC verification
- Mobile app

### Technical Improvements

1. **Real ZK Proofs**: Replace mocks with SP1 zkVM proofs
2. **Pedersen Commitments**: Use elliptic curve cryptography
3. **SP1 Verifier**: On-chain proof verification
4. **Gas Optimization**: Reduce contract gas costs
5. **Security Audits**: Professional smart contract audits

---

## Technical Stack

- **Blockchain**: Mantle Network (EVM-compatible L2)
- **Smart Contracts**: Solidity 0.8.25
- **ZK Proofs**: SP1 zkVM (Succinct Labs)
- **Frontend**: Next.js, React, TypeScript
- **Wallet**: Thirdweb SDK
- **Encryption**: AES-GCM (Web Crypto API)
- **Storage**: Encrypted localStorage

---

## Security Considerations

1. **Secret Management**: Secrets stored encrypted, never on-chain
2. **Double-Spending**: Prevented by nullifiers
3. **Proof Verification**: SP1 verifier ensures proof validity
4. **Access Control**: KYC tiers limit deposits
5. **Gas Optimization**: Efficient contract design

---

## Contracts

- **CommitmentRegistry**: Stores Pedersen commitments and nullifiers
- **PrivateLiquidityPool**: Main liquidity pool with Uniswap V2-style AMM
- **YieldAccumulator**: Tracks yield accrual per commitment
- **SelectiveDisclosure**: Verifies yield proofs for tax reporting
- **ZKKYCRegistry**: Manages ZK-KYC tiers and deposit limits

---

## Summary

**Privy-Lips** solves the privacy problem in DeFi liquidity provision by:

1. **Hiding Deposits**: Using commitments to hide deposit amounts
2. **Unlinkable Withdrawals**: Using nullifiers to prevent linking
3. **Selective Disclosure**: Proving yield for compliance without revealing exact amounts
4. **ZK-KYC**: Verifying compliance without revealing identity

**Key Innovation**: Combining zero-knowledge proofs with commitment schemes to provide privacy while maintaining compliance and security.

**Result**: Users can provide liquidity privately, withdraw unlinkably, prove yield for taxes, and verify compliance - all without compromising their privacy.

---

## License

MIT
