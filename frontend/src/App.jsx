import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import { Building2 } from "lucide-react";

// Page Views
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import StaffPortal from "./pages/StaffPortal";
import NewTicket from "./pages/NewTicket";
import TicketDetail from "./pages/TicketDetail";
import Approvals from "./pages/Approvals";

// Layout Shells
import { AppShell } from "./components/helpdesk/AppShell";
import { StaffShell } from "./components/helpdesk/StaffShell"; 

import { InactivityGuard } from "./components/helpdesk/InactivityGuard";


// Temporary Page Placeholder
function PagePlaceholder({ title }) {
  return (
    <div className="flex h-64 w-full items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-12 text-slate-400 text-sm bg-white font-sans">
      {title} page is currently under development.
    </div>
  );
}

/* ─────────────── 1. Frontend Route Guard Component ─────────────── */

function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("access_token");
  const userStr = localStorage.getItem("user");

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userStr);

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === "Staff") {
      return <Navigate to="/staff-portal" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

/* ─────────────── 2. Adaptive Shell Component ─────────────── */

function AdaptiveShell({ children }) {
  const userStr = localStorage.getItem("user");
  
  if (userStr) {
    const user = JSON.parse(userStr);
    if (user.role === "Staff") {
      return <StaffShell>{children}</StaffShell>;
    }
  }
  
  return <AppShell>{children}</AppShell>;
}

/* ─────────────── 3. Custom Secure 404 View ─────────────── */

function NotFound() {
  const token = localStorage.getItem("access_token");
  const userStr = localStorage.getItem("user");
  let redirectPath = "/login";

  if (token && userStr) {
    const user = JSON.parse(userStr);
    redirectPath = user.role === "Staff" ? "/staff-portal" : "/";
  }

  return (
    <div className="min-h-screen bg-[#0B1329] flex flex-col items-center justify-center p-6 text-center font-sans relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500 via-transparent to-transparent pointer-events-none" />
      <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

      <div className="relative space-y-6 max-w-sm z-10">
        <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-500 grid place-items-center shadow-lg shadow-blue-500/20">
          <Building2 className="h-6 w-6 text-white" />
        </div>

        <div className="space-y-2">
          <h1 className="text-5xl font-black text-white tracking-tight leading-none">404</h1>
          <h2 className="text-sm font-bold text-slate-200">Secure Sector Restricted</h2>
          <p className="text-slate-400 text-[11px] leading-relaxed max-w-xs mx-auto">
            The screen you are trying to access does not exist or requires security clearance parameters.
          </p>
        </div>

        <div className="pt-2">
          <Link
            to={redirectPath}
            className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            Return to Safe Zone
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── 4. Application Router ─────────────── */

export default function App() {
  return (
    <Router>
      <InactivityGuard>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Operational Dashboard Queue (Management & IT Roles Only) */}
          <Route path="/" element={
            <ProtectedRoute allowedRoles={["Agent", "Manager", "Admin"]}>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/my-tickets" element={
            <ProtectedRoute allowedRoles={["Agent", "Manager", "Admin"]}>
              <AppShell><PagePlaceholder title="My Tickets" /></AppShell>
            </ProtectedRoute>
          } />
          <Route path="/approvals" element={
            <ProtectedRoute allowedRoles={["Manager"]}>
              <Approvals />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute allowedRoles={["Agent", "Manager", "Admin"]}>
              <AppShell><PagePlaceholder title="Reports" /></AppShell>
            </ProtectedRoute>
          } />
          <Route path="/queues" element={
            <ProtectedRoute allowedRoles={["Agent", "Manager", "Admin"]}>
              <AppShell><PagePlaceholder title="Department Queues" /></AppShell>
            </ProtectedRoute>
          } />
          <Route path="/audit-logs" element={
            <ProtectedRoute allowedRoles={["Agent", "Manager", "Admin"]}>
              <AppShell><PagePlaceholder title="Audit Logs" /></AppShell>
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AppShell><PagePlaceholder title="Admin Control Panel" /></AppShell>
            </ProtectedRoute>
          } />

          {/* Staff Portal Specific Routes */}
          <Route path="/staff-portal" element={
            <ProtectedRoute allowedRoles={["Staff", "Agent", "Manager", "Admin"]}>
              <StaffPortal focusRequests={false} />
            </ProtectedRoute>
          } />
          <Route path="/staff-portal/requests" element={
            <ProtectedRoute allowedRoles={["Staff", "Agent", "Manager", "Admin"]}>
              <StaffPortal focusRequests={true} />
            </ProtectedRoute>
          } />
          <Route path="/tickets/new" element={
            <ProtectedRoute allowedRoles={["Staff", "Agent", "Manager", "Admin"]}>
              <NewTicket />
            </ProtectedRoute>
          } />

          {/* Shared Routes wrapped in the new AdaptiveShell wrapper */}
          <Route path="/tickets/:id" element={
            <ProtectedRoute allowedRoles={["Staff", "Agent", "Manager", "Admin"]}>
              <AdaptiveShell>
                <TicketDetail />
              </AdaptiveShell>
            </ProtectedRoute>
          } />
          <Route path="/kb" element={
            <ProtectedRoute allowedRoles={["Staff", "Agent", "Manager", "Admin"]}>
              <AdaptiveShell>
                <PagePlaceholder title="Knowledge Base Help Directory" />
              </AdaptiveShell>
            </ProtectedRoute>
          } />

          {/* 404 Fallback Catch-All Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </InactivityGuard>
    </Router>
  );
}