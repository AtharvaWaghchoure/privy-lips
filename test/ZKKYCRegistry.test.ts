import { expect } from "chai";
import { ethers } from "hardhat";
import { ZKKYCRegistry } from "../typechain-types";

describe("ZKKYCRegistry", function () {
  let kycRegistry: ZKKYCRegistry;
  let owner: any;
  let user: any;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const KYCRegistryFactory = await ethers.getContractFactory("ZKKYCRegistry");
    kycRegistry = await KYCRegistryFactory.deploy(owner.address);
    await kycRegistry.deployed();
  });

  describe("KYC Registration", function () {
    it("Should register Pseudonymous tier", async function () {
      const commitment = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("kyc-commitment"));
      const proof = "0x";
      const publicInputs = "0x";
      const attributes = {
        ageVerified: true,
        jurisdictionCompliant: true,
        accreditedInvestor: false,
      };

      await expect(
        kycRegistry.connect(user).registerKYCCommitment(
          commitment,
          1, // Pseudonymous tier
          proof,
          publicInputs,
          attributes
        )
      ).to.emit(kycRegistry, "KYCCommitmentRegistered");

      expect(await kycRegistry.userTier(user.address)).to.equal(1); // Pseudonymous
    });

    it("Should enforce deposit limits", async function () {
      const commitment = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("kyc-commitment"));
      const proof = "0x";
      const publicInputs = "0x";
      const attributes = {
        ageVerified: true,
        jurisdictionCompliant: true,
        accreditedInvestor: false,
      };

      await kycRegistry.connect(user).registerKYCCommitment(
        commitment,
        0, // Anonymous tier
        proof,
        publicInputs,
        attributes
      );

      const limit = await kycRegistry.getTierLimit(0);
      expect(limit).to.equal(ethers.utils.parseEther("10000")); // $10k limit
    });
  });
});

