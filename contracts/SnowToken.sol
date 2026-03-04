// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SnowToken is ERC20, Ownable {
    uint256 public maxSupply;

    constructor(
        uint256 _initialSupply,
        uint256 _maxSupply
    ) ERC20("SnowToken", "STK") Ownable(msg.sender) {
        // Mints initialSupply tokens (adjusted for 18 decimals) to the deployer
        maxSupply = _maxSupply;
        _mint(msg.sender, _initialSupply * 10 ** decimals());
    }

    event tokenMinted(uint256 amount);

    error SnowTokenMintOverMaxSupply(uint256 totalAmount, uint maxAmount);

    function mint(address to, uint256 amount) public {
        if (totalSupply() + amount > maxSupply) {
            revert SnowTokenMintOverMaxSupply(totalSupply() + amount, maxSupply);
        }
        _mint(to, amount);
    }
}
