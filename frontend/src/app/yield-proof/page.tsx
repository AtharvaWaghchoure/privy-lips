"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@thirdweb-dev/react";
import { useMantleWallet } from "@/lib/wallet";
import { 
  generateTaxReport, 
  getCommitmentYield, 
  getYieldInRange,
  accrueYieldForCommitment,
  generateFeesViaSwap,
  YieldProofParams 
} from "@/lib/pool";
import { StoredCommitment } from "@/lib/storage";
import { ethers } from "ethers";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import StatusMessage from "@/components/StatusMessage";
import InfoCard from "@/components/InfoCard";

export default function YieldProofPage() {
  const [commitments, setCommitments] = useState<StoredCommitment[]>([]);
  const [selectedCommitment, setSelectedCommitment] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [disclosureLevel, setDisclosureLevel] = useState<"exact" | "range">("range");
  const [minYield, setMinYield] = useState("");
  const [maxYield, setMaxYield] = useState("");
  const [currentYield, setCurrentYield] = useState<string>("0");
  const [loading, setLoading] = useState(false);
  const [accruingYield, setAccruingYield] = useState(false);
  const [generatingFees, setGeneratingFees] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [reportId, setReportId] = useState<string>("");
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
          const { getCommitmentsLegacy } = await import("@/lib/storage");
          const legacyCommitments = getCommitmentsLegacy();
          setCommitments(legacyCommitments);
          if (legacyCommitments.length > 0 && !selectedCommitment) {
            setSelectedCommitment(legacyCommitments[0].commitment);
          }
          return;
        }
        
        const { getCommitments } = await import("@/lib/storage");
        const stored = await getCommitments(address);
        setCommitments(stored);
        if (stored.length > 0 && !selectedCommitment) {
          setSelectedCommitment(stored[0].commitment);
        }
      } catch (error) {
        console.error("Failed to load commitments:", error);
        // Fallback to legacy storage for backward compatibility
        const { getCommitmentsLegacy } = await import("@/lib/storage");
        const legacyCommitments = getCommitmentsLegacy();
        setCommitments(legacyCommitments);
        if (legacyCommitments.length > 0 && !selectedCommitment) {
          setSelectedCommitment(legacyCommitments[0].commitment);
        }
      }
    };
    
    loadCommitments();
  }, [isConnected, getAddress]);

  // Load current yield for selected commitment
  useEffect(() => {
    if (!selectedCommitment || !isConnected || !wallet) return;

    const loadYield = async () => {
      try {
        const signer = await wallet.getSigner();
        const provider = signer.provider;
        if (!provider) return;

        const yieldData = await getCommitmentYield(provider, selectedCommitment);
        setCurrentYield(yieldData.yield);
      } catch (error) {
        console.error("Failed to load yield:", error);
        setCurrentYield("0");
      }
    };

    loadYield();
  }, [selectedCommitment, isConnected, wallet]);

  const handleGenerateFees = async () => {
    if (!wallet || !isConnected) {
      alert("Please connect wallet first");
      return;
    }

    try {
      setGeneratingFees(true);
      setStatus("Generating fees via swap (this creates yield)...");
      
      const signer = await wallet.getSigner();
      // Swap 10 USDC (6 decimals) to generate fees
      const swapAmount = ethers.utils.parseUnits("10", 6).toString();
      const txHash = await generateFeesViaSwap(signer, swapAmount);
      
      setStatus(`✅ Fees generated! Swap tx: ${txHash.slice(0, 10)}... Now click "Accrue Yield"`);
      
      // Reload yield after a short delay
      setTimeout(async () => {
        const provider = signer.provider;
        if (provider && selectedCommitment) {
          const yieldData = await getCommitmentYield(provider, selectedCommitment);
          setCurrentYield(yieldData.yield);
        }
      }, 2000);
    } catch (error: any) {
      setStatus(`❌ Error generating fees: ${error.message}`);
    } finally {
      setGeneratingFees(false);
    }
  };

  const handleAccrueYield = async () => {
    if (!wallet || !isConnected || !selectedCommitment) {
      alert("Please connect wallet and select a commitment");
      return;
    }

    try {
      setAccruingYield(true);
      setStatus("Checking commitment status...");
      
      const signer = await wallet.getSigner();
      const provider = signer.provider;
      
      if (!provider) {
        throw new Error("No provider available");
      }

      // Check status first to provide better error messages
      const { checkCommitmentStatus } = await import("@/lib/pool");
      const status = await checkCommitmentStatus(provider, selectedCommitment);
      
      if (!status.hasCommitment) {
        throw new Error("Commitment not found in registry. Make sure deposit was successful.");
      }
      
      if (status.shares === "0") {
        throw new Error("Commitment has no shares. The deposit may not have registered correctly.");
      }
      
      if (status.fees0 === "0" && status.fees1 === "0") {
        throw new Error("No fees accumulated yet. Click 'Generate Fees' first to create fees via swap.");
      }

      setStatus("Accruing yield for commitment...");
      const yieldAmount = await accrueYieldForCommitment(signer, selectedCommitment);
      
      setStatus(`✅ Yield accrued: ${ethers.utils.formatEther(yieldAmount)} tokens`);
      
      // Reload yield
      const yieldData = await getCommitmentYield(provider, selectedCommitment);
      setCurrentYield(yieldData.yield);
    } catch (error: any) {
      const errorMsg = error.message || error.reason || "Unknown error";
      setStatus(`❌ Error: ${errorMsg}`);
      console.error("Accrue yield error:", error);
    } finally {
      setAccruingYield(false);
    }
  };

  // Calculate suggested range based on current yield
  useEffect(() => {
    if (disclosureLevel === "range" && currentYield !== "0") {
      const yieldNum = parseFloat(ethers.utils.formatEther(currentYield));
      const range = yieldNum * 0.1; // 10% range
      setMinYield((yieldNum - range).toFixed(2));
      setMaxYield((yieldNum + range).toFixed(2));
    } else if (disclosureLevel === "exact") {
      setMinYield(ethers.utils.formatEther(currentYield));
      setMaxYield(ethers.utils.formatEther(currentYield));
    }
  }, [disclosureLevel, currentYield]);

  const handleGenerateProof = async () => {
    if (!wallet || !isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    if (!isMantleNetwork) {
      alert("Please switch to Mantle Sepolia network");
      return;
    }

    if (!selectedCommitment) {
      alert("Please select a commitment");
      return;
    }

    if (!startDate || !endDate) {
      alert("Please select both start and end dates");
      return;
    }

    const startTime = Math.floor(new Date(startDate).getTime() / 1000);
    const endTime = Math.floor(new Date(endDate).getTime() / 1000);

    if (startTime >= endTime) {
      alert("End date must be after start date");
      return;
    }

    if (disclosureLevel === "range") {
      if (!minYield || !maxYield) {
        alert("Please enter min and max yield for range disclosure");
        return;
      }
      if (parseFloat(minYield) > parseFloat(maxYield)) {
        alert("Min yield must be less than max yield");
        return;
      }
    }

    try {
      setLoading(true);
      setStatus("Generating tax report...");

      const signer = await wallet.getSigner();

      const minYieldBN = disclosureLevel === "exact"
        ? ethers.utils.parseEther(minYield)
        : ethers.utils.parseEther(minYield);
      const maxYieldBN = disclosureLevel === "exact"
        ? ethers.utils.parseEther(maxYield)
        : ethers.utils.parseEther(maxYield);

      const result = await generateTaxReport({
        commitment: selectedCommitment,
        startTime,
        endTime,
        minYield: minYieldBN.toString(),
        maxYield: maxYieldBN.toString(),
        signer,
      });

      setReportId(result.reportId);
      setTxHash(result.txHash);
      setStatus(`✅ Tax report generated successfully! Report ID: ${result.reportId.slice(0, 16)}...`);
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedCommitmentData = commitments.find(c => c.commitment === selectedCommitment);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-purple-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              Generate Yield Proof
            </h1>
            <p className="text-gray-600">
              Create tax reports with selective disclosure for compliance
            </p>
          </div>

          {!isConnected && (
            <InfoCard variant="warning" title="Wallet Not Connected">
              Please connect your wallet to continue with yield proof generation.
            </InfoCard>
          )}

          {isConnected && !isMantleNetwork && (
            <InfoCard variant="warning" title="Wrong Network">
              Please switch to Mantle Sepolia network to continue.
            </InfoCard>
          )}

          {commitments.length === 0 ? (
            <InfoCard variant="info" title="No Deposits Found">
              <p className="mb-4">Make a deposit first to generate yield proofs.</p>
              <Link href="/deposit" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
                Go to Deposit →
              </Link>
            </InfoCard>
          ) : (
          <div className="space-y-6">
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Select Commitment</label>
              <select
                value={selectedCommitment}
                onChange={(e) => setSelectedCommitment(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {commitments.map((c) => (
                  <option key={c.commitment} value={c.commitment}>
                    {c.commitment.slice(0, 10)}... ({new Date(c.timestamp).toLocaleDateString()}) - LP: {parseFloat(ethers.utils.formatEther(c.liquidity)).toFixed(4)}
                  </option>
                ))}
              </select>
            </div>

            {selectedCommitmentData && (
              <div className="p-5 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-700 mb-2">
                  <strong className="text-gray-800">Deposit Date:</strong> {new Date(selectedCommitmentData.timestamp).toLocaleString()}
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-700">
                      <strong className="text-gray-800">Current Yield:</strong> {parseFloat(ethers.utils.formatEther(currentYield)).toFixed(4)} tokens
                    </p>
                    <button
                      onClick={handleAccrueYield}
                      disabled={accruingYield || !isConnected}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {accruingYield ? "Accruing..." : "💰 Accrue Yield"}
                    </button>
                  </div>
                  {parseFloat(currentYield) === 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-800 mb-2 font-medium">
                        ⚠️ No yield yet. Yield comes from pool fees. For testing:
                      </p>
                      <ol className="text-xs text-amber-700 list-decimal list-inside space-y-1">
                        <li>Click "Generate Fees" to create fees via swap</li>
                        <li>Then click "Accrue Yield" to distribute fees as yield</li>
                      </ol>
                      <button
                        onClick={handleGenerateFees}
                        disabled={generatingFees || !isConnected}
                        className="mt-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm font-medium"
                      >
                        {generatingFees ? "Generating..." : "🔄 Generate Fees"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block mb-2 font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  const selectedStartDate = e.target.value;
                  setStartDate(selectedStartDate);
                  // If end date is before new start date, clear it
                  if (endDate && endDate < selectedStartDate) {
                    setEndDate("");
                  }
                }}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                disabled={loading}
                max={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-gray-500 mt-1">Select a start date for the tax period (can be any past date)</p>
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  const selectedEndDate = e.target.value;
                  // Validate that end date is after start date
                  if (startDate && selectedEndDate < startDate) {
                    alert("End date must be after start date");
                    return;
                  }
                  // Validate that end date is not in the future
                  const today = new Date().toISOString().split('T')[0];
                  if (selectedEndDate > today) {
                    alert("End date cannot be in the future");
                    return;
                  }
                  setEndDate(selectedEndDate);
                }}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                disabled={loading || !startDate}
                max={new Date().toISOString().split('T')[0]}
                min={startDate || undefined}
              />
              <p className="text-xs text-gray-500 mt-1">
                {startDate 
                  ? `End date must be after ${startDate} and not in the future`
                  : "Select start date first"}
              </p>
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700">Disclosure Level</label>
              <select
                value={disclosureLevel}
                onChange={(e) => setDisclosureLevel(e.target.value as "exact" | "range")}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                disabled={loading}
              >
                <option value="range">Range (Privacy-preserving)</option>
                <option value="exact">Exact Amount</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {disclosureLevel === "range" 
                  ? "Disclose yield within a range for privacy" 
                  : "Disclose exact yield amount"}
              </p>
            </div>

            {disclosureLevel === "range" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 font-medium text-gray-700">Min Yield</label>
                  <input
                    type="number"
                    value={minYield}
                    onChange={(e) => setMinYield(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                    placeholder="0.00"
                    disabled={loading}
                    step="0.01"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium text-gray-700">Max Yield</label>
                  <input
                    type="number"
                    value={maxYield}
                    onChange={(e) => setMaxYield(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                    placeholder="0.00"
                    disabled={loading}
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
            )}

            {disclosureLevel === "exact" && (
              <div>
                <label className="block mb-2 font-medium text-gray-700">Exact Yield</label>
                <input
                  type="number"
                  value={minYield}
                  onChange={(e) => {
                    setMinYield(e.target.value);
                    setMaxYield(e.target.value);
                  }}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                  placeholder="0.00"
                  disabled={loading}
                  step="0.01"
                  min="0"
                />
              </div>
            )}

            {status && (
              <StatusMessage
                type={status.includes("✅") ? "success" : status.includes("❌") ? "error" : "info"}
                message={status}
                txHash={txHash}
              />
            )}

            {reportId && (
              <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-300">
                <h3 className="font-semibold text-emerald-900 mb-2">Report Generated</h3>
                <p className="text-sm text-emerald-800 mb-2">Report ID:</p>
                <p className="text-xs font-mono text-emerald-700 break-all bg-emerald-100 p-2 rounded">{reportId}</p>
              </div>
            )}

            <button
              onClick={handleGenerateProof}
              disabled={loading || !isConnected || !isMantleNetwork || !selectedCommitment || !startDate || !endDate || (disclosureLevel === "range" && (!minYield || !maxYield)) || (disclosureLevel === "exact" && !minYield)}
              className="w-full px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-violet-700 hover:to-purple-700 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-lg"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Generating Report...
                </>
              ) : (
                <>
                  📊 Generate Tax Report
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
