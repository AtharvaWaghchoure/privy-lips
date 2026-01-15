"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@thirdweb-dev/react";
import { useMantleWallet } from "@/lib/wallet";
import { depositLiquidity, mintTestTokens, checkDepositLimit, getUserKYCInfo } from "@/lib/pool";
import { ethers } from "ethers";
import Link from "next/link";
import { storeCommitment } from "@/lib/storage";
import LoadingSpinner from "@/components/LoadingSpinner";
import StatusMessage from "@/components/StatusMessage";
import InfoCard from "@/components/InfoCard";

export default function DepositPage() {
  const [amount0, setAmount0] = useState(""); // USDC amount
  const [amount1, setAmount1] = useState(""); // WETH amount
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  const [kycInfo, setKYCInfo] = useState<{ tier: string; limit: string; currentDeposits: string } | null>(null);
  
  const wallet = useWallet();
  const { isConnected, isMantleNetwork } = useMantleWallet();

  // Load KYC info
  useEffect(() => {
    if (!isConnected || !wallet) return;

    const loadKYC = async () => {
      try {
        const signer = await wallet.getSigner();
        const provider = signer.provider;
        if (!provider) return;

        const address = await signer.getAddress();
        if (!address) return;

        const kyc = await getUserKYCInfo(provider, address);
        setKYCInfo({
          tier: kyc.tier,
          limit: kyc.depositLimit,
          currentDeposits: kyc.currentDeposits,
        });
      } catch (error) {
        console.error("Failed to load KYC info:", error);
      }
    };

    loadKYC();
  }, [isConnected, wallet]);

  const handleMintTestTokens = async () => {
    if (!wallet || !isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      setLoading(true);
      setStatus("Minting test tokens...");
      
      const signer = await wallet.getSigner();
      // Mint 1000 USDC (6 decimals) and 1 WETH (18 decimals)
      await mintTestTokens(
        signer,
        ethers.utils.parseUnits("1000", 6).toString(),
        ethers.utils.parseEther("1").toString()
      );
      
      setStatus("✅ Test tokens minted! You can now deposit.");
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!wallet || !isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    if (!isMantleNetwork) {
      alert("Please switch to Mantle Sepolia network");
      return;
    }

    if (!amount0 || !amount1) {
      alert("Please enter both USDC and WETH amounts. The pool requires both tokens to maintain the liquidity ratio.");
      return;
    }

    // Validate minimum amounts
    const amount0Num = parseFloat(amount0);
    const amount1Num = parseFloat(amount1);
    
    if (amount0Num <= 0 || amount1Num <= 0) {
      alert("Both amounts must be greater than 0");
      return;
    }

    try {
      setLoading(true);
      
      const signer = await wallet.getSigner();
      const provider = signer.provider;
      const address = await signer.getAddress();
      
      // Check KYC deposit limit
      if (provider && kycInfo) {
        // Convert amounts to BigNumber first
        const amount0BN = amount0 ? ethers.utils.parseUnits(amount0, 6) : ethers.BigNumber.from(0);
        const amount1BN = amount1 ? ethers.utils.parseEther(amount1) : ethers.BigNumber.from(0);
        
        // Convert both to USD value in 18 decimals for comparison
        // amount0 is USDC (6 decimals), convert to 18 decimals by multiplying by 1e12
        // amount1 is WETH (18 decimals), assume 1 WETH = $3000 USD for MVP (or use 1:1 if you prefer)
        // For MVP, we'll use a simplified 1:1 ratio (1 USDC = 1 USD, 1 WETH = 1 USD)
        // In production, use a price oracle
        
        // Convert USDC (6 decimals) to 18 decimals: multiply by 1e12
        const amount0In18Decimals = amount0BN.mul(ethers.BigNumber.from(10).pow(12));
        
        // Total value in USD (18 decimals) - simplified: USDC + WETH (assuming 1:1 ratio)
        const totalValue = amount0In18Decimals.add(amount1BN);
        
        const limitCheck = await checkDepositLimit(provider, address, totalValue.toString());
        if (!limitCheck.allowed) {
          const limitUSD = parseFloat(ethers.utils.formatEther(limitCheck.limit));
          const currentUSD = parseFloat(ethers.utils.formatEther(limitCheck.currentDeposits));
          const depositUSD = parseFloat(ethers.utils.formatEther(totalValue));
          throw new Error(`Deposit limit exceeded. Your ${kycInfo.tier} tier limit is $${limitUSD.toLocaleString()}. Current deposits: $${currentUSD.toLocaleString()}. This deposit: $${depositUSD.toLocaleString()}`);
        }
      }

      setStatus("Approving tokens...");
      
      // Convert to token units
      const amount0BN = amount0 ? ethers.utils.parseUnits(amount0, 6) : ethers.BigNumber.from(0);
      const amount1BN = amount1 ? ethers.utils.parseEther(amount1) : ethers.BigNumber.from(0);

      setStatus("Depositing liquidity...");
      const result = await depositLiquidity({
        amount0: amount0BN.toString(),
        amount1: amount1BN.toString(),
        signer,
      });

      setTxHash(result.txHash);
      
      // Store commitment for withdrawal (with encryption)
      if (address) {
        await storeCommitment({
          commitment: result.commitment,
          secret: result.secret,
          liquidity: result.liquidity,
          txHash: result.txHash,
          timestamp: Date.now(),
          amount0: amount0BN.toString(),
          amount1: amount1BN.toString(),
        }, address);
      }
      
      setStatus(`✅ Deposit successful! Commitment: ${result.commitment.slice(0, 10)}...`);
      setAmount0("");
      setAmount1("");
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Private Deposit
            </h1>
            <p className="text-gray-600">
              Deposit liquidity privately with shielded commitments
            </p>
          </div>

          {!isConnected && (
            <InfoCard variant="warning" title="Wallet Not Connected">
              Please connect your wallet to continue with deposits.
            </InfoCard>
          )}

          {isConnected && !isMantleNetwork && (
            <InfoCard variant="warning" title="Wrong Network">
              Please switch to Mantle Sepolia network to continue.
            </InfoCard>
          )}
        
          <div className="space-y-6">
            {/* Mint Test Tokens */}
            <InfoCard variant="info" title="Need Test Tokens?" icon="🪙">
              <p className="mb-3">
                Click below to mint mock USDC and WETH for testing on Mantle Sepolia.
              </p>
              <button
                onClick={handleMintTestTokens}
                disabled={loading || !isConnected || !isMantleNetwork}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Minting...
                  </>
                ) : (
                  <>
                    🪙 Mint Test Tokens (1000 USDC + 1 WETH)
                  </>
                )}
              </button>
            </InfoCard>

            {/* Amount Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block mb-2 font-semibold text-gray-700">
                  USDC Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount0}
                    onChange={(e) => setAmount0(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Enter USDC amount (e.g., 100)"
                    disabled={loading || !isConnected || !isMantleNetwork}
                    min="0"
                    step="0.01"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                    USDC
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1.5 ml-1">
                  6 decimals • Example: 100 = 100 USDC
                </p>
              </div>

              <div>
                <label className="block mb-2 font-semibold text-gray-700">
                  WETH Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount1}
                    onChange={(e) => setAmount1(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Enter WETH amount (e.g., 0.1)"
                    disabled={loading || !isConnected || !isMantleNetwork}
                    min="0"
                    step="0.001"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                    WETH
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1.5 ml-1">
                  18 decimals • Example: 0.1 = 0.1 WETH
                </p>
              </div>
            </div>

            {/* Info Note */}
            <InfoCard variant="info" title="Important Note">
              Both USDC and WETH amounts are required. The pool maintains a liquidity ratio, so you must provide both tokens to maintain balance.
            </InfoCard>

            {/* KYC Info */}
            {kycInfo && (
              <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-300">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-amber-900">Your KYC Status</h3>
                  <span className="px-2 py-1 bg-amber-200 text-amber-800 rounded-full text-xs font-medium">
                    {kycInfo.tier}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-amber-800">
                  <div className="flex justify-between">
                    <span className="font-medium">Deposit Limit:</span>
                    <span className="font-semibold">
                      {kycInfo.limit === ethers.constants.MaxUint256.toString()
                        ? "Unlimited"
                        : `$${parseFloat(ethers.utils.formatEther(kycInfo.limit)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Current Deposits:</span>
                    <span className="font-semibold">
                      ${parseFloat(ethers.utils.formatEther(kycInfo.currentDeposits)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {kycInfo.limit !== ethers.constants.MaxUint256.toString() && (
                    <div className="flex justify-between pt-2 border-t border-amber-300">
                      <span className="font-medium">Remaining:</span>
                      <span className="font-semibold text-emerald-700">
                        ${(parseFloat(ethers.utils.formatEther(kycInfo.limit)) - parseFloat(ethers.utils.formatEther(kycInfo.currentDeposits))).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
                <Link href="/kyc" className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-800 underline font-medium">
                  Upgrade KYC tier →
                </Link>
              </div>
            )}

            {/* Status Messages */}
            {status && (
              <StatusMessage
                type={status.includes("✅") ? "success" : status.includes("❌") ? "error" : "info"}
                message={status}
                txHash={txHash}
              />
            )}

            {/* Deposit Button */}
            <button
              onClick={handleDeposit}
              disabled={loading || !isConnected || !isMantleNetwork || !amount0 || !amount1 || parseFloat(amount0) <= 0 || parseFloat(amount1) <= 0}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-lg"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Processing Deposit...
                </>
              ) : (
                <>
                  💰 Deposit Privately
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

