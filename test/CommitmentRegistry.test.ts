import { expect } from "chai";
import { ethers } from "hardhat";
import { CommitmentRegistry } from "../typechain-types";

describe("CommitmentRegistry", function () {
  let registry: CommitmentRegistry;
  let owner: any;
  let pool: any;
  let addr1: any;

  beforeEach(async function () {
    [owner, pool, addr1] = await ethers.getSigners();

    const CommitmentRegistryFactory = await ethers.getContractFactory("CommitmentRegistry");
    registry = await CommitmentRegistryFactory.deploy(owner.address);
    await registry.deployed();

    // Set pool address
    await registry.setPoolAddress(pool.address);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await registry.owner()).to.equal(owner.address);
    });

    it("Should set pool address", async function () {
      await registry.setPoolAddress(pool.address);
      expect(await registry.poolAddress()).to.equal(pool.address);
    });
  });

  describe("Commitment Registration", function () {
    it("Should register a commitment", async function () {
      const commitment = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-commitment"));
      const shares = ethers.utils.parseEther("100");

      const tx = await registry.connect(pool).registerCommitment(commitment, shares);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      
      await expect(tx)
        .to.emit(registry, "CommitmentRegistered")
        .withArgs(commitment, shares, block.timestamp);

      expect(await registry.commitments(commitment)).to.be.true;
      expect(await registry.commitmentToShares(commitment)).to.equal(shares);
    });

    it("Should prevent duplicate commitments", async function () {
      const commitment = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-commitment"));
      const shares = ethers.utils.parseEther("100");

      await registry.connect(pool).registerCommitment(commitment, shares);

      await expect(
        registry.connect(pool).registerCommitment(commitment, shares)
      ).to.be.revertedWith("Registry: commitment already exists");
    });

    it("Should only allow pool to register", async function () {
      const commitment = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-commitment"));
      const shares = ethers.utils.parseEther("100");

      await expect(
        registry.connect(addr1).registerCommitment(commitment, shares)
      ).to.be.revertedWith("Registry: only pool can register");
    });
  });

  describe("Nullifier Usage", function () {
    it("Should use a nullifier", async function () {
      const commitment = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-commitment"));
      const shares = ethers.utils.parseEther("100");
      await registry.connect(pool).registerCommitment(commitment, shares);

      const nullifier = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("nullifier"));

      await expect(registry.connect(pool).useNullifier(nullifier, commitment))
        .to.emit(registry, "NullifierUsed")
        .withArgs(nullifier, commitment);

      expect(await registry.nullifiers(nullifier)).to.be.true;
    });

    it("Should prevent double-spend", async function () {
      const commitment = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-commitment"));
      const shares = ethers.utils.parseEther("100");
      await registry.connect(pool).registerCommitment(commitment, shares);

      const nullifier = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("nullifier"));
      await registry.connect(pool).useNullifier(nullifier, commitment);

      await expect(
        registry.connect(pool).useNullifier(nullifier, commitment)
      ).to.be.revertedWith("Registry: nullifier already used");
    });
  });
});

