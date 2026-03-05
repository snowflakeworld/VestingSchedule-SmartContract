import { ethers } from "hardhat";

import dotenv from "dotenv";
import { verifyContract } from "../utils";

dotenv.config();

async function main() {
  const SnowUSDT = await ethers.getContractFactory("SnowUSDT");

  console.log("Deploying SnowUSDT...");
  const snowUSDT = await SnowUSDT.deploy();

  await snowUSDT.waitForDeployment();

  console.log("SnowUSDT deployed to: ", await snowUSDT.getAddress());

  console.log("Waiting for block confirmations...");
  await snowUSDT.deploymentTransaction()?.wait(5);

  console.log("Waiting for verification...");
  await verifyContract(await snowUSDT.getAddress(), []);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
