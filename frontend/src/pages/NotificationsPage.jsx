import React, { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, Filter, Search, Ticket, ShieldCheck, AlertTriangle, MessageSquare, UserCheck, Clock, Settings2, Trash2, Mail, MailOpen, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { cn } from "../utils/cn";
import { apiFetch } from "../utils/apiFetch";

const KIND_META = {
  sla: {
    label: "SLA",
    icon: AlertTriangle,
    tone: "bg-rose-50 text-rose-700 border-rose-100",
  },
  approval: {
    label: "Approval",
    icon: ShieldCheck,
    tone: "bg-amber-50 text-amber-700 border-amber-200",
  },
  mention: {
    label: "Mention",
    icon: MessageSquare,
    tone: "bg-sky-50 text-sky-700 border-sky-100",
  },
  assignment: {
    label: "Assignment",
    icon: UserCheck,
    tone: "bg-blue-50 text-blue-700 border-blue-100",
  },
  comment: {
    label: "Comment",
    icon: MessageSquare,
    tone: "bg-slate-50 text-slate-700 border-slate-100",
  },
  status: {
    label: "Status",
    icon: Ticket,
    tone: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  system: {
    label: "System",
    icon: Sparkles,
    tone: "bg-slate-50 text-slate-700 border-slate-100",
  },
};

const TABS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "mentions", label: "Mentions" },
  { id: "approvals", label: "Approvals" },
  { id: "sla", label: "SLA Alerts" },
];

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");

  // 1. Fetch User Notifications on mount [1]
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await apiFetch("/notifications/");
        if (res.ok) {
          setItems(await res.json());
        } else {
          setError("Failed to retrieve your notifications queue.");
        }
      } catch (err) {
        setError("Network error. Unable to load system notifications.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const counts = useMemo(
    () => ({
      all: items.length,
      unread: items.filter((n) => n.unread).length,
      mentions: items.filter((n) => n.kind === "mention").length,
      approvals: items.filter((n) => n.kind === "approval").length,
      sla: items.filter((n) => n.kind === "sla").length,
    }),
    [items]
  );

  const filtered = useMemo(() => {
    return items
      .filter((n) => {
        if (tab === "unread") return n.unread;
        if (tab === "mentions") return n.kind === "mention";
        if (tab === "approvals") return n.kind === "approval";
        if (tab === "sla") return n.kind === "sla";
        return true;
      })
      .filter((n) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q) ||
          n.actor_name?.toLowerCase().includes(q) ||
          n.ticket_id_ref?.toLowerCase().includes(q)
        );
      });
  }, [items, tab, query]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const n of filtered) {
      // Group dynamically by their relative date label (Today, Yesterday, Earlier)
      const groupLabel = n.time_label.includes("ago") || n.time_label.includes("now") ? "Today" : n.time_label;
      const list = map.get(groupLabel) ?? [];
      list.push(n);
      map.set(groupLabel, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  // Bulk read handler (POST) [1]
  const markAllRead = async () => {
    try {
      const res = await apiFetch("/notifications/mark_all_read/", { method: "POST" });
      if (res.ok) {
        setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
      }
    } catch (err) {
      console.error("Bulk read adjustment rejected by server:", err);
    }
  };
  
  // Single read status toggle (PATCH) [1]
  const toggleRead = async (id, currentUnreadState) => {
    try {
      const res = await apiFetch(`/notifications/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ unread: !currentUnreadState })
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((n) => (n.id === id ? { ...n, unread: !n.unread } : n))
        );
      }
    } catch (err) {
      console.error("Toggle request rejected by server:", err);
    }
  };
  
  // Dismissal handler (DELETE) [1]
  const remove = async (id) => {
    try {
      const res = await apiFetch(`/notifications/${id}/`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (err) {
      console.error("Dismissal rejected by server:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs font-bold text-slate-400 gap-2 min-h-[400px]">
        <Loader2 className="size-8 text-blue-600 animate-spin" />
        <p>Loading your system alerts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left font-sans">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <nav className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <Link to="/" className="hover:text-slate-800 transition">
              Dashboard
            </Link>
            <ChevronRight className="size-3" />
            <span className="text-slate-800 font-extrabold">Notifications</span>
          </nav>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Bell className="size-6 text-blue-600" />
            Notifications
            {counts.unread > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-rose-500 text-white text-xs font-black shadow-sm">
                {counts.unread}
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track operational updates, mentions, SLA warnings, and approval requests across your bank queues.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={markAllRead}
            className="h-9 px-3.5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 cursor-pointer shadow-sm transition"
          >
            <CheckCheck className="size-4" />
            Mark all read
          </button>
          <button className="h-9 px-3.5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 cursor-pointer shadow-sm transition">
            <Settings2 className="size-4" />
            Preferences
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pt-2">
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 w-fit">
          {TABS.map((t) => {
            const active = tab === t.id;
            const count = counts[t.id];
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer border-0 outline-none bg-transparent",
                  active ? "text-slate-900" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="notif-tab-pill"
                    className="absolute inset-0 bg-white rounded-lg border border-slate-200 shadow-sm"
                    transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  />
                )}
                <span className="relative">{t.label}</span>
                <span
                  className={cn(
                    "relative inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[9px] font-black",
                    active
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-200 text-slate-500"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notifications…"
              className="w-64 h-9 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none transition"
            />
          </div>
          <button className="h-9 px-3.5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 cursor-pointer shadow-sm transition">
            <Filter className="size-4 text-slate-400" />
            Filters
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-6">
        {error && (
          <div className="p-12 text-center text-xs font-bold text-rose-500 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center gap-2">
            <AlertCircle className="size-4" /> {error}
          </div>
        )}

        {!error && (
          <AnimatePresence initial={false}>
            {grouped.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm"
              >
                <div className="mx-auto size-12 rounded-full bg-slate-50 border border-slate-100 grid place-items-center">
                  <Bell className="size-5 text-slate-400" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-900">You're all caught up</h3>
                <p className="mt-1 text-xs text-slate-500 font-semibold">
                  No active notifications match your filter parameters.
                </p>
              </motion.div>
            )}

            {grouped.map(([group, list]) => (
              <motion.section
                key={group}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {group}
                  </h2>
                  <div className="h-px flex-1 bg-slate-200/60" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    {list.length} {list.length === 1 ? "item" : "items"}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100 shadow-sm">
                  <AnimatePresence initial={false}>
                    {list.map((n) => {
                      const meta = KIND_META[n.kind] || KIND_META.system;
                      const Icon = meta.icon;
                      return (
                        <motion.div
                          key={n.id}
                          layout
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          className={cn(
                            "group relative flex items-start gap-4 px-5 py-4 transition-colors hover:bg-slate-50/50",
                            n.unread && "bg-blue-50/[0.12]"
                          )}
                        >
                          {n.unread && (
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-blue-600 animate-pulse" />
                          )}

                          <div
                            className={cn(
                              "shrink-0 grid place-items-center size-10 rounded-xl border shadow-inner",
                              meta.tone
                            )}
                          >
                            <Icon className="size-5" />
                          </div>

                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={cn(
                                      "text-xs leading-snug",
                                      n.unread
                                        ? "font-extrabold text-slate-900"
                                        : "font-semibold text-slate-700"
                                    )}
                                  >
                                    {n.title}
                                  </span>
                                  {n.urgent && (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 uppercase animate-pulse">
                                      <AlertTriangle className="size-3" />
                                      Urgent
                                    </span>
                                  )}
                                  <span
                                    className={cn(
                                      "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase border",
                                      meta.tone
                                    )}
                                  >
                                    {meta.label}
                                  </span>
                                </div>
                                <p className="mt-1.5 text-xs font-semibold text-slate-500 leading-relaxed">
                                  {n.body}
                                </p>
                                <div className="mt-2.5 flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase flex-wrap">
                                  <span className="inline-flex items-center gap-1">
                                    <UserCheck className="size-3.5 text-slate-400" />
                                    {n.actor_name}
                                  </span>
                                  {n.branch && (
                                    <span className="inline-flex items-center gap-1">
                                      · {n.branch}
                                    </span>
                                  )}
                                  {n.ticket_id_ref && (
                                    <span className="inline-flex items-center gap-1 font-mono text-slate-600">
                                      · {n.ticket_id_ref}
                                    </span>
                                  )}
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="size-3.5 text-slate-400" />
                                    {n.time_label}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => toggleRead(n.id, n.unread)}
                                  title={n.unread ? "Mark read" : "Mark unread"}
                                  className="grid place-items-center size-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors border-0 outline-none bg-transparent cursor-pointer"
                                >
                                  {n.unread ? (
                                    <MailOpen className="size-4" />
                                  ) : (
                                    <Mail className="size-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => remove(n.id)}
                                  title="Dismiss"
                                  className="grid place-items-center size-8 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors border-0 outline-none bg-transparent cursor-pointer"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </div>

                            {n.ticket_id_ref && (
                              <div className="mt-4 flex items-center gap-2">
                                <Link
                                  to={`/tickets/${n.ticket}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition"
                                >
                                  <Ticket className="size-3.5" />
                                  Open {n.ticket_id_ref}
                                </Link>
                                {n.kind === "approval" && (
                                  <Link
                                    to="/approvals"
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                                  >
                                    <ShieldCheck className="size-3.5 text-slate-400" />
                                    Review approval
                                  </Link>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </motion.section>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}