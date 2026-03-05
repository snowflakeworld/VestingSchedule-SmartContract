// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SnowMockToken is ERC20, Ownable {
    uint256 public maxSupply;

    constructor(
        uint256 _initialSupply,
        uint256 _maxSupply
    ) ERC20("SnowMockToken", "SMTK") Ownable(msg.sender) {
        // Mints initialSupply tokens (adjusted for 18 decimals) to the deployer
        maxSupply = _maxSupply;
        _mint(msg.sender, _initialSupply * 10 ** decimals());
    }

    event tokenMinted(uint256 amount);

    error SnowMockTokenMintOverMaxSupply(uint256 totalAmount, uint maxAmount);

    function mint(address to, uint256 amount) public {
        if (totalSupply() + amount > maxSupply) {
            revert SnowMockTokenMintOverMaxSupply(totalSupply() + amount, maxSupply);
        }
        _mint(to, amount);
    }
}
