import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useSubsidyClaim } from '../../hooks/useSubsidyClaim';
import { useMMYRCToken } from '../../hooks/useMMYRCToken';
import { useProfile } from '../../hooks/useProfile';

interface WalletConnectionProps {
  onClaimClick?: () => void;
}

export function WalletConnection({ onClaimClick }: WalletConnectionProps) {
  const { address, isConnected } = useAccount();
  const { profile } = useProfile();
  const {
    canClaim,
    formattedAllocation,
    alreadyClaimed,
    isPending,
    isConfirming,
    isConfirmed,
    claimTokens,
    error
  } = useSubsidyClaim();
  const { formattedBalance, symbol } = useMMYRCToken();

  // Check if connected wallet matches the stored wallet address
  const isWalletAddressMatch = profile?.wallet_address?.toLowerCase() === address?.toLowerCase();
  const hasStoredAddress = !!profile?.wallet_address;

  const handleClaim = async () => {
    try {
      await claimTokens();
      if (onClaimClick) onClaimClick();
    } catch (err) {
      console.error('Claim failed:', err);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Connect Your Wallet
        </h2>
        <p className="text-gray-600 mb-6">
          Connect your MetaMask wallet to check your MMYRC token allocation and claim your subsidy.
        </p>
        <div className="flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Wallet Connected
        </h2>
        <ConnectButton />
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-600">Connected Address</p>
        <p className="text-sm font-mono text-gray-900 break-all">
          {address}
        </p>
      </div>

      {/* Current Token Balance */}
      {formattedBalance > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
          <p className="text-sm text-blue-600">Current Balance</p>
          <p className="text-lg font-bold text-blue-800">
            {formattedBalance.toFixed(2)} {symbol || 'MMYRC'}
          </p>
        </div>
      )}

      {/* Wallet Address Mismatch Warning */}
      {hasStoredAddress && !isWalletAddressMatch ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-red-600 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800">
                Incorrect wallet
              </p>
              <p className="text-sm text-red-700">
                You can't claim on behalf of other citizens.
              </p>
              <p className="text-xs text-red-600 mt-1 font-mono">
                Expected: {profile?.wallet_address}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Claim Status */}
      {alreadyClaimed ? (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-gray-600 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-800">
                Tokens Already Claimed
              </p>
              <p className="text-sm text-gray-600">
                You have already claimed your MMYRC token allocation.
              </p>
            </div>
          </div>
        </div>
      ) : canClaim && formattedAllocation > 0 && isWalletAddressMatch ? (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <div className="flex items-center mb-3">
            <svg
              className="h-5 w-5 text-green-600 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-medium text-green-800">
              Congratulations! You are eligible for tokens.
            </p>
          </div>
          <p className="text-lg font-bold text-green-800 mb-4">
            You have been allocated {formattedAllocation.toFixed(0)} MMYRC tokens
          </p>
          <button
            onClick={handleClaim}
            disabled={isPending || isConfirming}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-md transition-colors"
          >
            {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Claim Now'}
          </button>
          {error && (
            <p className="text-red-600 text-sm mt-2">
              Error: {error.message}
            </p>
          )}
        </div>
      ) : formattedAllocation > 0 && isWalletAddressMatch ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-yellow-600 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Claim Period Not Active
              </p>
              <p className="text-sm text-yellow-700">
                You have {formattedAllocation.toFixed(0)} MMYRC tokens allocated, but the claim period is not currently active.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-red-600 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800">
                No allocation found
              </p>
              <p className="text-sm text-red-700">
                This wallet address is not eligible for MMYRC token allocation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {isConfirmed && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mt-4">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-green-600 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-medium text-green-800">
              Tokens claimed successfully! Check your wallet balance.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}