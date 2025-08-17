import React, { useState, useEffect } from 'react';
import { CitizenLayout } from '../components/common/CitizenLayout';
import { CountdownTimer } from '../components/common/CountdownTimer';
import { IncomeVerificationField } from '../components/zk/IncomeVerificationField';
import { useDeadlineStatus } from '../hooks/useDeadlineStatus';
import { useProfile } from '../hooks/useProfile';
import { useICVerification } from '../hooks/useICVerification';
import type { ProfileFormData } from '../hooks/useProfile';

const MALAYSIAN_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan',
  'Pahang', 'Pulau Pinang', 'Perak', 'Perlis', 'Sabah',
  'Sarawak', 'Selangor', 'Terengganu', 'Kuala Lumpur',
  'Labuan', 'Putrajaya'
];

const GENDER_OPTIONS = ['Male', 'Female'];

export default function CitizenProfilePage() {
  const { profile, loading, error, updateProfile, validateFormData } = useProfile();
  const { isExpired, deadline } = useDeadlineStatus();
  const { verificationData, lookupCitizenName } = useICVerification();
  const [formData, setFormData] = useState<ProfileFormData>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [realTimeExpired, setRealTimeExpired] = useState(false);
  const [icNumber, setIcNumber] = useState('');

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        wallet_address: profile.wallet_address || '',
        full_name: profile.full_name || '',
        date_of_birth: profile.date_of_birth || '',
        gender: profile.gender || '',
        monthly_income: profile.monthly_income || undefined,
        household_size: profile.household_size || undefined,
        number_of_children: profile.number_of_children || undefined,
        disability_status: profile.disability_status || false,
        state: profile.state || ''
      });
    }
  }, [profile]);

  // Auto-lookup citizen name when IC is entered
  useEffect(() => {
    if (icNumber && icNumber.length >= 12 && !verificationData.citizenName) {
      // Debounce name lookup
      const timer = setTimeout(() => {
        lookupCitizenName(icNumber);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [icNumber, lookupCitizenName, verificationData.citizenName]);

  // Update form data when citizen name is found
  useEffect(() => {
    if (verificationData.citizenName) {
      setFormData(prev => ({
        ...prev,
        full_name: verificationData.citizenName
      }));
    }
  }, [verificationData.citizenName]);

  // Real-time deadline checking
  useEffect(() => {
    if (!deadline) {
      setRealTimeExpired(false);
      return;
    }

    const checkDeadline = () => {
      const now = new Date();
      const deadlineDate = new Date(deadline);
      const expired = now > deadlineDate;
      setRealTimeExpired(expired);
    };

    // Check immediately
    checkDeadline();
    
    // Check every 10 seconds for real-time updates
    const interval = setInterval(checkDeadline, 10000);

    return () => clearInterval(interval);
  }, [deadline]);

  const handleInputChange = (field: keyof ProfileFormData, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation errors when user starts typing
    setValidationErrors([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formExpired = isExpired || realTimeExpired;
    if (formExpired) {
      alert('The application deadline has passed. You can no longer submit changes.');
      return;
    }

    // Validate form data
    const errors = validateFormData(formData);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    try {
      const success = await updateProfile(formData);
      
      if (success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <CitizenLayout title="Profile">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-300 rounded w-1/3"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-300 rounded w-full"></div>
                <div className="h-10 bg-gray-300 rounded w-full"></div>
                <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                <div className="h-10 bg-gray-300 rounded w-full"></div>
              </div>
            </div>
          </div>
        </div>
      </CitizenLayout>
    );
  }

  return (
    <CitizenLayout title="Application Form">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Deadline Timer */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Application Status</h2>
            <CountdownTimer size="md" />
          </div>
          {(isExpired || realTimeExpired) && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">
                The application deadline has passed. Your profile is now read-only.
              </p>
            </div>
          )}
        </div>

        {/* Profile Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Personal Information</h2>
            {profile?.eligibility_score && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Eligibility Score: </span>
                <span className="text-green-600 font-bold">{profile.eligibility_score}</span>
              </div>
            )}
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700 font-medium">Please fix the following errors:</p>
              <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {saveSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <svg className="h-4 w-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm text-green-700">Profile updated successfully!</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Details */}
            {/* IC Number Input (New Field) */}
            <div className="mb-6">
              <label htmlFor="ic_number" className="block text-sm font-medium text-gray-700 mb-2">
                Malaysian IC Number *
              </label>
              <input
                type="text"
                id="ic_number"
                value={icNumber}
                onChange={(e) => setIcNumber(e.target.value)}
                disabled={isExpired || realTimeExpired}
                placeholder="030520-01-2185"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter your IC number to automatically verify your income bracket using zero-knowledge proofs
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="full_name"
                  value={formData.full_name || ''}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  disabled={isExpired || realTimeExpired || !!verificationData.citizenName}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required
                />
                {verificationData.citizenName && (
                  <p className="mt-1 text-xs text-green-600">
                    ✓ Auto-filled from IC lookup
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  id="date_of_birth"
                  value={formData.date_of_birth || ''}
                  onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                  disabled={isExpired || realTimeExpired}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required
                />
              </div>

              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                  Gender *
                </label>
                <select
                  id="gender"
                  value={formData.gender || ''}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  disabled={isExpired || realTimeExpired}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required
                >
                  <option value="">Select Gender</option>
                  {GENDER_OPTIONS.map(gender => (
                    <option key={gender} value={gender}>{gender}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                  State *
                </label>
                <select
                  id="state"
                  value={formData.state || ''}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  disabled={isExpired || realTimeExpired}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required
                >
                  <option value="">Select State</option>
                  {MALAYSIAN_STATES.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ZK Income Verification */}
            <IncomeVerificationField
              icNumber={icNumber}
              onVerificationComplete={(data) => {
                // Store the verification result but don't expose actual income
                console.log('Income verification completed:', data);
              }}
              disabled={isExpired || realTimeExpired}
            />

            {/* Financial Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div>
                <label htmlFor="household_size" className="block text-sm font-medium text-gray-700 mb-2">
                  Household Size *
                </label>
                <input
                  type="number"
                  id="household_size"
                  value={formData.household_size || ''}
                  onChange={(e) => handleInputChange('household_size', parseInt(e.target.value))}
                  disabled={isExpired || realTimeExpired}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  min="1"
                  required
                />
              </div>

              <div>
                <label htmlFor="number_of_children" className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Children *
                </label>
                <input
                  type="number"
                  id="number_of_children"
                  value={formData.number_of_children || ''}
                  onChange={(e) => handleInputChange('number_of_children', parseInt(e.target.value))}
                  disabled={isExpired || realTimeExpired}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  min="0"
                  required
                />
              </div>
            </div>

            {/* Disability Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="disability_status"
                checked={formData.disability_status || false}
                onChange={(e) => handleInputChange('disability_status', e.target.checked)}
                disabled={isExpired}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
              />
              <label htmlFor="disability_status" className="ml-2 block text-sm text-gray-900">
                I have a disability status
              </label>
            </div>

            {/* Wallet Address */}
            <div>
              <label htmlFor="wallet_address" className="block text-sm font-medium text-gray-700 mb-2">
                Ethereum Wallet Address *
              </label>
              <input
                type="text"
                id="wallet_address"
                value={formData.wallet_address || ''}
                onChange={(e) => handleInputChange('wallet_address', e.target.value)}
                disabled={isExpired}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="0x..."
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter your Ethereum wallet address to receive subsidy payments
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving || isExpired || realTimeExpired}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </CitizenLayout>
  );
}