import { Addressable, ContractRunner, getUint } from "ethers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

import { SnowMockToken, TokenVestingSchedule } from "../typechain-types";

describe("TokenVestingSchedule", function () {
  let token: SnowMockToken;
  let vesting: TokenVestingSchedule;
  let owner: Addressable;
  let teamMember: Addressable;
  let advisor: Addressable;
  let investor: Addressable;
  let communityMember: Addressable;
  let treasury: Addressable;
  let publicSaleParticipant: Addressable;

  const DAY_SECONDS = 3600 * 24;
  const ONE_YEAR = 365 * DAY_SECONDS;
  const ONE_MONTH = 30 * DAY_SECONDS;
  const TEAM_PERCENT = 2000; // 20%
  const TOKEN_UNIT = 1000;
  const TOTAL_SUPPLY: bigint = BigInt(1000000000 * TOKEN_UNIT); // 1B * 10^3 tokens
  const TEAM_SUPPLY: bigint = BigInt((1000000000 * TOKEN_UNIT * 20) / 100);
  const ADVISOR_SUPPLY: bigint = BigInt((1000000000 * TOKEN_UNIT * 5) / 100);
  const INVESTOR_SUPPLY: bigint = BigInt((1000000000 * TOKEN_UNIT * 20) / 100);
  const COMMUNITY_SUPPLY: bigint = BigInt((1000000000 * TOKEN_UNIT * 25) / 100);
  const TREASURY_SUPPLY: bigint = BigInt((1000000000 * TOKEN_UNIT * 20) / 100);
  const PUBLIC_SALE_SUPPLY: bigint = BigInt(
    (1000000000 * TOKEN_UNIT * 10) / 100,
  );

  beforeEach(async function () {
    // Get signers
    [
      owner,
      teamMember,
      advisor,
      investor,
      communityMember,
      treasury,
      publicSaleParticipant,
    ] = await ethers.getSigners();

    // Deploy mock token
    const MockToken = await ethers.getContractFactory("SnowMockToken");
    token = await MockToken.deploy(TOTAL_SUPPLY);
    await token.waitForDeployment();

    // Deploy vesting contract
    const TokenVestingSchedule = await ethers.getContractFactory(
      "TokenVestingSchedule",
    );
    vesting = await TokenVestingSchedule.deploy(await token.getAddress());
    await vesting.waitForDeployment();

    // Transfer Ownership of token to vesting contract for minting
    await token.transferOwnership(await vesting.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the correct token address", async function () {
      expect(await vesting.snowToken()).to.equal(await token.getAddress());
    });

    it("Should initialize categories correctly", async function () {
      const team = await vesting.categories(1);
      expect(team.name).to.equal("Team");
      expect(team.allocation).to.equal(TEAM_PERCENT);
      expect(team.totalAllocated).to.equal(TEAM_SUPPLY);
    });
  });

  describe("TGE Setting", function () {
    it("Should set TGE timestamp", async function () {
      const futureTime = (await time.latest()) + DAY_SECONDS;
      await vesting.setTGE(futureTime);

      expect(await vesting.tgeOccurred()).to.be.true;
      expect(await vesting.tgeTimestamp()).to.equal(futureTime);
    });

    it("Should now allow setting TGE twice", async function () {
      const futureTime = (await time.latest()) + DAY_SECONDS;
      await vesting.setTGE(futureTime);

      await expect(vesting.setTGE(futureTime + DAY_SECONDS)).to.be.revertedWith(
        "TGE already set",
      );
    });

    it("Should now allow TGE in the past", async function () {
      const pastTime = (await time.latest()) - DAY_SECONDS;

      await expect(vesting.setTGE(pastTime)).to.be.revertedWith(
        "TGE must be in future",
      );
    });
  });

  describe("Adding Beneficiaries", function () {
    beforeEach(async function () {
      const futureTime = (await time.latest()) + DAY_SECONDS;
      await vesting.setTGE(futureTime);
    });

    it("Should add beneficiaries correctly", async function () {
      const teamAmount = TEAM_SUPPLY; // 20% tokens

      await vesting.addBeneficiaries(
        [await teamMember.getAddress()],
        [1],
        [teamAmount],
      );

      const beneficiary = await vesting.beneficiaries(
        await teamMember.getAddress(),
      );
      expect(beneficiary.categoryId).to.equal(1);
      expect(beneficiary.amount).to.equal(teamAmount);
      expect(beneficiary.isActive).to.be.true;
    });

    it("Should not exceed category allocation", async function () {
      const teamCategory = await vesting.categories(1);
      const tooMuch = teamCategory.totalAllocated + 1n;

      await expect(
        vesting.addBeneficiaries(
          [await teamMember.getAddress()],
          [1],
          [tooMuch],
        ),
      ).to.be.revertedWith("Exceeds category allocation");

      it("Should not add duplicate beneficiaries", async function () {
        const amount = TEAM_SUPPLY;

        await vesting.addBeneficiaries(
          [await teamMember.getAddress()],
          [1],
          [amount],
        );

        await expect(
          vesting.addBeneficiaries(
            [await teamMember.getAddress()],
            [1],
            [amount],
          ),
        ).to.be.revertedWith("Beneficiary already exists");
      });
    });
  });

  describe("Vesting Calculations", function () {
    beforeEach(async function () {
      // Set TGE to current time
      const currentTime = await time.latest();
      await vesting.setTGE(currentTime);

      // Add beneficiaries for each category
      await vesting.addBeneficiaries(
        [
          await teamMember.getAddress(),
          await advisor.getAddress(),
          await investor.getAddress(),
          await communityMember.getAddress(),
          await publicSaleParticipant.getAddress(),
        ],
        [1, 2, 3, 4, 6],
        [
          TEAM_SUPPLY, // Team
          ADVISOR_SUPPLY, // Advisor
          INVESTOR_SUPPLY, // Investor
          COMMUNITY_SUPPLY, // Community
          PUBLIC_SALE_SUPPLY, // Public Sale
        ],
      );
    });

    it("Team: Should have cliff for 1 year", async function () {
      // Fast forward 6 months
      await time.increase(180 * DAY_SECONDS);

      const claimable = await vesting.getClaimableAmount(
        await teamMember.getAddress(),
      );
      expect(claimable).to.equal(0);
    });

    it("Team: Should vest after cliff", async function () {
      // Fast forward 2 years
      await time.increase(2 * ONE_YEAR);

      const claimable = await vesting.getClaimableAmount(
        await teamMember.getAddress(),
      );
      const expectedVested = TEAM_SUPPLY / 2n;
      expect(claimable).to.be.closeTo(expectedVested, 100 * TOKEN_UNIT);
    });

    it("Advisors: Should have cliff for 6 months", async function () {
      // Fast forward 3 months
      await time.increase(3 * ONE_MONTH);

      const claimable = await vesting.getClaimableAmount(
        await advisor.getAddress(),
      );
      expect(claimable).to.equal(0);
    });

    it("Advisors: Should vest after cliff", async function () {
      // Fast forward 1 year
      await time.increase(ONE_YEAR);

      const claimable = await vesting.getClaimableAmount(
        await advisor.getAddress(),
      );
      expect(claimable).to.be.gt(0);
    });

    it("Investors: Should get 20% at TGE", async function () {
      const claimable = await vesting.getClaimableAmount(
        await investor.getAddress(),
      );
      const expectedInitial = (INVESTOR_SUPPLY * 20n) / 100n;
      expect(claimable).to.equal(expectedInitial);
    });

    it("Investors: Should vest remaining over 2 years", async function () {
      // Fast forward 1 year
      await time.increase(ONE_YEAR);

      const claimable = await vesting.getClaimableAmount(
        await investor.getAddress(),
      );
      const initial = (INVESTOR_SUPPLY * 20n) / 100n;
      const remaining = INVESTOR_SUPPLY - initial;
      const expectedVested = remaining / 2n;

      expect(claimable).to.be.closeTo(expectedVested, 100 * TOKEN_UNIT);
    });

    it("Public Sale: Should get 10% at TGE", async function () {
      const claimable = await vesting.getClaimableAmount(
        await publicSaleParticipant.getAddress(),
      );
      const expectedInitial = (PUBLIC_SALE_SUPPLY * 10n) / 100n;
      expect(claimable).to.equal(expectedInitial);
    });
  });

  describe("Claiming Tokens", function () {
    beforeEach(async function () {
      const currentTime = await time.latest();
      await vesting.setTGE(currentTime);

      // Add beneficiary
      const amount = TEAM_SUPPLY;
      await vesting.addBeneficiaries(
        [await teamMember.getAddress()],
        [1], // Team category
        [amount],
      );
    });

    it("Should mint and claim tokens", async function () {
      // Fast forward past cliff (1 year)
      await time.increase(ONE_YEAR);

      // Check vesting contract balance before claim
      const balanceBefore = await token.balanceOf(await vesting.getAddress());

      // Casting to the expected Runner type
      const memberRunner = teamMember as unknown as ContractRunner;

      // Claim tokens
      await vesting.connect(memberRunner).claim();

      // Check tokens were minted and transferred
      const teamBalance = await token.balanceOf(await teamMember.getAddress());
      expect(teamBalance).to.be.gt(0);

      // Check vesting contract now has tokens (minted but not claimed)
      const balanceAfter = await token.balanceOf(await vesting.getAddress());
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should not claim before cliff", async function () {
      // Casting to the expected Runner type
      const memberRunner = teamMember as unknown as ContractRunner;

      // Don't fast forward
      await expect(vesting.connect(memberRunner).claim()).to.be.revertedWith(
        "Nothing to claim",
      );
    });

    it("Should update claimed amounts correctly", async function () {
      // Fast forward 2 years
      await time.increase(2 * ONE_YEAR);

      // Casting to the expected Runner type
      const memberRunner = teamMember as unknown as ContractRunner;

      await vesting.connect(memberRunner).claim();

      const beneficiary = await vesting.beneficiaries(
        await teamMember.getAddress(),
      );
      expect(beneficiary.claimed).to.be.gt(0);

      const category = await vesting.categories(1);
      expect(category.totalClaimed).to.be.gt(0);
    });
  });

  describe("Treasury Unlock", function () {
    beforeEach(async function () {
      const currentTime = await time.latest();
      await vesting.setTGE(currentTime);

      // Add treasury beneficiary
      const amount = TREASURY_SUPPLY;
      await vesting.addBeneficiaries(
        [await treasury.getAddress()],
        [5], // Treasury category
        [amount],
      );
    });

    it("Owner should unlock treasury tokens", async function () {
      const unlockAmount = TREASURY_SUPPLY / 4n;

      await vesting.treasuryUnlock(await treasury.getAddress(), unlockAmount);

      const treasuryBalance = await token.balanceOf(
        await treasury.getAddress(),
      );
      expect(treasuryBalance).to.equal(unlockAmount);

      const beneficiary = await vesting.beneficiaries(
        await treasury.getAddress(),
      );
      expect(beneficiary.claimed).to.equal(unlockAmount);
    });

    it("Should not exceed treasury allocation", async function () {
      const beneficiary = await vesting.beneficiaries(
        await treasury.getAddress(),
      );
      const tooMuch = beneficiary.amount + 1n;

      await expect(
        vesting.treasuryUnlock(await treasury.getAddress(), tooMuch),
      ).to.be.revertedWith("Exceeds allocation");
    });

    it("Non-owner cannot unlock treasury", async function () {
      const unlockAmount = TREASURY_SUPPLY / 4n;

      // Casting to the expected Runner type
      const memberRunner = teamMember as unknown as ContractRunner;

      await expect(
        vesting
          .connect(memberRunner)
          .treasuryUnlock(await treasury.getAddress(), unlockAmount),
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Minting Controls", function () {
    beforeEach(async function () {
      const currentTime = await time.latest();
      await vesting.setTGE(currentTime);
    });

    it("Should toggle minting", async function () {
      expect(await vesting.mintingEnabled()).to.be.true;

      await vesting.toggleMinting();
      expect(await vesting.mintingEnabled()).to.be.false;

      await vesting.toggleMinting();
      expect(await vesting.mintingEnabled()).to.be.true;
    });

    it("Should batch mint category", async function () {
      const mintAmount = 1000000 * TOKEN_UNIT;

      await vesting.batchMintCategory(1, mintAmount);

      const category = await vesting.categories(1);
      expect(category.totalMinted).to.equal(mintAmount);
    });

    it("Should mark category as complete when fully minted", async function () {
      const category = await vesting.categories(1);

      await vesting.batchMintCategory(1, category.totalAllocated);

      expect(await vesting.isCategoryFullyMinted(1)).to.be.true;
    });
  });

  describe("Emergency Withdraw", function () {
    it("Owner can emergency withdraw", async function () {
      const currentTime = await time.latest();
      await vesting.setTGE(currentTime);

      // Mint some tokens to contract
      await vesting.batchMintCategory(1, 1000000 * TOKEN_UNIT);

      const withdrawAmount = 500000 * TOKEN_UNIT;
      await vesting.emergencyWithdraw(await owner.getAddress(), withdrawAmount);

      const ownerBalance = await token.balanceOf(await owner.getAddress());
      expect(ownerBalance).to.equal(withdrawAmount);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      const currentTime = await time.latest();
      await vesting.setTGE(currentTime);

      await vesting.addBeneficiaries(
        [await teamMember.getAddress()],
        [1],
        [TEAM_SUPPLY / 2n],
      );
    });

    it("Should return correct beneficiary info", async function () {
      const info = await vesting.getBeneficiaryInfo(
        await teamMember.getAddress(),
      );

      expect(info.categoryId).to.equal(1);
      expect(info.amount).to.equal(TEAM_SUPPLY / 2n);
      expect(info.claimed).to.equal(0);
      expect(info.isActive).to.be.true;
    });

    it("Should return category remaining to mint", async function () {
      const remaining = await vesting.getCategoryRemainingToMint(1);
      const category = await vesting.categories(1);
      expect(remaining).to.equal(category.totalAllocated);
    });
  });
});
