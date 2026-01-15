// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CommitmentRegistry is Ownable {
    // Commitment structure: hash(amount, secret, commitmentIndex)
    mapping(bytes32 => bool) public commitments;
    
    // Nullifier structure: hash(commitment, secret) - prevents double-spend
    mapping(bytes32 => bool) public nullifiers;
    
    // Maps commitment to pool share (LP tokens)
    mapping(bytes32 => uint256) public commitmentToShares;
    
    // Maps commitment to deposit timestamp
    mapping(bytes32 => uint256) public commitmentToTimestamp;
    
    // Total number of commitments
    uint256 public totalCommitments;
    
    // Pool address that can register commitments
    address public poolAddress;
    
    event CommitmentRegistered(
        bytes32 indexed commitment,
        uint256 shares,
        uint256 timestamp
    );
    
    event NullifierUsed(
        bytes32 indexed nullifier,
        bytes32 indexed commitment
    );
    
    event PoolAddressSet(address indexed poolAddress);
    
    constructor(address initialOwner) Ownable(initialOwner) {
        // Owner can set pool address later
    }

    function setPoolAddress(address _poolAddress) external onlyOwner {
        require(_poolAddress != address(0), "Registry: invalid pool address");
        poolAddress = _poolAddress;
        emit PoolAddressSet(_poolAddress);
    }

    function registerCommitment(bytes32 commitment, uint256 shares) external {
        require(msg.sender == poolAddress, "Registry: only pool can register");
        require(!commitments[commitment], "Registry: commitment already exists");
        require(shares > 0, "Registry: shares must be positive");
        
        commitments[commitment] = true;
        commitmentToShares[commitment] = shares;
        commitmentToTimestamp[commitment] = block.timestamp;
        totalCommitments++;
        
        emit CommitmentRegistered(commitment, shares, block.timestamp);
    }

    function useNullifier(bytes32 nullifier, bytes32 commitment) external {
        require(msg.sender == poolAddress, "Registry: only pool can use nullifiers");
        require(!nullifiers[nullifier], "Registry: nullifier already used");
        require(commitments[commitment], "Registry: commitment does not exist");
        
        nullifiers[nullifier] = true;
        
        emit NullifierUsed(nullifier, commitment);
    }

    function getCommitment(bytes32 commitment) external view returns (
        bool exists,
        uint256 shares,
        uint256 timestamp
    ) {
        exists = commitments[commitment];
        shares = commitmentToShares[commitment];
        timestamp = commitmentToTimestamp[commitment];
    }

    function isNullifierUsed(bytes32 nullifier) external view returns (bool) {
        return nullifiers[nullifier];
    }
    
    function updateShares(bytes32 commitment, uint256 newShares) external {
        require(msg.sender == poolAddress, "Registry: only pool can update shares");
        require(commitments[commitment], "Registry: commitment does not exist");
        
        commitmentToShares[commitment] = newShares;
    }
}

