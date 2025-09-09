import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu, Bell } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useProfile } from "../../hooks/useProfile";

interface CitizenTopNavProps {
  title: string;
  onMobileMenuToggle: () => void;
}

export const CitizenTopNav: React.FC<CitizenTopNavProps> = ({
  title,
  onMobileMenuToggle,
}) => {
  const { profile } = useProfile();
  const [citizenName, setCitizenName] = useState<string>("Citizen");
  const [citizenInitial, setCitizenInitial] = useState<string>("C");

  useEffect(() => {
    const fetchCitizenProfile = async () => {
      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Use profile data if available
          if (profile?.full_name) {
            setCitizenName(profile.full_name);
            setCitizenInitial(profile.full_name.charAt(0).toUpperCase());
          } else {
            // Fetch profile from profiles table
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", user.id)
              .eq("is_admin", false)
              .single();

            if (profileData?.full_name) {
              setCitizenName(profileData.full_name);
              setCitizenInitial(profileData.full_name.charAt(0).toUpperCase());
            }
          }
        }
      } catch (error) {
        console.error("Error fetching citizen profile:", error);
        // Keep default values
      }
    };

    fetchCitizenProfile();
  }, [profile]);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>

          <div>
            <h1 className="text-xl font-bold text-slate-800">{title}</h1>
            <p className="text-sm text-slate-500">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors relative"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            {/* Notification badge */}
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </motion.button>

          {/* User profile */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center space-x-3 cursor-pointer"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {citizenInitial}
              </span>
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-slate-800">
                {citizenName}
              </p>
              <p className="text-xs text-slate-500">Citizen</p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
};
