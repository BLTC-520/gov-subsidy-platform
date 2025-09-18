# Government Subsidy Platform - Sequence Diagram

## 🏗️ **Deployment & Setup Phase**

```mermaid
sequenceDiagram
    participant Admin as Admin (0x221ab...)
    participant Remix as Remix IDE
    participant MMYRCToken as MMYRCToken Contract
    participant SubsidyClaim as SubsidyClaim Contract
    participant Sepolia as Sepolia Testnet

    Note over Admin, Sepolia: Phase 1: Contract Deployment
    
    Admin->>Remix: Deploy MMYRCToken
    Note right of Admin: Constructor: name="MockMalaysiaRinggitCoin"<br/>symbol="MMYRC", decimals=18, initialSupply=0
    Remix->>Sepolia: Deploy contract
    Sepolia-->>Admin: Contract Address: 0x61B6056de59844cBc3A4eC44963D9619e4914F20
    
    Admin->>Remix: Deploy SubsidyClaim
    Note right of Admin: Constructor: _mmyrcToken=0x61B6..., _claimStartTime=1735689600<br/>_claimEndTime=2051222400, _owner=0x221ab...
    Remix->>Sepolia: Deploy contract
    Sepolia-->>Admin: Contract Address: 0xeF79df53ae0d09b0219da032170Bf9F502d94009

    Note over Admin, Sepolia: Phase 2: Token Setup
    
    Admin->>MMYRCToken: mint(to=0xeF79df..., amount=100000000000000000000000)
    Note right of Admin: Mint 100,000 tokens to SubsidyClaim contract
    MMYRCToken-->>Admin: ✅ Tokens minted
    
    Admin->>SubsidyClaim: setAllocations(citizens[], amounts[])
    Note right of Admin: Set 1,000 tokens for each of 10 citizens
    SubsidyClaim-->>Admin: ✅ Allocations set
```

## 🎯 **Citizen Claiming Phase**

```mermaid
sequenceDiagram
    participant Citizen as Citizen
    participant Frontend as React Frontend
    participant MetaMask as MetaMask Wallet
    participant SubsidyClaim as SubsidyClaim Contract
    participant MMYRCToken as MMYRCToken Contract
    participant Sepolia as Sepolia Testnet

    Note over Citizen, Sepolia: Phase 3: Citizen Claims Tokens
    
    Citizen->>Frontend: Visit /citizen/claim page
    Frontend->>Citizen: Show "Connect Wallet" button
    
    Citizen->>MetaMask: Click "Connect Wallet"
    MetaMask->>Frontend: Connect wallet (address)
    
    Frontend->>SubsidyClaim: canClaim(citizenAddress)
    SubsidyClaim-->>Frontend: (eligible=true, allocation=1000, alreadyClaimed=false)
    
    Frontend->>Citizen: Show "You have been allocated 1,000 MMYRC tokens"
    Frontend->>Citizen: Show "Claim Now" button
    
    Citizen->>Frontend: Click "Claim Now"
    Frontend->>MetaMask: Request transaction signature
    MetaMask->>Citizen: Show transaction details
    Citizen->>MetaMask: Approve transaction
    
    MetaMask->>SubsidyClaim: claimTokens()
    SubsidyClaim->>SubsidyClaim: Mark as claimed
    SubsidyClaim->>MMYRCToken: transfer(citizen, 1000 tokens)
    MMYRCToken->>Sepolia: Execute transfer
    
    Sepolia-->>Frontend: Transaction confirmed
    Frontend->>Citizen: Show "Tokens claimed successfully!"
    
    Note over Citizen: Citizen now has 1,000 MMYRC tokens in wallet
```

## 📋 **System Architecture Summary**

### **Contracts Created:**
1. **MMYRCToken** (`0x61B6056de59844cBc3A4eC44963D9619e4914F20`)
   - ERC-20 token contract
   - Max supply: 1,000,000 tokens
   - Owner: Admin address

2. **SubsidyClaim** (`0xeF79df53ae0d09b0219da032170Bf9F502d94009`)
   - Manages token allocations and claims
   - Holds 100,000 tokens for distribution
   - Owner: Admin address

### **Key Interactions:**
1. **Admin mints** 100,000 tokens to SubsidyClaim
2. **Admin sets** 1,000 token allocations for 10 citizens
3. **Citizens connect** wallets via RainbowKit
4. **Citizens claim** their allocated tokens
5. **Tokens transfer** from SubsidyClaim to citizen wallets

### **Frontend Integration:**
- **RainbowKit** for wallet connection
- **Wagmi hooks** for smart contract interaction
- **Real-time** allocation checking and claiming
- **Sepolia testnet** integration

### **Final State:**
- ✅ 100,000 tokens minted
- ✅ 10,000 tokens allocated (10 citizens × 1,000 each)
- ✅ 90,000 tokens remaining for future allocations
- ✅ Citizens can claim their 1,000 MMYRC tokens