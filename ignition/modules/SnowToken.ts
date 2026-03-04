import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const INITIAL_SUPPLY = 10 ** 3;
const MAX_SUPPLY = 10 ** 5;

const SnowTokenModule = buildModule("SnowTokenModule", (m) => {
  const initialSupply = m.getParameter("initialSupply", INITIAL_SUPPLY);
  const maxSupply = m.getParameter("maxSupply", MAX_SUPPLY);

  const snowToken = m.contract("SnowToken", [initialSupply, maxSupply]);

  return { snowToken };
});

export default SnowTokenModule;
