// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./YieldAccumulator.sol";
import "./CommitmentRegistry.sol";
import "./SP1Verifier.sol";

contract SelectiveDisclosure is Ownable {
    YieldAccumulator public immutable accumulator;
    CommitmentRegistry public immutable registry;
    
    // SP1 verifier adapter address (to be set after deployment)
    address public sp1Verifier;
    
    // Mapping from proof hash to verification status
    mapping(bytes32 => bool) public verifiedProofs;
    
    // Tax report structure
    struct TaxReport {
        bytes32 commitment;
        uint256 startTime;
        uint256 endTime;
        uint256 minYield;
        uint256 maxYield;
        bytes32 proofHash;
        bool verified;
    }
    
    // Mapping from report ID to tax report
    mapping(bytes32 => TaxReport) public taxReports;
    
    // Total number of reports generated
    uint256 public totalReports;
    
    event ProofVerified(
        bytes32 indexed proofHash,
        bytes32 indexed commitment,
        uint256 minYield,
        uint256 maxYield
    );
    
    event TaxReportGenerated(
        bytes32 indexed reportId,
        bytes32 indexed commitment,
        uint256 startTime,
        uint256 endTime,
        uint256 minYield,
        uint256 maxYield
    );
    
    event SP1VerifierSet(address indexed verifier);
    
    constructor(
        address _accumulator,
        address _registry,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_accumulator != address(0), "Disclosure: invalid accumulator");
        require(_registry != address(0), "Disclosure: invalid registry");
        
        accumulator = YieldAccumulator(_accumulator);
        registry = CommitmentRegistry(_registry);
    }
    
    /**
     * @notice Set the SP1 verifier address
     * @param _verifier Address of the SP1 verifier contract
     */
    function setSP1Verifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "Disclosure: invalid verifier");
        sp1Verifier = _verifier;
        emit SP1VerifierSet(_verifier);
    }

    function verifyYieldProof(
        bytes32 commitment,
        uint256 minYield,
        uint256 maxYield,
        bytes calldata proof,
        bytes calldata publicInputs
    ) external returns (bool verified) {
        require(minYield <= maxYield, "Disclosure: invalid range");
        require(registry.commitments(commitment), "Disclosure: invalid commitment");
        
        // Hash the proof for tracking
        bytes32 proofHash = keccak256(abi.encodePacked(commitment, minYield, maxYield, proof));
        
        // Production: Call SP1 verifier
        if (sp1Verifier != address(0)) {
            // Use SP1 verifier for production
            verified = SP1VerifierAdapter(sp1Verifier).verifyProof(proof, publicInputs);
            
            // Additional check: verify yield is in range (from accumulator)
            (uint256 actualYield, ) = accumulator.getYield(commitment);
            verified = verified && actualYield >= minYield && actualYield <= maxYield;
        } else {
            // Fallback for MVP/testing: Simplified verification
            (uint256 actualYield, ) = accumulator.getYield(commitment);
            verified = actualYield >= minYield && actualYield <= maxYield;
        }
        
        if (verified) {
            verifiedProofs[proofHash] = true;
            emit ProofVerified(proofHash, commitment, minYield, maxYield);
        }
        
        return verified;
    }

    function generateTaxReport(
        bytes32 commitment,
        uint256 startTime,
        uint256 endTime,
        uint256 minYield,
        uint256 maxYield,
        bytes calldata proof,
        bytes calldata publicInputs
    ) external returns (bytes32 reportId) {
        require(startTime < endTime, "Disclosure: invalid time range");
        require(endTime <= block.timestamp, "Disclosure: future end time");
        require(minYield <= maxYield, "Disclosure: invalid yield range");
        
        // Verify the proof first
        bool verified = this.verifyYieldProof(commitment, minYield, maxYield, proof, publicInputs);
        require(verified, "Disclosure: proof verification failed");
        
        // Generate report ID
        reportId = keccak256(abi.encodePacked(
            commitment,
            startTime,
            endTime,
            minYield,
            maxYield,
            block.timestamp,
            msg.sender
        ));
        
        // Store report
        taxReports[reportId] = TaxReport({
            commitment: commitment,
            startTime: startTime,
            endTime: endTime,
            minYield: minYield,
            maxYield: maxYield,
            proofHash: keccak256(abi.encodePacked(commitment, minYield, maxYield, proof)),
            verified: true
        });
        
        totalReports++;
        
        emit TaxReportGenerated(reportId, commitment, startTime, endTime, minYield, maxYield);
    }

    function getTaxReport(bytes32 reportId) external view returns (TaxReport memory report) {
        report = taxReports[reportId];
        require(report.verified, "Disclosure: report not found");
    }

    function isProofVerified(bytes32 proofHash) external view returns (bool) {
        return verifiedProofs[proofHash];
    }

    function verifyYieldInRange(
        bytes32 commitment,
        uint256 startTime,
        uint256 endTime,
        uint256 minYield,
        uint256 maxYield
    ) external view returns (uint256 yieldInRange) {
        yieldInRange = accumulator.getYieldInRange(commitment, startTime, endTime);
        require(yieldInRange >= minYield && yieldInRange <= maxYield, "Disclosure: yield out of range");
    }
}

