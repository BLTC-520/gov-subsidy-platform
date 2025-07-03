import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  email: string;
  is_admin: boolean;
  wallet_address: string | null;
  full_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  monthly_income: number | null;
  household_size: number | null;
  number_of_children: number | null;
  disability_status: boolean | null;
  state: string | null;
  eligibility_score: number | null;
  created_at: string;
}

export interface ProfileFormData {
  wallet_address?: string;
  full_name?: string;
  date_of_birth?: string;
  gender?: string;
  monthly_income?: number;
  household_size?: number;
  number_of_children?: number;
  disability_status?: boolean;
  state?: string;
}

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load current user's profile
  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error:', userError);
        throw new Error('Authentication failed');
      }
      
      if (!user) {
        throw new Error('No authenticated user');
      }

      console.log('Loading profile for user:', user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Profile query error:', error);
        throw error;
      }

      console.log('Profile loaded successfully:', data);
      setProfile(data);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  // Update profile data
  const updateProfile = async (formData: ProfileFormData) => {
    try {
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error:', userError);
        throw new Error('Authentication failed');
      }
      
      if (!user) {
        throw new Error('No authenticated user');
      }

      console.log('Updating profile for user:', user.id, 'with data:', formData);

      const { data, error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }

      console.log('Profile updated successfully:', data);
      setProfile(data);
      return true;
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      return false;
    }
  };

  // Validate Ethereum address
  const validateEthereumAddress = (address: string): boolean => {
    const ethRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethRegex.test(address);
  };

  // Validate form data
  const validateFormData = (formData: ProfileFormData): string[] => {
    const errors: string[] = [];

    if (formData.wallet_address && !validateEthereumAddress(formData.wallet_address)) {
      errors.push('Invalid Ethereum address format');
    }

    if (formData.monthly_income !== undefined && formData.monthly_income <= 0) {
      errors.push('Monthly income must be a positive number');
    }

    if (formData.household_size !== undefined && formData.household_size < 1) {
      errors.push('Household size must be at least 1');
    }

    if (formData.number_of_children !== undefined && formData.number_of_children < 0) {
      errors.push('Number of children cannot be negative');
    }

    if (formData.date_of_birth) {
      const birthDate = new Date(formData.date_of_birth);
      const now = new Date();
      const age = now.getFullYear() - birthDate.getFullYear();
      
      if (age < 18 || age > 120) {
        errors.push('Age must be between 18 and 120 years');
      }
    }

    return errors;
  };

  // Check if profile is complete
  const isProfileComplete = (): boolean => {
    if (!profile) return false;

    const requiredFields = [
      'full_name',
      'date_of_birth',
      'gender',
      'monthly_income',
      'household_size',
      'number_of_children',
      'state',
      'wallet_address'
    ];

    return requiredFields.every(field => 
      profile[field as keyof Profile] !== null && 
      profile[field as keyof Profile] !== undefined &&
      profile[field as keyof Profile] !== ''
    );
  };

  // Check if user is admin
  const isAdmin = (): boolean => {
    return profile?.is_admin === true || String(profile?.is_admin) === 'true';
  };

  useEffect(() => {
    loadProfile();
  }, []);

  return {
    profile,
    loading,
    error,
    updateProfile,
    validateFormData,
    validateEthereumAddress,
    isProfileComplete,
    isAdmin,
    refreshProfile: loadProfile
  };
};