import { expect } from "chai";
import { ethers } from "hardhat";
import { YieldAccumulator, PrivateLiquidityPool, CommitmentRegistry } from "../typechain-types";

describe("YieldAccumulator", function () {
  let accumulator: YieldAccumulator;
  let pool: PrivateLiquidityPool;
  let registry: CommitmentRegistry;
  let owner: any;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    // Deploy contracts (simplified setup)
    const RegistryFactory = await ethers.getContractFactory("CommitmentRegistry");
    registry = await RegistryFactory.deploy(owner.address);
    await registry.deployed();

    // Deploy a mock pool address (using registry as placeholder for testing)
    // In real tests, would deploy full pool setup
    const mockPoolAddress = registry.address; // Use registry as mock pool for testing

    const AccumulatorFactory = await ethers.getContractFactory("YieldAccumulator");
    accumulator = await AccumulatorFactory.deploy(
      mockPoolAddress,
      registry.address,
      owner.address
    );
    await accumulator.deployed();
  });

  describe("Merkle Root Updates", function () {
    it("Should update Merkle root", async function () {
      const newRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("new-root"));

      await expect(accumulator.updateMerkleRoot(newRoot))
        .to.emit(accumulator, "MerkleRootUpdated");

      expect(await accumulator.merkleRoot()).to.equal(newRoot);
    });
  });
});

