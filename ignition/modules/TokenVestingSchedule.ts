import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TokenVestingScheduleModule = buildModule(
  "TokenVestingScheduleModule",
  (m) => {
    const tokenAddress = m.getParameter(
      "tokenAddress",
      "0x577e378A5b87c3c0B18773e71Eb81A818dA56de8",
    );
    const vestingContract = m.contract("TokenVestingSchedule", [tokenAddress]);

    return { vestingContract };
  },
);

export default TokenVestingScheduleModule;
