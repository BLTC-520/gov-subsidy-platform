import { useState } from "react";
import { ZKVerificationBadge } from "./ZKVerificationBadge";

interface IncomeVerificationFieldProps {
  icNumber: string;
  onVerificationComplete: (data: {
    incomeBracket: string;
    citizenName: string;
    verified: boolean;
  }) => void;
  disabled?: boolean;
}

interface ZKProof {
  proof: string;
  publicSignals: string[];
}

interface ZKVerificationResult {
  success: boolean;
  citizen_name: string;
  income_bracket: string;
  verification_status: string;
  zk_proof: ZKProof;
  message: string;
  privacy_note: string;
}

export function IncomeVerificationField({
  icNumber,
  onVerificationComplete,
  disabled = false,
}: IncomeVerificationFieldProps) {
  const [verificationStatus, setVerificationStatus] = useState<
    "unverified" | "loading" | "verified" | "error"
  >("unverified");
  const [verificationData, setVerificationData] =
    useState<ZKVerificationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleVerifyIncome = async () => {
    if (!icNumber || icNumber.length < 10) {
      setErrorMessage("Please enter a valid IC number first");
      return;
    }

    setVerificationStatus("loading");
    setErrorMessage("");

    try {
      console.log("Starting ZK verification for IC:", icNumber);

      const response = await fetch(
        "http://localhost:3002/api/ic-verification",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ic: icNumber }),
        }
      );

      const result: ZKVerificationResult = await response.json();

      if (response.ok && result.success) {
        console.log("ZK verification successful:", result);
        setVerificationData(result);
        setVerificationStatus("verified");

        // Notify parent component
        onVerificationComplete({
          incomeBracket: result.income_bracket,
          citizenName: result.citizen_name,
          verified: true,
        });
      } else {
        console.error("ZK verification failed:", result);
        setVerificationStatus("error");
        setErrorMessage(result.message || "Verification failed");
      }
    } catch (error) {
      console.error("ZK verification error:", error);
      setVerificationStatus("error");
      setErrorMessage("Network error during verification");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Monthly Income Verification *
        </label>

        {verificationStatus === "unverified" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleVerifyIncome}
              disabled={disabled || !icNumber}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Verify Income with ZK-SNARK
            </button>
            <p className="text-xs text-gray-500">
              Click to securely verify your income bracket without revealing
              your actual salary amount
            </p>
          </div>
        )}

        {verificationStatus !== "unverified" && (
          <div className="space-y-3">
            <ZKVerificationBadge
              status={verificationStatus}
              incomeBracket={verificationData?.income_bracket}
              className="w-full justify-center"
            />

            {verificationStatus === "verified" && verificationData && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Citizen Name:</span>
                    <span className="font-medium text-gray-900">
                      {verificationData.citizen_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Income Bracket:</span>
                    <span className="font-bold text-green-700">
                      {verificationData.income_bracket}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Verification:</span>
                    <span className="font-medium text-green-700">
                      ZK-SNARK Proven ✓
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-xs text-green-600 italic">
                      {verificationData.privacy_note}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {verificationStatus === "error" && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-700">{errorMessage}</p>
                <button
                  type="button"
                  onClick={handleVerifyIncome}
                  disabled={disabled}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
