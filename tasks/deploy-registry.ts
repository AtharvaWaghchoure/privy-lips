import { task } from "hardhat/config";
import { waitForDeployment } from "./utils";

task("deploy-registry", "Deploy CommitmentRegistry")
  .setAction(async (taskArgs, hre) => {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying CommitmentRegistry with account:", deployer.address);

    const CommitmentRegistry = await hre.ethers.getContractFactory("CommitmentRegistry");
    const registry = await CommitmentRegistry.deploy(deployer.address);
    await registry.waitForDeployment();

    const address = await registry.getAddress();
    console.log("CommitmentRegistry deployed to:", address);
    console.log("Set COMMITMENT_REGISTRY_ADDRESS in .env:", address);

    return address;
  });

