"use client";

import Link from "next/link";
import WalletConnect from "./WalletConnect";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/deposit", label: "Deposit", emoji: "💰" },
    { href: "/withdraw", label: "Withdraw", emoji: "💸" },
    { href: "/yield-proof", label: "Yield Proof", emoji: "📊" },
    { href: "/kyc", label: "KYC", emoji: "✅" },
  ];

  return (
    <header className="w-full border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <img 
              src="/logo-icon.svg" 
              alt="Privy-Lips Logo" 
              className="w-10 h-10 transition-transform group-hover:scale-105"
            />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:to-indigo-700 transition-all">
              Privy-Lips
            </span>
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
              Beta
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <span className="mr-1.5">{link.emoji}</span>
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            <WalletConnect />
          </div>
        </div>
      </div>
    </header>
  );
}
