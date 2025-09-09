import { useState, useEffect, useCallback } from 'react';

export interface PersistedFormData {
  // Personal Information
  nric?: string;
  full_name?: string;
  date_of_birth?: string;
  gender?: string;
  state?: string;

  // Financial Information
  monthly_income?: number;
  household_size?: number;
  number_of_children?: number;
  disability_status?: boolean;

  // Wallet Information
  wallet_address?: string;

  // ZK Verification Data
  zkVerificationData?: {
    incomeBracket: string;
    citizenName: string;
    verified: boolean;
    zkFlags: number[];
    isSignatureValid: boolean;
    isDataAuthentic: boolean;
    zkProof: Record<string, unknown>;
  } | null;
}

const STORAGE_KEY = 'citizen_form_data';
const STORAGE_EXPIRY_KEY = 'citizen_form_data_expiry';
const EXPIRY_HOURS = 24; // Data expires after 24 hours

export const useFormPersistence = () => {
  const [formData, setFormData] = useState<PersistedFormData>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data from session storage on mount
  useEffect(() => {
    const loadPersistedData = () => {
      try {
        const storedData = sessionStorage.getItem(STORAGE_KEY);
        const storedExpiry = sessionStorage.getItem(STORAGE_EXPIRY_KEY);

        if (storedData && storedExpiry) {
          const expiryTime = parseInt(storedExpiry, 10);
          const currentTime = Date.now();

          // Check if data has expired
          if (currentTime < expiryTime) {
            const parsedData = JSON.parse(storedData);
            setFormData(parsedData);
            console.log('✅ Loaded persisted form data:', parsedData);
          } else {
            // Data expired, clear it
            sessionStorage.removeItem(STORAGE_KEY);
            sessionStorage.removeItem(STORAGE_EXPIRY_KEY);
            console.log('Persisted form data expired, cleared');
          }
        }
      } catch (error) {
        console.error('Error loading persisted form data:', error);
        // Clear corrupted data
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_EXPIRY_KEY);
      } finally {
        setIsLoaded(true);
      }
    };

    loadPersistedData();
  }, []);

  // Save data to session storage
  const persistFormData = useCallback((data: PersistedFormData) => {
    try {
      const expiryTime = Date.now() + (EXPIRY_HOURS * 60 * 60 * 1000);

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      sessionStorage.setItem(STORAGE_EXPIRY_KEY, expiryTime.toString());

      setFormData(data);
      console.log('💾 Persisted form data:', data);
    } catch (error) {
      console.error('Error persisting form data:', error);
    }
  }, []);

  // Update specific field
  const updateField = useCallback((field: keyof PersistedFormData, value: unknown) => {
    const updatedData = {
      ...formData,
      [field]: value,
    };
    persistFormData(updatedData);
  }, [formData, persistFormData]);

  // Clear persisted data
  const clearPersistedData = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_EXPIRY_KEY);
      setFormData({});
      console.log('🗑️ Cleared persisted form data');
    } catch (error) {
      console.error('Error clearing persisted form data:', error);
    }
  }, []);

  // Get specific field value
  const getFieldValue = useCallback((field: keyof PersistedFormData) => {
    return formData[field];
  }, [formData]);

  // Check if form has any persisted data
  const hasPersistedData = useCallback(() => {
    return Object.keys(formData).length > 0;
  }, [formData]);

  // Get completion percentage for current draft
  const getDraftCompletion = useCallback(() => {
    if (!hasPersistedData()) return 0;
    
    const meaningfulFields: (keyof PersistedFormData)[] = [
      'full_name', 'nric', 'date_of_birth', 'gender', 'state', 
      'monthly_income', 'household_size', 'number_of_children', 
      'wallet_address', 'zkVerificationData'
    ];

    const filledFields = meaningfulFields.filter(field => {
      const value = formData[field];
      
      if (field === 'number_of_children') {
        return value !== null && value !== undefined;
      }
      if (field === 'zkVerificationData') {
        return value && typeof value === 'object' && value.verified;
      }
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      if (typeof value === 'number') {
        return value > 0;
      }
      
      return !!value;
    });

    return Math.round((filledFields.length / meaningfulFields.length) * 100);
  }, [formData, hasPersistedData]);

  // Check if current draft is significant enough to show "Continue" 
  const isDraftSignificant = useCallback(() => {
    const completion = getDraftCompletion();
    const meaningfulFields = ['full_name', 'nric', 'date_of_birth', 'gender', 'state'];
    const filledCount = meaningfulFields.filter(field => {
      const value = formData[field as keyof PersistedFormData];
      return value && typeof value === 'string' && value.trim().length > 0;
    }).length;
    
    // Significant if 30%+ complete OR 3+ meaningful fields filled
    return completion >= 30 || filledCount >= 3;
  }, [formData, getDraftCompletion]);

  // Get draft summary for user display
  const getDraftSummary = useCallback(() => {
    const completion = getDraftCompletion();
    const hasName = formData.full_name && formData.full_name.trim().length > 0;
    const hasIC = formData.nric && formData.nric.trim().length > 0;
    const hasZK = formData.zkVerificationData && formData.zkVerificationData.verified;
    
    return {
      completion,
      hasName,
      hasIC,
      hasZK,
      isSignificant: isDraftSignificant(),
      fieldCount: Object.keys(formData).filter(key => {
        const value = formData[key as keyof PersistedFormData];
        return value !== null && value !== undefined && value !== '';
      }).length
    };
  }, [formData, getDraftCompletion, isDraftSignificant]);

  return {
    formData,
    isLoaded,
    persistFormData,
    updateField,
    clearPersistedData,
    getFieldValue,
    hasPersistedData,
    getDraftCompletion,
    isDraftSignificant,
    getDraftSummary,
  };
};