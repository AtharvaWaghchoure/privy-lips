import { useWallet, useChain, useConnectionStatus } from "@thirdweb-dev/react";

// Mantle Sepolia chain ID
export const MANTLE_SEPOLIA_CHAIN_ID = 5003;

export function useMantleWallet() {
  const wallet = useWallet();
  const chain = useChain();
  const connectionStatus = useConnectionStatus();

  const isConnected = connectionStatus === "connected";
  const isMantleNetwork = chain?.chainId === MANTLE_SEPOLIA_CHAIN_ID;
  
  const getAddress = async () => {
    if (!wallet) return undefined;
    try {
      return await wallet.getAddress();
    } catch {
      return undefined;
    }
  };

  const switchToMantleSepolia = async () => {
    if (!wallet) return;

    try {
      await wallet.switchChain(MANTLE_SEPOLIA_CHAIN_ID);
    } catch (error: any) {
      console.error("Failed to switch chain:", error);
      // Thirdweb should handle chain addition automatically
      // If it fails, user can manually add the network
      alert("Please add Mantle Sepolia network manually in your wallet");
    }
  };

  return {
    wallet,
    isConnected,
    isMantleNetwork,
    getAddress,
    switchToMantleSepolia,
  };
}
