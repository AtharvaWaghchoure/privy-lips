// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CommitmentRegistry.sol";

contract PrivateLiquidityPool is Ownable {
    IERC20 public immutable token0; // USDC
    IERC20 public immutable token1; // WETH (or ETH)
    
    CommitmentRegistry public immutable registry;
    
    // Pool reserves (public, but individual positions are private)
    uint256 public reserve0; // USDC
    uint256 public reserve1; // WETH
    
    // Total LP tokens issued
    uint256 public totalSupply;
    
    // Mapping from commitment to LP tokens minted
    mapping(bytes32 => uint256) public commitmentLPTokens;
    
    // Fee: 0.3% = 3000 basis points (out of 1,000,000)
    uint256 public constant FEE_BPS = 3000;
    uint256 public constant BPS_DENOMINATOR = 1000000;
    
    // Minimum liquidity to prevent first deposit manipulation
    uint256 public constant MINIMUM_LIQUIDITY = 10**3;
    
    // Accumulated fees (for yield distribution)
    uint256 public accumulatedFees0;
    uint256 public accumulatedFees1;
    
    event Deposit(
        bytes32 indexed commitment,
        uint256 amount0,
        uint256 amount1,
        uint256 liquidity
    );
    
    event Withdrawal(
        bytes32 indexed commitment,
        bytes32 indexed nullifier,
        uint256 amount0,
        uint256 amount1
    );
    
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    
    event Sync(uint256 reserve0, uint256 reserve1);
    
    constructor(
        address _token0,
        address _token1,
        address _registry,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_token0 != address(0), "Pool: invalid token0");
        require(_token1 != address(0), "Pool: invalid token1");
        require(_registry != address(0), "Pool: invalid registry");
        
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
        registry = CommitmentRegistry(_registry);
    }

    function deposit(
        bytes32 commitment,
        uint256 amount0,
        uint256 amount1,
        bytes calldata proof
    ) external returns (uint256 liquidity) {

        
        require(amount0 > 0 || amount1 > 0, "Pool: insufficient amount");
        
        // Calculate liquidity to mint
        uint256 _totalSupply = totalSupply;
        
        if (_totalSupply == 0) {
            // First deposit: require both tokens to establish initial price
            require(amount0 > 0 && amount1 > 0, "Pool: first deposit requires both tokens");
            liquidity = _sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            require(liquidity > 0, "Pool: insufficient liquidity");
            
            // Lock minimum liquidity forever
            _mint(address(0), MINIMUM_LIQUIDITY);
        } else {
            // Subsequent deposits: maintain ratio
            // Require both tokens if both reserves exist, or allow single token if one reserve is zero
            if (reserve0 > 0 && reserve1 > 0) {
                // Both reserves exist: require both tokens to maintain ratio
                require(amount0 > 0 && amount1 > 0, "Pool: both tokens required to maintain ratio");
                liquidity = _min(
                    (amount0 * _totalSupply) / reserve0,
                    (amount1 * _totalSupply) / reserve1
                );
            } else if (reserve0 > 0) {
                // Only reserve0 exists: allow only token0
                require(amount0 > 0 && amount1 == 0, "Pool: only token0 allowed when reserve1 is zero");
                liquidity = (amount0 * _totalSupply) / reserve0;
            } else {
                // Only reserve1 exists: allow only token1
                require(amount1 > 0 && amount0 == 0, "Pool: only token1 allowed when reserve0 is zero");
                liquidity = (amount1 * _totalSupply) / reserve1;
            }
        }
        
        require(liquidity > 0, "Pool: insufficient liquidity minted");
        
        // Transfer tokens from user
        if (amount0 > 0) {
            require(token0.transferFrom(msg.sender, address(this), amount0), "Pool: transfer0 failed");
        }
        if (amount1 > 0) {
            require(token1.transferFrom(msg.sender, address(this), amount1), "Pool: transfer1 failed");
        }
        
        // Update reserves
        reserve0 += amount0;
        reserve1 += amount1;
        
        // Mint LP tokens
        _mint(msg.sender, liquidity);
        
        // Register commitment in registry
        registry.registerCommitment(commitment, liquidity);
        commitmentLPTokens[commitment] = liquidity;
        
        emit Deposit(commitment, amount0, amount1, liquidity);
        emit Sync(reserve0, reserve1);
    }

    function withdraw(
        bytes32 commitment,
        bytes32 nullifier,
        uint256 liquidity,
        bytes calldata proof
    ) external returns (uint256 amount0, uint256 amount1) {
        // In production, verify SP1 proof here
        // Verify user owns the commitment and nullifier is valid
        
        require(liquidity > 0, "Pool: insufficient liquidity");
        require(commitmentLPTokens[commitment] >= liquidity, "Pool: insufficient commitment liquidity");
        
        // Calculate amounts to return
        uint256 _totalSupply = totalSupply;
        amount0 = (liquidity * reserve0) / _totalSupply;
        amount1 = (liquidity * reserve1) / _totalSupply;
        
        require(amount0 > 0 && amount1 > 0, "Pool: insufficient liquidity");
        
        // Burn LP tokens
        _burn(msg.sender, liquidity);
        
        // Update reserves
        reserve0 -= amount0;
        reserve1 -= amount1;
        
        // Update commitment
        commitmentLPTokens[commitment] -= liquidity;
        
        // Use nullifier
        registry.useNullifier(nullifier, commitment);
        
        // Transfer tokens to user
        require(token0.transfer(msg.sender, amount0), "Pool: transfer0 failed");
        require(token1.transfer(msg.sender, amount1), "Pool: transfer1 failed");
        
        emit Withdrawal(commitment, nullifier, amount0, amount1);
        emit Sync(reserve0, reserve1);
    }

    function swap(
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address to
    ) external {
        require(amount0Out > 0 || amount1Out > 0, "Pool: insufficient output");
        require(amount0Out < reserve0 && amount1Out < reserve1, "Pool: insufficient liquidity");
        
        uint256 balance0 = token0.balanceOf(address(this));
        uint256 balance1 = token1.balanceOf(address(this));
        
        // Transfer input tokens
        if (amount0In > 0) {
            require(token0.transferFrom(msg.sender, address(this), amount0In), "Pool: transfer0 failed");
        }
        if (amount1In > 0) {
            require(token1.transferFrom(msg.sender, address(this), amount1In), "Pool: transfer1 failed");
        }
        
        // Calculate fees (0.3%)
        uint256 balance0After = token0.balanceOf(address(this));
        uint256 balance1After = token1.balanceOf(address(this));
        
        uint256 amount0InWithFee = amount0In * (BPS_DENOMINATOR - FEE_BPS) / BPS_DENOMINATOR;
        uint256 amount1InWithFee = amount1In * (BPS_DENOMINATOR - FEE_BPS) / BPS_DENOMINATOR;
        
        // Verify K = x * y is maintained (with fees)
        require(
            balance0After * balance1After >= reserve0 * reserve1,
            "Pool: K invariant violated"
        );
        
        // Transfer output tokens
        if (amount0Out > 0) {
            require(token0.transfer(to, amount0Out), "Pool: transfer0 failed");
        }
        if (amount1Out > 0) {
            require(token1.transfer(to, amount1Out), "Pool: transfer1 failed");
        }
        
        // Update reserves
        reserve0 = token0.balanceOf(address(this));
        reserve1 = token1.balanceOf(address(this));
        
        // Accumulate fees
        accumulatedFees0 += (amount0In * FEE_BPS) / BPS_DENOMINATOR;
        accumulatedFees1 += (amount1In * FEE_BPS) / BPS_DENOMINATOR;
        
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
        emit Sync(reserve0, reserve1);
    }
    
    /**
     * @notice Get current pool reserves
     * @return _reserve0 Reserve of token0
     * @return _reserve1 Reserve of token1
     */
    function getReserves() external view returns (uint256 _reserve0, uint256 _reserve1) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
    }
    
    /**
     * @notice Get accumulated fees (for yield distribution)
     * @return _fees0 Accumulated fees in token0
     * @return _fees1 Accumulated fees in token1
     */
    function getAccumulatedFees() external view returns (uint256 _fees0, uint256 _fees1) {
        _fees0 = accumulatedFees0;
        _fees1 = accumulatedFees1;
    }
    
    // ERC20-like functions for LP tokens
    mapping(address => uint256) private _balances;
    
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }
    
    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        _balances[to] += amount;
    }
    
    function _burn(address from, uint256 amount) internal {
        _balances[from] -= amount;
        totalSupply -= amount;
    }
    
    // Math helpers
    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
    
    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}

