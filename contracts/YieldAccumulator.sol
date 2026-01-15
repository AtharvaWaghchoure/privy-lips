// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./PrivateLiquidityPool.sol";
import "./CommitmentRegistry.sol";

contract YieldAccumulator is Ownable {
    PrivateLiquidityPool public immutable pool;
    CommitmentRegistry public immutable registry;
    
    // Mapping from commitment to accumulated yield (in USD, scaled by 1e18)
    mapping(bytes32 => uint256) public commitmentYield;
    
    // Mapping from commitment to last update timestamp
    mapping(bytes32 => uint256) public commitmentLastUpdate;
    
    // Merkle root of all yields (updated periodically)
    bytes32 public merkleRoot;
    
    // Epoch for Merkle root updates
    uint256 public currentEpoch;
    uint256 public constant EPOCH_DURATION = 1 days; // Update Merkle root daily
    
    // Total yield distributed (for analytics)
    uint256 public totalYieldDistributed;
    
    event YieldAccrued(
        bytes32 indexed commitment,
        uint256 yieldAmount,
        uint256 timestamp
    );
    
    event MerkleRootUpdated(
        bytes32 indexed merkleRoot,
        uint256 epoch
    );
    
    event PoolAddressSet(address indexed poolAddress);
    
    constructor(
        address _pool,
        address _registry,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_pool != address(0), "Accumulator: invalid pool");
        require(_registry != address(0), "Accumulator: invalid registry");
        
        pool = PrivateLiquidityPool(_pool);
        registry = CommitmentRegistry(_registry);
    }

    function accrueYield(bytes32 commitment) external {
        require(registry.commitments(commitment), "Accumulator: invalid commitment");
        
        (uint256 fees0, uint256 fees1) = pool.getAccumulatedFees();
        uint256 totalSupply = pool.totalSupply();
        uint256 shares = registry.commitmentToShares(commitment);
        
        require(shares > 0, "Accumulator: no shares");
        
        // Calculate yield share (simplified: use token0 as base)
        // In production, would convert both tokens to USD
        uint256 yieldShare0 = (fees0 * shares) / totalSupply;
        uint256 yieldShare1 = (fees1 * shares) / totalSupply;
        
        // Convert to USD equivalent (simplified: 1:1 ratio for MVP)
        // In production, would use price oracle
        uint256 yieldUSD = yieldShare0 + yieldShare1;
        
        // Update commitment yield
        commitmentYield[commitment] += yieldUSD;
        commitmentLastUpdate[commitment] = block.timestamp;
        totalYieldDistributed += yieldUSD;
        
        emit YieldAccrued(commitment, yieldUSD, block.timestamp);
    }

    function batchAccrueYield(bytes32[] calldata commitments) external {
        for (uint256 i = 0; i < commitments.length; i++) {
            this.accrueYield(commitments[i]);
        }
    }

    function getYield(bytes32 commitment) external view returns (
        uint256 yield,
        uint256 lastUpdate
    ) {
        yield = commitmentYield[commitment];
        lastUpdate = commitmentLastUpdate[commitment];
    }

    function getYieldInRange(
        bytes32 commitment,
        uint256 startTime,
        uint256 endTime
    ) external view returns (uint256 yield) {
        require(startTime < endTime, "Accumulator: invalid range");
        require(endTime <= block.timestamp, "Accumulator: future end time");
        
        // For MVP, return total yield if commitment was active in range
        // In production, would track yield snapshots per epoch
        uint256 depositTime = registry.commitmentToTimestamp(commitment);
        
        if (depositTime <= endTime && commitmentLastUpdate[commitment] >= startTime) {
            yield = commitmentYield[commitment];
        }
    }

    function updateMerkleRoot(bytes32 newRoot) external onlyOwner {
        // Check if epoch has passed
        if (block.timestamp >= currentEpoch * EPOCH_DURATION + EPOCH_DURATION) {
            currentEpoch++;
        }
        
        merkleRoot = newRoot;
        
        emit MerkleRootUpdated(newRoot, currentEpoch);
    }

    function getMerkleRoot() external view returns (bytes32 root, uint256 epoch) {
        root = merkleRoot;
        epoch = currentEpoch;
    }
}

