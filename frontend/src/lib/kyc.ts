import { ethers } from "ethers";

/**
 * Generate KYC commitment from attributes
 */
export function generateKYCCommitment(
  age: number,
  jurisdiction: string,
  accreditedInvestor: boolean
): string {
  const hasher = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["uint8", "string", "bool"],
      [age, jurisdiction, accreditedInvestor]
    )
  );
  return hasher;
}

