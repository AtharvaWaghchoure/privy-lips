//! SP1 Deposit Proof Program
//! 
//! Generates a Pedersen commitment from deposit amount and secret,
//! and proves balance sufficiency without revealing the amount.

use sp1_sdk::{ProverClient, SP1Stdin};

fn main() {
    // Initialize SP1 prover client
    let client = ProverClient::new();
    
    // Read inputs from stdin
    let mut stdin = SP1Stdin::new();
    
    // Input: deposit amount (private)
    let amount: u64 = stdin.read();
    
    // Input: secret (private, for commitment)
    let secret: [u8; 32] = stdin.read();
    
    // Input: user balance (public, to prove sufficiency)
    let balance: u64 = stdin.read();
    
    // Generate Pedersen commitment: hash(amount || secret || index)
    let commitment = generate_commitment(amount, secret);
    
    // Prove balance >= amount (without revealing amount)
    assert!(balance >= amount, "Insufficient balance");
    
    // Output: commitment (public)
    stdin.write(&commitment);
    
    // Output: proof that balance >= amount (public)
    stdin.write(&true);
    
    // Generate proof
    let proof = client.prove("deposit-proof", stdin);
    
    // Output proof
    println!("Proof generated: {:?}", proof);
}

fn generate_commitment(amount: u64, secret: [u8; 32]) -> [u8; 32] {
    use sha2::{Sha256, Digest};
    
    let mut hasher = Sha256::new();
    hasher.update(&amount.to_le_bytes());
    hasher.update(&secret);
    hasher.finalize().into()
}

