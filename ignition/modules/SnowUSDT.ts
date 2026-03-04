import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SnowUSDTModule = buildModule("SnowUSDTModule", (m) => {
  const snowUSDT = m.contract("SnowUSDT", []);

  return { snowUSDT };
});

export default SnowUSDTModule;
