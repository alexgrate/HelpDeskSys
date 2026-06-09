import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  LayoutDashboard,
  Inbox,
  ShieldAlert,
  BarChart3,
  BookOpen,
  FolderTree,
  FileCheck,
  Wrench,
  X
} from "lucide-react";


// 1. Configured custom operational role-access parameters
const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/", allowedRoles: ["Agent", "Manager", "Admin"] },
  { label: "My Tickets", icon: Inbox, to: "/my-tickets", allowedRoles: ["Agent", "Manager", "Admin"] },
  { label: "Approvals", icon: ShieldAlert, to: "/approvals", allowedRoles: ["Manager"] }, // Strictly Managers
  { label: "Reports", icon: BarChart3, to: "/reports", allowedRoles: ["Manager", "Admin"] },
  { label: "Knowledge Base", icon: BookOpen, to: "/kb", allowedRoles: ["Agent", "Manager", "Admin"] },
  { label: "Department Queues", icon: FolderTree, to: "/queues", allowedRoles: ["Agent", "Manager", "Admin"] },
  { label: "Audit Logs", icon: FileCheck, to: "/audit-logs", allowedRoles: ["Manager", "Admin"] },
  { label: "Admin", icon: Wrench, to: "/admin", allowedRoles: ["Admin"] }, // Strictly Admins
];

const subtitleMap = {
  Agent: "Control Tower",
  Manager: "Management Desk",
  Admin: "Admin Console",
};

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setCurrentUser(JSON.parse(stored));
    }
  }, []);

  const userRole = currentUser?.role || "Agent";
  const subtitle = subtitleMap[userRole] || "Control Tower";

  // 2. Filter the navigation options dynamically based on the session's role
  const filteredNavItems = NAV_ITEMS.filter((item) =>
    item.allowedRoles ? item.allowedRoles.includes(userRole) : true
  );

  const sidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-[#0B1329] text-slate-200 text-left font-sans">
      {/* Title Header */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-slate-800">
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-500 grid place-items-center shrink-0">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        {(!collapsed || isMobile) && (
          <div className="text-left overflow-hidden">
            <div className="text-xs font-black text-white tracking-wide leading-tight">Dash MFB</div>
            {/* Dynamic subtitle matching the active role context */}
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{subtitle}</div>
          </div>
        )}
        {isMobile && (
          <button onClick={onMobileClose} className="ml-auto p-1.5 text-slate-400 hover:text-white cursor-pointer">
            <X className="size-5" />
          </button>
        )}
      </div>

      {/* Nav Section */}
      <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.label}
              to={item.to}
              onClick={isMobile ? onMobileClose : undefined}
              className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold transition-all ${
                active
                  ? "bg-[#4D1D6F]/10 text-[#7A3EB5]"
                  : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
              }`}
            >
              {active && (
                <motion.span
                  layoutId={isMobile ? "mobile-active-pill" : "sidebar-active-pill"}
                  className="absolute left-0 top-2 bottom-2 w-0.75 rounded-r bg-blue-500"
                />
              )}
              <Icon className="size-[16px] shrink-0" />
              {(!collapsed || isMobile) && <span className="flex-1 text-left">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile overlay menu */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="absolute inset-0 bg-black"
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="relative w-64 max-w-[80%] h-full shrink-0 flex flex-col z-10 shadow-2xl"
            >
              {sidebarContent(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 68 : 240 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className="relative hidden md:flex shrink-0 flex-col bg-[#0B1329] border-r border-slate-800"
      >
        {sidebarContent(false)}

        {/* Collapse toggle footer button */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={onToggle}
            className="flex items-center justify-center w-full gap-2 rounded-lg py-2 text-xs text-slate-500 hover:bg-slate-800/50 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <motion.span animate={{ rotate: collapsed ? 180 : 0 }}>
              ←
            </motion.span>
            {!collapsed && <span>Collapse Menu</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
}