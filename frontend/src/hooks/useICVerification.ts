import { useState, useCallback } from 'react';

interface ZKProof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  public_signals: string[];
}

interface ZKProof {
  proof: string;
  publicSignals: string[];
}

interface ICVerificationData {
  citizenName: string;
  incomeBracket: string;
  verificationStatus: 'unverified' | 'loading' | 'verified' | 'error';
  zkProof?: ZKProof;
  errorMessage?: string;
}

interface ZKVerificationResult {
  success: boolean;
  citizen_name: string;
  income_bracket: string;
  verification_status: string;
  zk_proof: ZKProof;
  zk_verified: boolean;
  zk_flags: number[];
  is_signature_valid: boolean;
  is_data_authentic: boolean;
  message: string;
  privacy_note: string;
  note: string;
  error?: string;
}

export function useICVerification() {
  const [verificationData, setVerificationData] = useState<ICVerificationData>({
    citizenName: '',
    incomeBracket: '',
    verificationStatus: 'unverified'
  });

  // Simple name lookup (no ZK verification)
  const lookupCitizenName = useCallback(async (icNumber: string): Promise<string> => {
    try {
      console.log('Looking up citizen name for IC:', icNumber);

      const response = await fetch('http://localhost:3002/api/lookup-citizen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ic: icNumber }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Update only the citizen name, keep verification status as unverified
        setVerificationData(prev => ({
          ...prev,
          citizenName: result.citizen_name
        }));
        return result.citizen_name;
      } else {
        console.log('Citizen not found in database');
        return '';
      }
    } catch (error) {
      console.log('Error looking up citizen:', error);
      return '';
    }
  }, []);

  const verifyIC = useCallback(async (icNumber: string): Promise<ICVerificationData> => {
    // Reset and set loading state
    setVerificationData(prev => ({
      ...prev,
      verificationStatus: 'loading',
      errorMessage: undefined
    }));

    try {
      console.log('Starting IC verification for:', icNumber);

      // Call ZK verification endpoint to generate proof (NO database storage)
      const zkResponse = await fetch('http://localhost:3002/api/ic-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ic: icNumber }),
      });

      const zkResult: ZKVerificationResult = await zkResponse.json();

      if (!zkResponse.ok || !zkResult.success || !zkResult.zk_verified) {
        const errorData: ICVerificationData = {
          citizenName: zkResult.citizen_name || '',
          incomeBracket: '',
          verificationStatus: 'error',
          errorMessage: zkResult.error || 'ZK verification failed'
        };

        setVerificationData(errorData);
        return errorData;
      }

      console.log('✅ ZK proof generated successfully (stored in memory only)');
      console.log('ZK verification note:', zkResult.note);

      // Return success data with ZK proof stored in memory
      const successData: ICVerificationData = {
        citizenName: zkResult.citizen_name,
        incomeBracket: zkResult.income_bracket,
        verificationStatus: 'verified',
        zkProof: zkResult.zk_proof
      };

      setVerificationData(successData);
      return successData;

    } catch (error) {
      console.error('IC verification error:', error);
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
    lookupCitizenName,
    resetVerification,
    isLoading: verificationData.verificationStatus === 'loading',
    isVerified: verificationData.verificationStatus === 'verified',
    hasError: verificationData.verificationStatus === 'error'
  };
}