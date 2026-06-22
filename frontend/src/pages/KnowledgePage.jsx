import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, BookOpen, Shield, CreditCard, Briefcase, Wifi, Lock, FileText, ThumbsUp, ThumbsDown, ArrowRight, Clock, Sparkles } from "lucide-react";
import { AppShell } from "../components/helpdesk/AppShell";
import { cn } from "../utils/cn";

const CATEGORIES = [
  { name: "VPN & Security", icon: Shield, count: 24, tone: "info", desc: "Network access, MFA setup, device compliance" },
  { name: "Core Banking FAQs", icon: Briefcase, count: 38, tone: "primary", desc: "Posting, reversals, EOD batch issues" },
  { name: "Cards & POS", icon: CreditCard, count: 19, tone: "warning", desc: "Issuance, activation, dispute SOPs" },
  { name: "HR Policies", icon: FileText, count: 31, tone: "success", desc: "Leave, payroll, code of conduct" },
  { name: "Network & Connectivity", icon: Wifi, count: 12, tone: "info", desc: "Wi-Fi, printers, branch links" },
  { name: "Compliance & Privacy", icon: Lock, count: 16, tone: "critical", desc: "AML, NDPR, data handling" },
];

const POPULAR = [
  { title: "How do I connect to the bank's VPN from home?", slug: "vpn-setup-guide", category: "VPN & Security", reads: 1842, time: "4 min" },
  { title: "Resolving 'Insufficient funds' error on intra-bank transfer", slug: "insufficient-funds-reversal", category: "Core Banking FAQs", reads: 1204, time: "3 min" },
  { title: "Reset corporate Microsoft 365 MFA device", slug: "reset-mfa-authenticator", category: "VPN & Security", reads: 982, time: "5 min" },
  { title: "Customer card not activating after issuance — SOP", slug: "pos-card-activation-sop", category: "Cards & POS", reads: 711, time: "6 min" },
  { title: "Submitting a leave request via Workday", slug: "submit-leave-workday", category: "HR Policies", reads: 654, time: "2 min" },
];

const toneMap = {
  info: "text-sky-600 bg-sky-50 border-sky-100",
  primary: "text-violet-600 bg-violet-50 border-violet-100",
  warning: "text-amber-600 bg-amber-50 border-amber-100",
  success: "text-emerald-600 bg-emerald-50 border-emerald-100",
  critical: "text-rose-600 bg-rose-50 border-rose-100",
};

export default function KnowledgePage() {
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState({});
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      alert(`Searching for: ${query}`);
    }
  };

  return (
      <div className="space-y-8 text-left font-sans">
        {/* Hero Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-[#0B1329] text-white p-8 md:p-12 shadow-md">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top_right,_var(--primary)_0%,_transparent_60%)]" />
          <div className="absolute -bottom-24 -left-16 size-72 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700 mb-4 uppercase tracking-wider">
              <Sparkles className="size-3 text-blue-400" /> Self-service · Powered by Dash AI
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
              Find the answer before raising a ticket.
            </h1>
            <p className="text-slate-400 mt-2 text-xs md:text-sm font-medium">
              140+ guides, FAQs, and policy documents — searched by 320 staff members this week.
            </p>

            <form onSubmit={handleSearchSubmit} className="mt-7 relative">
              <Search className="size-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search guides, FAQs, policy documents…"
                className="w-full h-14 pl-12 pr-32 rounded-2xl bg-white text-slate-900 border border-slate-200 focus:border-blue-500 outline-none text-xs font-semibold shadow-lg transition"
              />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold border-0 cursor-pointer transition">
                Search
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
              <span>Trending:</span>
              {["VPN setup", "Card activation", "Password reset", "Workday leave"].map((t) => (
                <button
                  key={t}
                  onClick={() => setQuery(t)}
                  className="px-2 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 outline-none cursor-pointer transition text-[10px]"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Categories */}
        <section>
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900">Browse by category</h2>
              <p className="text-xs text-slate-400 mt-0.5">Organized by bank department, not by software tool.</p>
            </div>
            <button className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold border-0 bg-transparent cursor-pointer">
              View all <ArrowRight className="size-3" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORIES.map((c, i) => {
              const Icon = c.icon;
              return (
                <motion.button
                  key={c.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ y: -2 }}
                  className="group relative text-left rounded-2xl bg-white border border-slate-200 p-5 hover:border-blue-300 transition-all cursor-pointer outline-none shadow-sm"
                >
                  <div className={cn("size-11 rounded-xl grid place-items-center border", toneMap[c.tone])}>
                    <Icon className="size-5" />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-800 text-sm">{c.name}</h3>
                    <span className="text-[10px] font-bold text-slate-400 tabular-nums uppercase">{c.count} articles</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">{c.desc}</p>
                  <ArrowRight className="size-4 text-slate-400 absolute top-5 right-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Popular Articles */}
        <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="px-5 h-12 flex items-center justify-between border-b border-slate-200 bg-slate-50/50">
              <div className="text-xs font-bold flex items-center gap-2 text-slate-800 uppercase tracking-wider">
                <BookOpen className="size-4 text-blue-600" /> Most read this week
              </div>
              <button className="text-xs text-slate-400 hover:text-slate-800 font-semibold border-0 bg-transparent cursor-pointer">See all</button>
            </div>
            <ul className="divide-y divide-slate-200">
              {POPULAR.map((p, i) => {
                const id = `p-${i}`;
                const f = feedback[id];
                return (
                  <li key={p.title} className="px-5 py-4 hover:bg-slate-50/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="text-[11px] font-bold tabular-nums text-slate-400 w-5 mt-0.5">
                        {i + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <Link to={`/kb/${p.slug}`} className="font-bold text-slate-800 hover:underline text-xs block">
                          {p.title}
                        </Link>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[10px] text-slate-400 font-bold uppercase">
                          <span className="inline-flex items-center gap-1">
                            <FileText className="size-3" /> {p.category}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3" /> {p.time} read
                          </span>
                          <span>{p.reads.toLocaleString()} views</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setFeedback((s) => ({ ...s, [id]: "up" }))}
                          className={cn(
                            "size-7 grid place-items-center rounded-md hover:bg-slate-100 border-0 outline-none bg-transparent cursor-pointer text-slate-400 hover:text-slate-800",
                            f === "up" && "bg-emerald-50 border border-emerald-100 text-emerald-600 hover:bg-emerald-100"
                          )}
                          aria-label="Helpful"
                        >
                          <ThumbsUp className="size-3.5" />
                        </button>
                        <button
                          onClick={() => setFeedback((s) => ({ ...s, [id]: "down" }))}
                          className={cn(
                            "size-7 grid place-items-center rounded-md hover:bg-slate-100 border-0 outline-none bg-transparent cursor-pointer text-slate-400 hover:text-slate-800",
                            f === "down" && "bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100"
                          )}
                          aria-label="Not helpful"
                        >
                          <ThumbsDown className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Ticket Escalation Card */}
          <div className="rounded-2xl bg-gradient-to-br from-blue-50/50 via-white to-slate-50 border border-slate-200 p-6 flex flex-col shadow-sm text-left">
            <div className="size-11 rounded-xl bg-blue-50 text-blue-600 grid place-items-center border border-blue-100 shadow-sm">
              <Sparkles className="size-5" />
            </div>
            <h3 className="mt-4 text-base font-bold tracking-tight text-slate-900">Still stuck?</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
              If none of our self-service guides resolve your problem, submit a help desk ticket and the system will auto-route it to the correct department queue in under a minute [2].
            </p>
            <div className="mt-5 grid gap-2 text-[10px] text-slate-400 font-bold uppercase">
              <Stat label="Avg first response" value="6 min" />
              <Stat label="Resolved within SLA" value="94.2%" />
            </div>
            <Link
              to="/tickets/new"
              className="mt-6 inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md"
            >
              Raise a ticket <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200">
      <span>{label}</span>
      <span className="font-extrabold text-slate-800 tabular-nums">{value}</span>
    </div>
  );
}