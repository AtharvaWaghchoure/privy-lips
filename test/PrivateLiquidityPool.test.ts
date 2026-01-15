import { expect } from "chai";
import { ethers } from "hardhat";
import { PrivateLiquidityPool, CommitmentRegistry, IERC20 } from "../typechain-types";

describe("PrivateLiquidityPool", function () {
  let pool: PrivateLiquidityPool;
  let registry: CommitmentRegistry;
  let token0: IERC20;
  let token1: IERC20;
  let owner: any;
  let user: any;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    token0 = await ERC20Factory.deploy("USDC", "USDC", 6);
    token1 = await ERC20Factory.deploy("WETH", "WETH", 18);
    await token0.deployed();
    await token1.deployed();

    // Deploy CommitmentRegistry
    const RegistryFactory = await ethers.getContractFactory("CommitmentRegistry");
    registry = await RegistryFactory.deploy(owner.address);
    await registry.deployed();

    // Deploy PrivateLiquidityPool
    const PoolFactory = await ethers.getContractFactory("PrivateLiquidityPool");
    pool = await PoolFactory.deploy(
      token0.address,
      token1.address,
      registry.address,
      owner.address
    );
    await pool.deployed();

    // Set pool address in registry
    await registry.setPoolAddress(pool.address);

    // Mint tokens to user
    await token0.mint(user.address, ethers.utils.parseUnits("10000", 6));
    await token1.mint(user.address, ethers.utils.parseEther("100"));
  });

  describe("Deposit", function () {
    it("Should allow first deposit", async function () {
      const commitment = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("commitment-1"));
      const amount0 = ethers.utils.parseUnits("1000", 6);
      const amount1 = ethers.utils.parseEther("1");
      const proof = "0x";

      await token0.connect(user).approve(pool.address, amount0);
      await token1.connect(user).approve(pool.address, amount1);

      await expect(
        pool.connect(user).deposit(commitment, amount0, amount1, proof)
      ).to.emit(pool, "Deposit");

      expect(await pool.reserve0()).to.equal(amount0);
      expect(await pool.reserve1()).to.equal(amount1);
    });
  });

  describe("Withdrawal", function () {
    it("Should allow withdrawal", async function () {
      // First deposit
      const commitment = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("commitment-1"));
      const amount0 = ethers.utils.parseUnits("1000", 6);
      const amount1 = ethers.utils.parseEther("1");
      const proof = "0x";

      await token0.connect(user).approve(pool.address, amount0);
      await token1.connect(user).approve(pool.address, amount1);
      await pool.connect(user).deposit(commitment, amount0, amount1, proof);

      // Withdraw
      const nullifier = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("nullifier-1"));
      const liquidity = await pool.balanceOf(user.address);

      await expect(
        pool.connect(user).withdraw(commitment, nullifier, liquidity, proof)
      ).to.emit(pool, "Withdrawal");
    });
  });
});

