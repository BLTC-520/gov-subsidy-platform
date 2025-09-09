import { useState } from "react";
import { CitizenPortalLayout } from "../components/common/CitizenPortalLayout";
import { useProfile } from "../hooks/useProfile";
import { useNavigate } from "react-router-dom";

// Generate a random person emoji for profile picture
const getRandomPersonEmoji = () => {
  const personEmojis = [
    "👨",
    "👩",
    "🧑",
    "👨‍💼",
    "👩‍💼",
    "👨‍🎓",
    "👩‍🎓",
    "🧑‍💻",
    "👨‍💻",
    "👩‍💻",
  ];
  return personEmojis[Math.floor(Math.random() * personEmojis.length)];
};

export default function ProfilePage() {
  const { profile, loading, error } = useProfile();
  const navigate = useNavigate();
  const [profileEmoji] = useState(() => getRandomPersonEmoji());

  const handleEditProfile = () => {
    navigate("/citizen/application");
  };

  if (loading) {
    return (
      <CitizenPortalLayout title="User Profile">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            {/* Profile Header Skeleton */}
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <div className="flex items-center space-x-6">
                <div className="w-24 h-24 bg-gray-300 rounded-full"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-8 bg-gray-300 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                  <div className="h-10 bg-gray-300 rounded w-32"></div>
                </div>
              </div>
            </div>
            {/* Profile Details Skeleton */}
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <div className="h-6 bg-gray-300 rounded w-1/4 mb-6"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                    <div className="h-6 bg-gray-300 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CitizenPortalLayout>
    );
  }

  return (
    <CitizenPortalLayout title="User Profile">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center">
              <svg
                className="h-5 w-5 text-red-400 mr-3"
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
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-6 sm:space-y-0 sm:space-x-8">
            {/* Profile Picture */}
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center text-4xl shadow-inner">
                {profileEmoji}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-white"
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
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {profile?.full_name || "User Name"}
              </h1>
              <p className="text-lg text-gray-600 mb-4">
                NRIC: {profile?.nric || "Not provided"}
              </p>

              {/* Eligibility Score Badge */}
              {profile?.eligibility_score && (
                <div className="inline-flex items-center px-4 py-2 bg-green-50 border border-green-200 rounded-full mb-4">
                  <svg
                    className="w-4 h-4 text-green-600 mr-2"
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

              {/* Edit Profile Button */}
              <button
                onClick={handleEditProfile}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 shadow-sm hover:shadow-md"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Profile Details Section */}
        <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Profile Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Personal Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Personal Information
              </h3>

              <div className="space-y-4">
                <div className="group">
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Email
                  </label>
                  <p className="text-gray-900 group-hover:text-blue-600 transition-colors">
                    {profile?.email || "Not provided"}
                  </p>
                </div>

                <div className="group">
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Date of Birth
                  </label>
                  <p className="text-gray-900 group-hover:text-blue-600 transition-colors">
                    {profile?.date_of_birth
                      ? new Date(profile.date_of_birth).toLocaleDateString(
                          "en-MY"
                        )
                      : "Not provided"}
                  </p>
                </div>

                <div className="group">
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Gender
                  </label>
                  <p className="text-gray-900 group-hover:text-blue-600 transition-colors">
                    {profile?.gender || "Not provided"}
                  </p>
                </div>

                <div className="group">
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    State
                  </label>
                  <p className="text-gray-900 group-hover:text-blue-600 transition-colors">
                    {profile?.state || "Not provided"}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial & Technical Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Additional Information
              </h3>

              <div className="space-y-4">
                <div className="group">
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Wallet Address
                  </label>
                  <p className="text-gray-900 group-hover:text-blue-600 transition-colors font-mono text-sm break-all">
                    {profile?.wallet_address
                      ? `${profile.wallet_address.substring(
                          0,
                          6
                        )}...${profile.wallet_address.substring(
                          profile.wallet_address.length - 4
                        )}`
                      : "Not provided"}
                  </p>
                </div>

                <div className="group">
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Income Bracket
                  </label>
                  <p className="text-gray-900 group-hover:text-blue-600 transition-colors">
                    {profile?.income_bracket || "Not verified"}
                  </p>
                </div>

                <div className="group">
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Household Size
                  </label>
                  <p className="text-gray-900 group-hover:text-blue-600 transition-colors">
                    {profile?.household_size
                      ? `${profile.household_size} members`
                      : "Not provided"}
                  </p>
                </div>

                <div className="group">
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Number of Children
                  </label>
                  <p className="text-gray-900 group-hover:text-blue-600 transition-colors">
                    {profile?.number_of_children ?? "Not provided"}
                  </p>
                </div>

                <div className="group">
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Disability Status
                  </label>
                  <div className="flex items-center">
                    <div
                      className={`w-3 h-3 rounded-full mr-2 ${
                        profile?.disability_status
                          ? "bg-blue-500"
                          : "bg-gray-300"
                      }`}
                    ></div>
                    <p className="text-gray-900 group-hover:text-blue-600 transition-colors">
                      {profile?.disability_status ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Status */}
          {(profile?.is_signature_valid !== null ||
            profile?.is_data_authentic !== null) && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Verification Status
              </h3>
              <div className="flex flex-wrap gap-4">
                {profile?.is_signature_valid !== null && (
                  <div
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      profile?.is_signature_valid
                        ? "bg-green-100 text-green-800 border border-green-200"
                        : "bg-red-100 text-red-800 border border-red-200"
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 mr-1 ${
                        profile?.is_signature_valid
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={
                          profile?.is_signature_valid
                            ? "M5 13l4 4L19 7"
                            : "M6 18L18 6M6 6l12 12"
                        }
                      />
                    </svg>
                    Signature{" "}
                    {profile?.is_signature_valid ? "Valid" : "Invalid"}
                  </div>
                )}

                {profile?.is_data_authentic !== null && (
                  <div
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      profile?.is_data_authentic
                        ? "bg-green-100 text-green-800 border border-green-200"
                        : "bg-red-100 text-red-800 border border-red-200"
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 mr-1 ${
                        profile?.is_data_authentic
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={
                          profile?.is_data_authentic
                            ? "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        }
                      />
                    </svg>
                    Data{" "}
                    {profile?.is_data_authentic ? "Authentic" : "Unverified"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* No Profile Data State */}
        {!profile && !loading && (
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="text-gray-400 mb-4">
                    <svg
                      className="mx-auto h-12 w-12"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 48 48"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8-4-8 4m16 0v18l-8 4-8-4V7m16 0L20 11 4 7"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Profile Information
                  </h3>
                  <p className="text-gray-600 mb-4">
                    You haven't filled out your profile information yet. Please
                    complete the application form to view your profile.
                  </p>
                  <button
                    onClick={handleEditProfile}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Complete Application
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </CitizenPortalLayout>
  );
}
