import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CitizenPortalLayout } from "../components/common/CitizenPortalLayout";
import { CountdownTimer } from "../components/common/CountdownTimer";
import { IncomeVerificationField } from "../components/zk/IncomeVerificationField";
import { useDeadlineStatus } from "../hooks/useDeadlineStatus";
import { useProfile } from "../hooks/useProfile";
import { useICVerification } from "../hooks/useICVerification";
import { useFormPersistence } from "../hooks/useFormPersistence";
import type { ProfileFormData } from "../hooks/useProfile";

const MALAYSIAN_STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Pulau Pinang",
  "Perak",
  "Perlis",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "Kuala Lumpur",
  "Labuan",
  "Putrajaya",
];

const GENDER_OPTIONS = ["Male", "Female"];

export default function CitizenProfilePage() {
  const { profile, loading, error, updateProfile, validateFormData } =
    useProfile();
  const { isExpired, deadline } = useDeadlineStatus();
  const { verificationData, lookupCitizenName } = useICVerification();
  const {
    formData: persistedFormData,
    isLoaded: persistenceLoaded,
    updateField,
    clearPersistedData,
    hasPersistedData,
  } = useFormPersistence();

  const [formData, setFormData] = useState<ProfileFormData>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dataRestored, setDataRestored] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [realTimeExpired, setRealTimeExpired] = useState(false);
  const [icNumber, setIcNumber] = useState("");
  const [zkVerificationData, setZkVerificationData] = useState<{
    incomeBracket: string;
    citizenName: string;
    verified: boolean;
    zkFlags: number[];
    isSignatureValid: boolean;
    isDataAuthentic: boolean;
    zkProof: Record<string, unknown>;
  } | null>(null);

  // Initialize form data when profile loads or persisted data is available
  useEffect(() => {
    if (persistenceLoaded) {
      // Priority: persisted data > profile data > defaults
      const initialData = {
        nric: persistedFormData.nric || profile?.nric || "",
        wallet_address:
          persistedFormData.wallet_address || profile?.wallet_address || "",
        full_name: persistedFormData.full_name || profile?.full_name || "",
        date_of_birth:
          persistedFormData.date_of_birth || profile?.date_of_birth || "",
        gender: persistedFormData.gender || profile?.gender || "",
        monthly_income:
          persistedFormData.monthly_income ||
          profile?.monthly_income ||
          undefined,
        household_size:
          persistedFormData.household_size ||
          profile?.household_size ||
          undefined,
        number_of_children:
          persistedFormData.number_of_children ??
          profile?.number_of_children ??
          undefined,
        disability_status:
          persistedFormData.disability_status ??
          profile?.disability_status ??
          false,
        state: persistedFormData.state || profile?.state || "",
      };

      setFormData(initialData);

      // Also restore IC number and ZK verification data if available
      if (persistedFormData.nric) {
        setIcNumber(persistedFormData.nric);
      }

      if (persistedFormData.zkVerificationData) {
        setZkVerificationData(persistedFormData.zkVerificationData);
      }

      // Show notification if persisted data was loaded
      if (hasPersistedData()) {
        console.log("Restored form data from previous session");
        setDataRestored(true);
        setTimeout(() => setDataRestored(false), 5000);
      }
    }
  }, [profile, persistedFormData, persistenceLoaded, hasPersistedData]);

  // Auto-save form data when user navigates away
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only persist if there's unsaved data
      if (
        formData &&
        Object.keys(formData).some(
          (key) => formData[key as keyof ProfileFormData]
        )
      ) {
        // Update all form data at once before leaving
        const allFormData = {
          ...formData,
          nric: icNumber,
          zkVerificationData: zkVerificationData,
        };

        try {
          const expiryTime = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
          sessionStorage.setItem(
            "citizen_form_data",
            JSON.stringify(allFormData)
          );
          sessionStorage.setItem(
            "citizen_form_data_expiry",
            expiryTime.toString()
          );
        } catch (error) {
          console.error("Error auto-saving form data:", error);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [formData, icNumber, zkVerificationData]);

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
      setFormData((prev) => ({
        ...prev,
        full_name: verificationData.citizenName,
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

  const handleInputChange = (
    field: keyof ProfileFormData,
    value: string | number | boolean
  ) => {
    const updatedFormData = {
      ...formData,
      [field]: value,
    };

    setFormData(updatedFormData);

    // Persist the updated form data
    updateField(field, value);

    // Clear validation errors when user starts typing
    setValidationErrors([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formExpired = isExpired || realTimeExpired;
    if (formExpired) {
      alert(
        "The application deadline has passed. You can no longer submit changes."
      );
      return;
    }

    // Validate form data
    const errors = validateFormData(formData);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Ensure ZK verification is completed before saving
    if (!zkVerificationData || !zkVerificationData.verified) {
      setValidationErrors([
        "Please complete income verification with ZK-SNARK before saving",
      ]);
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    try {
      // Include IC number in form data before submission
      const completeFormData = {
        ...formData,
        nric: icNumber,
      };

      // Update profile with ZK data included
      const success = await updateProfile(completeFormData, zkVerificationData);

      if (success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);

        // Show success alert to user
        alert("Application submitted successfully! 🎉");

        // Clear persisted data after successful submission
        clearPersistedData();
      }
    } catch (err) {
      console.error("Error saving profile:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <CitizenPortalLayout title="Application Form">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Loading Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-sm p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-300 rounded-lg w-1/3"></div>
                <div className="h-4 bg-gray-300 rounded w-2/3"></div>
              </div>
            </div>

            {/* Loading Form */}
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <div className="animate-pulse space-y-6">
                <div className="h-6 bg-gray-300 rounded w-1/4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="space-y-3">
                      <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                      <div className="h-12 bg-gray-300 rounded-lg"></div>
                    </div>
                  ))}
                </div>
                <div className="h-16 bg-gray-300 rounded-lg"></div>
                <div className="flex justify-end">
                  <div className="h-12 w-32 bg-gray-300 rounded-lg"></div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </CitizenPortalLayout>
    );
  }

  return (
    <CitizenPortalLayout title="Subsidy Application">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent"></div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="mb-4 md:mb-0">
                <h1 className="text-3xl font-bold mb-2">
                  Government Subsidy Application
                </h1>
                <p className="text-blue-100 text-lg">
                  Complete your profile to apply for financial assistance
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <CountdownTimer size="lg" />
              </div>
            </div>

            {(isExpired || realTimeExpired) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 p-4 bg-red-500/20 border border-red-300/30 rounded-xl backdrop-blur-sm"
              >
                <div className="flex items-center">
                  <svg
                    className="h-5 w-5 text-red-200 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-red-100 font-medium">
                    Application deadline has passed. Your profile is now
                    read-only.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Application Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Application Status
              </h3>
              <p className="text-sm text-gray-600">
                Complete all sections to submit your application
              </p>
            </div>
            {profile?.eligibility_score && (
              <div className="flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-full">
                <svg
                  className="h-4 w-4 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-medium text-green-800">
                  Eligibility Score: {profile.eligibility_score}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Profile Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Personal Information
            </h2>
            <p className="text-gray-600">
              Please provide accurate information for your subsidy application
            </p>
          </div>

          <div className="p-8">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl"
                >
                  <div className="flex items-center">
                    <svg
                      className="h-5 w-5 text-red-500 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                </motion.div>
              )}

              {validationErrors.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl"
                >
                  <div className="flex items-start">
                    <svg
                      className="h-5 w-5 text-red-500 mr-3 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm text-red-700 font-medium mb-2">
                        Please fix the following errors:
                      </p>
                      <ul className="text-sm text-red-600 space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index} className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></span>
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}

              {dataRestored && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg
                        className="h-5 w-5 text-blue-500 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      <div>
                        <p className="text-sm text-blue-700 font-medium">
                          Form data restored
                        </p>
                        <p className="text-xs text-blue-600">
                          Your previous session data has been recovered
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            "Are you sure you want to clear all saved form data? This will remove any unsaved changes."
                          )
                        ) {
                          clearPersistedData();
                          setDataRestored(false);
                          if (profile) {
                            setFormData({
                              nric: profile.nric || "",
                              wallet_address: profile.wallet_address || "",
                              full_name: profile.full_name || "",
                              date_of_birth: profile.date_of_birth || "",
                              gender: profile.gender || "",
                              monthly_income:
                                profile.monthly_income || undefined,
                              household_size:
                                profile.household_size || undefined,
                              number_of_children:
                                profile.number_of_children || undefined,
                              disability_status:
                                profile.disability_status || false,
                              state: profile.state || "",
                            });
                            setIcNumber("");
                            setZkVerificationData(null);
                          }
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium px-3 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Clear Data
                    </button>
                  </div>
                </motion.div>
              )}

              {saveSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl"
                >
                  <div className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-500 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <div>
                      <p className="text-sm text-green-700 font-medium">
                        Profile updated successfully!
                      </p>
                      <p className="text-xs text-green-600">
                        Your application has been saved and processed
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Section 1: Identity Verification */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                    <span className="text-sm font-semibold text-blue-600">
                      1
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Identity Verification
                  </h3>
                </div>

                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <label
                    htmlFor="ic_number"
                    className="block text-sm font-semibold text-gray-800 mb-3"
                  >
                    Malaysian IC Number *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="ic_number"
                      value={icNumber}
                      onChange={(e) => {
                        setIcNumber(e.target.value);
                        updateField("nric", e.target.value);
                      }}
                      disabled={isExpired || realTimeExpired}
                      placeholder="030520-01-2185"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200 text-lg font-mono"
                      required
                    />
                    {icNumber && icNumber.length >= 12 && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <svg
                          className="h-5 w-5 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-600 flex items-center">
                    <svg
                      className="h-4 w-4 text-blue-500 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    Secure verification using zero-knowledge proofs
                  </p>
                </div>
              </motion.div>

              {/* Section 2: Personal Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-6"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                    <span className="text-sm font-semibold text-green-600">
                      2
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Personal Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="full_name"
                      className="block text-sm font-semibold text-gray-800"
                    >
                      Full Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="full_name"
                        value={formData.full_name || ""}
                        onChange={(e) =>
                          handleInputChange("full_name", e.target.value)
                        }
                        disabled={
                          isExpired ||
                          realTimeExpired ||
                          !!verificationData.citizenName
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200"
                        placeholder="Enter your full name"
                        required
                      />
                      {verificationData.citizenName && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <svg
                            className="h-5 w-5 text-green-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    {verificationData.citizenName && (
                      <p className="text-xs text-green-600 flex items-center">
                        <svg
                          className="h-3 w-3 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Auto-filled from IC verification
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="date_of_birth"
                      className="block text-sm font-semibold text-gray-800"
                    >
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      id="date_of_birth"
                      value={formData.date_of_birth || ""}
                      onChange={(e) =>
                        handleInputChange("date_of_birth", e.target.value)
                      }
                      disabled={isExpired || realTimeExpired}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="gender"
                      className="block text-sm font-semibold text-gray-800"
                    >
                      Gender *
                    </label>
                    <select
                      id="gender"
                      value={formData.gender || ""}
                      onChange={(e) =>
                        handleInputChange("gender", e.target.value)
                      }
                      disabled={isExpired || realTimeExpired}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200 appearance-none bg-white"
                      required
                    >
                      <option value="">Select Gender</option>
                      {GENDER_OPTIONS.map((gender) => (
                        <option key={gender} value={gender}>
                          {gender}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="state"
                      className="block text-sm font-semibold text-gray-800"
                    >
                      State *
                    </label>
                    <select
                      id="state"
                      value={formData.state || ""}
                      onChange={(e) =>
                        handleInputChange("state", e.target.value)
                      }
                      disabled={isExpired || realTimeExpired}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200 appearance-none bg-white"
                      required
                    >
                      <option value="">Select State</option>
                      {MALAYSIAN_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>

              {/* Section 3: Income Verification */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-6"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full">
                    <span className="text-sm font-semibold text-purple-600">
                      3
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Income Verification
                  </h3>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
                  <IncomeVerificationField
                    icNumber={icNumber}
                    onVerificationComplete={(data) => {
                      console.log("Income verification completed:", data);
                      setZkVerificationData(data);
                      updateField("zkVerificationData", data);
                      setFormData((prev) => ({
                        ...prev,
                        monthly_income: undefined, // Keep income private
                      }));
                    }}
                    disabled={isExpired || realTimeExpired}
                  />
                </div>
              </motion.div>

              {/* Section 4: Household Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-6"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full">
                    <span className="text-sm font-semibold text-orange-600">
                      4
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Household Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="household_size"
                      className="block text-sm font-semibold text-gray-800"
                    >
                      Household Size *
                    </label>
                    <input
                      type="number"
                      id="household_size"
                      value={formData.household_size || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "household_size",
                          parseInt(e.target.value)
                        )
                      }
                      disabled={isExpired || realTimeExpired}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200"
                      min="1"
                      placeholder="e.g., 4"
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Total number of people living in your household
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="number_of_children"
                      className="block text-sm font-semibold text-gray-800"
                    >
                      Number of Children *
                    </label>
                    <input
                      type="number"
                      id="number_of_children"
                      value={formData.number_of_children || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "number_of_children",
                          parseInt(e.target.value)
                        )
                      }
                      disabled={isExpired || realTimeExpired}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200"
                      min="0"
                      placeholder="e.g., 2"
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Children under 18 years old
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      id="disability_status"
                      checked={formData.disability_status || false}
                      onChange={(e) =>
                        handleInputChange("disability_status", e.target.checked)
                      }
                      disabled={isExpired}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 transition-all duration-200"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        I have a disability status
                      </span>
                      <p className="text-xs text-gray-500">
                        Check this if you have an official disability
                        certification
                      </p>
                    </div>
                  </label>
                </div>
              </motion.div>

              {/* Section 5: Payment Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="space-y-6"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 rounded-full">
                    <span className="text-sm font-semibold text-indigo-600">
                      5
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Payment Information
                  </h3>
                </div>

                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-200">
                  <label
                    htmlFor="wallet_address"
                    className="block text-sm font-semibold text-gray-800 mb-3"
                  >
                    Ethereum Wallet Address *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="wallet_address"
                      value={formData.wallet_address || ""}
                      onChange={(e) =>
                        handleInputChange("wallet_address", e.target.value)
                      }
                      disabled={isExpired}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200 font-mono text-sm"
                      placeholder="0x1234567890abcdef1234567890abcdef12345678"
                      required
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 flex items-center">
                    <svg
                      className="h-4 w-4 text-indigo-500 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    Subsidy payments will be sent directly to this wallet
                  </p>
                </div>
              </motion.div>

              {/* Submit Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="pt-8 border-t border-gray-200"
              >
                <div className="flex flex-col space-y-4">
                  <AnimatePresence>
                    {!zkVerificationData?.verified && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-amber-50 border border-amber-200 rounded-xl p-4"
                      >
                        <div className="flex items-center">
                          <svg
                            className="h-5 w-5 text-amber-500 mr-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <p className="text-sm text-amber-700 font-medium">
                            Please complete income verification above before
                            submitting
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {zkVerificationData?.verified && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-green-50 border border-green-200 rounded-xl p-4"
                      >
                        <div className="flex items-center">
                          <svg
                            className="h-5 w-5 text-green-500 mr-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            />
                          </svg>
                          <div>
                            <p className="text-sm text-green-700 font-medium">
                              Income verified (Bracket:{" "}
                              {zkVerificationData.incomeBracket})
                            </p>
                            <p className="text-xs text-green-600">
                              Your application is ready to submit
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex justify-end">
                    {isExpired || realTimeExpired ? (
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center text-red-600">
                          <svg
                            className="h-5 w-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="text-sm font-medium">
                            Application deadline has expired
                          </span>
                        </div>
                        <div className="px-8 py-4 bg-gray-300 text-gray-500 font-semibold rounded-xl cursor-not-allowed">
                          <div className="flex items-center space-x-2">
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
                              />
                            </svg>
                            <span>Submission Disabled</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <motion.button
                        type="submit"
                        disabled={saving || !zkVerificationData?.verified}
                        whileHover={{ scale: saving ? 1 : 1.02 }}
                        whileTap={{ scale: saving ? 1 : 0.98 }}
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        {saving ? (
                          <div className="flex items-center space-x-2">
                            <svg
                              className="animate-spin h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            <span>Saving Application...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            <span>Submit Application</span>
                          </div>
                        )}
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            </form>
          </div>
        </motion.div>
      </div>
    </CitizenPortalLayout>
  );
}
