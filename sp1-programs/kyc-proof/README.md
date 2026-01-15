# KYC Proof SP1 Program

Generates a zero-knowledge proof for KYC attributes:
- Proves age >= 18 or >= 21 without revealing exact age
- Proves jurisdiction compliance (not sanctioned) without revealing jurisdiction
- Proves accredited investor status (optional)

## Usage

```bash
cargo build --release
sp1 prove kyc-proof
```

## Inputs

- `age`: User's age (private)
- `jurisdiction`: Jurisdiction code (private)
- `accredited_investor`: Accredited investor status (private)
- `sanctioned_jurisdictions`: List of sanctioned jurisdictions (public)
- `min_age`: Minimum age requirement (public, 18 or 21)

## Outputs

- `kyc_commitment`: KYC commitment hash (public)
- `age_verified`: Age verification flag (public)
- `jurisdiction_compliant`: Jurisdiction compliance flag (public)
- `accredited_investor`: Accredited investor flag (public)

