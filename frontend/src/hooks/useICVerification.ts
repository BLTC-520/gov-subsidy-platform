import { useState, useCallback } from 'react';

interface ICVerificationData {
  citizenName: string;
  incomeBracket: string;
  verificationStatus: 'unverified' | 'loading' | 'verified' | 'error';
  zkProof?: any;
  errorMessage?: string;
}

interface ZKVerificationResult {
  success: boolean;
  citizen_name: string;
  income_bracket: string;
  verification_status: string;
  zk_proof: any;
  zk_verified: boolean;
  message: string;
  privacy_note: string;
  error?: string;
}

export function useICVerification() {
  const [verificationData, setVerificationData] = useState<ICVerificationData>({
    citizenName: '',
    incomeBracket: '',
    verificationStatus: 'unverified'
  });

  const verifyIC = useCallback(async (icNumber: string): Promise<ICVerificationData> => {
    // Reset and set loading state
    setVerificationData(prev => ({
      ...prev,
      verificationStatus: 'loading',
      errorMessage: undefined
    }));

    try {
      console.log('Starting IC verification for:', icNumber);

      const response = await fetch('http://localhost:3002/api/ic-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ic: icNumber }),
      });

      const result: ZKVerificationResult = await response.json();

      if (response.ok && result.success && result.zk_verified) {
        const successData: ICVerificationData = {
          citizenName: result.citizen_name,
          incomeBracket: result.income_bracket,
          verificationStatus: 'verified',
          zkProof: result.zk_proof
        };
        
        setVerificationData(successData);
        return successData;
      } else {
        const errorData: ICVerificationData = {
          citizenName: '',
          incomeBracket: '',
          verificationStatus: 'error',
          errorMessage: result.error || 'Verification failed'
        };
        
        setVerificationData(errorData);
        return errorData;
      }
    } catch (error) {
      const errorData: ICVerificationData = {
        citizenName: '',
        incomeBracket: '',
        verificationStatus: 'error',
        errorMessage: error instanceof Error ? error.message : 'Network error'
      };
      
      setVerificationData(errorData);
      return errorData;
    }
  }, []);

  const resetVerification = useCallback(() => {
    setVerificationData({
      citizenName: '',
      incomeBracket: '',
      verificationStatus: 'unverified'
    });
  }, []);

  return {
    verificationData,
    verifyIC,
    resetVerification,
    isLoading: verificationData.verificationStatus === 'loading',
    isVerified: verificationData.verificationStatus === 'verified',
    hasError: verificationData.verificationStatus === 'error'
  };
}