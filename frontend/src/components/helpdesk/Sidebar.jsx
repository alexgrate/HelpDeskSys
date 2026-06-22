import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, LayoutDashboard, Inbox, ShieldAlert, BarChart3, BookOpen, FolderTree, FileCheck, Wrench, X } from "lucide-react";
import { apiFetch } from "../../utils/apiFetch";
import brandSymbol from "../../assets/brand-symbol.png"


const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/", allowedRoles: ["Agent", "Approver", "Admin"] },
  { label: "Approvals", icon: ShieldAlert, to: "/approvals", allowedRoles: ["Approver"] }, 
  { label: "Reports", icon: BarChart3, to: "/reports", allowedRoles: ["Approver", "Admin"] },
  { label: "Knowledge Base", icon: BookOpen, to: "/kb", allowedRoles: ["Agent", "Approver", "Admin"] },
  { label: "Audit Logs", icon: FileCheck, to: "/audit-logs", allowedRoles: ["Approver", "Admin"] },
  { label: "Admin", icon: Wrench, to: "/admin", allowedRoles: ["Admin"] },
];

const subtitleMap = {
  Agent: "Control Tower",
  Approver: "Management Desk",
  Admin: "Admin Console",
};

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [badgeCounts, setBadgeCounts] = useState({ pending_approvals: 0, my_workload: 0})

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setCurrentUser(JSON.parse(stored));
    }

    const fetchCounts = async () => {
      try {
        const res = await apiFetch("/tickets/badge_analytics/")
        if (res.ok) {
          setBadgeCounts(await res.json())
        }
      } catch (err) {
        console.warn("Failed to retrieve operational badge counts:", err)
      }
    }
    fetchCounts()
  }, [])


  const filteredNavItems = NAV_ITEMS.filter((item) => {
    if (currentUser?.role === "Admin") return true;

    if (!item.allowedRoles) return true

    return item.allowedRoles.some(role => {
      if (role === "Staff") return currentUser?.role === "Staff";
      if (role === "Agent") return currentUser?.is_agent;
      if (role === "Approver") return currentUser?.can_approve;
      return false
    })
  })

  const subtitle = currentUser?.role === "Admin" ? "Admin Console" : currentUser?.can_approve ? "Management Desk" : currentUser?.is_agent ? "Control Tower" : "Staff Portal";

  const sidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-[#0B1329] text-slate-200 text-left font-sans">
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-slate-800">
        <div className="h-10 w-10 rounded-xl bg-white grid place-items-center shadow-lg">
          <img 
            src={brandSymbol}
            alt="Dash MFB"
            className="h-9 w-9 object-contain shrink-0"
          />
        </div>
        {(!collapsed || isMobile) && (
          <div className="text-left overflow-hidden">
            <div className="text-xs font-black text-white tracking-wide leading-tight">Dash MFB</div>
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{subtitle}</div>
          </div>
        )}
        {isMobile && (
          <button onClick={onMobileClose} className="ml-auto p-1.5 text-slate-400 hover:text-white cursor-pointer">
            <X className="size-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to;

          const showApprovalBadge = item.label === "Approvals" && badgeCounts.pending_approvals > 0;
          const showWorkloadBadge = (item.label === "My Tickets" || item.label === "My Requests") && badgeCounts.my_workload > 0;

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

              {(!collapsed || isMobile) && (
                <>
                  {showApprovalBadge && (
                    <span className="size-4 rounded-full bg-rose-500 text-white text-[9px] font-black grid place-items-center shrink-0 tabular-nums animate-pulse shadow-sm">
                      {badgeCounts.pending_approvals}
                    </span>
                  )}
                  {showWorkloadBadge && (
                    <span className="size-4 rounded-full bg-[#4D1D6F] text-white text-[9px] font-black grid place-items-center shrink-0 tabular-nums shadow-sm">
                      {badgeCounts.my_workload}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="absolute inset-0 bg-black"
            />
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

      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 68 : 240 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className="relative hidden md:flex shrink-0 flex-col bg-[#0B1329] border-r border-slate-800"
      >
        {sidebarContent(false)}

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