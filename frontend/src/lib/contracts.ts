// Contract addresses - Deployed on Sepolia testnet
export const CONTRACT_ADDRESSES = {
    MMYRC_TOKEN: '0x61B6056de59844cBc3A4eC44963D9619e4914F20',
    SUBSIDY_CLAIM: '0xeF79df53ae0d09b0219da032170Bf9F502d94009',
} as const;
// MMYRC Token ABI (essential functions only)
export const MMYRC_TOKEN_ABI = [
    {
        "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "name",
        "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "symbol",
        "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "to", "type": "address" },
            { "internalType": "uint256", "name": "amount", "type": "uint256" }
        ],
        "name": "mint",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;// Subsidy Claim ABI
export const SUBSIDY_CLAIM_ABI = [
    {
        "inputs": [],
        "name": "claimTokens",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "citizen", "type": "address" }],
        "name": "canClaim",
        "outputs": [
            { "internalType": "bool", "name": "canClaim", "type": "bool" },
            { "internalType": "uint256", "name": "allocation", "type": "uint256" },
            { "internalType": "bool", "name": "alreadyClaimed", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "name": "allocations",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "name": "hasClaimed",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getClaimStats",
        "outputs": [
            { "internalType": "uint256", "name": "_totalAllocated", "type": "uint256" },
            { "internalType": "uint256", "name": "_remainingToClaim", "type": "uint256" },
            { "internalType": "uint256", "name": "_claimStartTime", "type": "uint256" },
            { "internalType": "uint256", "name": "_claimEndTime", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address[]", "name": "citizens", "type": "address[]" },
            { "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }
        ],
        "name": "setAllocations",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;