import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

interface AdminWalletConnectionProps {
    requiredAddress?: string;
}

export function AdminWalletConnection({ requiredAddress }: AdminWalletConnectionProps) {
    const { address, isConnected } = useAccount();

    const isAuthorized = !requiredAddress || (address?.toLowerCase() === requiredAddress.toLowerCase());

    if (!isConnected) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    Admin Wallet Connection
                </h2>
                <p className="text-gray-600 mb-4">
                    Connect your admin wallet to manage the MMYRC token system.
                </p>
                <ConnectButton />
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
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
                            Unauthorized Wallet
                        </p>
                        <p className="text-sm text-red-700">
                            Connected wallet is not authorized for admin functions.
                        </p>
                    </div>
                </div>
                <div className="mt-4">
                    <ConnectButton />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
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
                    <div>
                        <p className="text-sm font-medium text-green-800">
                            Admin Wallet Connected
                        </p>
                        <p className="text-sm text-green-700 font-mono">
                            {address}
                        </p>
                    </div>
                </div>
                <ConnectButton />
            </div>
        </div>
    );
}