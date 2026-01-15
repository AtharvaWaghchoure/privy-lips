/**
 * Local storage utilities for storing user commitments
 * Production implementation with encryption
 */

import { encrypt, decrypt, derivePasswordFromWallet } from "./encryption";

export interface StoredCommitment {
  commitment: string;
  secret: string; // hex-encoded secret (will be encrypted)
  liquidity: string;
  txHash: string;
  timestamp: number;
  amount0: string;
  amount1: string;
}

const STORAGE_KEY = "privy-lips-commitments";

/**
 * Store a commitment after deposit (with encryption)
 * @param data The commitment data to store
 * @param walletAddress The wallet address for encryption key derivation
 */
export async function storeCommitment(data: StoredCommitment, walletAddress: string): Promise<void> {
  const commitments = await getCommitments(walletAddress);
  
  // Encrypt the secret before storing
  const password = derivePasswordFromWallet(walletAddress);
  const encryptedSecret = await encrypt(data.secret, password);
  
  // Store with encrypted secret
  const encryptedData = {
    ...data,
    secret: encryptedSecret,
  };
  
  commitments.push(encryptedData);
  
  // Store encrypted commitments
  localStorage.setItem(STORAGE_KEY, JSON.stringify(commitments));
}

/**
 * Legacy function for backward compatibility (non-encrypted)
 * @deprecated Use storeCommitment with walletAddress instead
 */
export function storeCommitmentLegacy(data: StoredCommitment) {
  const commitments = getCommitmentsLegacy();
  commitments.push(data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(commitments));
}

/**
 * Get all stored commitments (with decryption)
 * @param walletAddress The wallet address for decryption key derivation
 * @returns Array of decrypted commitments
 */
export async function getCommitments(walletAddress: string): Promise<StoredCommitment[]> {
  if (typeof window === "undefined") return [];
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    const encryptedCommitments = JSON.parse(stored);
    const password = derivePasswordFromWallet(walletAddress);
    
    // Decrypt all secrets
    const decryptedCommitments = await Promise.all(
      encryptedCommitments.map(async (enc: any) => {
        try {
          const decryptedSecret = await decrypt(enc.secret, password);
          return {
            ...enc,
            secret: decryptedSecret,
          };
        } catch (error) {
          // If decryption fails, try legacy format (non-encrypted)
          console.warn("Failed to decrypt commitment, trying legacy format:", error);
          return enc;
        }
      })
    );
    
    return decryptedCommitments;
  } catch (error) {
    console.error("Failed to get commitments:", error);
    return [];
  }
}

/**
 * Legacy function for backward compatibility (non-encrypted)
 * @deprecated Use getCommitments with walletAddress instead
 */
export function getCommitmentsLegacy(): StoredCommitment[] {
  if (typeof window === "undefined") return [];
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Remove a commitment after withdrawal
 * @param commitment The commitment hash to remove
 * @param walletAddress The wallet address for encryption key derivation
 */
export async function removeCommitment(commitment: string, walletAddress: string): Promise<void> {
  const commitments = await getCommitments(walletAddress);
  const filtered = commitments.filter(c => c.commitment !== commitment);
  
  // Re-encrypt before storing
  const password = derivePasswordFromWallet(walletAddress);
  const encryptedFiltered = await Promise.all(
    filtered.map(async (c) => {
      const encryptedSecret = await encrypt(c.secret, password);
      return {
        ...c,
        secret: encryptedSecret,
      };
    })
  );
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(encryptedFiltered));
}

/**
 * Get a specific commitment by commitment hash
 * @param commitment The commitment hash
 * @param walletAddress The wallet address for decryption key derivation
 * @returns The decrypted commitment or null
 */
export async function getCommitment(commitment: string, walletAddress: string): Promise<StoredCommitment | null> {
  const commitments = await getCommitments(walletAddress);
  return commitments.find(c => c.commitment === commitment) || null;
}

