"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@thirdweb-dev/react";
import { useMantleWallet } from "@/lib/wallet";
import { withdrawLiquidity, getCommitmentLPTokens } from "@/lib/pool";
import { getCommitments, removeCommitment, getCommitmentsLegacy, StoredCommitment } from "@/lib/storage";
import { ethers } from "ethers";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import StatusMessage from "@/components/StatusMessage";
import InfoCard from "@/components/InfoCard";

export default function WithdrawPage() {
  const [commitments, setCommitments] = useState<StoredCommitment[]>([]);
  const [selectedCommitment, setSelectedCommitment] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [availableLiquidity, setAvailableLiquidity] = useState<string>("0");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  
  const wallet = useWallet();
  const { isConnected, isMantleNetwork, getAddress } = useMantleWallet();

  // Load commitments from storage (with decryption)
  useEffect(() => {
    const loadCommitments = async () => {
      if (!isConnected || !getAddress) return;
      
      try {
        const address = await getAddress();
        if (!address) {
          // Fallback to legacy storage if no address
          const legacyCommitments = getCommitmentsLegacy();
          setCommitments(legacyCommitments);
          if (legacyCommitments.length > 0 && !selectedCommitment) {
            setSelectedCommitment(legacyCommitments[0].commitment);
          }
          return;
        }
        
        const stored = await getCommitments(address);
        setCommitments(stored);
        if (stored.length > 0 && !selectedCommitment) {
          setSelectedCommitment(stored[0].commitment);
        }
      } catch (error) {
        console.error("Failed to load commitments:", error);
        // Fallback to legacy storage for backward compatibility
        const legacyCommitments = getCommitmentsLegacy();
        setCommitments(legacyCommitments);
        if (legacyCommitments.length > 0 && !selectedCommitment) {
          setSelectedCommitment(legacyCommitments[0].commitment);
        }
      }
    };
    
    loadCommitments();
  }, [isConnected, getAddress]);

  // Load available liquidity for selected commitment
  useEffect(() => {
    if (!selectedCommitment || !isConnected || !wallet) return;
    
    const loadLiquidity = async () => {
      try {
        const signer = await wallet.getSigner();
        const provider = signer.provider;
        if (!provider) return;
        
        const liquidity = await getCommitmentLPTokens(provider, selectedCommitment);
        setAvailableLiquidity(liquidity);
        setWithdrawAmount(liquidity); // Pre-fill with max available
      } catch (error) {
        console.error("Failed to load liquidity:", error);
        setAvailableLiquidity("0");
      }
    };
    
    loadLiquidity();
  }, [selectedCommitment, isConnected, wallet]);

  const handleWithdraw = async () => {
    if (!wallet || !isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    if (!isMantleNetwork) {
      alert("Please switch to Mantle Sepolia network");
      return;
    }

    if (!selectedCommitment) {
      alert("Please select a commitment to withdraw from");
      return;
    }

    const commitment = commitments.find(c => c.commitment === selectedCommitment);
    if (!commitment) {
      alert("Commitment not found");
      return;
    }

    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      alert("Please enter a valid withdrawal amount");
      return;
    }

    const withdrawAmountBN = ethers.BigNumber.from(withdrawAmount);
    const availableBN = ethers.BigNumber.from(availableLiquidity);
    
    if (withdrawAmountBN.gt(availableBN)) {
      alert(`Insufficient liquidity. Available: ${availableLiquidity}`);
      return;
    }

    try {
      setLoading(true);
      setStatus("Withdrawing liquidity...");
      
      const signer = await wallet.getSigner();
      
      // Convert secret from hex to bytes
      const secret = ethers.utils.arrayify(commitment.secret);
      
      const result = await withdrawLiquidity({
        commitment: selectedCommitment,
        secret,
        liquidity: withdrawAmount,
        signer,
      });

      setTxHash(result.txHash);
      
      // Update or remove commitment (with encryption)
      const address = await signer.getAddress();
      if (address) {
        if (withdrawAmountBN.eq(availableBN)) {
          // Fully withdrawn, remove commitment
          await removeCommitment(selectedCommitment, address);
          const updatedCommitments = await getCommitments(address);
          setCommitments(updatedCommitments);
          setSelectedCommitment(updatedCommitments.length > 0 ? updatedCommitments[0].commitment : "");
        } else {
          // Partially withdrawn, update available liquidity
          const newLiquidity = availableBN.sub(withdrawAmountBN).toString();
          setAvailableLiquidity(newLiquidity);
          setWithdrawAmount(newLiquidity);
          // Reload commitments to get updated data
          const updatedCommitments = await getCommitments(address);
          setCommitments(updatedCommitments);
        }
      }
      
      setStatus(`✅ Withdrawal successful! Received ${ethers.utils.formatUnits(result.amount0, 6)} USDC and ${ethers.utils.formatEther(result.amount1)} WETH`);
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedCommitmentData = commitments.find(c => c.commitment === selectedCommitment);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Private Withdrawal
            </h1>
            <p className="text-gray-600">
              Withdraw liquidity privately with unlinkable transactions
            </p>
          </div>

          {!isConnected && (
            <InfoCard variant="warning" title="Wallet Not Connected">
              Please connect your wallet to continue with withdrawals.
            </InfoCard>
          )}

          {isConnected && !isMantleNetwork && (
            <InfoCard variant="warning" title="Wrong Network">
              Please switch to Mantle Sepolia network to continue.
            </InfoCard>
          )}

          {commitments.length === 0 ? (
            <InfoCard variant="info" title="No Deposits Found">
              <p className="mb-4">Make a deposit first to withdraw liquidity.</p>
              <Link href="/deposit" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
                Go to Deposit →
              </Link>
            </InfoCard>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block mb-2 font-semibold text-gray-700">
                  Select Commitment
                </label>
                <select
                  value={selectedCommitment}
                  onChange={(e) => setSelectedCommitment(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {commitments.map((c) => (
                    <option key={c.commitment} value={c.commitment}>
                      {c.commitment.slice(0, 10)}... ({new Date(c.timestamp).toLocaleDateString()}) - LP: {ethers.utils.formatEther(c.liquidity)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCommitmentData && (
                <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200">
                  <h3 className="font-semibold text-emerald-900 mb-3">Commitment Details</h3>
                  <div className="space-y-2 text-sm text-emerald-800">
                    <div className="flex justify-between">
                      <span className="font-medium">Deposit Date:</span>
                      <span>{new Date(selectedCommitmentData.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Available LP Tokens:</span>
                      <span className="font-semibold text-emerald-700">
                        {parseFloat(ethers.utils.formatEther(availableLiquidity)).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Original Deposit:</span>
                      <span>
                        {parseFloat(ethers.utils.formatUnits(selectedCommitmentData.amount0, 6)).toFixed(2)} USDC + {parseFloat(ethers.utils.formatEther(selectedCommitmentData.amount1)).toFixed(4)} WETH
                      </span>
                    </div>
                    <div className="pt-2 border-t border-emerald-300">
                      <p className="text-xs font-mono text-emerald-700 break-all">
                        {selectedCommitment.slice(0, 20)}...{selectedCommitment.slice(-8)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block mb-2 font-semibold text-gray-700">
                  Withdrawal Amount (LP Tokens)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Enter amount"
                    disabled={loading || !isConnected || !isMantleNetwork || !selectedCommitment}
                    min="0"
                    max={availableLiquidity}
                    step="0.000001"
                  />
                  <button
                    onClick={() => setWithdrawAmount(availableLiquidity)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 font-medium transition-colors"
                  >
                    Max
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1.5 ml-1">
                  Max available: {parseFloat(ethers.utils.formatEther(availableLiquidity)).toLocaleString(undefined, { maximumFractionDigits: 6 })} LP tokens
                </p>
              </div>

              {status && (
                <StatusMessage
                  type={status.includes("✅") ? "success" : status.includes("❌") ? "error" : "info"}
                  message={status}
                  txHash={txHash}
                />
              )}

              <button
                onClick={handleWithdraw}
                disabled={loading || !isConnected || !isMantleNetwork || !selectedCommitment || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                className="w-full px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-emerald-700 hover:to-teal-700 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-lg"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Processing Withdrawal...
                  </>
                ) : (
                  <>
                    💸 Withdraw Privately
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
