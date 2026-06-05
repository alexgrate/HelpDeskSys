import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  Ticket as TicketIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  BookOpen,
  Search,
} from "lucide-react";
import { StaffShell } from "../components/helpdesk/StaffShell";
import { cn } from "../utils/cn";
import { apiFetch } from "../utils/apiFetch";

const API_BASE_URL = "http://127.0.0.1:8000/api";
const STEPS = ["Submitted", "Pending Manager Approval", "In Progress", "Resolved"];

export default function StaffPortal({ focusRequests }) {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const listRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("access_token");

    if (!token || !storedUser) {
      navigate("/login");
      return;
    }

    setUser(JSON.parse(storedUser));

    // Fetch only the logged-in user's tickets (automatically filtered by the backend queryset)
    const fetchMyTickets = async () => {
      try {
        const response = await apiFetch("/tickets/")
    

        if (!response.ok) {
          throw new Error("Unable to retrieve your tickets.");
        }

        const data = await response.json();
        setTickets(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyTickets();
  }, [navigate]);

  useEffect(() => {
    if (focusRequests && !isLoading) {
      setFilter("All");
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focusRequests, isLoading]);

  const filtered = tickets.filter(
    (t) =>
      (filter === "All" || t.status === filter) &&
      (t.title?.toLowerCase().includes(query.toLowerCase()) || 
       t.summary.toLowerCase().includes(query.toLowerCase()) || 
       t.ticket_id.toLowerCase().includes(query.toLowerCase())),
  );

  const counts = {
    All: tickets.length,
    open: tickets.filter((t) => t.status !== "Resolved" && t.status !== "Closed").length,
    resolved: tickets.filter((t) => t.status === "Resolved" || t.status === "Closed").length,
    pending: tickets.filter((t) => t.status === "Pending Manager Approval").length,
  };

  const firstName = user?.first_name || "Staff Member";
  const branchName = user?.branch || "Branch";

  return (
    <StaffShell>
      <div className="space-y-6 text-left">
        {/* Hero / CTA */}
        <section className="relative overflow-hidden rounded-2xl bg-slate-900 text-slate-100 p-6 md:p-8">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_top_right,_var(--primary)_0%,_transparent_60%)]" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-medium text-slate-300">
                Hello, {firstName} · {branchName}
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">
                Got an issue? Let's get it routed in 60 seconds.
              </h1>
              <p className="text-sm text-slate-400 mt-1.5 max-w-xl">
                File a new request or track the ones you've already raised. The system will auto-route it to the right
                team.
              </p>
            </div>
            <Link
              to="/tickets/new"
              className="shrink-0 inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-lg shadow-blue-500/20"
            >
              <Plus className="size-5" /> Create new ticket
            </Link>
          </div>
        </section>

        {/* Dynamic Quick stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="All requests" value={counts.All} icon={TicketIcon} tone="info" />
          <StatCard label="Open" value={counts.open} icon={Clock} tone="warning" />
          <StatCard label="Awaiting approval" value={counts.pending} icon={ShieldCheck} tone="primary" />
          <StatCard label="Resolved" value={counts.resolved} icon={CheckCircle2} tone="success" />
        </section>

        {/* My Requests list */}
        <section ref={listRef} className="rounded-2xl bg-white border border-slate-200 scroll-mt-20">
          <div className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">My requests</h2>
              <p className="text-xs text-slate-500 mt-0.5">Real-time status of every ticket you've raised.</p>
            </div>
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by ID or title…"
                  className="h-9 pl-9 pr-3 rounded-lg bg-white border border-slate-200 focus:border-blue-500 outline-none text-sm w-56"
                />
              </div>
            </div>
          </div>

          {/* Indicators */}
          {isLoading && (
            <div className="p-12 text-center text-xs font-bold text-slate-400">Loading your support history...</div>
          )}
          {error && (
            <div className="p-12 text-center text-xs font-bold text-rose-500">{error}</div>
          )}

          {!isLoading && !error && (
            <>
              <div className="flex gap-1 p-1 mx-5 mt-4 rounded-lg bg-slate-100 w-fit">
                {["All", "Submitted", "Pending Manager Approval", "In Progress", "Resolved"].map((f) => {
                  const active = filter === f;
                  return (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        "relative px-3 py-1.5 rounded-md text-[12.5px] font-medium transition-colors cursor-pointer",
                        active ? "text-slate-900" : "text-slate-500 hover:text-slate-900",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="staff-filter"
                          className="absolute inset-0 bg-white rounded-md shadow-sm border border-slate-200"
                        />
                      )}
                      <span className="relative">{f}</span>
                    </button>
                  );
                })}
              </div>

              <ul className="divide-y divide-slate-200 mt-2">
                {filtered.length === 0 && (
                  <li className="px-5 py-10 text-center text-sm text-slate-400">No requests match that filter.</li>
                )}
                {filtered.map((t, i) => (
                  <motion.li
                    key={t.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="px-5 py-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span className="font-mono">{t.ticket_id}</span>
                          <span>·</span>
                          <span className="uppercase">{t.category}</span>
                          <span>·</span>
                          <span>Submitted {new Date(t.created_at).toLocaleDateString()}</span>
                        </div>
                        <Link
                          to={`/tickets/${t.id}`}
                          className="block mt-1 text-sm font-semibold text-slate-900 hover:underline truncate"
                        >
                          {t.summary}
                        </Link>
                        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400">
                          {t.assignee_name ? (
                            <span>Assigned to {t.assignee_name}</span>
                          ) : (
                            <span>Waiting for assignment</span>
                          )}
                          <span>·</span>
                          <span>Updated {new Date(t.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <StatusBadge status={t.status} />
                    </div>

                    <ProgressSteps status={t.status} />
                  </motion.li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* KB Link */}
        <Link
          to="/kb"
          className="group block rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 p-5 hover:border-blue-300 transition-all shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="size-11 rounded-xl bg-blue-50 text-blue-600 grid place-items-center">
              <BookOpen className="size-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold tracking-tight text-slate-900">Browse the Knowledge Base first</div>
              <p className="text-xs text-slate-500 mt-0.5">
                140+ self-service guides — most VPN and printer issues are solved in under 3 minutes.
              </p>
            </div>
            <ArrowRight className="size-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </StaffShell>
  );
}

// Subcomponents
function StatCard({ label, value, icon: Icon, tone }) {
  const tones = {
    info: "text-blue-600 bg-blue-50 border-blue-100",
    warning: "text-amber-600 bg-amber-50 border-amber-100",
    primary: "text-indigo-600 bg-indigo-50 border-indigo-100",
    success: "text-emerald-600 bg-emerald-50 border-emerald-100",
  };
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center gap-3 shadow-sm text-left">
      <div className={cn("size-10 rounded-xl grid place-items-center border", tones[tone])}>
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-xl font-bold text-slate-900 leading-none">{value}</div>
        <div className="text-[11px] text-slate-400 font-medium mt-1">{label}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    Submitted: { cls: "bg-slate-100 text-slate-600 border-slate-200", icon: AlertCircle },
    "Pending Manager Approval": { cls: "bg-amber-50 text-amber-700 border-amber-200", icon: ShieldCheck },
    "In Progress": { cls: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
    Resolved: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    Closed: { cls: "bg-slate-100 text-slate-600 border-slate-200", icon: CheckCircle2 }
  };
  const badge = map[status] || map.Submitted;
  const { cls, icon: Icon } = badge;
  return (
    <span className={cn("shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full border", cls)}>
      <Icon className="size-3" /> {status}
    </span>
  );
}

function ProgressSteps({ status }) {
  const currentIdx = STEPS.indexOf(status);
  return (
    <div className="mt-3 flex items-center gap-2">
      {STEPS.map((s, i) => {
        const done = i <= currentIdx;
        const current = i === currentIdx && status !== "Resolved";
        return (
          <div key={s} className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: done ? "100%" : "0%" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className={cn(
                  "h-full rounded-full",
                  status === "Resolved" || status === "Closed" ? "bg-emerald-500" : current ? "bg-blue-500" : "bg-indigo-600"
                )}
              />
            </div>
            <span className={cn("text-[10px] whitespace-nowrap hidden lg:inline", done ? "text-slate-800 font-medium" : "text-slate-400")}>
              {s}
            </span>
          </div>
        );
      })}
    </div>
  );
}