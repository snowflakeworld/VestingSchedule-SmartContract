import { ethers } from "hardhat";

import dotenv from "dotenv";
import { verifyContract } from "../utils";

dotenv.config();

async function main() {
  const VestingContract = await ethers.getContractFactory(
    "TokenVestingSchedule",
  );

  console.log("Deploying Vesting Contract...");
  const vestingContract = await VestingContract.deploy(
    process.env.SNOW_TOKEN_ADDRESS ||
      "0x577e378A5b87c3c0B18773e71Eb81A818dA56de8",
  );

  await vestingContract.waitForDeployment();

  console.log(
    "VestingContract deployed to: ",
    await vestingContract.getAddress(),
  );

  console.log("Waiting for block confirmations...");
  await vestingContract.deploymentTransaction()?.wait(5);

  console.log("Waiting for verification...");
  await verifyContract(await vestingContract.getAddress(), [
    process.env.SNOW_TOKEN_ADDRESS ||
      "0x577e378A5b87c3c0B18773e71Eb81A818dA56de8"
  ]);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
