import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-tracer";
import dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_URL || "",
      accounts: [
        process.env.OWNER_PRIVATE_KEY || "",
        process.env.TEAM_PRIVATE_KEY || "",
        process.env.ADVISOR_PRIVATE_KEY || "",
        process.env.INVESTOR_PRIVATE_KEY || "",
        process.env.COMMUNITY_PRIVATE_KEY || "",
        process.env.TREASURY_PRIVATE_KEY || "",
        process.env.PUBLICSALE_PRIVATE_KEY || "",
      ],
    },
    hardhat: {
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
