"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@thirdweb-dev/react";
import { useMantleWallet } from "@/lib/wallet";
import { getPoolInfo, getUserPoolStats, PoolInfo, UserPoolStats } from "@/lib/pool";
import { ethers } from "ethers";

export default function PoolStats() {
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [userStats, setUserStats] = useState<UserPoolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  
  const wallet = useWallet();
  const { isConnected, getAddress } = useMantleWallet();

  const loadPoolData = async () => {
    try {
      setLoading(true);
      setError("");

      if (!wallet) {
        setLoading(false);
        return;
      }

      const signer = await wallet.getSigner();
      const provider = signer.provider;
      if (!provider) {
        setLoading(false);
        return;
      }

      // Load pool info
      const poolData = await getPoolInfo(provider);
      setPoolInfo(poolData);

      // Load user stats if connected
      if (isConnected) {
        const address = await getAddress();
        if (address) {
          const stats = await getUserPoolStats(provider, address);
          setUserStats(stats);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load pool data");
      console.error("Error loading pool data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPoolData();
    
    // Refresh every 10 seconds
    const interval = setInterval(loadPoolData, 10000);
    return () => clearInterval(interval);
  }, [wallet, isConnected]);

  if (loading && !poolInfo) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200">
        <p className="text-gray-600">Loading pool data...</p>
      </div>
    );
  }

  if (error && !poolInfo) {
    return (
      <div className="p-6 bg-red-50 rounded-xl border-2 border-red-300">
        <p className="text-red-700 font-medium">Error: {error}</p>
        <button
          onClick={loadPoolData}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!poolInfo) {
    return null;
  }

  const reserve0Formatted = ethers.utils.formatUnits(
    poolInfo.reserve0,
    poolInfo.token0Decimals
  );
  const reserve1Formatted = ethers.utils.formatUnits(
    poolInfo.reserve1,
    poolInfo.token1Decimals
  );
  const totalSupplyFormatted = ethers.utils.formatEther(poolInfo.totalSupply);

  return (
    <div className="space-y-6">
      {/* Pool Overview */}
      <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Pool Overview</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
            <p className="text-sm font-medium text-gray-700 mb-2">{poolInfo.token0Symbol} Reserve</p>
            <p className="text-3xl font-bold text-blue-700">
              {parseFloat(reserve0Formatted).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-xs text-gray-600 mt-2 font-mono">
              {poolInfo.token0Address.slice(0, 6)}...{poolInfo.token0Address.slice(-4)}
            </p>
          </div>

          <div className="p-5 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200">
            <p className="text-sm font-medium text-gray-700 mb-2">{poolInfo.token1Symbol} Reserve</p>
            <p className="text-3xl font-bold text-indigo-700">
              {parseFloat(reserve1Formatted).toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })}
            </p>
            <p className="text-xs text-gray-600 mt-2 font-mono">
              {poolInfo.token1Address.slice(0, 6)}...{poolInfo.token1Address.slice(-4)}
            </p>
          </div>

          <div className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200">
            <p className="text-sm font-medium text-gray-700 mb-2">Total LP Tokens</p>
            <p className="text-3xl font-bold text-emerald-700">
              {parseFloat(totalSupplyFormatted).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-xs text-gray-600 mt-2">Total Supply</p>
          </div>
        </div>

        {/* Pool Ratio */}
        <div className="mt-6 p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-3">Pool Ratio</p>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-gray-800">
              1 {poolInfo.token0Symbol} = <span className="text-blue-600">{(
                parseFloat(reserve1Formatted) / parseFloat(reserve0Formatted)
              ).toFixed(6)}</span> {poolInfo.token1Symbol}
            </p>
            <p className="text-sm text-gray-600">
              or 1 {poolInfo.token1Symbol} = <span className="text-indigo-600">{(
                parseFloat(reserve0Formatted) / parseFloat(reserve1Formatted)
              ).toFixed(2)}</span> {poolInfo.token0Symbol}
            </p>
          </div>
        </div>

        <button
          onClick={loadPoolData}
          className="mt-4 px-5 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
        >
          🔄 Refresh Data
        </button>
      </div>

      {/* User Stats */}
      {isConnected && userStats && (
        <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Your Stats</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Your LP Balance</p>
              <p className="text-3xl font-bold text-amber-700">
                {parseFloat(ethers.utils.formatEther(userStats.lpBalance)).toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}
              </p>
              <p className="text-xs text-gray-600 mt-2">LP Tokens</p>
            </div>

            <div className="p-5 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Active Commitments</p>
              <p className="text-3xl font-bold text-orange-700">
                {userStats.commitments}
              </p>
              <p className="text-xs text-gray-600 mt-2">Deposits</p>
            </div>

            <div className="p-5 bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl border border-violet-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Total Deposited</p>
              <p className="text-lg font-bold text-violet-700">
                {parseFloat(ethers.utils.formatUnits(userStats.totalDeposited.amount0, poolInfo.token0Decimals)).toFixed(2)} {poolInfo.token0Symbol}
              </p>
              <p className="text-sm font-semibold text-violet-600 mt-1">
                {parseFloat(ethers.utils.formatEther(userStats.totalDeposited.amount1)).toFixed(4)} {poolInfo.token1Symbol}
              </p>
            </div>
          </div>

          {/* Token Balances */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Your {poolInfo.token0Symbol} Balance</p>
              <p className="text-2xl font-bold text-blue-700">
                {parseFloat(ethers.utils.formatUnits(userStats.tokenBalances.token0, poolInfo.token0Decimals)).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="p-5 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Your {poolInfo.token1Symbol} Balance</p>
              <p className="text-2xl font-bold text-indigo-700">
                {parseFloat(ethers.utils.formatEther(userStats.tokenBalances.token1)).toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}
              </p>
            </div>
          </div>

          {/* Your Share */}
          {parseFloat(totalSupplyFormatted) > 0 && (
            <div className="mt-6 p-5 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Your Pool Share</p>
              <p className="text-2xl font-bold text-gray-800">
                {(
                  (parseFloat(userStats.lpBalance) / parseFloat(poolInfo.totalSupply)) * 100
                ).toFixed(4)}%
              </p>
            </div>
          )}
        </div>
      )}

      {isConnected && !userStats && (
        <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-xl">
          <p className="text-amber-800 font-medium">No deposits found. Make your first deposit to see your stats!</p>
        </div>
      )}
    </div>
  );
}

