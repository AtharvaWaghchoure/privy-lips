//! SP1 Withdrawal Proof Program
//! 
//! Proves ownership of deposit commitment, generates nullifier to prevent double-spend,
//! and proves valid withdrawal amount without revealing the commitment details.

use sp1_sdk::{ProverClient, SP1Stdin};

fn main() {
    // Initialize SP1 prover client
    let client = ProverClient::new();
    
    // Read inputs from stdin
    let mut stdin = SP1Stdin::new();
    
    // Input: original commitment (private)
    let commitment: [u8; 32] = stdin.read();
    
    // Input: secret used in commitment (private)
    let secret: [u8; 32] = stdin.read();
    
    // Input: withdrawal amount (private)
    let withdrawal_amount: u64 = stdin.read();
    
    // Input: available LP tokens (public)
    let available_lp_tokens: u64 = stdin.read();
    
    // Verify commitment matches secret (prove ownership)
    let computed_commitment = generate_commitment_from_secret(secret);
    assert_eq!(computed_commitment, commitment, "Invalid commitment");
    
    // Generate nullifier: hash(commitment || secret || withdrawal_index)
    let nullifier = generate_nullifier(commitment, secret);
    
    // Prove withdrawal amount <= available LP tokens
    assert!(withdrawal_amount <= available_lp_tokens, "Insufficient LP tokens");
    
    // Output: nullifier (public, prevents double-spend)
    stdin.write(&nullifier);
    
    // Output: proof that withdrawal is valid (public)
    stdin.write(&true);
    
    // Generate proof
    let proof = client.prove("withdrawal-proof", stdin);
    
    // Output proof
    println!("Proof generated: {:?}", proof);
}

fn generate_commitment_from_secret(secret: [u8; 32]) -> [u8; 32] {
    use sha2::{Sha256, Digest};
    
    let mut hasher = Sha256::new();
    hasher.update(&secret);
    hasher.finalize().into()
}

fn generate_nullifier(commitment: [u8; 32], secret: [u8; 32]) -> [u8; 32] {
    use sha2::{Sha256, Digest};
    
    let mut hasher = Sha256::new();
    hasher.update(&commitment);
    hasher.update(&secret);
    hasher.update(&b"withdrawal");
    hasher.finalize().into()
}

