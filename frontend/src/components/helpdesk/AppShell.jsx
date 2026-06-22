import React, { useState, useEffect, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useLocation } from "react-router-dom";

export function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const location = useLocation()
  const mainRef = useRef(null)

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0)
    }
  }, [location.pathname])

  useEffect(() => {
    if (mobileOpen) {
      document.body.classList.add("overflow-hidden")
    } else {
      document.body.classList.remove("overflow-hidden")
    } 
    return () => document.body.classList.remove("overflow-hidden")
  }, [mobileOpen])

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50/50 text-slate-900">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main ref={mainRef} className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}