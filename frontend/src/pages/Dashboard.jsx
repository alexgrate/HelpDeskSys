import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppShell } from "../components/helpdesk/AppShell";
import { MetricCards } from "../components/helpdesk/MetricCards";
import { TicketTable } from "../components/helpdesk/TicketTable";
import { apiFetch } from "../utils/apiFetch";
import { API_BASE_URL } from "../utils/apiFetch";


export default function Dashboard() {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Retrieve authenticated user session
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("access_token");

    if (!token || !storedUser) {
      navigate("/login");
      return;
    }

    setUser(JSON.parse(storedUser));

    // 2. Fetch all tickets 
    const fetchQueue = async () => {
      try {
        const response = await apiFetch("/tickets/")

        if (!response.ok) {
          throw new Error("Failed to load queue. Please check your credentials.");
        }

        const data = await response.json();
        setTickets(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQueue();
  }, [navigate]);

  const firstName = user?.first_name || "Help Desk";

  return (
    <AppShell>
      <div className="space-y-6 text-left">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Good morning, {firstName}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Here's the operational pulse across all branches.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All systems operational
            </span>
          </div>
        </div>

        {/* Distributed State Props */}
        <MetricCards tickets={tickets} />
        <TicketTable
          tickets={tickets}
          isLoading={isLoading}
          error={error}
          currentUser={user}
          onTicketUpdate={(updated) =>
            setTickets(prev => prev.map(t => t.id === updated.id ? updated : t))
          }
        />
      </div>
    </AppShell>
  );
}