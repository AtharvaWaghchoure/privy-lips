/**
 * Encryption utilities for secret storage
 * Uses Web Crypto API for production-grade encryption
 */

/**
 * Encrypt data using AES-GCM
 * @param data The data to encrypt (as string)
 * @param password The password for encryption
 * @returns Encrypted data as base64 string
 */
export async function encrypt(data: string, password: string): Promise<string> {
  // Generate a key from password using PBKDF2
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const passwordBuffer = encoder.encode(password);

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  // Derive key using PBKDF2
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  // Generate IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    dataBuffer
  );

  // Combine salt, IV, and encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  // Convert to base64 for storage
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data using AES-GCM
 * @param encryptedData The encrypted data (as base64 string)
 * @param password The password for decryption
 * @returns Decrypted data as string
 */
export async function decrypt(encryptedData: string, password: string): Promise<string> {
  // Decode from base64
  const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));

  // Extract salt, IV, and encrypted data
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const encrypted = combined.slice(28);

  // Import password as key material
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  // Derive key
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encrypted
  );

  // Convert to string
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Derive encryption password from wallet address
 * This ensures each wallet has a unique encryption key
 * @param walletAddress The wallet address
 * @returns A password derived from the wallet address
 */
export function derivePasswordFromWallet(walletAddress: string): string {
  // Use wallet address as base for password derivation
  // In production, you might want to combine with user-provided password
  return `privy-lips-${walletAddress.toLowerCase()}`;
}

