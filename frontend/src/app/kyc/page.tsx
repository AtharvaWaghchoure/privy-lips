"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@thirdweb-dev/react";
import { useMantleWallet } from "@/lib/wallet";
import { 
  registerKYCCommitment, 
  getUserKYCInfo, 
  checkDepositLimit,
  KYCTier 
} from "@/lib/pool";
import { ethers } from "ethers";
import Link from "next/link";

export default function KYCPage() {
  const [tier, setTier] = useState<KYCTier>("Anonymous");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  const [commitment, setCommitment] = useState<string>("");
  
  // User's current KYC info
  const [userKYC, setUserKYC] = useState<{
    tier: KYCTier;
    commitment: string;
    depositLimit: string;
    currentDeposits: string;
  } | null>(null);
  
  const wallet = useWallet();
  const { isConnected, isMantleNetwork, getAddress } = useMantleWallet();

  // Load user's current KYC info
  useEffect(() => {
    if (!isConnected || !wallet) return;

    const loadKYCInfo = async () => {
      try {
        const address = await getAddress();
        if (!address) return;

        const signer = await wallet.getSigner();
        const provider = signer.provider;
        if (!provider) return;

        const kycInfo = await getUserKYCInfo(provider, address);
        setUserKYC(kycInfo);
        
        // Pre-select current tier if user has one
        if (kycInfo.tier !== "Anonymous" || kycInfo.commitment) {
          setTier(kycInfo.tier);
        }
      } catch (error) {
        console.error("Failed to load KYC info:", error);
      }
    };

    loadKYCInfo();
  }, [isConnected, wallet, getAddress]);

  const handleRegisterKYC = async () => {
    if (!wallet || !isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    if (!isMantleNetwork) {
      alert("Please switch to Mantle Sepolia network");
      return;
    }

    try {
      setLoading(true);
      setStatus("Registering KYC commitment...");

      const signer = await wallet.getSigner();

      // Set attributes based on tier
      let ageVerified = true;
      let jurisdictionCompliant = true;
      let accreditedInvestor = false;

      if (tier === "Pseudonymous") {
        jurisdictionCompliant = true; // Required for pseudonymous
      } else if (tier === "Institutional") {
        jurisdictionCompliant = true; // Required for institutional
        accreditedInvestor = true; // Required for institutional
      }

      const result = await registerKYCCommitment(
        signer,
        tier,
        ageVerified,
        jurisdictionCompliant,
        accreditedInvestor
      );

      setCommitment(result.commitment);
      setTxHash(result.txHash);
      setStatus(`✅ KYC registered successfully! Tier: ${tier}`);

      // Reload KYC info
      const address = await signer.getAddress();
      const provider = signer.provider;
      if (provider) {
        const kycInfo = await getUserKYCInfo(provider, address);
        setUserKYC(kycInfo);
      }
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
      console.error("KYC registration error:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatLimit = (limit: string) => {
    const limitBN = ethers.BigNumber.from(limit);
    if (limitBN.eq(ethers.constants.MaxUint256)) {
      return "Unlimited";
    }
    const limitUSD = parseFloat(ethers.utils.formatEther(limit));
    return `$${limitUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const formatDeposits = (deposits: string) => {
    const depositsBN = ethers.BigNumber.from(deposits);
    const depositsUSD = parseFloat(ethers.utils.formatEther(depositsBN));
    return `$${depositsUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-2xl w-full">
        <h1 className="text-3xl font-bold mb-8">ZK-KYC Registration</h1>

        {!isConnected && (
          <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl">
            <p className="text-amber-800 font-medium">Please connect your wallet to continue</p>
          </div>
        )}

        {isConnected && !isMantleNetwork && (
          <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl">
            <p className="text-amber-800 font-medium">Please switch to Mantle Sepolia network</p>
          </div>
        )}

        {/* Current KYC Status */}
        {isConnected && userKYC && (
          <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Your Current KYC Status</h2>
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                <strong className="text-gray-800">Tier:</strong> <span className="font-semibold text-blue-700">{userKYC.tier}</span>
              </p>
              <p className="text-sm text-gray-700">
                <strong className="text-gray-800">Deposit Limit:</strong> <span className="font-semibold text-indigo-700">{formatLimit(userKYC.depositLimit)}</span>
              </p>
              <p className="text-sm text-gray-700">
                <strong className="text-gray-800">Current Deposits:</strong> <span className="font-semibold">{formatDeposits(userKYC.currentDeposits)}</span>
              </p>
              {userKYC.commitment && (
                <p className="text-xs text-gray-600 mt-2 font-mono break-all">
                  Commitment: {userKYC.commitment.slice(0, 20)}...
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block mb-2 font-medium text-gray-700">Select Tier</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as KYCTier)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              disabled={loading}
            >
              <option value="Anonymous">Anonymous ($10k limit)</option>
              <option value="Pseudonymous">Pseudonymous ($100k limit)</option>
              <option value="Institutional">Institutional (Unlimited)</option>
            </select>
          </div>

          <div className="p-5 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-gray-200">
            <h3 className="font-semibold mb-3 text-gray-800">Tier Requirements:</h3>
            {tier === "Anonymous" && (
              <div className="space-y-2 text-sm text-gray-700">
                <p>✅ <strong>No KYC required</strong> - Basic access with privacy</p>
                <p>💰 <strong>Deposit Limit:</strong> $10,000</p>
                <p>🔒 <strong>Privacy:</strong> Maximum privacy, no identity verification</p>
              </div>
            )}
            {tier === "Pseudonymous" && (
              <div className="space-y-2 text-sm text-gray-700">
                <p>✅ <strong>ZK proof of jurisdiction compliance</strong> required</p>
                <p>💰 <strong>Deposit Limit:</strong> $100,000</p>
                <p>🔒 <strong>Privacy:</strong> Jurisdiction verified without revealing identity</p>
                <p className="text-xs text-amber-700 mt-2">⚠️ Requires proof that you're not from a sanctioned jurisdiction</p>
              </div>
            )}
            {tier === "Institutional" && (
              <div className="space-y-2 text-sm text-gray-700">
                <p>✅ <strong>Full ZK-KYC required:</strong> Accredited investor + jurisdiction compliance</p>
                <p>💰 <strong>Deposit Limit:</strong> Unlimited</p>
                <p>🔒 <strong>Privacy:</strong> Identity verified via ZK proofs, no data exposed</p>
                <p className="text-xs text-amber-700 mt-2">⚠️ Requires proof of accredited investor status and jurisdiction compliance</p>
              </div>
            )}
          </div>

          {userKYC && userKYC.tier === tier && userKYC.commitment && (
            <div className="p-4 bg-green-50 border-2 border-green-300 rounded-xl">
              <p className="text-green-800 font-medium">
                ✅ You are already registered with this tier. You can upgrade to a higher tier if needed.
              </p>
            </div>
          )}

          {status && (
            <div className={`p-4 rounded-xl border-2 ${
              status.includes("✅") 
                ? "bg-emerald-50 border-emerald-300 text-emerald-800" 
                : status.includes("❌") 
                ? "bg-red-50 border-red-300 text-red-800" 
                : "bg-blue-50 border-blue-300 text-blue-800"
            }`}>
              <p className="font-medium">{status}</p>
            </div>
          )}

          {commitment && txHash && (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl">
              <p className="text-sm font-medium text-emerald-800 mb-2">KYC Commitment:</p>
              <p className="text-xs font-mono text-emerald-700 break-all mb-3">{commitment}</p>
              <p className="text-sm font-medium text-emerald-800 mb-2">Transaction:</p>
              <a
                href={`https://sepolia.mantlescan.xyz/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline font-medium"
              >
                View on Mantlescan →
              </a>
            </div>
          )}

          <button
            onClick={handleRegisterKYC}
            disabled={loading || !isConnected || !isMantleNetwork || (userKYC?.tier === tier && !!userKYC?.commitment)}
            className="w-full px-6 py-3 bg-amber-600 text-white rounded-xl disabled:opacity-50 hover:bg-amber-700 font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            {loading ? "Processing..." : (userKYC?.tier === tier && !!userKYC?.commitment) ? "Already Registered" : "✅ Register KYC"}
          </button>

          <Link href="/" className="block text-center text-blue-600 hover:text-blue-800 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
