import { useAccount } from 'wagmi';
import { getAllocation, isEligibleForClaim } from '../lib/allocation';

export function useAllocation() {
  const { address, isConnected } = useAccount();

  const allocation = address ? getAllocation(address) : null;
  const isEligible = address ? isEligibleForClaim(address) : false;

  return {
    address,
    isConnected,
    allocation,
    isEligible,
  };
}