import React from "react";
import { motion } from "framer-motion";
import { Inbox, AlertTriangle, TimerOff, CheckCircle2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "../../utils/cn";
import { getSlaMetrics } from "../../utils/sla";

const toneStyles = {
  neutral: { ring: "border-slate-200", icon: "text-blue-600 bg-blue-50 border-blue-100", bg: "bg-white", accent: "text-slate-900" },
  warning: { ring: "border-amber-200", icon: "text-amber-600 bg-amber-50 border-amber-100", bg: "bg-white", accent: "text-slate-900" },
  critical: { ring: "border-rose-200", icon: "text-rose-600 bg-rose-50 border-rose-100", bg: "bg-white", accent: "text-rose-600" },
  success: { ring: "border-emerald-200", icon: "text-emerald-600 bg-emerald-50 border-emerald-100", bg: "bg-white", accent: "text-slate-900" },
};

export function MetricCards({ tickets = [] }) {
  const openCount = tickets.filter(t => t.status !== "Closed" && t.status !== "Resolved").length;
  const criticalCount = tickets.filter(t => t.priority === "Critical" && t.status !== "Closed" && t.status !== "Resolved").length;
  const overdueCount = tickets.filter(t => {
    if (t.status === "Closed" || t.status === "Resolved") return false;
    const { remainingMin } = getSlaMetrics(t.created_at, t.priority);
    return remainingMin < 0;
  }).length;

  const resolvedCount = tickets.filter(t => t.status === "Resolved" || t.status === "Closed").length;

  const metricsList = [
    { label: "Open Tickets", value: openCount.toString(), delta: "Active Queue", trend: "up", icon: Inbox, tone: "neutral" },
    { label: "Critical / SLA Risk", value: criticalCount.toString(), delta: "Triage Priority", trend: "up", icon: AlertTriangle, tone: "warning", pulse: criticalCount > 0 },
    { label: "Overdue", value: overdueCount.toString(), delta: "Breached SLA", trend: "down", icon: TimerOff, tone: "critical" },
    
    { label: "Processed Today", value: resolvedCount.toString(), delta: "Closed Issues", trend: "up", icon: CheckCircle2, tone: "success" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {metricsList.map((m, i) => {
        const Icon = m.icon;
        const tone = toneStyles[m.tone];
        return (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06, ease: "easeOut" }}
            whileHover={{ y: -2 }}
            className={cn("relative p-5 rounded-2xl border shadow-sm overflow-hidden text-left", tone.ring, tone.bg)}
          >
            <div className="flex items-start justify-between">
              <div className={cn("size-10 rounded-xl grid place-items-center border relative z-10", tone.icon)}>
                <Icon className="size-5" />
                {m.pulse && (
                  <motion.span
                    className="absolute inset-0 rounded-xl bg-amber-400/20"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 bg-slate-50 text-slate-500"
                )}
              >
                {m.delta}
              </span>
            </div>
            <div className="mt-5">
              <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{m.label}</div>
              <div className={cn("mt-1 text-3xl font-black tracking-tight tabular-nums", tone.accent)}>{m.value}</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}