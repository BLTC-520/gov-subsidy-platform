import { useAccount, useReadContract } from 'wagmi';
import { CONTRACT_ADDRESSES, MMYRC_TOKEN_ABI } from '../lib/contracts';

export function useMMYRCToken() {
  const { address } = useAccount();

  // Get token balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.MMYRC_TOKEN as `0x${string}`,
    abi: MMYRC_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Get token info
  const { data: name } = useReadContract({
    address: CONTRACT_ADDRESSES.MMYRC_TOKEN as `0x${string}`,
    abi: MMYRC_TOKEN_ABI,
    functionName: 'name',
  });

  const { data: symbol } = useReadContract({
    address: CONTRACT_ADDRESSES.MMYRC_TOKEN as `0x${string}`,
    abi: MMYRC_TOKEN_ABI,
    functionName: 'symbol',
  });

  const { data: decimals } = useReadContract({
    address: CONTRACT_ADDRESSES.MMYRC_TOKEN as `0x${string}`,
    abi: MMYRC_TOKEN_ABI,
    functionName: 'decimals',
  });

  const { data: totalSupply } = useReadContract({
    address: CONTRACT_ADDRESSES.MMYRC_TOKEN as `0x${string}`,
    abi: MMYRC_TOKEN_ABI,
    functionName: 'totalSupply',
  });

  // Format balance (assuming 18 decimals)
  const formattedBalance = balance ? Number(balance) / 1e18 : 0;
  const formattedTotalSupply = totalSupply ? Number(totalSupply) / 1e18 : 0;

  return {
    // Token info
    name: name as string,
    symbol: symbol as string,
    decimals: decimals as number,
    totalSupply,
    formattedTotalSupply,
    
    // User balance
    balance,
    formattedBalance,
    
    // Actions
    refetchBalance,
  };
}