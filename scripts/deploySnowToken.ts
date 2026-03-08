import { ethers } from "hardhat";

import dotenv from "dotenv";
import { verifyContract } from "../utils";

dotenv.config();

async function main() {
  const SnowToken = await ethers.getContractFactory("SnowToken");

  console.log("Deploying SnowToken...");
  const snowToken = await SnowToken.deploy(1000000000n * 1000n);

  await snowToken.waitForDeployment();

  console.log("SnowToken deployed to: ", await snowToken.getAddress());

  console.log("Waiting for block confirmations...");
  await snowToken.deploymentTransaction()?.wait(5);

  console.log("Waiting for verification...");
  await verifyContract(await snowToken.getAddress(), [1000000000n * 1000n]);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
