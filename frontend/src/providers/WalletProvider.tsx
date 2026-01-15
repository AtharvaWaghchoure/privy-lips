"use client";

import { ThirdwebProvider } from "@thirdweb-dev/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// Mantle Sepolia Testnet configuration
const mantleSepolia = {
  chainId: 5003,
  rpc: ["https://rpc.sepolia.mantle.xyz"],
  nativeCurrency: {
    decimals: 18,
    name: "Mantle",
    symbol: "MNT",
  },
  shortName: "mantle-sepolia",
  slug: "mantle-sepolia",
  testnet: true,
  chain: "mantle-sepolia",
  name: "Mantle Sepolia Testnet",
};

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "910b8eeb02974e796e21bfff7c2d8461";

  return (
    <QueryClientProvider client={queryClient}>
      <ThirdwebProvider
        clientId={clientId}
        activeChain={mantleSepolia}
        supportedChains={[mantleSepolia]}
      >
        {children}
      </ThirdwebProvider>
    </QueryClientProvider>
  );
}

