# Withdrawal Proof SP1 Program

Generates a zero-knowledge proof for a withdrawal transaction:
- Proves ownership of deposit commitment
- Generates nullifier to prevent double-spend
- Proves valid withdrawal amount without revealing commitment details

## Usage

```bash
cargo build --release
sp1 prove withdrawal-proof
```

## Inputs

- `commitment`: Original deposit commitment (private)
- `secret`: Secret used in commitment (private)
- `withdrawal_amount`: Amount to withdraw (private)
- `available_lp_tokens`: Available LP tokens (public)

## Outputs

- `nullifier`: Nullifier hash (public, prevents double-spend)
- `proof`: Proof of valid withdrawal (public)

