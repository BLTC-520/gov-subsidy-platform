import { CitizenPortalLayout } from "../components/common/CitizenPortalLayout";
import { CountdownTimer } from "../components/common/CountdownTimer";
import { WalletConnection } from "../components/common/WalletConnection";
import { useProfile } from "../hooks/useProfile";
import { useState } from "react";

export default function CitizenClaimPage() {
  const { profile, loading } = useProfile();
  const [isClaimProcessing, setIsClaimProcessing] = useState(false);

  const handleClaim = async () => {
    setIsClaimProcessing(true);
    try {
      // TODO: Implement actual smart contract interaction
      console.log("Claiming tokens...");
      // Simulate claim process
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert("Claim successful! (This is a demo - actual smart contract integration needed)");
    } catch (error) {
      console.error("Claim failed:", error);
      alert("Claim failed. Please try again.");
    } finally {
      setIsClaimProcessing(false);
    }
  };

  if (loading) {
    return (
      <CitizenPortalLayout title="Claim Subsidy">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-300 rounded w-1/3"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-300 rounded w-full"></div>
                <div className="h-4 bg-gray-300 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </CitizenPortalLayout>
    );
  }

  return (
    <CitizenPortalLayout title="Claim Subsidy">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Application Status */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Application Status
            </h2>
            <CountdownTimer size="md" />
          </div>

          {profile?.eligibility_score !== null &&
          profile?.eligibility_score !== undefined ? (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
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
                    Your eligibility has been assessed
                  </p>
                  <p className="text-sm text-green-700">
                    Eligibility Score:{" "}
                    <span className="font-bold">
                      {profile.eligibility_score}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ) : (
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
                    Eligibility assessment pending
                  </p>
                  <p className="text-sm text-yellow-700">
                    Complete your profile to receive your eligibility score
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wallet Connection and Claim Interface */}
        <WalletConnection onClaimClick={handleClaim} />

        {/* Claim Status */}
        {isClaimProcessing && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Processing Claim...
              </h3>
              <p className="text-gray-600">
                Please wait while we process your token claim.
              </p>
            </div>
          </div>
        )}

        {/* Token Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            About MMYRC Tokens
          </h3>
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Token Details</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Token Symbol: MMYRC</li>
                <li>• Allocation Amount: 1,000 tokens per eligible citizen</li>
                <li>• Network: Sepolia Testnet</li>
                <li>• Claim Period: Limited time offer</li>
              </ul>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">Important Notes</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Connect the same wallet address used in your profile</li>
                <li>• Ensure you have enough ETH for gas fees</li>
                <li>• Tokens will be transferred directly to your wallet</li>
                <li>• Each address can only claim once</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </CitizenPortalLayout>
  );
}
