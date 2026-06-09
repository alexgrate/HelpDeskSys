import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import { Search, Bell, Menu, User, Settings, Moon, LogOut, Power } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../../utils/apiFetch";

export function Topbar({ onMenu }) {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  
  const [profileOpen, setProfileOpen] = useState(false);

  // Dynamically initialize user profile data from localStorage on load
  const [currentUser, setCurrentUser] = useState(() => {
    return JSON.parse(localStorage.getItem("user") || "{}");
  });

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Functional Sign Out routine
  const handleSignOut = async () => {
    const refreshToken = localStorage.getItem("refresh_token");

    // 1. AUTOMATION CHANGE: Set off-duty in the database before signing out [3]
    try {
      await apiFetch("/users/me/", {
        method: "PATCH",
        body: JSON.stringify({ is_on_duty: false }),
      });
    } catch (err) {
      console.warn("Failed to set off-duty status on backend:", err);
    }

    // 2. Blacklist the refresh token on the Django server
    if (refreshToken) {
      try {
        await apiFetch("/auth/logout/", {
          method: "POST",
          body: JSON.stringify({ refresh: refreshToken }),
        });
      } catch (err) {
        console.warn("Backend token blacklisting skipped or failed:", err);
      }
    }

    // 3. Clear credentials and session payloads from browser storage
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const displayName = currentUser.first_name && currentUser.last_name 
    ? `${currentUser.first_name} ${currentUser.last_name}` 
    : currentUser.email ? currentUser.email.split('@')[0] : "Staff Member";

  const displayInitials = currentUser.first_name ? currentUser.first_name[0] : "U";
  const roleLabel = currentUser ? `${currentUser.role} · ${currentUser.branch?.split("—")[0]?.trim() || "HQ"}` : "";

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-6 shrink-0 relative">
      
      {/* Mobile Menu & Search Input */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          onClick={onMenu}
          className="p-1.5 rounded-lg hover:bg-slate-100 md:hidden text-slate-500 cursor-pointer"
        >
          <Menu className="size-5" />
        </button>

        <div className="relative w-full hidden sm:block">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search tickets, requesters, branches..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none text-xs transition-all"
          />
        </div>
      </div>

      {/* Control Indicators */}
      <div className="flex items-center gap-4 text-left">
        
        {/* Dynamic Status Badge (Always On Duty while active session is running) */}
        <button 
          onClick={() => setProfileOpen(true)}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-bold cursor-pointer"
        >
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          On duty
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer">
          <Bell className="size-5" />
          <span className="absolute top-1.5 right-1.5 size-4 bg-rose-500 text-[9px] font-bold text-white rounded-full flex items-center justify-center">
            3
          </span>
        </button>

        <div className="h-8 w-px bg-slate-200 hidden xs:block" />

        {/* Interactive Profile Action Group */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 hover:opacity-90 cursor-pointer outline-none group text-left"
          >
            <div className="text-right hidden md:block">
              <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-none">
                {displayName}
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">{roleLabel}</div>
            </div>
            
            <div className="relative">
              <div className="h-9 w-9 rounded-full bg-[#4D1D6F] text-white font-bold text-xs flex items-center justify-center border-2 border-white shadow-sm">
                {displayInitials}
              </div>
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-emerald-500" />
            </div>
          </button>

          {/* Interactive Profile Dropdown Card Popover */}
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-slate-200/80 shadow-xl shadow-slate-200/50 z-50 overflow-hidden text-slate-800 text-left"
              >
                {/* 1. Header Profile Box */}
                <div className="p-4 flex items-center gap-3 border-b border-slate-100">
                  <div className="h-12 w-12 rounded-full bg-[#4D1D6F] text-white font-bold text-sm flex items-center justify-center shadow-inner">
                    {displayInitials}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{displayName}</h3>
                    <p className="text-xs text-slate-400 font-medium">{currentUser.email}</p>
                  </div>
                </div>

                {/* 2. AUTOMATION CHANGE: Replaced interactive switch with active session badge [3] */}
                <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Power className="size-4 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-800">Operational Status</span>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">
                    On Duty
                  </span>
                </div>

                {/* 3. Settings Navigation Menu list */}
                <div className="py-1.5 border-b border-slate-100">
                  <button className="w-full h-10 px-4 hover:bg-slate-50 transition-colors flex items-center gap-3 text-xs font-bold text-slate-700 cursor-pointer">
                    <User className="size-4.5 text-slate-400" />
                    Profile & shift settings
                  </button>
                  <button className="w-full h-10 px-4 hover:bg-slate-50 transition-colors flex items-center gap-3 text-xs font-bold text-slate-700 cursor-pointer">
                    <Settings className="size-4.5 text-slate-400" />
                    Preferences
                  </button>
                  <button className="w-full h-10 px-4 hover:bg-slate-50 transition-colors flex items-center gap-3 text-xs font-bold text-slate-700 cursor-pointer">
                    <Moon className="size-4.5 text-slate-400" />
                    Dark mode
                  </button>
                </div>

                {/* 4. Functional Sign Out Trigger */}
                <div className="p-1.5">
                  <button 
                    onClick={handleSignOut}
                    className="w-full h-10 px-2.5 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center gap-3 cursor-pointer"
                  >
                    <LogOut className="size-4.5" />
                    Sign out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}