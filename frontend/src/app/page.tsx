"use client";

import Link from "next/link";
import PoolStats from "@/components/PoolStats";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Privy-Lips
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 font-medium mb-2">
            Private Liquidity Protocol on Mantle Network
          </p>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Deposit, earn yield, and withdraw with complete privacy using zero-knowledge proofs
          </p>
        </div>
        
        {/* Pool Stats */}
        <div className="mb-12">
          <PoolStats />
        </div>
        
        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/deposit"
              className="group p-6 bg-white rounded-xl shadow-md hover:shadow-xl border-2 border-transparent hover:border-blue-300 transition-all transform hover:-translate-y-1"
            >
              <div className="text-4xl mb-3">💰</div>
              <h3 className="font-semibold text-lg mb-2 text-gray-800 group-hover:text-blue-600 transition-colors">
                Deposit
              </h3>
              <p className="text-sm text-gray-600">
                Add liquidity privately with shielded commitments
              </p>
            </Link>
            <Link
              href="/withdraw"
              className="group p-6 bg-white rounded-xl shadow-md hover:shadow-xl border-2 border-transparent hover:border-emerald-300 transition-all transform hover:-translate-y-1"
            >
              <div className="text-4xl mb-3">💸</div>
              <h3 className="font-semibold text-lg mb-2 text-gray-800 group-hover:text-emerald-600 transition-colors">
                Withdraw
              </h3>
              <p className="text-sm text-gray-600">
                Unlinkable withdrawals using nullifiers
              </p>
            </Link>
            <Link
              href="/yield-proof"
              className="group p-6 bg-white rounded-xl shadow-md hover:shadow-xl border-2 border-transparent hover:border-violet-300 transition-all transform hover:-translate-y-1"
            >
              <div className="text-4xl mb-3">📊</div>
              <h3 className="font-semibold text-lg mb-2 text-gray-800 group-hover:text-violet-600 transition-colors">
                Yield Proof
              </h3>
              <p className="text-sm text-gray-600">
                Generate tax reports with selective disclosure
              </p>
            </Link>
            <Link
              href="/kyc"
              className="group p-6 bg-white rounded-xl shadow-md hover:shadow-xl border-2 border-transparent hover:border-amber-300 transition-all transform hover:-translate-y-1"
            >
              <div className="text-4xl mb-3">✅</div>
              <h3 className="font-semibold text-lg mb-2 text-gray-800 group-hover:text-amber-600 transition-colors">
                KYC
              </h3>
              <p className="text-sm text-gray-600">
                Register for tiered access with ZK-KYC
              </p>
            </Link>
          </div>
        </div>
        
        {/* Features */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🔒</div>
                <div>
                  <h3 className="font-semibold text-xl mb-2 text-gray-800">Shielded Deposits</h3>
                  <p className="text-gray-700">
                    Deposit amounts are hidden via Pedersen commitments. Your privacy is protected on-chain.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🔓</div>
                <div>
                  <h3 className="font-semibold text-xl mb-2 text-gray-800">Unlinkable Withdrawals</h3>
                  <p className="text-gray-700">
                    Withdraw without linking to your deposit using nullifiers. Complete transaction privacy.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl border border-violet-200 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="text-3xl">📊</div>
                <div>
                  <h3 className="font-semibold text-xl mb-2 text-gray-800">Selective Disclosure</h3>
                  <p className="text-gray-700">
                    Generate yield proofs for tax/regulatory compliance without revealing exact amounts.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="text-3xl">✅</div>
                <div>
                  <h3 className="font-semibold text-xl mb-2 text-gray-800">ZK-KYC Tiers</h3>
                  <p className="text-gray-700">
                    Three-tier access control (Anonymous, Pseudonymous, Institutional) with zero-knowledge proofs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

