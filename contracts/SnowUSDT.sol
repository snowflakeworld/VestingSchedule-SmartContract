// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SnowUSDT is ERC20 {
    constructor() ERC20("SnowUSDTToken", "SUSDT") {
      // Mints 1,000,000 tokens (adjusted for 18 decimals) to the deployer
      _mint(msg.sender, 1000000 * 10 ** decimals());
    }
}
