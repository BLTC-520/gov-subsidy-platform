# Remix Deployment Data

## SubsidyClaim Constructor Parameters

```
_mmyrcToken: "0xYourMMYRCTokenAddressHere"
_claimStartTime: 1735689600
_claimEndTime: 2051222400
_owner: "0xYourAdminAddressHere"
```

## setAllocations Function Call

After deployment, call `setAllocations` with these parameters:

### citizens (address[]):
```
["0xCC06811c343Aa8F4CeB42c5d9053400C2Df27dC6","0x3fa90eCe725B2bDed859dCf5364c39d8AAC8BdAC","0x50d18bA7d4b7f2A0A2fce3be97D1C19b5e19dCE3","0xE819584CA25B9C82e9FE30D0c0a75BeA06B70357","0x0FD0a773719A84d99cA3a09F8CdA6aE51a2BE84f","0xfAB3c85aeadEEF963aB2835d25268dB3F8228B1D","0xC36020E61724E86979e4c31709b027c889C05244","0x74A6e88e81F4730D60D3b6Ee7C01ea7Ea758cF30","0x05b503d55024175d18F0D800cE5aaD9C48582591","0xf804F7706F6fE94d883120810a831cB56E2786C1"]
```

### amounts (uint256[]):
```
["1000000000000000000000000","1000000000000000000000000","1000000000000000000000000","1000000000000000000000000","1000000000000000000000000","1000000000000000000000000","1000000000000000000000000","1000000000000000000000000","1000000000000000000000000","1000000000000000000000000"]
```

Note: Each amount is 1,000,000 tokens with 18 decimals = 1000000 * 10^18 = 1000000000000000000000000

## Required Steps After Deployment

1. **Deploy SubsidyClaim** with constructor parameters above
2. **Mint tokens to SubsidyClaim contract**: Call `mint` on MMYRCToken contract
   - to: SubsidyClaim contract address
   - amount: "10000000000000000000000000" (10M tokens total for all allocations)
3. **Set allocations**: Call `setAllocations` on SubsidyClaim with arrays above
4. **Update frontend**: Add contract addresses to frontend/src/lib/contracts.ts

## Frontend Contract Addresses Update

After deployment, update these addresses in `frontend/src/lib/contracts.ts`:

```typescript
export const CONTRACT_ADDRESSES = {
  MMYRC_TOKEN: '0xYourMMYRCTokenAddress',
  SUBSIDY_CLAIM: '0xYourSubsidyClaimAddress',
} as const;
```