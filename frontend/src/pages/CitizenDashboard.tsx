import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CitizenPortalLayout } from "../components/common/CitizenPortalLayout";
import { useProfile } from "../hooks/useProfile";
import { useDeadlineStatus } from "../hooks/useDeadlineStatus";

interface CitizenStats {
  applicationStatus: "incomplete" | "pending" | "approved" | "rejected";
  eligibilityScore: number | null;
  documentsUploaded: number;
  lastUpdated: string | null;
}

// Main Citizen Dashboard showing personal application status and quick actions
// Displays eligibility score, application progress, and navigation to key features
// Central hub for citizen portal navigation and status monitoring
export default function CitizenDashboard() {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const { isExpired, deadline } = useDeadlineStatus();

  const [stats, setStats] = useState<CitizenStats>({
    applicationStatus: "incomplete",
    eligibilityScore: null,
    documentsUploaded: 0,
    lastUpdated: null,
  });
  const [loading, setLoading] = useState(true);

  // Fetches citizen-specific dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      if (profile) {
        // Determine application status based on profile completeness
        const hasRequiredFields =
          profile.full_name &&
          profile.date_of_birth &&
          profile.gender &&
          profile.state &&
          profile.household_size &&
          profile.number_of_children !== null &&
          profile.wallet_address;

        const applicationStatus = hasRequiredFields
          ? profile.eligibility_score !== null
            ? "approved"
            : "pending"
          : "incomplete";

        setStats({
          applicationStatus,
          eligibilityScore: profile.eligibility_score,
          documentsUploaded: 0, // Could be enhanced to count actual documents
          lastUpdated: profile.updated_at,
        });
      }
    } catch (error) {
      console.error("Dashboard data error:", error);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  // Load citizen dashboard data on component mount
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Stat card component for consistent styling
  const StatCard = ({
    title,
    value,
    icon,
    color = "blue",
    subtitle,
  }: {
    title: string;
    value: string | number | React.ReactNode;
    icon: React.ReactNode;
    color?: string;
    subtitle?: string;
  }) => (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex items-center">
        <div
          className={`p-3 rounded-xl bg-${color}-100 dark:bg-${color}-900/30`}
        >
          <div className={`text-${color}-600 dark:text-${color}-400`}>
            {icon}
          </div>
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {title}
          </p>
          <motion.p
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-2xl font-bold text-slate-900 dark:text-white"
          >
            {loading ? "..." : value}
          </motion.p>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig = {
      incomplete: {
        color: "bg-yellow-100 text-yellow-800",
        text: "Incomplete",
      },
      pending: { color: "bg-blue-100 text-blue-800", text: "Under Review" },
      approved: { color: "bg-green-100 text-green-800", text: "Approved" },
      rejected: { color: "bg-red-100 text-red-800", text: "Rejected" },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.incomplete;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
      >
        {config.text}
      </span>
    );
  };

  if (profileLoading || loading) {
    return (
      <CitizenPortalLayout title="Dashboard">
        <div className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-300 rounded-lg"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="h-24 bg-gray-300 rounded-lg"></div>
              <div className="h-24 bg-gray-300 rounded-lg"></div>
              <div className="h-24 bg-gray-300 rounded-lg"></div>
            </div>
          </div>
        </div>
      </CitizenPortalLayout>
    );
  }

  return (
    <CitizenPortalLayout title="Citizen Dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-md p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">
            Welcome to Your Citizen Portal
          </h2>
          <p className="text-blue-100">
            Track your subsidy application and manage your profile
          </p>
          {profile?.full_name && (
            <p className="text-blue-200 mt-2">Hello, {profile.full_name}!</p>
          )}
        </div>

        {/* Application Deadline Alert */}
        {deadline && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-lg shadow-md p-6 ${
              isExpired
                ? "bg-red-50 border border-red-200"
                : "bg-amber-50 border border-amber-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div
                  className={`p-2 rounded-lg ${
                    isExpired ? "bg-red-100" : "bg-amber-100"
                  }`}
                >
                  <svg
                    className={`h-5 w-5 ${
                      isExpired ? "text-red-600" : "text-amber-600"
                    }`}
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
                </div>
                <div className="ml-4">
                  <h3
                    className={`font-semibold ${
                      isExpired ? "text-red-800" : "text-amber-800"
                    }`}
                  >
                    {isExpired
                      ? "Application Deadline Passed"
                      : "Application Deadline"}
                  </h3>
                  <p
                    className={`text-sm ${
                      isExpired ? "text-red-700" : "text-amber-700"
                    }`}
                  >
                    {isExpired
                      ? "The application period has ended. Your profile is now read-only."
                      : "Application deadline is approaching. Please complete your application."}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Application Action Card */}
        {!isExpired ? (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-lg shadow-md p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-blue-100">
                  <svg
                    className="h-5 w-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  {(() => {
                    // Check if user has any application data (excluding eligibility_score)
                    const hasApplicationData =
                      profile &&
                      (profile.full_name ||
                        profile.date_of_birth ||
                        profile.gender ||
                        profile.state ||
                        profile.household_size ||
                        profile.number_of_children !== null ||
                        profile.wallet_address ||
                        profile.nric);

                    if (hasApplicationData && !profile?.eligibility_score) {
                      // Has saved data but not completed
                      return (
                        <>
                          <h3 className="font-semibold text-blue-800">
                            Continue Your Application
                          </h3>
                          <p className="text-sm text-blue-700">
                            You have a saved application. Continue where you
                            left off to complete your submission.
                          </p>
                        </>
                      );
                    } else if (!hasApplicationData) {
                      // No application data - fresh start
                      return (
                        <>
                          <h3 className="font-semibold text-blue-800">
                            Start Your Application
                          </h3>
                          <p className="text-sm text-blue-700">
                            Begin your subsidy application process. Complete all
                            required information to qualify.
                          </p>
                        </>
                      );
                    } else {
                      // Has eligibility score - completed
                      return (
                        <>
                          <h3 className="font-semibold text-green-800">
                            Application Completed
                          </h3>
                          <p className="text-sm text-green-700">
                            Your application has been submitted and processed.
                            View your profile for details.
                          </p>
                        </>
                      );
                    }
                  })()}
                </div>
              </div>
              {(() => {
                const hasApplicationData =
                  profile &&
                  (profile.full_name ||
                    profile.date_of_birth ||
                    profile.gender ||
                    profile.state ||
                    profile.household_size ||
                    profile.number_of_children !== null ||
                    profile.wallet_address ||
                    profile.nric);

                if (hasApplicationData && !profile?.eligibility_score) {
                  // Show "Edit Application" button
                  return (
                    <motion.button
                      onClick={() => navigate("/citizen/application")}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Edit Application
                    </motion.button>
                  );
                } else if (!hasApplicationData) {
                  // Show "Start Application" button
                  return (
                    <motion.button
                      onClick={() => navigate("/citizen/application")}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Start Application
                    </motion.button>
                  );
                } else {
                  // Show "View Profile" button for completed applications
                  return (
                    <motion.button
                      onClick={() => navigate("/citizen/profile")}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
                    >
                      View Profile
                    </motion.button>
                  );
                }
              })()}
            </div>
          </motion.div>
        ) : (
          // Show expired message when deadline has passed
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg shadow-md p-6"
          >
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-red-100">
                <svg
                  className="h-5 w-5 text-red-600"
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
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-red-800">
                  Application Period Ended
                </h3>
                <p className="text-sm text-red-700">
                  The application deadline has passed. No new applications or
                  changes can be submitted.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Statistics Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
        >
          <StatCard
            title="Application Status"
            value={<StatusBadge status={stats.applicationStatus} />}
            color="blue"
            icon={
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            }
          />

          <StatCard
            title="Eligibility Score"
            value={
              stats.eligibilityScore !== null
                ? stats.eligibilityScore
                : "Pending"
            }
            color="emerald"
            subtitle={
              stats.eligibilityScore !== null
                ? "Assessment completed"
                : "Complete profile for assessment"
            }
            icon={
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            }
          />

          <StatCard
            title="Profile Completion"
            value={`${Math.round(
              (((profile?.full_name ? 1 : 0) +
                (profile?.date_of_birth ? 1 : 0) +
                (profile?.gender ? 1 : 0) +
                (profile?.state ? 1 : 0) +
                (profile?.household_size ? 1 : 0) +
                (profile?.number_of_children !== null ? 1 : 0) +
                (profile?.wallet_address ? 1 : 0)) /
                7) *
                100
            )}%`}
            color="violet"
            subtitle="Complete all fields to qualify"
            icon={
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            }
          />
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
        >
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(() => {
              const hasApplicationData =
                profile &&
                (profile.full_name ||
                  profile.date_of_birth ||
                  profile.gender ||
                  profile.state ||
                  profile.household_size ||
                  profile.number_of_children !== null ||
                  profile.wallet_address ||
                  profile.nric);

              if (isExpired) {
                // Show disabled button when expired
                return (
                  <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-gray-200 dark:border-gray-800 opacity-50">
                    <svg
                      className="h-5 w-5 text-gray-400 mr-2"
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
                    <span className="text-gray-500 dark:text-gray-400 font-medium">
                      Application Expired
                    </span>
                  </div>
                );
              } else if (hasApplicationData && !profile?.eligibility_score) {
                // Show "Edit Application" for saved but incomplete applications
                return (
                  <motion.button
                    onClick={() => navigate("/citizen/application")}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <svg
                      className="h-5 w-5 text-blue-600 mr-2"
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
                    <span className="text-blue-700 dark:text-blue-400 font-medium">
                      Edit Application
                    </span>
                  </motion.button>
                );
              } else if (!hasApplicationData) {
                // Show "Start Application" for new applications
                return (
                  <motion.button
                    onClick={() => navigate("/citizen/application")}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  >
                    <svg
                      className="h-5 w-5 text-green-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    <span className="text-green-700 dark:text-green-400 font-medium">
                      Start Application
                    </span>
                  </motion.button>
                );
              } else {
                // Show "View Application" for completed applications
                return (
                  <motion.button
                    onClick={() => navigate("/citizen/profile")}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900/30 transition-colors"
                  >
                    <svg
                      className="h-5 w-5 text-gray-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="text-gray-700 dark:text-gray-400 font-medium">
                      View Application
                    </span>
                  </motion.button>
                );
              }
            })()}

            <motion.button
              onClick={() => navigate("/citizen/profile")}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
            >
              <svg
                className="h-5 w-5 text-emerald-600 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                View Profile
              </span>
            </motion.button>

            <motion.button
              onClick={() => navigate("/citizen/claim")}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
            >
              <svg
                className="h-5 w-5 text-violet-600 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
              <span className="text-violet-700 dark:text-violet-400 font-medium">
                Claim Subsidy
              </span>
            </motion.button>
          </div>
        </motion.div>

        {/* Application Progress */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Application Progress
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Profile Information</span>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  profile?.full_name &&
                  profile?.date_of_birth &&
                  profile?.gender &&
                  profile?.state
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {profile?.full_name &&
                profile?.date_of_birth &&
                profile?.gender &&
                profile?.state
                  ? "✅ Complete"
                  : "⏳ Incomplete"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Financial Information
              </span>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  profile?.household_size &&
                  profile?.number_of_children !== null
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {profile?.household_size && profile?.number_of_children !== null
                  ? "✅ Complete"
                  : "⏳ Incomplete"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Wallet Address</span>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  profile?.wallet_address
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {profile?.wallet_address ? "✅ Complete" : "⏳ Incomplete"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Eligibility Assessment
              </span>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  stats.eligibilityScore !== null
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {stats.eligibilityScore !== null ? "✅ Assessed" : "⏳ Pending"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </CitizenPortalLayout>
  );
}
