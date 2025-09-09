import { CitizenPortalLayout } from "../components/common/CitizenPortalLayout";
import { CountdownTimer } from "../components/common/CountdownTimer";
import { useProfile } from "../hooks/useProfile";

export default function CitizenClaimPage() {
  const { profile, loading } = useProfile();

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

        {/* Claim Interface - Coming Soon */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Subsidy Claim
          </h2>

          <div className="text-center py-12">
            <div className="bg-blue-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg
                className="h-8 w-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Subsidy Claim Interface
            </h3>
            <p className="text-gray-600 mb-6">
              The subsidy claim functionality is currently under development.
              Once your eligibility is confirmed, you'll be able to claim your
              subsidy directly through this interface.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 text-left">
              <h4 className="font-medium text-gray-900 mb-2">Coming Soon:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Wallet connection integration</li>
                <li>• Smart contract interaction</li>
                <li>• Automated subsidy token distribution</li>
                <li>• Transaction history tracking</li>
                <li>• Claim status monitoring</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Wallet Information */}
        {profile?.wallet_address && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Wallet Information
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    Registered Wallet Address
                  </p>
                  <p className="text-sm font-mono text-gray-900 break-all">
                    {profile.wallet_address}
                  </p>
                </div>
                <div className="ml-4">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    Copy
                  </button>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Subsidies will be sent to this wallet address once the claim
              process is activated.
            </p>
          </div>
        )}
      </div>
    </CitizenPortalLayout>
  );
}
