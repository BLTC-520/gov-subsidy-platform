import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CONTRACT_ADDRESSES, MMYRC_TOKEN_ABI } from '../../lib/contracts';

export function TokenMinting() {
  const { isConnected } = useAccount();
  const [mintAmount, setMintAmount] = useState('');
  const [mintToAddress, setMintToAddress] = useState('');

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Get current total supply
  const { data: totalSupply } = useReadContract({
    address: CONTRACT_ADDRESSES.MMYRC_TOKEN as `0x${string}`,
    abi: MMYRC_TOKEN_ABI,
    functionName: 'totalSupply',
  });

  // Get max supply (1M tokens)
  const maxSupply = 1000000;
  const currentSupply = totalSupply ? Number(formatUnits(totalSupply, 18)) : 0;
  const remainingSupply = maxSupply - currentSupply;

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mintAmount || !mintToAddress) {
      alert('Please fill in all fields');
      return;
    }

    const amount = parseFloat(mintAmount);
    if (amount <= 0) {
      alert('Amount must be greater than 0');
      return;
    }

    if (amount > remainingSupply) {
      alert(`Cannot mint ${amount} tokens. Only ${remainingSupply} tokens remaining.`);
      return;
    }

    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.MMYRC_TOKEN as `0x${string}`,
        abi: MMYRC_TOKEN_ABI,
        functionName: 'mint',
        args: [mintToAddress as `0x${string}`, parseUnits(mintAmount, 18)],
      });
    } catch (err) {
      console.error('Minting failed:', err);
    }
  };

  const setSubsidyClaimAddress = () => {
    setMintToAddress(CONTRACT_ADDRESSES.SUBSIDY_CLAIM);
  };

  if (!isConnected) {
    return (
      <div className="bg-gray-50 rounded-lg p-6">
        <p className="text-gray-600">Connect your admin wallet to mint tokens.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Mint MMYRC Tokens
      </h2>

      {/* Supply Information */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-blue-900 mb-2">Token Supply Status</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-blue-600">Current Supply</p>
            <p className="font-bold text-blue-800">{currentSupply.toLocaleString()} MMYRC</p>
          </div>
          <div>
            <p className="text-blue-600">Max Supply</p>
            <p className="font-bold text-blue-800">{maxSupply.toLocaleString()} MMYRC</p>
          </div>
          <div>
            <p className="text-blue-600">Remaining</p>
            <p className="font-bold text-blue-800">{remainingSupply.toLocaleString()} MMYRC</p>
          </div>
        </div>
      </div>

      {/* Minting Form */}
      <form onSubmit={handleMint} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mint To Address
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={mintToAddress}
              onChange={(e) => setMintToAddress(e.target.value)}
              placeholder="0x..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="button"
              onClick={setSubsidyClaimAddress}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
            >
              Use SubsidyClaim
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (MMYRC)
          </label>
          <input
            type="number"
            value={mintAmount}
            onChange={(e) => setMintAmount(e.target.value)}
            placeholder="1000"
            min="0"
            max={remainingSupply}
            step="0.000000000000000001"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Maximum: {remainingSupply.toLocaleString()} MMYRC
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending || isConfirming || !mintAmount || !mintToAddress}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-md transition-colors"
        >
          {isPending ? 'Confirming...' : isConfirming ? 'Minting...' : 'Mint Tokens'}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-800 text-sm">
              Error: {error.message}
            </p>
          </div>
        )}

        {isConfirmed && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-green-800 text-sm">
              ✅ Tokens minted successfully!
            </p>
            {hash && (
              <div className="mt-2">
                <a
                  href={`https://sepolia.etherscan.io/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                >
                  View on Sepolia Etherscan
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <p className="text-green-700 text-xs mt-1 font-mono break-all">
                  Transaction: {hash}
                </p>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}