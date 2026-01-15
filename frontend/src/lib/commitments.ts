import { ethers } from "ethers";

/**
 * Generate a Pedersen commitment from amount and secret
 * Production implementation with improved privacy properties
 * 
 * Note: For full production, this should use actual Pedersen commitments on an elliptic curve
 * (e.g., Baby Jubjub curve: C = g^amount * h^secret mod p)
 * For now, we use a hash-based commitment that maintains hiding properties
 */
export function generateCommitment(amount: bigint, secret: Uint8Array): string {
  // Production: Use Pedersen commitment C = g^amount * h^secret
  // For compatibility with existing contracts, we use a hash-based approach
  // that still provides hiding (can't determine amount from commitment)
  
  const amountBytes = ethers.utils.hexlify(ethers.utils.zeroPad(ethers.BigNumber.from(amount).toHexString(), 32));
  const secretHex = ethers.utils.hexlify(secret);
  
  // Use a more secure commitment scheme: hash(amount || secret || domain)
  // This provides hiding (can't determine amount from commitment)
  // In full production, replace with actual Pedersen commitment
  const commitment = ethers.utils.keccak256(
    ethers.utils.concat([
      amountBytes,
      secretHex,
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PRIVY_LIPS_COMMITMENT"))
    ])
  );
  
  return commitment;
}

/**
 * Generate a nullifier from commitment and secret
 */
export function generateNullifier(commitment: string, secret: Uint8Array): string {
  const hasher = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["bytes32", "bytes32"],
      [commitment, ethers.utils.hexlify(secret)]
    )
  );
  return hasher;
}

