import { expect } from "chai";
import { ethers } from "hardhat";
import { verifyContract } from "../utils";

describe("SnowUSDT contract", () => {
  async function deployToken() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const token = await ethers.deployContract("SnowUSDT");

    await token.waitForDeployment();

    return { token, owner, addr1, addr2 };
  }

  describe("Deployment", function () {
    it("Checking Snow USDT Token deployment", async () => {
      const { token, owner } = await deployToken();
      const contractAddress = await token.getAddress();
      console.log("Contract Address: " + (await token.getAddress()));
      // console.log("Deployed Code: " + (await token.getDeployedCode()));
      console.log("Owner Address: " + owner.address);
      console.log("Owner Balance: " + (await token.balanceOf(owner.address)));
      console.log("Total Supply: " + (await token.totalSupply()));
      const ownerBalance = await token.balanceOf(owner.address);
      expect(await token.totalSupply()).to.equal(ownerBalance);
      expect(await verifyContract("SnowUSDT", contractAddress)).to.equal(true);
    });
  });
});
