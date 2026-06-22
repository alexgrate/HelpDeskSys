import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Ticket as TicketIcon, CheckCircle2, Clock, AlertCircle, ShieldCheck, ArrowRight, BookOpen, Search, } from "lucide-react";
import { StaffShell } from "../components/helpdesk/StaffShell";
import { cn } from "../utils/cn";
import { apiFetch } from "../utils/apiFetch";
import { API_BASE_URL } from "../utils/apiFetch";

const STEPS = ["New", "Pending Approval", "In Progress", "Resolved"];

export default function StaffPortal({ focusRequests }) {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  const [filter, setFilter] = useState("Active");
  const listRef = useRef(null);
  const navigate = useNavigate();


  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("q") || "");

  useEffect(() => {
    const urlQuery = searchParams.get("q");
    if (urlQuery !== null) {
      setQuery(urlQuery);
    }
  }, [searchParams]);

  const handleLocalQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (!val) {
      setSearchParams({}); 
    } else {
      setSearchParams({ q: val });
    }
  };

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

  const filtered = tickets.filter((t) =>{
    const matchesSearch = t.summary.toLowerCase().includes(query.toLowerCase()) || t.ticket_id.toLowerCase().includes(query.toLowerCase())

    if (!matchesSearch) return false

    if (filter === "All") return true;
    if (filter === "Active") {
      return t.status !== "Resolved" && t.status !== "Closed"
    }
    return t.status === filter
  });

  const counts = {
    All: tickets.length,
    open: tickets.filter((t) => t.status !== "Resolved" && t.status !== "Closed").length,
    resolved: tickets.filter((t) => t.status === "Resolved" || t.status === "Closed").length,
    pending: tickets.filter((t) => t.status === "Pending Approval").length,
  };

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5; 

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, query]);

  const totalFilteredCount = filtered.length;
  const totalPages = Math.ceil(totalFilteredCount / pageSize) || 1;

  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  }, [filtered, currentPage]);

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
                  onChange={handleLocalQueryChange}
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
                {["Active", "All", "Submitted", "Pending Approval", "In Progress", "Resolved"].map((f) => {
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
                {paginatedRequests.map((t, i) => (
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
                      <StatusBadge status={t.status} pendingApprover={t.pending_approver_role} />
                    </div>

                    <ProgressSteps status={t.status} approvalSequence={t.approval_sequence} activeApprovalStep={t.active_approval_step} />
                  </motion.li>
                ))}
              </ul>

               {totalFilteredCount > pageSize && (
                <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 bg-slate-50/50 rounded-b-2xl">
                  <span>
                    Showing {Math.min(totalFilteredCount, (currentPage - 1) * pageSize + 1)}-{Math.min(totalFilteredCount, currentPage * pageSize)} of {totalFilteredCount} requests
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-600 cursor-pointer outline-none transition"
                    >
                      Previous
                    </button>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-600 cursor-pointer outline-none transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
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

function StatusBadge({ status, pendingApprover }) {
  const map = {
    Submitted: { cls: "bg-blue-50 text-blue-700 border-blue-200", icon: AlertCircle },
    "Pending Approval": { cls: "bg-amber-50 text-amber-700 border-amber-200", icon: ShieldCheck },
    "In Progress": { cls: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: Clock },
    Resolved: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    Closed: { cls: "bg-slate-100 text-slate-600 border-slate-200", icon: CheckCircle2 },
    "Returned for Update": { cls: "bg-rose-50 text-rose-700 border-rose-200 animate-pulse border-rose-300", icon: AlertCircle }
  };


  const badge = map[status] || map.Submitted;
  const { cls, icon: Icon } = badge;

  return (
    <span className={cn("shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full border", cls)}>
      <Icon className="size-3" /> 
      {status === "Pending Approval" && pendingApprover
        ? `Pending ${pendingApprover} Approval`
        : status === "Submitted" ? "New" : status}
    </span>
  );
}

function ProgressSteps({ status, approvalSequence = [], activeApprovalStep }) {

  const steps = ["New"]
  approvalSequence.forEach((role) => {
    steps.push(`${role} Approval`)
  })
  steps.push("In Progress", "Resolved")

  let currentIdx = 0;
  let isReturned = status === "Returned for Update";
  const isCompleted = status === "Resolved" || status === "Closed";


  if (isCompleted) {
    currentIdx = steps.indexOf("Resolved");
  } else if (status === "In Progress") {
    currentIdx = steps.indexOf("In Progress");
  } else if (isReturned) {
    currentIdx = 0; // Kicked back to the very beginning (New)
  } else if (status?.startsWith("Pending") && status?.includes("Approval") && activeApprovalStep) {
    // Math Shift: activeApprovalStep is 1-based (1 = HOD, 2 = Compliance)
    // We map it to currentIdx as activeApprovalStep - 1
    // This holds the bar back at index 0 (New) until HOD approves, index 1 (HOD) until Compliance approves, etc.
    currentIdx = Math.max(0, activeApprovalStep - 1);
  } else {
    currentIdx = 0; // Default fallback
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      {steps.map((s, i) => {
        const done = i < currentIdx;
        const current = i === currentIdx && !isCompleted;

        let widthPct = "0%";
        if (isCompleted || done) {
          widthPct = "100%";
        } else if (current) {
          widthPct = "50%"; // Active step displays as half-filled
        }

        let barColor = "bg-indigo-600"; // Completed steps display in solid indigo
        if (isCompleted) {
          barColor = "bg-emerald-500"; // Green color on resolution
        } else if (isReturned && current) {
          barColor = "bg-rose-500"; // Red highlight alert for returned stage
        } else if (current) {
          barColor = "bg-blue-500"; // Blue pulsing for normal active progress
        }

        return (
          <div key={s} className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: widthPct }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className={cn("h-full rounded-full", current && "animate-pulse", barColor)}
                />
            </div>
            <span className={cn(
              "text-[10px] whitespace-nowrap hidden lg:inline",
              done || isCompleted 
                ? "text-slate-800 font-medium" 
                : current 
                  ? isReturned ? "text-rose-600 font-bold" : "text-blue-600 font-bold"
                  : "text-slate-400"
            )}>
              {isReturned && current ? "Correction Required" : s}
            </span>
          </div>
        );
      })}
    </div>
  );
}