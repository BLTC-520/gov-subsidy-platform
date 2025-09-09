import { useState } from "react";
import { ZKVerificationBadge } from "./ZKVerificationBadge";

interface IncomeVerificationFieldProps {
  icNumber: string;
  onVerificationComplete: (data: {
    incomeBracket: string;
    citizenName: string;
    verified: boolean;
    zkFlags: number[];
    isSignatureValid: boolean;
    isDataAuthentic: boolean;
    zkProof: ZKProof;
  }) => void;
  disabled?: boolean;
}

interface ZKProof extends Record<string, unknown> {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  public_signals: string[];
}

interface ZKVerificationResult {
  success: boolean;
  citizen_name: string;
  income_bracket: string;
  verification_status: string;
  zk_proof: ZKProof;
  zk_flags: number[];
  is_signature_valid: boolean;
  is_data_authentic: boolean;
  message: string;
  privacy_note: string;
  note: string;
}

type VerificationStep =
  | "idle"
  | "lhdn_lookup"
  | "circuit_compilation"
  | "witness_generation"
  | "proof_generation"
  | "proof_verification"
  | "completed";

interface ProcessStep {
  step: VerificationStep;
  label: string;
  description: string;
}

const VERIFICATION_STEPS: ProcessStep[] = [
  {
    step: "lhdn_lookup",
    label: "LHDN Lookup",
    description: "Fetching income data from tax authority",
  },
  {
    step: "circuit_compilation",
    label: "Circuit Setup",
    description: "Preparing cryptographic circuit",
  },
  {
    step: "witness_generation",
    label: "Witness Generation",
    description: "Computing circuit inputs",
  },
  {
    step: "proof_generation",
    label: "ZK Proof Generation",
    description: "Creating zero-knowledge proof",
  },
  {
    step: "proof_verification",
    label: "Proof Verification",
    description: "Validating cryptographic proof",
  },
  {
    step: "completed",
    label: "Completed",
    description: "Income bracket verified privately",
  },
];

export function IncomeVerificationField({
  icNumber,
  onVerificationComplete,
  disabled = false,
}: IncomeVerificationFieldProps) {
  const [verificationStatus, setVerificationStatus] = useState<
    "unverified" | "loading" | "verified" | "error"
  >("unverified");
  const [currentStep, setCurrentStep] = useState<VerificationStep>("idle");
  const [verificationData, setVerificationData] =
    useState<ZKVerificationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const simulateStepProgress = (
    steps: VerificationStep[],
    onComplete: () => void
  ) => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < steps.length) {
        setCurrentStep(steps[currentIndex]);
        currentIndex++;
      } else {
        clearInterval(interval);
        onComplete();
      }
    }, 800); // Each step takes ~800ms for realistic feel
  };

  const handleVerifyIncome = async () => {
    if (!icNumber || icNumber.length < 10) {
      setErrorMessage("Please enter a valid IC number first");
      return;
    }

    setVerificationStatus("loading");
    setCurrentStep("lhdn_lookup");
    setErrorMessage("");

    try {
      console.log("Starting ZK verification for IC:", icNumber);

      // Show step-by-step progress while API call is happening
      const stepsToShow: VerificationStep[] = [
        "lhdn_lookup",
        "circuit_compilation",
        "witness_generation",
        "proof_generation",
        "proof_verification",
      ];

      // Start the API call
      const apiPromise = fetch("http://localhost:3002/api/ic-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ic: icNumber }),
      });

      // Simulate step progress for better UX
      simulateStepProgress(stepsToShow, () => {
        setCurrentStep("completed");
      });

      const response = await apiPromise;
      const result: ZKVerificationResult = await response.json();

      if (response.ok && result.success) {
        console.log("ZK verification successful:", result);
        console.log("ZK verification successful:", result);
        console.log("ZK proof generated, but NOT saved to database yet");

        setVerificationData(result);
        setCurrentStep("completed");
        setVerificationStatus("verified");

        // Notify parent component with complete ZK data
        onVerificationComplete({
          incomeBracket: result.income_bracket,
          citizenName: result.citizen_name,
          verified: true,
          zkFlags: result.zk_flags,
          isSignatureValid: result.is_signature_valid,
          isDataAuthentic: result.is_data_authentic,
          zkProof: result.zk_proof,
        });
      } else {
        console.error("ZK verification failed:", result);
        setVerificationStatus("error");
        setCurrentStep("idle");
        setErrorMessage(result.message || "Verification failed");
      }
    } catch (error) {
      console.error("ZK verification error:", error);
      setVerificationStatus("error");
      setCurrentStep("idle");
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

        {verificationStatus === "loading" && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-center mb-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <h4 className="font-medium text-blue-900">
                  Generating Zero-Knowledge Proof
                </h4>
              </div>

              <div className="space-y-2">
                {VERIFICATION_STEPS.map((step, index) => {
                  const isCurrentStep = currentStep === step.step;
                  const isCompleted =
                    VERIFICATION_STEPS.findIndex(
                      (s) => s.step === currentStep
                    ) > index;

                  return (
                    <div
                      key={step.step}
                      className={`flex items-center space-x-3 ${
                        isCurrentStep
                          ? "text-blue-600"
                          : isCompleted
                          ? "text-green-600"
                          : "text-gray-400"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isCurrentStep
                            ? "bg-blue-600 animate-pulse"
                            : isCompleted
                            ? "bg-green-600"
                            : "bg-gray-300"
                        }`}
                      ></div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span
                            className={`text-sm font-medium ${
                              isCurrentStep
                                ? "text-blue-900"
                                : isCompleted
                                ? "text-green-900"
                                : "text-gray-500"
                            }`}
                          >
                            {step.label}
                            {isCompleted && " ✓"}
                            {isCurrentStep && " ..."}
                          </span>
                        </div>
                        <p
                          className={`text-xs ${
                            isCurrentStep
                              ? "text-blue-600"
                              : isCompleted
                              ? "text-green-600"
                              : "text-gray-400"
                          }`}
                        >
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 text-xs text-blue-600">
                <p>
                  🔐 Your income amount remains completely private during this
                  process
                </p>
              </div>
            </div>
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
                <div className="flex items-center mb-3">
                  <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
                  <h4 className="font-medium text-green-900">
                    ZK Verification Complete
                  </h4>
                </div>

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
                    <div className="space-y-1">
                      <p className="text-xs text-green-600 italic">
                        {verificationData.privacy_note}
                      </p>
                      <p className="text-xs text-blue-600 font-medium">
                        ⚠️ Click "Save Profile" below to store this verification
                        to your profile
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    disabled={true}
                    className="w-full px-3 py-2 bg-gray-100 text-gray-500 rounded-md cursor-not-allowed text-sm"
                  >
                    ✓ Income Verified - Cannot Re-verify
                  </button>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Verification complete. Data will be saved when you submit
                    the form.
                  </p>
                </div>
              </div>
            )}

            {verificationStatus === "error" && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
                  <h4 className="font-medium text-red-900">
                    Verification Failed
                  </h4>
                </div>
                <p className="text-sm text-red-700 mb-3">{errorMessage}</p>
                <button
                  type="button"
                  onClick={handleVerifyIncome}
                  disabled={disabled}
                  className="w-full px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 text-sm"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
