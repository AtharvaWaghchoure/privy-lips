# Deposit Proof SP1 Program

Generates a zero-knowledge proof for a deposit transaction:
- Creates Pedersen commitment from deposit amount and secret
- Proves balance sufficiency without revealing amount
- Outputs commitment and proof for on-chain verification

## Usage

```bash
cargo build --release
sp1 prove deposit-proof
```

## Inputs

- `amount`: Deposit amount (private)
- `secret`: Secret for commitment (private)
- `balance`: User's balance (public)

## Outputs

- `commitment`: Pedersen commitment hash (public)
- `proof`: Proof of balance sufficiency (public)

