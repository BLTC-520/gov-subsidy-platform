# Government Subsidy Platform - System Description for Final Year Report

## System Overview

The Government Subsidy Platform is a blockchain-based system designed to distribute government subsidies in the form of digital tokens (MMYRC - Mock Malaysia Ringgit Coin) to eligible citizens. The system leverages Ethereum smart contracts deployed on the Sepolia testnet to ensure transparency, security, and immutability in the subsidy distribution process.

## System Architecture and Components

### 1. Smart Contract Layer

The system consists of two primary smart contracts:

**MMYRCToken Contract (0x61B6056de59844cBc3A4eC44963D9619e4914F20)**
- An ERC-20 compliant token contract representing the government subsidy currency
- Features a maximum supply cap of 1,000,000 tokens to prevent inflation
- Implements access control mechanisms with only the government admin having minting privileges
- Includes pause functionality for emergency situations
- Supports standard ERC-20 operations (transfer, approve, allowance)

**SubsidyClaim Contract (0xeF79df53ae0d09b0219da032170Bf9F502d94009)**
- Manages the allocation and distribution of tokens to eligible citizens
- Maintains a mapping of citizen addresses to their allocated token amounts
- Implements claim period controls and prevents double-claiming
- Provides batch allocation functionality for efficient government administration
- Includes emergency withdrawal mechanisms for unclaimed tokens

### 2. Frontend Application Layer

The user interface is built using modern web technologies:
- **React.js** for the user interface framework
- **RainbowKit** for seamless wallet connection and management
- **Wagmi** for Ethereum blockchain interactions
- **Viem** for low-level blockchain operations
- **TypeScript** for type safety and better development experience

## System Workflow and Process Flow

### Phase 1: System Deployment and Initialization

The deployment process begins with the government administrator deploying the smart contracts to the Ethereum blockchain. First, the MMYRCToken contract is deployed with predefined parameters including the token name ("MockMalaysiaRinggitCoin"), symbol ("MMYRC"), decimal places (18), and initial supply (0). The contract is configured with the government admin address as the owner, granting exclusive rights to mint tokens and manage the system.

Subsequently, the SubsidyClaim contract is deployed with references to the MMYRCToken contract address, claim period timestamps, and the admin address as the owner. The claim period is configured with a start time allowing immediate claims and an end time set far in the future (year 2035) to effectively remove time restrictions on claiming.

### Phase 2: Token Minting and Allocation Setup

Following successful deployment, the administrator mints tokens from the MMYRCToken contract to the SubsidyClaim contract. In the current implementation, 100,000 tokens (representing 10% of the maximum supply) are minted and transferred to the SubsidyClaim contract's address. This creates a pool of tokens available for distribution to eligible citizens.

The administrator then configures individual citizen allocations by calling the setAllocations function on the SubsidyClaim contract. This function accepts arrays of citizen wallet addresses and their corresponding token allocations. In the current configuration, 10 citizens are allocated 1,000 tokens each, totaling 10,000 tokens committed for distribution, while 90,000 tokens remain available for future allocations.

### Phase 3: Citizen Interaction and Token Claiming

Citizens interact with the system through a web-based frontend application. The process begins when a citizen navigates to the claim page and initiates wallet connection through RainbowKit, which supports various wallet providers including MetaMask. Upon successful wallet connection, the system automatically queries the SubsidyClaim contract to verify the citizen's eligibility and allocation amount.

The frontend application calls the canClaim function, which returns three critical pieces of information: eligibility status, allocated token amount, and whether the citizen has already claimed their tokens. If the citizen is eligible and has not previously claimed, the interface displays their allocation amount (1,000 MMYRC tokens) and presents a "Claim Now" button.

When the citizen initiates the claiming process, the frontend triggers a blockchain transaction through their connected wallet. The citizen must approve the transaction, which calls the claimTokens function on the SubsidyClaim contract. This function performs several validation checks: verifying the citizen has an allocation, confirming they haven't already claimed, and ensuring the claim period is active.

Upon successful validation, the contract marks the citizen as having claimed their tokens and initiates a transfer from the SubsidyClaim contract to the citizen's wallet address. The MMYRCToken contract executes the transfer, updating the citizen's token balance. The transaction is recorded on the blockchain, providing an immutable record of the subsidy distribution.

## Technical Implementation Details

### Smart Contract Security Features

The system implements multiple security mechanisms to ensure safe operation:

**Access Control**: Both contracts utilize OpenZeppelin's Ownable pattern, restricting administrative functions to the government admin address. This prevents unauthorized token minting or allocation modifications.

**Reentrancy Protection**: The SubsidyClaim contract implements ReentrancyGuard to prevent reentrancy attacks during the claiming process.

**Supply Management**: The MMYRCToken contract enforces a maximum supply limit, preventing excessive token creation that could devalue the subsidy currency.

**Pause Functionality**: Both contracts can be paused by the administrator in emergency situations, halting all token operations until the issue is resolved.

**Double-Claim Prevention**: The system maintains a mapping of addresses that have already claimed tokens, preventing citizens from claiming multiple times.

### Frontend Integration

The frontend application leverages modern Web3 technologies to provide a seamless user experience:

**Wallet Integration**: RainbowKit provides a unified interface for connecting various Ethereum wallets, supporting MetaMask, WalletConnect, and other popular wallet providers.

**Real-time Data**: The application uses Wagmi hooks to maintain real-time synchronization with blockchain state, automatically updating user interfaces when contract states change.

**Transaction Management**: The system provides comprehensive transaction status tracking, showing pending, confirmed, and failed states to keep users informed throughout the claiming process.

**Error Handling**: Robust error handling mechanisms provide clear feedback to users when transactions fail or when they attempt invalid operations.

## System Benefits and Advantages

### Transparency and Auditability
All transactions and allocations are recorded on the blockchain, providing complete transparency in the subsidy distribution process. Citizens and auditors can verify allocations and claims independently.

### Reduced Administrative Overhead
The automated claiming process reduces manual processing requirements, allowing government resources to be allocated more efficiently.

### Fraud Prevention
The immutable nature of blockchain records and the prevention of double-claiming significantly reduces the potential for fraudulent subsidy claims.

### Accessibility
The web-based interface allows citizens to claim subsidies from any location with internet access, improving accessibility compared to traditional physical distribution methods.

### Scalability
The batch allocation functionality allows the system to efficiently handle large numbers of citizens, making it suitable for national-scale subsidy programs.

## Current System Status

The implemented system successfully demonstrates the complete subsidy distribution workflow:
- **Total Token Supply**: 1,000,000 MMYRC (maximum)
- **Tokens Minted**: 100,000 MMYRC (10% of maximum supply)
- **Citizens Allocated**: 10 citizens with 1,000 tokens each
- **Total Allocated**: 10,000 MMYRC tokens
- **Remaining Available**: 90,000 MMYRC tokens for future allocations

The system is deployed on the Sepolia testnet, providing a safe environment for testing and demonstration while maintaining all the functionality of a mainnet deployment. This implementation serves as a proof-of-concept for blockchain-based government subsidy distribution, demonstrating the feasibility and benefits of using distributed ledger technology for public sector applications.