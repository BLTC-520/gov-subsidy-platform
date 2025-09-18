// Allocation data from CSV (Note: This is now handled by smart contracts)
export const ALLOCATION_DATA = [
  { address: '0xCC06811c343Aa8F4CeB42c5d9053400C2Df27dC6', amount: 1000 },
  { address: '0x3fa90eCe725B2bDed859dCf5364c39d8AAC8BdAC', amount: 1000 },
  { address: '0x50d18bA7d4b7f2A0A2fce3be97D1C19b5e19dCE3', amount: 1000 },
  { address: '0xE819584CA25B9C82e9FE30D0c0a75BeA06B70357', amount: 1000 },
  { address: '0x0FD0a773719A84d99cA3a09F8CdA6aE51a2BE84f', amount: 1000 },
  { address: '0xfAB3c85aeadEEF963aB2835d25268dB3F8228B1D', amount: 1000 },
  { address: '0xC36020E61724E86979e4c31709b027c889C05244', amount: 1000 },
  { address: '0x74A6e88e81F4730D60D3b6Ee7C01ea7Ea758cF30', amount: 1000 },
  { address: '0x05b503d55024175d18F0D800cE5aaD9C48582591', amount: 1000 },
  { address: '0xf804F7706F6fE94d883120810a831cB56E2786C1', amount: 1000 },
];

export function getAllocation(address: string): number | null {
  const allocation = ALLOCATION_DATA.find(
    (item) => item.address.toLowerCase() === address.toLowerCase()
  );
  return allocation ? allocation.amount : null;
}

export function isEligibleForClaim(address: string): boolean {
  return getAllocation(address) !== null;
}