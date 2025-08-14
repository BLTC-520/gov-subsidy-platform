import { useState } from 'react';
import { ZKVerificationBadge } from './ZKVerificationBadge';
import ZKProofExplainer from './ZKProofExplainer';
import ZKProcessFlow from './ZKProcessFlow';

interface IncomeVerificationFieldProps {
  icNumber: string;
  onVerificationComplete: (data: {
    incomeBracket: string;
    citizenName: string;
    verified: boolean;
  }) => void;
  disabled?: boolean;
}

interface ZKVerificationResult {
  success: boolean;
  citizen_name: string;
  income_bracket: string;
  verification_status: string;
  zk_proof: any;
  message: string;
  privacy_note: string;
}

export function IncomeVerificationField({ 
  icNumber, 
  onVerificationComplete, 
  disabled = false 
}: IncomeVerificationFieldProps) {
  const [verificationStatus, setVerificationStatus] = useState<'unverified' | 'loading' | 'verified' | 'error'>('unverified');
  const [verificationData, setVerificationData] = useState<ZKVerificationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [showProcessFlow, setShowProcessFlow] = useState<boolean>(false);

  const handleVerifyIncome = async () => {
    if (!icNumber || icNumber.length < 10) {
      setErrorMessage('Please enter a valid IC number first');
      return;
    }

    setVerificationStatus('loading');
    setErrorMessage('');

    try {
      console.log('Starting ZK verification for IC:', icNumber);
      
      const response = await fetch('http://localhost:3002/api/ic-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ic: icNumber })
      });

      const result: ZKVerificationResult = await response.json();
      
      if (response.ok && result.success) {
        console.log('ZK verification successful:', result);
        setVerificationData(result);
        setVerificationStatus('verified');
        
        // Notify parent component
        onVerificationComplete({
          incomeBracket: result.income_bracket,
          citizenName: result.citizen_name,
          verified: true
        });
      } else {
        console.error('ZK verification failed:', result);
        setVerificationStatus('error');
        setErrorMessage(result.message || 'Verification failed');
      }
    } catch (error) {
      console.error('ZK verification error:', error);
      setVerificationStatus('error');
      setErrorMessage('Network error during verification');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Monthly Income Verification *
        </label>
        
        {verificationStatus === 'unverified' && (
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
              Click to securely verify your income bracket without revealing your actual salary amount
            </p>
          </div>
        )}

        {verificationStatus !== 'unverified' && (
          <div className="space-y-3">
            <ZKVerificationBadge 
              status={verificationStatus} 
              incomeBracket={verificationData?.income_bracket}
              className="w-full justify-center"
            />
            
            {verificationStatus === 'verified' && verificationData && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Citizen Name:</span>
                    <span className="font-medium text-gray-900">{verificationData.citizen_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Income Bracket:</span>
                    <span className="font-bold text-green-700">{verificationData.income_bracket}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Verification:</span>
                    <span className="font-medium text-green-700">ZK-SNARK Proven ✓</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-xs text-green-600 italic">
                      {verificationData.privacy_note}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {verificationStatus === 'error' && (
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

      {/* Educational ZK explanations */}
      {verificationStatus === 'verified' && verificationData?.zk_proof && (
        <div className="space-y-4 border-t border-gray-200 pt-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              🎓 Understanding Zero-Knowledge Proofs
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Learn how we verified your income bracket without seeing your actual salary!
            </p>
          </div>

          {/* Toggle buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => {
                setShowProcessFlow(!showProcessFlow);
                setShowTechnicalDetails(false);
              }}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                showProcessFlow 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {showProcessFlow ? '✓ ' : ''}How It Works (Step-by-Step)
            </button>
            
            <button
              onClick={() => {
                setShowTechnicalDetails(!showTechnicalDetails);
                setShowProcessFlow(false);
              }}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                showTechnicalDetails 
                  ? 'bg-green-600 text-white' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {showTechnicalDetails ? '✓ ' : ''}Technical Details (π_a, π_b, π_c)
            </button>
          </div>

          {/* Educational content */}
          {showProcessFlow && (
            <ZKProcessFlow className="animate-in slide-in-from-top-2 duration-300" />
          )}
          
          <ZKProofExplainer
            proof={verificationData.zk_proof}
            isVisible={showTechnicalDetails}
          />

          {(showProcessFlow || showTechnicalDetails) && (
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setShowProcessFlow(false);
                  setShowTechnicalDetails(false);
                }}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Hide Educational Content
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}