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

  return {
    formData,
    isLoaded,
    persistFormData,
    updateField,
    clearPersistedData,
    getFieldValue,
    hasPersistedData,
  };
};