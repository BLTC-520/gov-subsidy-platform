import { useState, useEffect } from "react";
import { AdminLayout } from "../components/common/AdminLayout";
import { useAppSettings } from "../hooks/useAppSettings";

export default function SettingsPage() {
  const { settings, loading, error, updateSetting } = useAppSettings();
  const [deadlineInput, setDeadlineInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    total: number;
  } | null>(null);

  // Update time remaining every minute
  useEffect(() => {
    if (!settings.application_deadline) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const deadline = new Date(settings.application_deadline!);
      const now = new Date();
      const total = deadline.getTime() - now.getTime();

      if (total <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, total: 0 });
        return;
      }

      const days = Math.floor(total / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));

      setTimeRemaining({ days, hours, minutes, total });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [settings.application_deadline]);

  // Initialize deadline input when settings load
  useEffect(() => {
    if (settings.application_deadline) {
      // Convert to local datetime format for input
      const date = new Date(settings.application_deadline);
      const localDatetime = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16);
      setDeadlineInput(localDatetime);
    }
  }, [settings.application_deadline]);

  const handleSaveDeadline = async () => {
    if (!deadlineInput) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      const success = await updateSetting(
        "application_deadline",
        new Date(deadlineInput).toISOString()
      );

      if (success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Error saving deadline:", err);
    } finally {
      setSaving(false);
    }
  };

  const formatTimeRemaining = () => {
    if (!timeRemaining) return "No deadline set";

    if (timeRemaining.total <= 0) {
      return "Deadline has passed";
    }

    const { days, hours, minutes } = timeRemaining;
    return `${days} days, ${hours} hours, ${minutes} minutes`;
  };

  const getUrgencyColor = () => {
    if (!timeRemaining || timeRemaining.total <= 0) return "text-red-600";
    if (timeRemaining.days <= 1) return "text-red-600";
    if (timeRemaining.days <= 7) return "text-yellow-600";
    return "text-green-600";
  };

  if (loading) {
    return (
      <AdminLayout title="Application Settings">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
              <div className="h-10 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Application Settings">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Application Settings
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Current Deadline Status */}
          <div>
            <h3 className="text-base font-medium text-gray-700 mb-3">
              Current Application Deadline
            </h3>
            {settings.application_deadline ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  {new Date(settings.application_deadline).toLocaleString(
                    "en-US",
                    {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    }
                  )}
                </p>
                <div className="flex items-center space-x-2">
                  <div
                    className={`h-2 w-2 rounded-full ${getUrgencyColor().replace(
                      "text-",
                      "bg-"
                    )}`}
                  ></div>
                  <span className={`text-sm font-medium ${getUrgencyColor()}`}>
                    {formatTimeRemaining()}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No deadline set</p>
            )}
          </div>

          {/* Deadline Input */}
          <div>
            <label
              htmlFor="deadline"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Set Application Deadline
            </label>
            <div className="flex space-x-3">
              <input
                type="datetime-local"
                id="deadline"
                value={deadlineInput}
                onChange={(e) => setDeadlineInput(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min={new Date().toISOString().slice(0, 16)}
              />
              <button
                onClick={handleSaveDeadline}
                disabled={saving || !deadlineInput}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          {/* Save Success Message */}
          {saveSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <svg
                  className="h-4 w-4 text-green-600 mr-2"
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
                <p className="text-sm text-green-700">
                  <span className="font-medium">Success!</span> Application
                  deadline updated successfully.
                </p>
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-blue-600 mr-2 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">About Application Deadlines</p>
                <p>
                  Citizens will see a countdown timer based on this deadline.
                  The form will become read-only after the deadline passes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
