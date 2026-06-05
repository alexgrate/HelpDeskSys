import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import { Search, Bell, Menu, User, Settings, Moon, LogOut, Power } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../../utils/apiFetch";

export function Topbar({ onMenu }) {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  
  const [profileOpen, setProfileOpen] = useState(false);
  const [dutyState, setDutyState] = useState("on-duty");

  // Dynamically initialize user profile data from localStorage on load
  const [currentUser, setCurrentUser] = useState(() => {
    return JSON.parse(localStorage.getItem("user") || "{}");
  });

  // Dynamically initialize availability status from the Django database profile payload
  const [isAvailable, setIsAvailable] = useState(() => {
    const userPayload = JSON.parse(localStorage.getItem("user") || "{}");
    return userPayload.is_on_duty !== undefined ? userPayload.is_on_duty : true;
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

  // 1. Dynamic Availability Patch Handler (Tied to Django PATCH /users/me/)
  const handleAvailabilityToggle = async (newStatus) => {
    // Optimistically update local UI state
    setIsAvailable(newStatus);

    try {
      const response = await apiFetch("/users/me/", {
        method: "PATCH",
        body: JSON.stringify({ is_on_duty: newStatus }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        // Save the updated profile to localStorage to keep views synchronized
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
      } else {
        // Rollback state if server rejection occurs
        setIsAvailable(!newStatus);
      }
    } catch (err) {
      console.error("Failed to persist availability status to database:", err);
      setIsAvailable(!newStatus); // Rollback
    }
  };

  // 2. Functional Sign Out routine
  const handleSignOut = async () => {
    const refreshToken = localStorage.getItem("refresh_token");

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

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const displayName = currentUser.first_name && currentUser.last_name 
    ? `${currentUser.first_name} ${currentUser.last_name}` 
    : currentUser.email ? currentUser.email.split('@')[0] : "Staff Member";

  const displayInitials = currentUser.first_name ? currentUser.first_name[0] : "U";

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
      <div className="flex items-center gap-4">
        
        {/* Dynamic Status Badge */}
        {isAvailable && dutyState === "on-duty" ? (
          <button 
            onClick={() => setProfileOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-bold cursor-pointer"
          >
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            On duty
          </button>
        ) : (
          <button 
            onClick={() => setProfileOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200 text-[11px] font-bold cursor-pointer"
          >
            <span className="size-1.5 rounded-full bg-slate-400" />
            Out of office
          </button>
        )}

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
              <div className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">{currentUser.role || "User"}</div>
            </div>
            
            <div className="relative">
              <div className="h-9 w-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center border-2 border-white shadow-sm">
                {displayInitials}
              </div>
              <span className={`absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white ${
                isAvailable && dutyState === "on-duty" ? "bg-emerald-500" : "bg-slate-400"
              }`} />
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
                  <div className="h-12 w-12 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-inner">
                    {displayInitials}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{displayName}</h3>
                    <p className="text-xs text-slate-400 font-medium">{currentUser.email}</p>
                  </div>
                </div>

                {/* 2. Availability Switch Control */}
                <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Power className={`size-4 ${isAvailable ? "text-emerald-500" : "text-slate-400"}`} />
                      <span className="text-xs font-bold text-slate-800">Availability</span>
                    </div>
                    
                    {/* iOS Switch Selector - WIRED to active handler */}
                    <button
                      onClick={() => handleAvailabilityToggle(!isAvailable)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                        isAvailable ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isAvailable ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    {isAvailable 
                      ? "Active. New tickets can be routed to you." 
                      : "Inactive. Routing system will bypass your queue."
                    }
                  </p>

                  {/* On Duty / Out of Office Switch Button Group */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => setDutyState("on-duty")}
                      disabled={!isAvailable}
                      className={`h-9 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        dutyState === "on-duty" && isAvailable
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm"
                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      On duty
                    </button>
                    <button
                      onClick={() => setDutyState("ooo")}
                      disabled={!isAvailable}
                      className={`h-9 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        dutyState === "ooo" && isAvailable
                          ? "bg-slate-100 text-slate-700 border-slate-300 shadow-sm"
                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      Out of office
                    </button>
                  </div>
                </div>

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