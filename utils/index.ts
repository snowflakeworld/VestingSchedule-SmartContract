import hre from "hardhat";

export async function verifyContract(
  name: string,
  address: string,
): Promise<boolean> {
  try {
    console.log(`\nVerifying ${name}...`);

    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [],
    });

    console.log(`✅ ${name} verified successfully!`);

    return true;
  } catch (error) {
    if (error instanceof Error) {
      if ("message" in error) {
        if (error.message.toLowerCase().includes("already verified")) {
          console.log(`✅ ${name} is already verified`);
        } else {
          console.error(`❌ ${name} verification failed:`, error.message);
        }
      }
    }

    return false;
  }
}
