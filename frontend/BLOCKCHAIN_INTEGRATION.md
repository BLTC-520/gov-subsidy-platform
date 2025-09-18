# Blockchain Integration with RainbowKit

## Overview
This document describes the blockchain integration implemented for the Government Subsidy Platform using RainbowKit, Wagmi, and Viem.

## Features Implemented

### 1. Wallet Connection
- **RainbowKit Integration**: Users can connect their MetaMask and other supported wallets
- **Multi-chain Support**: Configured for Ethereum mainnet, Polygon, Optimism, Arbitrum, Base, and Sepolia testnet
- **Responsive UI**: Clean wallet connection interface with proper error handling

### 2. Token Allocation System
- **CSV-based Allocation**: Token allocations are loaded from `artifacts/allocation.csv`
- **Address Verification**: Connected wallet addresses are checked against the allocation list
- **Dynamic Display**: Shows allocation amount (1000 MMYRC tokens) for eligible addresses

### 3. Claim Interface
- **Eligibility Check**: Automatically verifies if connected wallet is eligible for tokens
- **Claim Button**: Interactive claim functionality (currently demo implementation)
- **Status Feedback**: Loading states and success/error messages

## Files Added/Modified

### New Files
- `frontend/src/lib/wagmi.ts` - Wagmi configuration for blockchain connection
- `frontend/src/lib/allocation.ts` - Allocation data and utility functions
- `frontend/src/components/common/WalletConnection.tsx` - Wallet connection component
- `frontend/src/hooks/useAllocation.ts` - Custom hook for allocation management

### Modified Files
- `frontend/src/main.tsx` - Added RainbowKit providers
- `frontend/src/pages/CitizenClaimPage.tsx` - Integrated wallet connection and claim functionality
- `frontend/package.json` - Added blockchain dependencies

## Dependencies Added
```json
{
  "@rainbow-me/rainbowkit": "^2.x",
  "wagmi": "^2.x", 
  "viem": "^2.x",
  "@tanstack/react-query": "^5.x"
}
```

## Configuration Required

### 1. WalletConnect Project ID
Update `frontend/src/lib/wagmi.ts` with your WalletConnect project ID:
```typescript
projectId: 'YOUR_PROJECT_ID', // Get this from WalletConnect Cloud
```

### 2. Network Configuration
The current configuration supports multiple networks. Modify the chains array in `wagmi.ts` to match your deployment needs.

## Usage

### For Citizens
1. Navigate to the Claim page (`/citizen/claim`)
2. Click "Connect Wallet" to connect MetaMask or other supported wallets
3. If the connected address is in the allocation list, they'll see:
   - "You have been allocated 1000 MMYRC tokens"
   - "Claim Now" button
4. Click "Claim Now" to initiate the token claim process

### For Developers
The allocation data is currently hardcoded from the CSV file. To update allocations:
1. Modify `frontend/src/lib/allocation.ts`
2. Update the `ALLOCATION_DATA` array with new addresses and amounts

## Next Steps

### Smart Contract Integration
The current implementation includes a demo claim function. To complete the integration:

1. **Deploy Token Contract**: Deploy an ERC-20 token contract for MMYRC tokens
2. **Deploy Claim Contract**: Create a smart contract that handles the claiming logic
3. **Update Claim Function**: Replace the demo implementation with actual contract calls
4. **Add Transaction Handling**: Implement proper transaction status tracking
5. **Gas Fee Estimation**: Add gas fee estimation and handling

### Example Smart Contract Integration
```typescript
// In the claim function
const { writeContract } = useWriteContract();

const handleClaim = async () => {
  try {
    await writeContract({
      address: CLAIM_CONTRACT_ADDRESS,
      abi: CLAIM_CONTRACT_ABI,
      functionName: 'claimTokens',
      args: [address, allocation],
    });
  } catch (error) {
    console.error('Claim failed:', error);
  }
};
```

## Security Considerations
- Wallet addresses are case-insensitive when checking allocations
- Each address can only claim once (to be enforced by smart contract)
- Users must have sufficient ETH for gas fees
- Allocation data should be verified against official government records

## Testing
The integration has been tested with:
- Wallet connection/disconnection
- Address eligibility checking
- UI state management
- Build process compatibility

For production deployment, additional testing should include:
- Smart contract interaction
- Transaction error handling
- Network switching
- Mobile wallet compatibility