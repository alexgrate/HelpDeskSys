import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, ChevronDown, MoreHorizontal, UserPlus, ArrowUpRightFromSquare, CheckCircle2, AlertOctagon, Flame, Signal, Minus, Clock, Search, User as UserIcon, X, Check } from "lucide-react";
import { cn } from "../../utils/cn";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../../utils/apiFetch";
import { getSlaMetrics } from "../../utils/sla";

const priorityStyle = {
  Critical: { dot: "bg-rose-500", chip: "bg-rose-50 text-rose-700 border-rose-100", icon: Flame },
  High: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700 border-amber-100", icon: AlertOctagon },
  Medium: { dot: "bg-blue-500", chip: "bg-blue-50 text-blue-700 border-blue-100", icon: Signal },
  Low: { dot: "bg-slate-400", chip: "bg-slate-50 text-slate-500 border-slate-200", icon: Minus },
};

const statusStyle = {
  "Submitted": "bg-slate-50 text-slate-700 border-blue-200",
  "Pending Approval": "bg-amber-50 text-amber-700 border-amber-200",
  "Open": "bg-blue-50 text-blue-700 border-blue-200",
  "In Progress": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Resolved": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Closed": "bg-slate-100 text-slate-600 border-slate-200",
};

const PRIORITY_OPTIONS = ["Critical", "High", "Medium", "Low"];
const SLA_OPTIONS = ["Breached", "At Risk", "On Track"];
const ASSIGNEE_OPTIONS = [
  { k: "unassigned", label: "Unassigned" },
  { k: "me", label: "Assigned to Me" },
  { k: "others", label: "Assigned to Others" },
];

export function TicketTable({ tickets = [], isLoading, error, currentUser, onTicketUpdate }) {
  const [searchParams, setSearchParams] = useSearchParams()

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [active, setActive] = useState(null);
  const [statusFilter, setStatusFilter] = useState("Active Unassigned")

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [deptOptions, setDeptOptions] = useState([])

  const [filterDept, setFilterDept] = useState("")
  const [filterPriority, setFilterPriority] = useState("")
  const [filterSla, setFilterSla] = useState("")
  const [filterAssignee, setFilterAssignee] = useState("")

  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const urlQuery = searchParams.get("q")
    if (urlQuery !== null) {
      setQuery(urlQuery)
    }
  }, [searchParams])

  const handleLocalQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val)
    if (!val) {
      setSearchParams({})
    } else {
      setSearchParams({ q: val })
    }
  }

  useEffect(() => {
    const fetchDynamicCategories = async () => {
      try {
        const res = await apiFetch("/categories/")
        if (res.ok) {
          const data = await res.json()
          setDeptOptions(data.map((c) => ({ k: c.key, label: c.label })))
        }
      } catch (err) {
        console.error("Failed to load dynamic departments for filtering:", err)
      }
    }
    fetchDynamicCategories()
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const counts = useMemo(() => {
    return {
      unassigned: tickets.filter(
        (t) => !t.assignee && t.status !== "Resolved" && t.status !== "Closed" && t.status !== "Pending Approval"
      ).length,
      myWorkload: tickets.filter(
        (t) => t.assignee === currentUser?.id && t.status !== "Resolved" && t.status !== "Closed"
      ).length,
      history: tickets.filter(
        (t) => t.status === "Resolved" || t.status === "Closed"
      ).length,
    }
  }, [tickets, currentUser]);

  // filters
  const rows = useMemo(() => {
    let filtered = [...tickets]
    const q = query.toLowerCase().trim();

    // Text Search Input
    if (q) {
      filtered = filtered.filter(
        (t) => 
          t.ticket_id.toLowerCase().includes(q) ||
          t.summary.toLowerCase().includes(q) ||
          t.submitted_by_email.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      )
    }

    // Tab Filter States
    if (statusFilter === "Active Unassigned") {
      filtered = filtered.filter(
        (t) => 
          !t.assignee &&
          t.status !== "Resolved" &&
          t.status !== "Closed" &&
          t.status !== "Pending Approval"
      )
    } else if (statusFilter === "My Active") {
      filtered = filtered.filter(
        (t) => t.assignee === currentUser?.id && t.status !== "Resolved" && t.status !== "Closed"
      )
    } else if (statusFilter === "Resolved/Closed") {
      filtered = filtered.filter(
        (t) => t.status === "Resolved" || t.status === "Closed"
      )
    }

    // Department
    if (filterDept) {
      filtered = filtered.filter((t) => t.category === filterDept)
    }

    // Priority
    if (filterPriority) {
      filtered = filtered.filter((t) => t.priority === filterPriority)
    }

    // SLA Breach status
    if (filterSla) {
      filtered = filtered.filter((t) => {
        const sla = getSlaMetrics(t.created_at, t.priority, t.status, t.resolved_at, t.sla_hours);        const isResolved = t.status === "Resolved" || t.status === "Closed";
        const breached = sla.remainingMin < 0 && !isResolved;
        const isAtRisk = sla.remainingMin >= 0 && sla.remainingMin < 45 && !isResolved;

        if (filterSla === "Breached") return breached;
        if (filterSla === "At Risk") return isAtRisk;
        if (filterSla === "On Track") return !breached && !isAtRisk && !isResolved;
        return true;
      });
    }

    //  Assignee allocation
    if (filterAssignee) {
      filtered = filtered.filter((t) => {
        if (filterAssignee === "unassigned") return !t.assignee;
        if (filterAssignee === "me") return t.assignee === currentUser?.id;
        if (filterAssignee === "others") return t.assignee && t.assignee !== currentUser?.id;
        return true;
      });
    }
    
    // SLA sorting
    return [...filtered].sort((a, b) => {
      const isA_Resolved = a.status === "Resolved" || a.status === "Closed";
      const isB_Resolved = b.status === "Resolved" || b.status === "Closed";

      if (isA_Resolved && !isB_Resolved) return 1;
      if (!isA_Resolved && isB_Resolved) return -1;
      if (isA_Resolved && isB_Resolved) {
        return new Date(b.resolved_at || b.updated_at) - new Date(a.resolved_at || a.updated_at);
      }

      const slaA = getSlaMetrics(a.created_at, a.priority, a.status, a.resolved_at, a.sla_hours);
      const slaB = getSlaMetrics(b.created_at, b.priority, b.status, b.resolved_at, a.sla_hours);

      const isA_Breached = slaA.remainingMin < 0;
      const isB_Breached = slaB.remainingMin < 0;

      if (isA_Breached && !isB_Breached) return -1;
      if (!isA_Breached && isB_Breached) return 1;

      return new Date(a.created_at) - new Date(b.created_at);
    });
  }, [query, tickets, statusFilter, filterDept, filterPriority, filterSla, filterAssignee, currentUser]);

  const totalRowsCount = rows.length
  const totalPages = Math.ceil(totalRowsCount / pageSize) || 1

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return rows.slice(startIndex, startIndex + pageSize)
  }, [rows, currentPage, pageSize])

  useEffect(() => {
    setCurrentPage(1)
  }, [query, statusFilter, filterDept, filterPriority, filterSla, filterAssignee])

  const hasActiveFilters = filterDept || filterPriority || filterSla || filterAssignee;

  const resetAllFilters = () => {
    setFilterDept("")
    setFilterPriority("")
    setFilterSla("")
    setFilterAssignee("")
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden text-left relative" ref={dropdownRef}>
      <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-3 border-b border-slate-200">
        <div className="shrink-0">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">Ticket Queue</h2>
          <p className="text-xs text-slate-400 mt-0.5">{rows.length} tickets · live updates</p>
        </div>

        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg text-xs font-semibold shrink-0">
          {[
            { id: "Active Unassigned", label: "Unassigned", count: counts.unassigned },
            { id: "My Active", label: "My Workload", count: counts.myWorkload },
            { id: "Resolved/Closed", label: "History", count: counts.history }
          ].map((tab) => {
            const active = statusFilter === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-colors cursor-pointer text-[11px] font-bold border-0 outline-none bg-transparent", active ? "bg-white text-slate-900 shadow-sm border border-slate-200/50" : "text-slate-400 hover:text-slate-900"
                )}
              >
                <span>{tab.label}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[9px] font-black tracking-tight tabular-nums ml-1.5",
                  active ? "bg-slate-100 text-slate-700" : "bg-slate-200/60 text-slate-400"
                )}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>


        <div className="lg:ml-auto flex flex-wrap items-center gap-2 relative">
          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={handleLocalQueryChange}
              placeholder="Filter rows..."
              className="h-9 pl-8 pr-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 outline-none text-xs w-56 transition-colors"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === "dept" ? null : "dept")}
              className={cn(
                "h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer bg-white outline-none",
                filterDept ? "border-blue-300 bg-blue-50/20 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              <Filter className="size-3.5" />
              {filterDept ? `Dept: ${deptOptions.find(d => d.k === filterDept)?.label}` : "Department"}
              <ChevronDown className="size-3 text-slate-400" />
            </button>

            <AnimatePresence>
              {openDropdown === "dept" && (
                <DropdownMenu>
                  {deptOptions.map((opt) => (
                    <DropdownItem
                      key={opt.k}
                      label={opt.label}
                      active={filterDept === opt.k}
                      onClick={() => { setFilterDept(filterDept === opt.k ? "" : opt.k); setOpenDropdown(null); }}
                    />
                  ))}
                </DropdownMenu>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === "priority" ? null : "priority")}
              className={cn(
                "h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer bg-white outline-none",
                filterPriority ? "border-blue-300 bg-blue-50/20 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              <Filter className="size-3.5" />
              {filterPriority ? `Priority: ${filterPriority}` : "Priority"}
              <ChevronDown className="size-3 text-slate-400" />
            </button>

            <AnimatePresence>
              {openDropdown === "priority" && (
                <DropdownMenu>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <DropdownItem
                      key={opt}
                      label={opt}
                      active={filterPriority === opt}
                      onClick={() => { setFilterPriority(filterPriority === opt ? "" : opt); setOpenDropdown(null); }}
                    />
                  ))}
                </DropdownMenu>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === "sla" ? null : "sla")}
              className={cn(
                "h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer bg-white outline-none",
                filterSla ? "border-blue-300 bg-blue-50/20 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              <Filter className="size-3.5" />
              {filterSla ? `SLA: ${filterSla}` : "SLA Status"}
              <ChevronDown className="size-3 text-slate-400" />
            </button>

            <AnimatePresence>
              {openDropdown === "sla" && (
                <DropdownMenu>
                  {SLA_OPTIONS.map((opt) => (
                    <DropdownItem
                      key={opt}
                      label={opt}
                      active={filterSla === opt}
                      onClick={() => { setFilterSla(filterSla === opt ? "" : opt); setOpenDropdown(null); }}
                    />
                  ))}
                </DropdownMenu>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === "assignee" ? null : "assignee")}
              className={cn(
                "h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer bg-white outline-none",
                filterAssignee ? "border-blue-300 bg-blue-50/20 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              <Filter className="size-3.5" />
              {filterAssignee ? `Assignee: ${ASSIGNEE_OPTIONS.find(a => a.k === filterAssignee)?.label}` : "Assignee"}
              <ChevronDown className="size-3 text-slate-400" />
            </button>

            <AnimatePresence>
              {openDropdown === "assignee" && (
                <DropdownMenu>
                  {ASSIGNEE_OPTIONS.map((opt) => (
                    <DropdownItem
                      key={opt.k}
                      label={opt.label}
                      active={filterAssignee === opt.k}
                      onClick={() => { setFilterAssignee(filterAssignee === opt.k ? "" : opt.k); setOpenDropdown(null); }}
                    />
                  ))}
                </DropdownMenu>
              )}
            </AnimatePresence>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <X className="size-3.5" /> Clear filters
            </button>
          )}
        </div>
      </div>

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
              {paginatedRows.map((t, i) => (
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


      {!isLoading && !error && totalRowsCount > 0 && (
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="h-8 px-2 rounded-md bg-white border border-slate-200 text-xs font-bold text-slate-700 focus:border-blue-500 outline-none cursor-pointer"
            >
              {[10, 25, 50, 100].map(size => (
                <option key={size} value={size}>{size} per page</option>
              ))}
            </select>
            <span className="text-slate-400 font-medium ml-1">
              Showing {Math.min(totalRowsCount, (currentPage - 1) * pageSize + 1)}-{Math.min(totalRowsCount, currentPage * pageSize)} of {totalRowsCount} entries
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white text-slate-600 outline-none cursor-pointer transition"
            >
              Previous
            </button>
            
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              
              if (totalPages > 5 && Math.abs(currentPage - pageNum) > 1 && pageNum !== 1 && pageNum !== totalPages) {
                if (pageNum === 2 || pageNum === totalPages - 1) {
                  return <span key={pageNum} className="px-1 text-slate-300">...</span>;
                }
                return null;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    "size-8 rounded-lg text-xs font-bold outline-none cursor-pointer transition border border-transparent",
                    currentPage === pageNum ? "bg-blue-600 text-white shadow-sm" : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white text-slate-600 outline-none cursor-pointer transition"
            >
              Next
            </button>
          </div>
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
  const sla = getSlaMetrics(t.created_at, t.priority, t.status, t.resolved_at, t.sla_hours);

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
  const isPendingApproval = t.status?.startsWith("Pending") && t.status?.includes("Approval")
  const isAssignee = t.assignee === currentUser?.id;
  const isBreached = sla.remainingMin < 0 && !isResolvedOrClosed; 

  return (
    <>
      <motion.tr
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.03, duration: 0.25 }}
        onClick={() => navigate(`/tickets/${t.id}`)}
        className={cn(
          "transition-colors group cursor-pointer border-t border-slate-200",
          isBreached 
            ? "bg-rose-50/60 hover:bg-rose-50 border-l-4 border-l-rose-500" 
            : "hover:bg-slate-50/50 bg-white"
        )}
      >
        <td className={cn(
          "px-4 py-3.5 font-mono text-xs font-bold text-slate-900 whitespace-nowrap",
          isBreached ? "border-l-4 border-l-rose-500" : "border-l-4 border-l-transparent"
        )}>
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
          <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase" style={{ backgroundColor: `${t.category_color || '#64748b'}15`, borderColor: `${t.category_color || '#64748b'}30`, color: t.category_color || '#64748b'}} >
            {t.category_label || t.category}
          </span>
        </td>
        <td className="px-4 py-3.5 whitespace-nowrap">
          <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border", P.chip)}>
            <PIcon className="size-3" /> {t.priority}
          </span>
        </td>
        <td className="px-4 py-3.5 whitespace-nowrap">
          {isResolvedOrClosed ? (
            <div className="flex flex-col">
              <span className={cn(
                "flex items-center gap-1 text-[11px] font-bold",
                sla.remainingMin < 0 ? "text-rose-600" : "text-emerald-600"
              )}>
                <CheckCircle2 className="size-3.5 shrink-0" />
                {t.status === "Closed" ? "Closed / Rejected" : "Resolved"} in {formatSla(sla.totalMin - sla.remainingMin)}
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
            {t.status === "Submitted" ? "New" : t.status}
          </span>
        </td>
        <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          {!isResolvedOrClosed && !isPendingApproval && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-slate-100 transition cursor-pointer"
            >
              <MoreHorizontal className="size-4 text-slate-400" />
            </button>
          )}
        </td>
      </motion.tr>

      <AnimatePresence initial={false}>
        {active && !isResolvedOrClosed && (
          <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <td colSpan={7} className="bg-slate-50/50 px-4 py-2.5 border-t border-slate-200">
              {t.assignee && !isAssignee ? (
                <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 py-1">
                  <UserIcon className="size-4 text-blue-500" />
                  This ticket is currently assigned to and being worked on by <span className="text-slate-800 font-black">{t.assignee_name}</span>.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <QuickAction 
                    icon={UserPlus} 
                    label={isAssignee ? "Assigned to You" : "Assign to Me"} 
                    tone="primary" 
                    onClick={(e) => handleAction(e, "assign")} 
                    disabled={isAssignee}
                  />
                  
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

function DropdownMenu({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 mt-1.5 w-44 rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden z-50 p-1"
    >
      {children}
    </motion.div>
  )
}

function DropdownItem({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full h-8 px-2.5 rounded-lg text-left text-xs font-bold flex items-center justify-between transition-colors border-0 outline-none cursor-pointer",
        active ? "bg-blue-50 text-blue-700" : "bg-transparent text-slate-600 hover:bg-slate-50"
      )}
    >
      <span>{label}</span>
      {active && <Check className="size-3.5 text-blue-600 shrink-0" />}
    </button>
  );
}