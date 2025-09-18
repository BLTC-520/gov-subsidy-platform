// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SubsidyClaim
 * @dev Contract for managing government subsidy token claims
 * @notice Citizens can claim their allocated MMYRC tokens through this contract
 */
contract SubsidyClaim is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    IERC20 public immutable mmyrcToken;
    
    // Mapping to store allocations for each address
    mapping(address => uint256) public allocations;
    
    // Mapping to track if an address has already claimed
    mapping(address => bool) public hasClaimed;
    
    // Total tokens allocated
    uint256 public totalAllocated;
    
    // Total tokens claimed
    uint256 public totalClaimed;
    
    // Claim period
    uint256 public claimStartTime;
    uint256 public claimEndTime;
    
    // Events
    event AllocationSet(address indexed citizen, uint256 amount);
    event TokensClaimed(address indexed citizen, uint256 amount);
    event ClaimPeriodUpdated(uint256 startTime, uint256 endTime);
    event EmergencyWithdrawal(address indexed token, uint256 amount);
    
    // Modifiers
    modifier onlyDuringClaimPeriod() {
        require(block.timestamp >= claimStartTime, "Claim period has not started");
        require(block.timestamp <= claimEndTime, "Claim period has ended");
        _;
    }
    
    modifier hasAllocation(address citizen) {
        require(allocations[citizen] > 0, "No allocation found for this address");
        _;
    }
    
    modifier hasNotClaimed(address citizen) {
        require(!hasClaimed[citizen], "Tokens already claimed");
        _;
    }
    
    constructor(
        address _mmyrcToken,
        uint256 _claimStartTime,
        uint256 _claimEndTime,
        address _owner
    ) Ownable(_owner) {
        require(_mmyrcToken != address(0), "Invalid token address");
        require(_claimStartTime < _claimEndTime, "Invalid claim period");
        require(_claimEndTime > block.timestamp, "Claim end time must be in the future");
        
        mmyrcToken = IERC20(_mmyrcToken);
        claimStartTime = _claimStartTime;
        claimEndTime = _claimEndTime;
    }
    
    /**
     * @dev Set allocation for a single citizen
     * @param citizen Address of the citizen
     * @param amount Amount of tokens allocated
     */
    function setAllocation(address citizen, uint256 amount) external onlyOwner {
        require(citizen != address(0), "Invalid citizen address");
        require(amount > 0, "Allocation must be greater than 0");
        
        // Update total allocated amount
        totalAllocated = totalAllocated - allocations[citizen] + amount;
        
        allocations[citizen] = amount;
        emit AllocationSet(citizen, amount);
    }
    
    /**
     * @dev Set allocations for multiple citizens in batch
     * @param citizens Array of citizen addresses
     * @param amounts Array of allocation amounts
     */
    function setAllocations(address[] calldata citizens, uint256[] calldata amounts) external onlyOwner {
        require(citizens.length == amounts.length, "Arrays length mismatch");
        require(citizens.length > 0, "Empty arrays");
        
        for (uint256 i = 0; i < citizens.length; i++) {
            require(citizens[i] != address(0), "Invalid citizen address");
            require(amounts[i] > 0, "Allocation must be greater than 0");
            
            // Update total allocated amount
            totalAllocated = totalAllocated - allocations[citizens[i]] + amounts[i];
            
            allocations[citizens[i]] = amounts[i];
            emit AllocationSet(citizens[i], amounts[i]);
        }
    }
    
    /**
     * @dev Claim allocated tokens
     */
    function claimTokens() external nonReentrant whenNotPaused onlyDuringClaimPeriod hasAllocation(msg.sender) hasNotClaimed(msg.sender) {
        uint256 allocation = allocations[msg.sender];
        
        // Mark as claimed
        hasClaimed[msg.sender] = true;
        totalClaimed += allocation;
        
        // Transfer tokens
        mmyrcToken.safeTransfer(msg.sender, allocation);
        
        emit TokensClaimed(msg.sender, allocation);
    }
    
    /**
     * @dev Check if an address can claim tokens
     * @param citizen Address to check
     * @return eligible Whether the address can claim
     * @return allocation Amount allocated to the address
     * @return alreadyClaimed Whether the address has already claimed
     */
    function canClaim(address citizen) external view returns (bool eligible, uint256 allocation, bool alreadyClaimed) {
        allocation = allocations[citizen];
        alreadyClaimed = hasClaimed[citizen];
        
        eligible = allocation > 0 && 
                   !alreadyClaimed && 
                   block.timestamp >= claimStartTime && 
                   block.timestamp <= claimEndTime;
    }
    
    /**
     * @dev Update claim period (only before it starts)
     * @param _claimStartTime New start time
     * @param _claimEndTime New end time
     */
    function updateClaimPeriod(uint256 _claimStartTime, uint256 _claimEndTime) external onlyOwner {
        require(block.timestamp < claimStartTime, "Claim period has already started");
        require(_claimStartTime < _claimEndTime, "Invalid claim period");
        require(_claimEndTime > block.timestamp, "Claim end time must be in the future");
        
        claimStartTime = _claimStartTime;
        claimEndTime = _claimEndTime;
        
        emit ClaimPeriodUpdated(_claimStartTime, _claimEndTime);
    }
    
    /**
     * @dev Get claim statistics
     * @return _totalAllocated Total tokens allocated
     * @return _totalClaimed Total tokens claimed
     * @return _remainingToClaim Remaining tokens to be claimed
     * @return _claimStartTime Claim start time
     * @return _claimEndTime Claim end time
     */
    function getClaimStats() external view returns (
        uint256 _totalAllocated,
        uint256 _totalClaimed,
        uint256 _remainingToClaim,
        uint256 _claimStartTime,
        uint256 _claimEndTime
    ) {
        _totalAllocated = totalAllocated;
        _totalClaimed = totalClaimed;
        _remainingToClaim = totalAllocated - totalClaimed;
        _claimStartTime = claimStartTime;
        _claimEndTime = claimEndTime;
    }
    
    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency withdrawal of tokens (after claim period ends)
     * @param token Token address to withdraw
     */
    function emergencyWithdraw(address token) external onlyOwner {
        require(block.timestamp > claimEndTime, "Claim period has not ended");
        
        IERC20 tokenContract = IERC20(token);
        uint256 balance = tokenContract.balanceOf(address(this));
        
        if (balance > 0) {
            tokenContract.safeTransfer(owner(), balance);
            emit EmergencyWithdrawal(token, balance);
        }
    }
    
    /**
     * @dev Emergency withdrawal of ETH
     */
    function emergencyWithdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(owner()).transfer(balance);
        }
    }
}