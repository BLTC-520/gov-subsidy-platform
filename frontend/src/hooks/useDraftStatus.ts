import { useCallback } from 'react';
import { useFormPersistence } from './useFormPersistence';
import { useProfile } from './useProfile';
import type { PersistedFormData } from './useFormPersistence';

export type ApplicationState = 'NEW' | 'DRAFT' | 'SUBMITTED';

// Define meaningful form fields for significance calculation (constant outside component)
const MEANINGFUL_FIELDS: (keyof PersistedFormData)[] = [
  'full_name',
  'nric',
  'date_of_birth',
  'gender', 
  'state',
  'monthly_income',
  'household_size',
  'number_of_children',
  'wallet_address',
  'zkVerificationData'
];

export interface DraftStatus {
  state: ApplicationState;
  completionPercentage: number;
  isSignificantDraft: boolean;
  hasSubmittedApplication: boolean;
  message: string;
  actionText: string;
  actionVariant: 'green' | 'blue' | 'gray';
}

/**
 * Professional draft status management hook
 * Provides clean separation between draft state and submitted application state
 */
export const useDraftStatus = (): DraftStatus & {
  clearDraft: () => void;
  getDraftFields: () => string[];
} => {
  const { profile } = useProfile();
  const { formData, hasPersistedData, clearPersistedData } = useFormPersistence();

  // Calculate draft completion percentage
  const calculateDraftCompletion = useCallback((): number => {
    if (!hasPersistedData()) return 0;

    const filledFields = MEANINGFUL_FIELDS.filter(field => {
      const value = formData[field];
      
      // Handle different field types
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

    return Math.round((filledFields.length / MEANINGFUL_FIELDS.length) * 100);
  }, [formData, hasPersistedData]);

  // Check if draft is significant enough to show "Continue"
  const isSignificantDraft = useCallback((): boolean => {
    const completion = calculateDraftCompletion();
    const filledCount = MEANINGFUL_FIELDS.filter(field => {
      const value = formData[field];
      return field === 'number_of_children' 
        ? (value !== null && value !== undefined)
        : !!value && (typeof value !== 'string' || value.trim().length > 0);
    }).length;

    // Significant if 30%+ complete OR 3+ meaningful fields filled
    return completion >= 30 || filledCount >= 3;
  }, [formData, calculateDraftCompletion]);

  // Check if user has submitted application (real database data)
  // Only meaningful fields count, not default values like disability_status: false
  const hasSubmittedApplication = useCallback((): boolean => {
    if (!profile) return false;
    
    // Only count fields that represent actual user input, not default values
    const meaningfulFields = [
      profile.full_name && profile.full_name.trim().length > 0,
      profile.date_of_birth && profile.date_of_birth.trim().length > 0,
      profile.gender && profile.gender.trim().length > 0,
      profile.state && profile.state.trim().length > 0,
      profile.household_size && profile.household_size > 0,
      profile.number_of_children !== null && profile.number_of_children !== undefined,
      profile.wallet_address && profile.wallet_address.trim().length > 0,
      profile.nric && profile.nric.trim().length > 0,
      profile.monthly_income && profile.monthly_income > 0
    ];
    
    // Only consider it submitted if at least 2 meaningful fields are filled
    const filledCount = meaningfulFields.filter(Boolean).length;
    return filledCount >= 2;
  }, [profile]);

  // Determine application state
  const getApplicationState = useCallback((): ApplicationState => {
    if (hasSubmittedApplication()) {
      return 'SUBMITTED';
    }
    if (hasPersistedData() && isSignificantDraft()) {
      return 'DRAFT';
    }
    return 'NEW';
  }, [hasSubmittedApplication, hasPersistedData, isSignificantDraft]);

  // Get appropriate messaging for current state
  const getStateMessage = useCallback((state: ApplicationState): { message: string; actionText: string; actionVariant: 'green' | 'blue' | 'gray' } => {
    switch (state) {
      case 'NEW':
        return {
          message: 'Begin your subsidy application process. Complete all required information to qualify.',
          actionText: 'Start Application',
          actionVariant: 'green'
        };
      case 'DRAFT': {
        const completion = calculateDraftCompletion();
        return {
          message: `You have an unsaved draft (${completion}% complete). Continue where you left off to complete your submission.`,
          actionText: 'Continue Draft',
          actionVariant: 'blue'
        };
      }
      case 'SUBMITTED':
        return {
          message: profile?.eligibility_score 
            ? 'Your application has been submitted and processed. View your profile for details.'
            : 'You have a saved application. Continue where you left off to complete your submission.',
          actionText: profile?.eligibility_score ? 'View Application' : 'Continue Application',
          actionVariant: profile?.eligibility_score ? 'gray' : 'blue'
        };
      default:
        return {
          message: 'Start your application process.',
          actionText: 'Start Application',
          actionVariant: 'green'
        };
    }
  }, [profile, calculateDraftCompletion]);

  // Get list of filled draft fields (for debugging/display)
  const getDraftFields = useCallback((): string[] => {
    return MEANINGFUL_FIELDS.filter(field => {
      const value = formData[field];
      return field === 'number_of_children' 
        ? (value !== null && value !== undefined)
        : !!value && (typeof value !== 'string' || value.trim().length > 0);
    }).map(field => String(field));
  }, [formData]);

  // Clear draft with confirmation
  const clearDraft = useCallback(() => {
    clearPersistedData();
  }, [clearPersistedData]);

  const state = getApplicationState();
  const { message, actionText, actionVariant } = getStateMessage(state);
  const completionPercentage = calculateDraftCompletion();

  // Debug logging for troubleshooting
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Draft Status Debug:', {
      state,
      hasSubmitted: hasSubmittedApplication(),
      hasDraft: hasPersistedData(),
      isDraftSignificant: isSignificantDraft(),
      draftCompletion: completionPercentage,
      profileFields: profile ? Object.keys(profile).filter(key => profile[key as keyof typeof profile]) : [],
      draftFields: getDraftFields()
    });
  }

  return {
    state,
    completionPercentage,
    isSignificantDraft: isSignificantDraft(),
    hasSubmittedApplication: hasSubmittedApplication(),
    message,
    actionText,
    actionVariant,
    clearDraft,
    getDraftFields
  };
};