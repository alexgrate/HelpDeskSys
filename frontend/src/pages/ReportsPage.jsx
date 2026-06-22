// src/pages/ReportsPage.jsx

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Download, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Target, 
  Timer, 
  Users, 
  Loader2, 
  AlertCircle 
} from "lucide-react";
import { cn } from "../utils/cn";
import { apiFetch } from "../utils/apiFetch";

export default function ReportsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await apiFetch("/tickets/operations_analytics/");
        if (res.ok) {
          setAnalytics(await res.json());
        } else {
          setError("Failed to compile operations metrics from server.");
        }
      } catch (err) {
        setError("Network error. Unable to load SLA and ticketing trends.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs font-bold text-slate-400 gap-2 min-h-[400px]">
        <Loader2 className="size-8 text-blue-600 animate-spin" />
        <p>Aggregating database SLA & volume analytics...</p>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-12 text-center text-xs font-bold text-rose-500 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center gap-2">
        <AlertCircle className="size-4" /> {error || "Unable to compile reports."}
      </div>
    );
  }

  const { kpis, volume_by_hour, departments, sla_by_dept } = analytics;
  
  // Calculate total tickets across the last 7 days dynamically
  const totalTickets = departments.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="space-y-6 text-left font-sans">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
            <Activity className="size-3.5 text-blue-600" /> Operations analytics · Last 7 days
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Reports & SLA</h1>
          <p className="text-xs text-slate-500 mt-1">
            System-wide performance, bottlenecks, and audit-ready compliance snapshots.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer shadow-sm">
            <FileText className="size-4 text-slate-400" /> Export PDF
          </button>
          <button className="h-9 px-4 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-blue-700 transition shadow-sm cursor-pointer border-0">
            <Download className="size-4" /> Export CSV
          </button>
        </div>
      </header>

      {/* KPIs Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Target} label="SLA Compliance" value={kpis.sla_compliance} delta="+1.8%" trend="up" tone="success" />
        <KpiCard icon={Timer} label="Avg Resolution" value={kpis.avg_resolution} delta="-12m" trend="up" tone="info" />
        <KpiCard icon={Activity} label="Tickets / Day" value={kpis.tickets_per_day} delta="+9%" trend="up" tone="neutral" />
        <KpiCard icon={Users} label="Active Agents" value={kpis.active_agents} delta="-3" trend="down" tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        {/* Hourly Spline Volume Chart */}
        <Card title="Ticket volume by hour" subtitle="Average across the last 7 days · peak 2–4 PM">
          <LineChart data={volume_by_hour} />
          <div className="mt-4 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
            <span>12 AM</span>
            <span>6 AM</span>
            <span>12 PM</span>
            <span>6 PM</span>
            <span>11 PM</span>
          </div>
        </Card>

        {/* Dynamic Category Donut Chart */}
        <Card title="Tickets by department" subtitle={`${totalTickets.toLocaleString()} tickets · last 7 days`}>
          <Donut data={departments} total={totalTickets} />
        </Card>
      </div>

      {/* Dynamic SLA compliance by department progress bars */}
      <Card title="SLA compliance by department" subtitle="Target ≥ 90% · breach if below threshold for 3+ days">
        <div className="space-y-4 pt-2">
          {sla_by_dept.map((d, i) => {
            const tone = d.rate >= 95 ? "success" : d.rate >= 90 ? "info" : "warning";
            return (
              <motion.div
                key={d.dept}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="grid grid-cols-[140px_1fr_64px] items-center gap-4"
              >
                <div className="text-xs font-bold text-slate-800 truncate">{d.dept}</div>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/40">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${d.rate}%` }}
                    transition={{ duration: 0.8, delay: i * 0.04, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full",
                      tone === "success" && "bg-emerald-500",
                      tone === "info" && "bg-blue-500",
                      tone === "warning" && "bg-amber-500"
                    )}
                  />
                </div>
                <div className="text-xs font-extrabold tabular-nums text-right text-slate-900">{d.rate.toFixed(1)}%</div>
              </motion.div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ---------- Shared Subcomponents ---------- */

function Card({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm text-left">
      <div className="mb-4">
        <div className="text-sm font-bold text-slate-900 tracking-tight">{title}</div>
        {subtitle && <div className="text-xs text-slate-400 mt-1 font-semibold">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, delta, trend, tone }) {
  const toneCls = {
    success: "text-emerald-600 bg-emerald-50 border-emerald-100",
    info: "text-blue-600 bg-blue-50 border-blue-100",
    neutral: "text-slate-700 bg-slate-100 border-slate-200",
    warning: "text-amber-600 bg-amber-50 border-amber-100",
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm text-left"
    >
      <div className="flex items-center justify-between">
        <div className={cn("size-10 rounded-xl grid place-items-center border", toneCls)}>
          <Icon className="size-5" />
        </div>
        <span
          className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 border",
            trend === "up" ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-rose-600 bg-rose-50 border-rose-100"
          )}
        >
          {trend === "up" ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
          {delta}
        </span>
      </div>
      <div className="mt-4 text-[10px] uppercase tracking-wider text-slate-400 font-bold">{label}</div>
      <div className="text-2xl font-black tracking-tight tabular-nums text-slate-900 mt-1">{value}</div>
    </motion.div>
  );
}

function LineChart({ data }) {
  const w = 600;
  const h = 200;
  const max = Math.max(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - (v / max) * (h - 20) - 10]);
  const path = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ");
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-48">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((p) => (
        <line key={p} x1="0" x2={w} y1={h * p} y2={h * p} stroke="#f1f5f9" strokeDasharray="3 4" />
      ))}
      <motion.path
        d={area}
        fill="url(#lg)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      />
      <motion.path
        d={path}
        fill="none"
        stroke="#2563eb"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      />
      {pts.map(([x, y], i) =>
        i === 14 ? (
          <g key={i}>
            <circle cx={x} cy={y} r="5" fill="#2563eb" />
            <circle cx={x} cy={y} r="10" fill="#2563eb" opacity="0.2" />
          </g>
        ) : null
      )}
    </svg>
  );
}

function Donut({ data, total }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 text-left">
      <svg viewBox="0 0 200 200" className="size-44 shrink-0 -rotate-90">
        <circle cx="100" cy="100" r={r} fill="none" stroke="#f1f5f9" strokeWidth="22" />
        {data.map((d) => {
          const frac = d.value / total;
          const len = frac * c;
          const seg = (
            <motion.circle
              key={d.name}
              cx="100"
              cy="100"
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth="22"
              strokeDasharray={`${len} ${c}`}
              strokeDashoffset={-offset}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            />
          );
          offset += len;
          return seg;
        })}
        <g transform="rotate(90 100 100)">
          <text x="100" y="96" textAnchor="middle" className="fill-slate-800 text-[26px] font-black tabular-nums">
            {total.toLocaleString()}
          </text>
          <text x="100" y="116" textAnchor="middle" className="fill-slate-400 text-[10px] font-bold uppercase tracking-wider">
            Total tickets
          </text>
        </g>
      </svg>
      <ul className="flex-1 space-y-2 text-xs font-bold min-w-0">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2.5">
            <span className="size-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
            <span className="flex-1 truncate text-slate-700">{d.name}</span>
            <span className="tabular-nums text-slate-500">{d.value}</span>
            <span className="tabular-nums text-[10px] text-slate-400 w-12 text-right">
              {total > 0 ? ((d.value / total) * 100).toFixed(1) : "0.0"}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}