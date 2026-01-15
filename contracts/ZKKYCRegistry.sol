// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SP1Verifier.sol";

contract ZKKYCRegistry is Ownable {
    enum KYCTier {
        Anonymous,
        Pseudonymous,
        Institutional
    }
    
    // Deposit limits per tier (in USD, scaled by 1e18)
    uint256 public constant ANONYMOUS_LIMIT = 10_000 * 1e18; // $10k
    uint256 public constant PSEUDONYMOUS_LIMIT = 100_000 * 1e18; // $100k
    uint256 public constant INSTITUTIONAL_LIMIT = type(uint256).max; // Unlimited
    
    // Mapping from user address to KYC proof commitment
    mapping(address => bytes32) public userKYCCommitment;
    
    // Mapping from user address to KYC tier
    mapping(address => KYCTier) public userTier;
    
    // Mapping from user address to total deposits (for limit enforcement)
    mapping(address => uint256) public userTotalDeposits;
    
    // Mapping from commitment hash to verification status
    mapping(bytes32 => bool) public verifiedCommitments;
    
    // SP1 verifier adapter address
    address public sp1Verifier;
    
    // KYC attributes structure
    struct KYCAttributes {
        bool ageVerified; // >= 18 or >= 21
        bool jurisdictionCompliant; // Not sanctioned
        bool accreditedInvestor; // For institutional tier
    }
    
    // Mapping from commitment to attributes
    mapping(bytes32 => KYCAttributes) public commitmentAttributes;
    
    event KYCCommitmentRegistered(
        address indexed user,
        bytes32 indexed commitment,
        KYCTier tier
    );
    
    event TierUpgraded(
        address indexed user,
        KYCTier oldTier,
        KYCTier newTier
    );
    
    event DepositLimitEnforced(
        address indexed user,
        uint256 attemptedAmount,
        uint256 limit
    );
    
    event SP1VerifierSet(address indexed verifier);
    
    constructor(address initialOwner) Ownable(initialOwner) {
        // Owner can set SP1 verifier later
    }

    function setSP1Verifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "KYC: invalid verifier");
        sp1Verifier = _verifier;
        emit SP1VerifierSet(_verifier);
    }

    function registerKYCCommitment(
        bytes32 commitment,
        KYCTier tier,
        bytes calldata proof,
        bytes calldata publicInputs,
        KYCAttributes calldata attributes
    ) external {
        require(!verifiedCommitments[commitment], "KYC: commitment already exists");
        
        // Verify proof (in production, call SP1 verifier)
        bool proofValid = false;
        
        if (sp1Verifier != address(0)) {
            // Production: Use SP1 verifier
            proofValid = SP1VerifierAdapter(sp1Verifier).verifyProof(proof, publicInputs);
        } else {
            // Fallback for MVP/testing: Simplified checks
            if (tier == KYCTier.Pseudonymous) {
                require(attributes.jurisdictionCompliant, "KYC: must be jurisdiction compliant");
                proofValid = attributes.jurisdictionCompliant;
            } else if (tier == KYCTier.Institutional) {
                require(attributes.accreditedInvestor, "KYC: must be accredited investor");
                require(attributes.jurisdictionCompliant, "KYC: must be jurisdiction compliant");
                proofValid = attributes.accreditedInvestor && attributes.jurisdictionCompliant;
            } else {
                proofValid = true; // Anonymous tier
            }
        }
        
        require(proofValid, "KYC: proof verification failed");
        
        // Store commitment
        bytes32 oldCommitment = userKYCCommitment[msg.sender];
        KYCTier oldTier = userTier[msg.sender];
        
        userKYCCommitment[msg.sender] = commitment;
        userTier[msg.sender] = tier;
        verifiedCommitments[commitment] = true;
        commitmentAttributes[commitment] = attributes;
        
        if (oldTier != tier) {
            emit TierUpgraded(msg.sender, oldTier, tier);
        }
        
        emit KYCCommitmentRegistered(msg.sender, commitment, tier);
    }

    function canDeposit(address user, uint256 amount) external view returns (
        bool allowed,
        uint256 limit
    ) {
        KYCTier tier = userTier[user];
        
        // Get limit for tier
        if (tier == KYCTier.Anonymous) {
            limit = ANONYMOUS_LIMIT;
        } else if (tier == KYCTier.Pseudonymous) {
            limit = PSEUDONYMOUS_LIMIT;
        } else {
            limit = INSTITUTIONAL_LIMIT;
        }
        
        uint256 currentDeposits = userTotalDeposits[user];
        allowed = (currentDeposits + amount) <= limit;
    }

    function recordDeposit(address user, uint256 amount) external {
        // Only pool can call this
        // In production, would check msg.sender is pool address
        
        (bool allowed, uint256 limit) = this.canDeposit(user, amount);
        
        if (!allowed) {
            emit DepositLimitEnforced(user, amount, limit);
            revert("KYC: deposit limit exceeded");
        }
        
        userTotalDeposits[user] += amount;
    }

    function getUserKYC(address user) external view returns (
        KYCTier tier,
        bytes32 commitment
    ) {
        tier = userTier[user];
        commitment = userKYCCommitment[user];
    }

    function getTierLimit(KYCTier tier) external pure returns (uint256 limit) {
        if (tier == KYCTier.Anonymous) {
            return ANONYMOUS_LIMIT;
        } else if (tier == KYCTier.Pseudonymous) {
            return PSEUDONYMOUS_LIMIT;
        } else {
            return INSTITUTIONAL_LIMIT;
        }
    }

    function getCommitmentAttributes(bytes32 commitment) external view returns (
        KYCAttributes memory attributes
    ) {
        require(verifiedCommitments[commitment], "KYC: commitment not found");
        attributes = commitmentAttributes[commitment];
    }
}

