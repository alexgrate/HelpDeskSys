import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, LayoutDashboard, Inbox, BookOpen, ChevronLeft, LifeBuoy, Menu, X } from "lucide-react";
import { Topbar } from "./Topbar";
import brandSymbol from "../../assets/brand-symbol.png"

const NAV = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/staff-portal" },
  { label: "My Requests", icon: Inbox, to: "/staff-portal/requests" },
  { label: "Knowledge Base", icon: BookOpen, to: "/kb" },
];

export function StaffShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const location = useLocation();
  const mainRef = useRef(null)

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0)
    }
  }, [location.pathname])

  const sidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-[#1A2332] text-slate-200">
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-slate-700/50">
        <div className="h-10 w-10 rounded-xl bg-white grid place-items-center shadow-lg">
          <img 
            src={brandSymbol}
            alt="Dash MFB"
            className="h-9 w-9 object-contain shrink-0"
          />
        </div>
        {(!collapsed || isMobile) && (
          <div className="text-left overflow-hidden">
            <div className="text-xs font-black text-white leading-tight tracking-wide">Dash MFB</div>
            <div className="text-[10px] text-slate-400 font-medium mt-1">Staff Portal</div>
          </div>
        )}
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} className="ml-auto p-1.5 text-slate-400 hover:text-white cursor-pointer">
            <X className="size-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to; // Resolved bug: evaluates unique strings
          return (
            <Link
              key={item.label}
              to={item.to}
              onClick={isMobile ? () => setMobileOpen(false) : undefined}
              className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
                active
                  ? "bg-slate-700/50 text-white shadow-sm border-l-2 border-blue-500 rounded-l-none"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              }`}
            >
              <Icon className="size-[16px] shrink-0" />
              {(!collapsed || isMobile) && <span className="flex-1 text-left">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {(!collapsed || isMobile) && (
        <div className="mx-3 mb-3 rounded-xl bg-slate-800/60 border border-slate-700/50 p-3 text-left">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300">
            <LifeBuoy className="size-3.5 text-blue-400" /> Need help fast?
          </div>
          <p className="text-[10px] text-slate-400 mt-1 leading-snug">
            Call the IT hotline at <span className="text-white font-bold">x4001</span> for critical outages.
          </p>
        </div>
      )}

      <div className="p-3 border-t border-slate-700/50">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full gap-2 rounded-lg py-2 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-100 transition-colors cursor-pointer"
        >
          <ChevronLeft className={`size-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50 text-slate-950">
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
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
        className="relative hidden md:flex shrink-0 flex-col bg-[#1A2332] border-r border-slate-700/50"
      >
        {sidebarContent(false)}
      </motion.aside>

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main ref={mainRef} className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1400px] w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}