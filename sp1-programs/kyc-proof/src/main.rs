//! SP1 KYC Proof Program
//! 
//! Proves KYC attributes without revealing identity:
//! - Age >= 18 or >= 21
//! - Jurisdiction compliance (not sanctioned)
//! - Accredited investor status (optional)

use sp1_sdk::{ProverClient, SP1Stdin};

fn main() {
    // Initialize SP1 prover client
    let client = ProverClient::new();
    
    // Read inputs from stdin
    let mut stdin = SP1Stdin::new();
    
    // Input: user's age (private)
    let age: u8 = stdin.read();
    
    // Input: jurisdiction code (private)
    let jurisdiction: [u8; 2] = stdin.read();
    
    // Input: accredited investor status (private)
    let accredited_investor: bool = stdin.read();
    
    // Input: sanctioned jurisdictions list (public)
    let sanctioned_jurisdictions: Vec<[u8; 2]> = stdin.read();
    
    // Input: minimum age requirement (public, 18 or 21)
    let min_age: u8 = stdin.read();
    
    // Prove age >= min_age (without revealing exact age)
    assert!(age >= min_age, "Age requirement not met");
    
    // Prove jurisdiction is not sanctioned (without revealing jurisdiction)
    let is_sanctioned = sanctioned_jurisdictions.contains(&jurisdiction);
    assert!(!is_sanctioned, "Jurisdiction is sanctioned");
    
    // Generate KYC commitment
    let kyc_commitment = generate_kyc_commitment(age, jurisdiction, accredited_investor);
    
    // Output: KYC commitment (public)
    stdin.write(&kyc_commitment);
    
    // Output: age verified flag (public, true if >= min_age)
    stdin.write(&(age >= min_age));
    
    // Output: jurisdiction compliant flag (public, true if not sanctioned)
    stdin.write(&!is_sanctioned);
    
    // Output: accredited investor flag (public)
    stdin.write(&accredited_investor);
    
    // Generate proof
    let proof = client.prove("kyc-proof", stdin);
    
    // Output proof
    println!("Proof generated: {:?}", proof);
}

fn generate_kyc_commitment(age: u8, jurisdiction: [u8; 2], accredited: bool) -> [u8; 32] {
    use sha2::{Sha256, Digest};
    
    let mut hasher = Sha256::new();
    hasher.update(&age.to_le_bytes());
    hasher.update(&jurisdiction);
    hasher.update(&accredited.to_le_bytes());
    hasher.finalize().into()
}

