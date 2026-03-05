import { ethers } from "hardhat";

import dotenv from "dotenv";

dotenv.config();

async function main() {
  const VestingContract = await ethers.getContractFactory(
    "TokenVestingSchedule",
  );

  console.log("Deploying Vesting Contract...");
  const vestingContract = await VestingContract.deploy(
    process.env.SNOW_TOKEN_ADDRESS ||
      "0x41FeEA17abf6Aa452BeC69722E967fAbbe4bAbE4",
  );

  await vestingContract.waitForDeployment();

  console.log(
    "VestingContract deployed to: ",
    await vestingContract.getAddress(),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
