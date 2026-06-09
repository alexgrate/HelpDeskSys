import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Filter, ChevronDown, MoreHorizontal, UserPlus, ArrowUpRightFromSquare, CheckCircle2,
  AlertOctagon, Flame, Signal, Minus, Clock, Search, User as UserIcon
} from "lucide-react";
import { cn } from "../../utils/cn";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../utils/apiFetch";
import { getSlaMetrics } from "../../utils/sla";

const priorityStyle = {
  Critical: { dot: "bg-rose-500", chip: "bg-rose-50 text-rose-700 border-rose-100", icon: Flame },
  High: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700 border-amber-100", icon: AlertOctagon },
  Medium: { dot: "bg-blue-500", chip: "bg-blue-50 text-blue-700 border-blue-100", icon: Signal },
  Low: { dot: "bg-slate-400", chip: "bg-slate-50 text-slate-500 border-slate-200", icon: Minus },
};

const statusStyle = {
  "Submitted": "bg-slate-100 text-slate-600 border-slate-200",
  "Pending Manager Approval": "bg-amber-50 text-amber-700 border-amber-200",
  "Open": "bg-blue-50 text-blue-700 border-blue-200",
  "In Progress": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Resolved": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Closed": "bg-slate-100 text-slate-600 border-slate-200",
};

const categoryStyle = {
  "it": "bg-sky-50 text-sky-700 border-sky-100",
  "core": "bg-violet-50 text-violet-700 border-violet-100",
  "cards": "bg-rose-50 text-rose-700 border-rose-100",
  "facilities": "bg-amber-50 text-amber-700 border-amber-100",
  "hr": "bg-emerald-50 text-emerald-700 border-emerald-100",
  "compliance": "bg-indigo-50 text-indigo-700 border-indigo-100",
};

const FILTERS = ["Department", "Priority", "SLA Status", "Assignee"];

export function TicketTable({ tickets = [], isLoading, error, onTicketUpdate }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(null);

  // 1. FIXED: Sorting algorithm prioritizing breached tickets to the top [4]
  const rows = useMemo(() => {
    const q = query.toLowerCase().trim();
    
    // Filter rows by query
    const filtered = tickets.filter(
      (t) =>
        t.ticket_id.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.submitted_by_email.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );

    // Sort by operational priority
    return [...filtered].sort((a, b) => {
      const isA_Resolved = a.status === "Resolved" || a.status === "Closed";
      const isB_Resolved = b.status === "Resolved" || b.status === "Closed";

      // Put resolved/closed tickets at the very bottom
      if (isA_Resolved && !isB_Resolved) return 1;
      if (!isA_Resolved && isB_Resolved) return -1;
      if (isA_Resolved && isB_Resolved) {
        // If both are resolved, sort newest-first [4]
        return new Date(b.updated_at) - new Date(a.updated_at);
      }

      // Calculate SLA remaining minutes for active tickets
      const slaA = getSlaMetrics(a.created_at, a.priority, a.status, a.updated_at);
      const slaB = getSlaMetrics(b.created_at, b.priority, b.status, b.updated_at);

      const isA_Breached = slaA.remainingMin < 0;
      const isB_Breached = slaB.remainingMin < 0;

      // Put breached (overdue) tickets above on-track tickets
      if (isA_Breached && !isB_Breached) return -1;
      if (!isA_Breached && isB_Breached) return 1;

      // If both are breached, or both are on-track:
      // Sort oldest-first to prioritize older pending issues
      return new Date(a.created_at) - new Date(b.created_at);
    });
  }, [query, tickets]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden text-left">
      {/* Toolbar */}
      <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-3 border-b border-slate-200">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">Ticket Queue</h2>
          <p className="text-xs text-slate-400 mt-0.5">{rows.length} tickets · live updates</p>
        </div>
        <div className="lg:ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter rows..."
              className="h-9 pl-8 pr-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 outline-none text-xs w-56 transition-colors"
            />
          </div>
          {FILTERS.map((f) => (
            <button
              key={f}
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-600 transition-colors cursor-pointer"
            >
              <Filter className="size-3.5 text-slate-400" />
              {f}
              <ChevronDown className="size-3.5 text-slate-400" />
            </button>
          ))}
        </div>
      </div>

      {/* Loading States */}
      {isLoading && (
        <div className="p-12 text-center text-xs font-bold text-slate-400">Loading live queue...</div>
      )}
      {error && (
        <div className="p-12 text-center text-xs font-bold text-rose-500 bg-rose-50/20">{error}</div>
      )}
      {!isLoading && !error && rows.length === 0 && (
        <div className="p-12 text-center text-xs font-bold text-slate-400">Queue is completely clear.</div>
      )}

      {/* Table */}
      {!isLoading && !error && rows.length > 0 && (
        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50/50 border-b border-slate-200">
                {["Ticket", "Requester", "Category", "Priority", "SLA Status", "Status", ""].map((h) => (
                  <th key={h} className="text-left font-bold px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((t, i) => (
                <TicketRow 
                  key={t.id} 
                  t={t} 
                  i={i} 
                  active={active === t.id} 
                  onToggle={() => setActive(active === t.id ? null : t.id)} 
                  onTicketUpdate={onTicketUpdate}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TicketRow({ t, i, active, onToggle, onTicketUpdate }) {
  const navigate    = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const P           = priorityStyle[t.priority] || priorityStyle.Medium;
  const PIcon       = P.icon;
  const sla         = getSlaMetrics(t.created_at, t.priority, t.status, t.updated_at);

  const handleAction = async (e, actionType) => {
    e.stopPropagation(); 
    let body = {};
    if (actionType === "assign") body = { assignee: currentUser.id };
    if (actionType === "resolve") body = { status: "Resolved" };
    
    if (actionType === "escalate") {
      const nextPriority = t.priority === "Low" ? "Medium" : t.priority === "Medium" ? "High" : "Critical";
      body = { priority: nextPriority };
    }

    try {
      const res = await apiFetch(`/tickets/${t.id}/`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        onTicketUpdate?.(updated);
      }
    } catch (err) {
      console.error("Quick action failed:", err);
    }
  };

  const isResolvedOrClosed = t.status === "Resolved" || t.status === "Closed";
  const isAssignee = t.assignee === currentUser?.id;
  const isBreached = sla.remainingMin < 0 && !isResolvedOrClosed; // Active and overdue

  return (
    <>
      <motion.tr
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.03, duration: 0.25 }}
        onClick={() => navigate(`/tickets/${t.id}`)}
        className={cn(
          "transition-colors group cursor-pointer border-t border-slate-200",
          // FIXED: Red border-left and light rose background highlight for overdue rows [4]
          isBreached 
            ? "bg-rose-50/60 hover:bg-rose-50 border-l-4 border-l-rose-500" 
            : "hover:bg-slate-50/50 bg-white"
        )}
      >
        <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
          <span className="text-slate-400">#</span>{t.ticket_id}
        </td>
        <td className="px-4 py-3.5 whitespace-nowrap">
          <div className="font-semibold text-slate-900 text-xs">{t.submitted_by_email.split('@')[0]}</div>
          <div className="text-[10px] text-slate-400 font-medium">
            {t.branch || "HQ"}
            {t.assignee_name && (
              <span className="text-blue-600 font-bold ml-1.5">· Assigned: {t.assignee_name}</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3.5 whitespace-nowrap">
          <span className={cn("inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase", categoryStyle[t.category])}>
            {t.category}
          </span>
        </td>
        <td className="px-4 py-3.5 whitespace-nowrap">
          <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border", P.chip)}>
            <PIcon className="size-3" /> {t.priority}
          </span>
        </td>
        <td className="px-4 py-3.5 whitespace-nowrap">
          {/* Resolved/Closed display a final resolution time summary, hiding progress bar */}
          {isResolvedOrClosed ? (
            <div className="flex flex-col">
              <span className={cn(
                "flex items-center gap-1 text-[11px] font-bold",
                sla.remainingMin < 0 ? "text-rose-600" : "text-emerald-600"
              )}>
                <CheckCircle2 className="size-3.5 shrink-0" />
                Resolved in {formatSla(sla.totalMin - sla.remainingMin)}
              </span>
              {sla.remainingMin < 0 && (
                <span className="text-[9px] text-rose-500 font-bold uppercase tracking-wider mt-0.5 animate-pulse">SLA Breached</span>
              )}
            </div>
          ) : (
            <SlaBar total={sla.totalMin} remaining={sla.remainingMin} />
          )}
        </td>
        <td className="px-4 py-3.5 whitespace-nowrap">
          <span className={cn("inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border", statusStyle[t.status] || "bg-slate-50")}>
            {t.status}
          </span>
        </td>
        <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          {!isResolvedOrClosed && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-slate-100 transition cursor-pointer"
            >
              <MoreHorizontal className="size-4 text-slate-400" />
            </button>
          )}
        </td>
      </motion.tr>

      {/* Expanded details actions panel */}
      <AnimatePresence initial={false}>
        {active && !isResolvedOrClosed && (
          <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <td colSpan={7} className="bg-slate-50/50 px-4 py-2.5 border-t border-slate-200">
              {t.assignee && !isAssignee ? (
                // Notice for other operators if already claimed [4]
                <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 py-1">
                  <UserIcon className="size-4 text-blue-500" />
                  This ticket is currently assigned to and being worked on by <span className="text-slate-800 font-black">{t.assignee_name}</span>.
                </div>
              ) : (
                // Actions available for unassigned or assigned agent
                <div className="flex flex-wrap gap-2">
                  <QuickAction 
                    icon={UserPlus} 
                    label={isAssignee ? "Assigned to You" : "Assign to Me"} 
                    tone="primary" 
                    onClick={(e) => handleAction(e, "assign")} 
                    disabled={isAssignee}
                  />
                  
                  {/* Enforce that an agent must take active ownership before resolving or escalating [4] */}
                  <QuickAction 
                    icon={ArrowUpRightFromSquare} 
                    label="Escalate Priority" 
                    tone="warning" 
                    onClick={(e) => handleAction(e, "escalate")} 
                    disabled={!isAssignee}
                  />
                  <QuickAction 
                    icon={CheckCircle2} 
                    label="Mark Resolved" 
                    tone="success" 
                    onClick={(e) => handleAction(e, "resolve")} 
                    disabled={!isAssignee}
                  />
                </div>
              )}
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
}

function SlaBar({ total, remaining }) {
  const breached = remaining < 0;
  const pct = breached ? 100 : Math.max(0, Math.min(100, ((total - remaining) / total) * 100));
  const tone = breached || pct >= 85 ? "bg-rose-500" : pct >= 65 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="min-w-[120px]">
      <div className="flex items-center justify-between text-[11px] font-medium mb-1">
        <span className={cn("flex items-center gap-1", breached ? "text-rose-600 font-bold animate-pulse" : "text-slate-400")}>
          <Clock className="size-3" />
          {breached ? "Breached " : ""}{formatSla(remaining)}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className={cn("h-full rounded-full", tone)}
        />
      </div>
    </div>
  );
}

function formatSla(min) {
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = min < 0 ? "-" : "";
  if (h > 0) return `${sign}${h}h ${m}m`;
  return `${sign}${m}m`;
}

function QuickAction({ icon: Icon, label, tone, onClick, disabled }) {
  const toneCls = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 border-transparent disabled:opacity-55 disabled:cursor-not-allowed",
    warning: "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 disabled:opacity-55 disabled:cursor-not-allowed",
    success: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 disabled:opacity-55 disabled:cursor-not-allowed",
  }[tone];
  return (
    <motion.button
      whileHover={disabled ? {} : { y: -1 }} 
      whileTap={disabled ? {} : { scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={cn("inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer", toneCls)}
    >
      <Icon className="size-3.5" /> {label}
    </motion.button>
  );
}