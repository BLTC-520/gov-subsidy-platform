import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface TopNavProps {
  title: string;
  onMobileMenuToggle: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  title,
  onMobileMenuToggle,
}) => {
  const [adminName, setAdminName] = useState<string>("Admin User");
  const [adminInitial, setAdminInitial] = useState<string>("A");

  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Fetch profile from profiles table
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .eq("is_admin", true)
            .single();

          if (profile?.full_name) {
            setAdminName(profile.full_name);
            // Set initial to first letter of first name
            setAdminInitial(profile.full_name.charAt(0).toUpperCase());
          }
        }
      } catch (error) {
        console.error("Error fetching admin profile:", error);
        // Keep default values
      }
    };

    fetchAdminProfile();
  }, []);
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
          {/* User profile */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center space-x-3 cursor-pointer"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {adminInitial}
              </span>
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-slate-800">{adminName}</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
};
