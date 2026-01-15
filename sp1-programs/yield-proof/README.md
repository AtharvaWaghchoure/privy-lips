# Yield Proof SP1 Program

Generates a zero-knowledge proof for yield earned in a time range:
- Proves yield earned without revealing exact amount
- Generates Merkle proof of yield accumulator
- Supports range proofs for tax reporting

## Usage

```bash
cargo build --release
sp1 prove yield-proof
```

## Inputs

- `commitment`: Deposit commitment (private)
- `actual_yield`: Actual yield amount (private)
- `start_time`: Start of time range (public)
- `end_time`: End of time range (public)
- `min_yield`: Minimum yield to disclose (public)
- `max_yield`: Maximum yield to disclose (public)
- `merkle_root`: Merkle root of yield accumulator (public)
- `merkle_proof`: Merkle proof path (public)

## Outputs

- `proof`: Proof that yield is in range (public)
- `commitment_hash`: Commitment hash for verification (public)

