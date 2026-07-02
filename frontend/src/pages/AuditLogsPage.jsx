import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollText, Search, Filter, Download, ShieldCheck, ShieldAlert, UserCog, Settings2, Eye, Lock, LogIn, RefreshCw, Calendar, ChevronDown, Loader2, AlertCircle } from "lucide-react";
import { cn } from "../utils/cn";
import { apiFetch } from "../utils/apiFetch";

const CATEGORIES = ["All", "Approval", "SLA", "Role", "Auth", "Ticket", "Config", "Access"];

const catIcon = {
  Approval: ShieldCheck,
  SLA: RefreshCw,
  Role: UserCog,
  Auth: LogIn,
  Ticket: ScrollText,
  Config: Settings2,
  Access: Eye,
};

export default function AuditLogsPage() {
  const PAGE_SIZE = 25;

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [range, setRange] = useState("Last 24 hours");

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [stats, setStats] = useState({ total: 0, critical: 0, auth: 0, config: 0 });

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const fetchSystemLogs = async () => {
      setIsLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ category: cat, page: String(page) });
        if (debouncedQuery.trim()) params.set("search", debouncedQuery.trim());
        const res = await apiFetch(`/audit-logs/?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data.results ?? []);
          setTotalCount(data.count ?? 0);
          setHasNext(Boolean(data.next));
          setHasPrev(Boolean(data.previous));
          setStats(data.stats ?? { total: data.count ?? 0, critical: 0, auth: 0, config: 0 });
        } else {
          setError("Failed to retrieve system compliance records.");
        }
      } catch (err) {
        setError("Network error. Unable to connect to system ledger.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSystemLogs();
  }, [cat, debouncedQuery, page]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const selectCategory = (c) => {
    setCat(c);
    setPage(1);
  };

  return (
    <div className="space-y-6 text-left font-sans">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
            <ScrollText className="size-3.5 text-blue-600" /> Compliance & internal control
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Global audit logs</h1>
          <p className="text-xs text-slate-500 mt-1">
            Read-only, immutable trail of every action across the help desk. Retained for 7 years per CBN guidance [2].
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer shadow-sm">
            <Download className="size-4 text-slate-400" /> Export CSV
          </button>
          <button className="h-9 px-4 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-blue-700 transition shadow-sm cursor-pointer border-0">
            <Lock className="size-4" /> Request raw signed bundle
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Total events" value={(stats.total ?? 0).toLocaleString()} tone="info" icon={ScrollText} />
        <Stat label="Critical actions" value={stats.critical ?? 0} tone="critical" icon={ShieldAlert} />
        <Stat label="Auth events" value={stats.auth ?? 0} tone="warning" icon={LogIn} />
        <Stat label="Config changes" value={stats.config ?? 0} tone="primary" icon={Settings2} />
      </section>

      <div className="rounded-2xl bg-white border border-slate-200 p-4 flex flex-col lg:flex-row gap-3 lg:items-center shadow-sm">
        <div className="relative flex-1">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actor email, action, or ticket ID…"
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 outline-none text-xs font-semibold"
          />
        </div>

        <button className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 flex items-center gap-2 hover:bg-slate-50 cursor-pointer">
          <Calendar className="size-4 text-slate-400" />
          {range}
          <ChevronDown className="size-3.5 text-slate-400" />
        </button>

        <div className="hidden lg:block h-6 w-px bg-slate-200" />

        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => {
            const active = cat === c;
            return (
              <button
                key={c}
                onClick={() => selectCategory(c)}
                className={cn(
                  "px-3.5 h-8 text-xs rounded-full border transition font-bold cursor-pointer",
                  active
                    ? "bg-blue-600 text-white border-transparent shadow-sm"
                    : "bg-white text-slate-500 border-slate-200 hover:text-slate-800",
                )}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 h-12 flex items-center justify-between border-b border-slate-200 bg-slate-50/50">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="size-3.5 text-blue-600" /> Showing {logs.length} of {totalCount.toLocaleString()} events
          </div>
          <div className="text-[10px] text-slate-400 font-bold uppercase">Sorted by most recent</div>
        </div>

        {isLoading && (
          <div className="p-12 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin text-blue-600" /> Resolving system logs...
          </div>
        )}

        {error && (
          <div className="p-12 text-center text-xs font-bold text-rose-500 bg-rose-50 border border-rose-100 flex items-center justify-center gap-2">
            <AlertCircle className="size-4" /> {error}
          </div>
        )}

        {!isLoading && !error && logs.length === 0 && (
          <div className="p-12 text-center text-xs font-bold text-slate-400">
            No compliance log records found matching those parameters.
          </div>
        )}

        {!isLoading && !error && logs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
                  <th className="text-left font-bold py-2.5 pl-5 w-40">Date / Time</th>
                  <th className="text-left font-bold py-2.5">Actor</th>
                  <th className="text-left font-bold py-2.5">Action</th>
                  <th className="text-left font-bold py-2.5 w-28">Ticket</th>
                  <th className="text-left font-bold py-2.5 w-36">IP / Device</th>
                  <th className="text-right font-bold py-2.5 pr-5 w-28">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((l, i) => {
                  const Icon = catIcon[l.category] || ScrollText;
                  return (
                    <motion.tr
                      key={`${l.ts}-${i}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.015, 0.2) }}
                      className="hover:bg-slate-50/50"
                    >
                      <td className="py-3.5 pl-5 align-top">
                        <div className="text-[11.5px] font-bold font-mono text-slate-700 tabular-nums">{l.ts}</div>
                        <div className="text-[10px] text-slate-400 font-bold">{l.date}</div>
                      </td>
                      <td className="py-3.5 align-top">
                        <div className="font-bold text-slate-800 text-xs">{l.actor}</div>
                        <div className="text-[10px] text-slate-400 font-bold">{l.email}</div>
                      </td>
                      <td className="py-3.5 align-top">
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 size-6 rounded-md bg-slate-100 text-slate-400 border border-slate-200/50 grid place-items-center shrink-0">
                            <Icon className="size-3.5" />
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-700">{l.action}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{l.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 align-top">
                        {l.ticket ? (
                          <Link to={`/tickets/${l.ticket}`} className="font-mono text-xs font-bold text-blue-600 hover:underline">
                            {l.ticket}
                          </Link>
                        ) : (
                          <span className="text-slate-400 font-bold">—</span>
                        )}
                      </td>
                      <td className="py-3.5 align-top">
                        <div className="text-[11.5px] font-bold font-mono text-slate-500 tabular-nums">{l.ip}</div>
                        <div className="text-[10px] text-slate-400 font-bold">{l.device}</div>
                      </td>
                      <td className="py-3.5 pr-5 align-top text-right">
                        <SeverityPill s={l.severity} />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !error && totalCount > 0 && (
          <div className="px-5 h-12 flex items-center justify-between border-t border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase">
            <div>Page {page} of {totalPages} · {totalCount.toLocaleString()} total records</div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!hasPrev}
                className="px-3 h-8 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white text-slate-600 cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNext}
                className="px-3 h-8 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white text-slate-600 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }) {
  const tones = {
    info: "text-sky-600 bg-sky-50 border-sky-100",
    critical: "text-rose-600 bg-rose-50 border-rose-100",
    warning: "text-amber-600 bg-amber-50 border-amber-200",
    primary: "text-blue-600 bg-blue-50 border-blue-100",
  };
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center gap-3 shadow-sm text-left">
      <div className={cn("size-10 rounded-xl grid place-items-center border", tones[tone])}>
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-xl font-black text-slate-900 tabular-nums tracking-tight leading-none">{value}</div>
        <div className="text-[11px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

function SeverityPill({ s }) {
  const map = {
    Info: "bg-slate-50 text-slate-500 border-slate-200",
    Notice: "bg-sky-50 text-sky-700 border-sky-100",
    Warning: "bg-amber-50 text-amber-700 border-amber-200",
    Critical: "bg-rose-50 text-rose-700 border-rose-100",
  };
  return (
    <span className={cn("inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase", map[s])}>
      {s}
    </span>
  );
}