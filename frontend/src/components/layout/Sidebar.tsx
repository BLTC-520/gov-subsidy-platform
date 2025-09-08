import React from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Upload,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Users, label: "Citizens", path: "/admin/citizens" },
  { icon: Upload, label: "Documents", path: "/admin/file-upload" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col h-full shadow-lg"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <motion.div
            initial={false}
            animate={{ opacity: isCollapsed ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            className="flex items-center space-x-3"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-800 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">GS</span>
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="font-bold text-slate-800 dark:text-white text-sm">
                  Gov Subsidy
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Admin Panel
                </p>
              </div>
            )}
          </motion.div>

          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                active
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon
                className={`w-5 h-5 ${
                  active ? "text-slate-700 dark:text-white" : ""
                }`}
              />

              <motion.span
                initial={false}
                animate={{
                  opacity: isCollapsed ? 0 : 1,
                  width: isCollapsed ? 0 : "auto",
                }}
                transition={{ duration: 0.2 }}
                className="font-medium text-sm whitespace-nowrap overflow-hidden"
              >
                {item.label}
              </motion.span>

              {item.badge && !isCollapsed && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs px-2 py-0.5 rounded-full"
                >
                  {item.badge}
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <motion.button
          onClick={handleLogout}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <motion.span
            initial={false}
            animate={{
              opacity: isCollapsed ? 0 : 1,
              width: isCollapsed ? 0 : "auto",
            }}
            transition={{ duration: 0.2 }}
            className="font-medium text-sm whitespace-nowrap overflow-hidden"
          >
            Logout
          </motion.span>
        </motion.button>
      </div>
    </motion.div>
  );
};
