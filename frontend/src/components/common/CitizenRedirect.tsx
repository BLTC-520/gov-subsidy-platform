import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Simple redirect component to send citizens to the dashboard by default
export const CitizenRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/citizen/dashboard", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600 text-sm">
          Redirecting to dashboard...
        </p>
      </div>
    </div>
  );
};
