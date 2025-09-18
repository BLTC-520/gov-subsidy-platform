import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ADDRESSES, SUBSIDY_CLAIM_ABI } from '../lib/contracts';

export function useSubsidyClaim() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  // Check if user can claim
  const { data: claimData, isLoading: isCheckingClaim, refetch: refetchClaimData } = useReadContract({
    address: CONTRACT_ADDRESSES.SUBSIDY_CLAIM as `0x${string}`,
    abi: SUBSIDY_CLAIM_ABI,
    functionName: 'canClaim',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Get allocation amount
  const { data: allocation } = useReadContract({
    address: CONTRACT_ADDRESSES.SUBSIDY_CLAIM as `0x${string}`,
    abi: SUBSIDY_CLAIM_ABI,
    functionName: 'allocations',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Check if already claimed
  const { data: hasClaimed } = useReadContract({
    address: CONTRACT_ADDRESSES.SUBSIDY_CLAIM as `0x${string}`,
    abi: SUBSIDY_CLAIM_ABI,
    functionName: 'hasClaimed',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Get claim statistics
  const { data: claimStats, refetch: refetchStats } = useReadContract({
    address: CONTRACT_ADDRESSES.SUBSIDY_CLAIM as `0x${string}`,
    abi: SUBSIDY_CLAIM_ABI,
    functionName: 'getClaimStats',
  });

  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Claim tokens function
  const claimTokens = async () => {
    if (!address) throw new Error('Wallet not connected');
    
    return writeContract({
      address: CONTRACT_ADDRESSES.SUBSIDY_CLAIM as `0x${string}`,
      abi: SUBSIDY_CLAIM_ABI,
      functionName: 'claimTokens',
    });
  };

  // Parse claim data
  const canClaim = claimData?.[0] ?? false;
  const allocationAmount = claimData?.[1] ?? allocation ?? 0n;
  const alreadyClaimed = claimData?.[2] ?? hasClaimed ?? false;

  // Format allocation amount (assuming 18 decimals)
  const formattedAllocation = allocationAmount ? Number(allocationAmount) / 1e18 : 0;

  return {
    // State
    canClaim,
    allocationAmount,
    formattedAllocation,
    alreadyClaimed,
    claimStats,
    
    // Actions
    claimTokens,
    refetchClaimData,
    refetchStats,
    
    // Transaction state
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error,
    
    // Loading states
    isCheckingClaim,
  };
}