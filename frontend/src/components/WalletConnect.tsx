"use client";

import { ConnectWallet } from "@thirdweb-dev/react";
import { useMantleWallet } from "@/lib/wallet";
import { useState, useEffect } from "react";

export default function WalletConnect() {
  const { isConnected, isMantleNetwork, getAddress, switchToMantleSepolia } = useMantleWallet();
  const [address, setAddress] = useState<string | undefined>();

  useEffect(() => {
    if (isConnected) {
      getAddress().then(setAddress);
    } else {
      setAddress(undefined);
    }
  }, [isConnected, getAddress]);

  if (!isConnected) {
    return (
      <div className="flex items-center gap-4">
        <ConnectWallet
          theme="dark"
          modalSize="wide"
          welcomeScreen={{
            title: "Connect to Privy-Lips",
            subtitle: "Private Liquidity Protocol on Mantle",
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {!isMantleNetwork && (
        <button
          onClick={switchToMantleSepolia}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Switch to Mantle Sepolia
        </button>
      )}
      {address && (
        <div className="px-4 py-2 bg-green-500 text-white rounded">
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
      )}
      <ConnectWallet />
    </div>
  );
}

