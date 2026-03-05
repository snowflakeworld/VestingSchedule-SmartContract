// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ISnowToken is IERC20 {
    function mint(address to, uint256 amount) external;
}

contract TokenVestingSchedule is Ownable {
    ISnowToken public immutable snowToken;

    uint256 public constant DENOMINATOR = 10000; // 100%
    uint256 public constant TEAM_PERCENT = 2000; // 20%
    uint256 public constant ADVISOR_PERCENT = 500; // 5%
    uint256 public constant INVESTOR_PERCENT = 2000; // 20%
    uint256 public constant COMMUNITY_PERCENT = 2500; // 25%
    uint256 public constant TREASURY_PERCENT = 2000; // 20%
    uint256 public constant PUBLIC_SALE_PERCENT = 1000; // 10%

    uint256 public constant TOKEN_UNIT = 10 ** 3;
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * TOKEN_UNIT;
    uint256 public constant TEAM_SUPPLY = (TOTAL_SUPPLY * TEAM_PERCENT) / DENOMINATOR;
    uint256 public constant ADVISOR_SUPPLY = (TOTAL_SUPPLY * ADVISOR_PERCENT) / DENOMINATOR;
    uint256 public constant INVESTOR_SUPPLY = (TOTAL_SUPPLY * INVESTOR_PERCENT) / DENOMINATOR;
    uint256 public constant COMMUNITY_SUPPLY = (TOTAL_SUPPLY * COMMUNITY_PERCENT) / DENOMINATOR;
    uint256 public constant TREASURY_SUPPLY = (TOTAL_SUPPLY * TREASURY_PERCENT) / DENOMINATOR;
    uint256 public constant PUBLIC_SALE_SUPPLY = (TOTAL_SUPPLY * PUBLIC_SALE_PERCENT) / DENOMINATOR;

    uint256 public tgeTimestamp;
    bool public tgeOccurred;

    // Minting control
    bool public mintingEnabled = true;
    uint256 public totalMinted;

    // Category struct to track allocation details
    struct Category {
        string name;
        uint256 allocation; // (10000 = 100%)
        uint256 totalAllocated;
        uint256 totalMinted;
        uint256 totalClaimed;
        bool isInitialized;
        bool mintingComplete;
    }

    // Beneficiary struct for individual allocations
    struct Beneficiary {
        uint8 categoryId;
        uint256 amount;
        uint256 minted;
        uint256 claimed;
        bool isActive;
    }

    // Category IDs
    uint8 public constant TEAM = 1;
    uint8 public constant ADVISORS = 2;
    uint8 public constant INVESTORS = 3;
    uint8 public constant COMMUNITY = 4;
    uint8 public constant TREASURY = 5;
    uint8 public constant PUBLIC_SALE = 6;

    // Category allocations (10000 = 100%)
    mapping(uint8 => Category) public categories;
    mapping(address => Beneficiary) public beneficiaries;

    // Events
    event TGESet(uint256 timestamp);
    event BeneficiaryAdded(
        address indexed beneficiary,
        uint8 indexed categoryId,
        uint256 amount
    );
    event TokensMinted(
        address indexed beneficiary,
        uint256 amount,
        uint8 indexed categoryId
    );
    event TokensClaimed(address indexed beneficiary, uint256 amount);
    event TreasuryUnlock(address indexed to, uint256 amount);
    event CategoryMintingComplete(uint8 indexed categoryId);
    event MintingToggled(bool enabled);

    constructor(address _snowToken) Ownable(msg.sender) {
        require(_snowToken != address(0), "Invalid Snow token address");

        snowToken = ISnowToken(_snowToken);

        // Initialize categories with allocations
        categories[TEAM] = Category({
            name: "Team",
            allocation: TEAM_PERCENT, // 20%
            totalAllocated: TEAM_SUPPLY,
            totalMinted: 0,
            totalClaimed: 0,
            isInitialized: true,
            mintingComplete: false
        });

        categories[ADVISORS] = Category({
            name: "Advisors",
            allocation: ADVISOR_PERCENT, // 5%
            totalAllocated: ADVISOR_SUPPLY,
            totalMinted: 0,
            totalClaimed: 0,
            isInitialized: true,
            mintingComplete: false
        });

        categories[INVESTORS] = Category({
            name: "Investors",
            allocation: INVESTOR_PERCENT, // 20%
            totalAllocated: INVESTOR_SUPPLY,
            totalMinted: 0,
            totalClaimed: 0,
            isInitialized: true,
            mintingComplete: false
        });

        categories[COMMUNITY] = Category({
            name: "Community",
            allocation: COMMUNITY_PERCENT, // 25%
            totalAllocated: COMMUNITY_SUPPLY,
            totalMinted: 0,
            totalClaimed: 0,
            isInitialized: true,
            mintingComplete: false
        });

        categories[TREASURY] = Category({
            name: "Treasury",
            allocation: TREASURY_PERCENT, // 20%
            totalAllocated: TREASURY_SUPPLY,
            totalMinted: 0,
            totalClaimed: 0,
            isInitialized: true,
            mintingComplete: false
        });

        categories[PUBLIC_SALE] = Category({
            name: "Public_Sale",
            allocation: PUBLIC_SALE_PERCENT, // 10%
            totalAllocated: PUBLIC_SALE_SUPPLY,
            totalMinted: 0,
            totalClaimed: 0,
            isInitialized: true,
            mintingComplete: false
        });
    }

    // Modifier to check if TGE has occurred
    modifier tgeSet() {
        require(tgeOccurred, "TGE not set");
        _;
    }

    // Modifier to check if minting is enabled
    modifier mintingActive() {
        require(mintingEnabled, "Minting is disabled");
        _;
    }

    // Set TGE timestamp (can only be set once)
    function setTGE(uint256 _timestamp) external onlyOwner {
        require(!tgeOccurred, "TGE already set");
        require(_timestamp > block.timestamp, "TGE must be in future");

        tgeTimestamp = _timestamp;
        tgeOccurred = true;

        emit TGESet(_timestamp);
    }

    // Toggle minting on/off
    function toggleMinting() external onlyOwner {
        mintingEnabled = !mintingEnabled;
        emit MintingToggled(mintingEnabled);
    }

    // Add beneficiaries to categories
    function addBeneficiaries(
        address[] calldata _beneficiaries,
        uint8[] calldata _categoryIds,
        uint256[] calldata _amounts
    ) external onlyOwner {
        require(
            _beneficiaries.length == _categoryIds.length &&
                _categoryIds.length == _amounts.length,
            "Array length mismatch"
        );

        for (uint i = 0; i < _beneficiaries.length; ++i) {
            require(_beneficiaries[i] != address(0), "Invalid address");
            require(
                categories[_categoryIds[i]].isInitialized,
                "Invalid category"
            );
            require(
                beneficiaries[_beneficiaries[i]].amount == 0,
                "Beneficiary already exists"
            );

            uint8 categoryId = _categoryIds[i];
            uint256 amount = _amounts[i];

            // Check category allocation
            Category storage category = categories[categoryId];
            require(
                category.totalMinted + amount <= category.totalAllocated,
                "Exceeds category allocation"
            );

            beneficiaries[_beneficiaries[i]] = Beneficiary({
                categoryId: categoryId,
                amount: amount,
                minted: 0,
                claimed: 0,
                isActive: true
            });

            emit BeneficiaryAdded(_beneficiaries[i], categoryId, amount);
        }
    }

    // Mint tokens for a beneficiary (called before claiming)
    function mintTokens(
        address _beneficiary
    ) internal tgeSet mintingActive returns (uint256) {
        Beneficiary storage beneficiary = beneficiaries[_beneficiary];
        require(beneficiary.isActive, "Beneficiary not active");

        // Check if category minting is complete
        Category storage category = categories[beneficiary.categoryId];
        require(!category.mintingComplete, "Category minting complete");

        uint256 claimable = _calculateClaimableAmount(beneficiary);
        uint256 mintable = max(
            0,
            min(
                claimable - beneficiary.minted,
                category.totalAllocated - category.totalMinted
            )
        );

        if (mintable > 0) {
            // Mint tokens
            snowToken.mint(address(this), mintable);

            // Update records
            beneficiary.minted += mintable;
            category.totalMinted += mintable;
            totalMinted += mintable;

            // Check if category minting is now complete
            if (category.totalMinted >= category.totalAllocated) {
                category.mintingComplete = true;
                emit CategoryMintingComplete(beneficiary.categoryId);
            }

            emit TokensMinted(_beneficiary, mintable, beneficiary.categoryId);
        }

        return mintable;
    }

    // Calculate claimable amount for a beneficiary
    function _calculateClaimableAmount(
        Beneficiary memory beneficiary
    ) internal view returns (uint256) {
        uint256 categoryId = beneficiary.categoryId;

        if (categoryId == TEAM) {
            return _calculateTeamVesting(beneficiary);
        } else if (categoryId == ADVISORS) {
            return _calculateAdvisorVesting(beneficiary);
        } else if (categoryId == COMMUNITY) {
            return _calculateCommunityVesting(beneficiary);
        } else if (categoryId == TREASURY) {
            // return _calculateTreasuryVesting(beneficiary);
            return _calculateTreasuryVesting();
        } else if (categoryId == PUBLIC_SALE) {
            return _calculatePublicSaleVesting(beneficiary);
        }

        return 0;
    }

    // Get Claimable amount for a beneficiary
    function getClaimableAmount(
        address _beneficiary
    ) public view tgeSet returns (uint256) {
        Beneficiary memory beneficiary = beneficiaries[_beneficiary];
        require(beneficiary.isActive, "Beneficiary not active");
        return _calculateClaimableAmount(beneficiary);
    }

    // Team: 4 years vesting with 1-year cliff
    function _calculateTeamVesting(
        Beneficiary memory beneficiary
    ) internal view returns (uint256) {
        uint256 timeSinceTGE = block.timestamp - tgeTimestamp;
        uint256 oneYear = 365 days;
        uint256 fourYears = 4 * 365 days;

        if (timeSinceTGE < oneYear) {
            // Check cliff period
            return 0;
        }

        if (timeSinceTGE >= fourYears) {
            // Fully vested
            return beneficiary.minted;
        }

        return (beneficiary.amount * timeSinceTGE) / fourYears;
    }

    // Advisors: 2 years vesting with 6-month cliff
    function _calculateAdvisorVesting(
        Beneficiary memory beneficiary
    ) internal view returns (uint256) {
        uint256 timeSinceTGE = block.timestamp - tgeTimestamp;
        uint256 sixMonths = 180 days;
        uint256 twoYears = 2 * 365 days;

        if (timeSinceTGE < sixMonths) {
            // Cliff period
            return 0;
        }

        if (timeSinceTGE >= twoYears) {
            // Fully vested
            return beneficiary.minted;
        }

        return (beneficiary.amount * timeSinceTGE) / twoYears;
    }

    // Investors: 2 years vesting with partial unlock at TGE (20% at TGE, then linear)
    function _calculateInvestorVesting(
        Beneficiary memory beneficiary
    ) internal view returns (uint256) {
        uint256 timeSinceTGE = block.timestamp - tgeTimestamp;
        uint256 twoYears = 2 * 365 days;

        // Initial 20% unlock at TGE
        uint256 initialUnlock = (beneficiary.amount * 2000) / DENOMINATOR;

        if (timeSinceTGE < 0) {
            return 0;
        }

        if (timeSinceTGE >= twoYears) {
            return beneficiary.minted;
        }

        // Remaining 50% vests linearly over 2 years
        uint256 remainingAmount = beneficiary.amount - initialUnlock;

        return initialUnlock + (((remainingAmount * timeSinceTGE)) / twoYears);
    }

    // Community: Gradual release over 4 years (linear vesting)
    function _calculateCommunityVesting(
        Beneficiary memory beneficiary
    ) internal view returns (uint256) {
        uint256 timeSinceTGE = block.timestamp - tgeTimestamp;
        uint256 fourYears = 4 * 365 days;

        if (timeSinceTGE < 0) {
            return 0;
        }

        if (timeSinceTGE >= fourYears) {
            return beneficiary.minted;
        }

        return (beneficiary.amount * timeSinceTGE) / fourYears;
    }

    // Treasury: Controlled unlock (requires owner to specify amount)
    // function _calculateTreasuryVesting(Beneficiary memory beneficiary) internal pure returns (uint256) {
    //     return 0;
    // }
    function _calculateTreasuryVesting() internal pure returns (uint256) {
        return 0;
    }

    // Public Sale: 10% at TGE, rest over 6-12months
    function _calculatePublicSaleVesting(
        Beneficiary memory beneficiary
    ) internal view returns (uint256) {
        uint256 timeSinceTGE = block.timestamp - tgeTimestamp;
        uint256 twelveMonths = 365 days;

        // Initial 10% unlock at TGE
        uint256 initialUnlock = (beneficiary.amount * 1000) / DENOMINATOR;

        if (timeSinceTGE < 0) {
            return 0;
        }

        if (timeSinceTGE >= twelveMonths) {
            return beneficiary.minted;
        }

        // Linear vesting from month 0 to 12
        uint256 remainingAmount = beneficiary.amount - initialUnlock;

        return
            initialUnlock + (((remainingAmount * timeSinceTGE)) / twelveMonths);
    }

    // Claim tokens (automatically mints if needed)
    function claim() external tgeSet {
        Beneficiary storage beneficiary = beneficiaries[msg.sender];
        require(beneficiary.isActive, "Beneficiary not active");

        // First mint any new vested tokens
        mintTokens(msg.sender);

        // Calculate claimable from already minted tokens
        uint256 claimable = beneficiary.minted - beneficiary.claimed;
        require(claimable > 0, "Nothing to claim");

        // Update records
        beneficiary.claimed += claimable;
        Category storage category = categories[beneficiary.categoryId];
        category.totalClaimed += claimable;

        // Transfer tokens
        require(snowToken.transfer(msg.sender, claimable), "Transfer failed");

        emit TokensClaimed(msg.sender, claimable);
    }

    // Treasury unlock function (only owner can call)
    function treasuryUnlock(
        address to,
        uint256 amount
    ) external onlyOwner tgeSet {
        require(to != address(0), "Invalid address");

        // Find treasury beneficiary
        Beneficiary storage treasuryBeneficiary = beneficiaries[to];
        require(
            treasuryBeneficiary.categoryId == TREASURY,
            "Not treasury beneficiary"
        );
        require(
            treasuryBeneficiary.amount >= treasuryBeneficiary.minted + amount,
            "Exceeds allocation"
        );

        // Mint treasury tokens if needed
        Category storage treasury = categories[TREASURY];
        require(!treasury.mintingComplete, "Treasury minting complete");
        require(
            treasury.totalMinted + amount <= treasury.totalAllocated,
            "Exceeds category allocation"
        );

        // Mint tokens
        snowToken.mint(address(this), amount);

        // Updatee records
        treasuryBeneficiary.minted += amount;
        treasuryBeneficiary.claimed += amount; // Treasury claims immediately
        treasury.totalMinted += amount;
        treasury.totalClaimed += amount;
        totalMinted += amount;

        // Check if treasury minting is complete
        if (treasury.totalMinted >= treasury.totalAllocated) {
            treasury.mintingComplete = true;
            emit CategoryMintingComplete(TREASURY);
        }

        // Transfer tokens
        require(snowToken.transfer(to, amount), "Transfer failed");

        emit TreasuryUnlock(to, amount);
    }

    // Batch mint for a category (for administrative purposes)
    function batchMintCategory(
        uint8 categoryId,
        uint256 amount
    ) external onlyOwner {
        require(categories[categoryId].isInitialized, "Invalid category");
        Category storage category = categories[categoryId];
        require(!category.mintingComplete, "Category minting complete");
        require(
            category.totalMinted + amount <= category.totalAllocated,
            "Exceeds allocation"
        );

        snowToken.mint(address(this), amount);

        category.totalMinted += amount;
        totalMinted += amount;

        if (category.totalMinted >= category.totalAllocated) {
            category.mintingComplete = true;
            emit CategoryMintingComplete(categoryId);
        }
    }

    // Emergency withdraw (in caase of issues)
    function emergencyWithdraw(address to, uint256 amount) external onlyOwner {
        require(snowToken.transfer(to, amount), "Transfer failed");
    }

    // Get total minted for a category
    function getCategoryMinted(
        uint8 categoryId
    ) external view returns (uint256) {
        return categories[categoryId].totalMinted;
    }

    // Get total claimed for a category
    function getCategoryClaimed(
        uint8 categoryId
    ) external view returns (uint256) {
        return categories[categoryId].totalClaimed;
    }

    // Check if category is fully minted
    function isCategoryFullyMinted(
        uint8 categoryId
    ) external view returns (bool) {
        return categories[categoryId].mintingComplete;
    }

    // Get beneficiary info
    function getBeneficiaryInfo(
        address _beneficiary
    )
        external
        view
        returns (
            uint8 categoryId,
            uint256 amount,
            uint256 minted,
            uint256 claimed,
            uint256 claimable,
            uint256 pendingMint,
            bool isActive
        )
    {
        Beneficiary memory b = beneficiaries[_beneficiary];
        uint256 totalClaimable = tgeOccurred ? _calculateClaimableAmount(b) : 0;
        uint256 pendingMintAmount = totalClaimable > b.minted
            ? totalClaimable - b.minted
            : 0;
        uint256 claimableNow = b.minted - b.claimed;

        return (
            b.categoryId,
            b.amount,
            b.minted,
            b.claimed,
            claimableNow,
            pendingMintAmount,
            b.isActive
        );
    }

    // Get remaining to mint for a category
    function getCategoryRemainingToMint(
        uint8 categoryId
    ) external view returns (uint256) {
        Category memory category = categories[categoryId];
        return category.totalAllocated - category.totalMinted;
    }

    // Get total supply minted so far
    function getTotalMinted() external view returns (uint256) {
        return totalMinted;
    }

    // Calculate min value
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    // Calculate max value
    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }
}
