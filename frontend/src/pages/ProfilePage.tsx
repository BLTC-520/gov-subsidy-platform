import { CitizenLayout } from '../components/common/CitizenLayout';
import { useProfile } from '../hooks/useProfile';

export default function ProfilePage() {
  const { profile, loading, error } = useProfile();

  if (loading) {
    return (
      <CitizenLayout title="Profile">
        <div className="max-w-4xl mx-auto">
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
    <CitizenLayout title="Profile">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
            {profile?.eligibility_score && (
              <div className="bg-green-100 px-4 py-2 rounded-lg">
                <span className="text-sm font-medium text-green-800">Eligibility Score: </span>
                <span className="text-lg font-bold text-green-600">{profile.eligibility_score}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {profile ? (
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
                    <p className="text-gray-900 font-medium">{profile.full_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Date of Birth</label>
                    <p className="text-gray-900 font-medium">{profile.date_of_birth || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Gender</label>
                    <p className="text-gray-900 font-medium">{profile.gender || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">State</label>
                    <p className="text-gray-900 font-medium">{profile.state || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Financial Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Monthly Income</label>
                    <p className="text-gray-900 font-medium">
                      {profile.monthly_income ? `RM ${profile.monthly_income.toFixed(2)}` : 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Household Size</label>
                    <p className="text-gray-900 font-medium">{profile.household_size || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Number of Children</label>
                    <p className="text-gray-900 font-medium">{profile.number_of_children || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Disability Status</label>
                    <p className="text-gray-900 font-medium">
                      {profile.disability_status ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Wallet Address</label>
                    <p className="text-gray-900 font-mono text-sm break-all bg-gray-50 p-2 rounded border">
                      {profile.wallet_address || 'Not provided'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Eligibility Assessment */}
              {profile.eligibility_score && (
                <div className="border rounded-lg p-6 bg-green-50 border-green-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Eligibility Assessment</h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-2">Your current eligibility score:</p>
                      <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-4 mr-4">
                          <div 
                            className="bg-green-500 h-4 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min((profile.eligibility_score / 100) * 100, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-2xl font-bold text-green-600">{profile.eligibility_score}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Application Status */}
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Application Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Profile Created</label>
                    <p className="text-gray-900 font-medium">
                      {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Not available'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Account Status</label>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8-4-8 4m16 0v18l-8 4-8-4V7m16 0L20 11 4 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Profile Information</h3>
                  <p className="text-gray-600 mb-4">
                    You haven't filled out your profile information yet. Please complete the form to view your profile.
                  </p>
                  <a
                    href="/citizen-profile"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Complete Profile
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </CitizenLayout>
  );
}