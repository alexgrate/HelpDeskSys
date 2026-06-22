import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Clock, Eye, ThumbsUp, ThumbsDown, Share2, Printer, Bookmark, ShieldCheck, CheckCircle2, AlertTriangle, BookOpen, ArrowRight, Sparkles } from "lucide-react";
import { AppShell } from "../components/helpdesk/AppShell";
import { cn } from "../utils/cn";

const TOC = [
  { id: "overview", label: "Overview" },
  { id: "prereqs", label: "Prerequisites" },
  { id: "install", label: "1. Install the client" },
  { id: "configure", label: "2. Configure the profile" },
  { id: "connect", label: "3. Connect & verify" },
  { id: "trouble", label: "Troubleshooting" },
  { id: "related", label: "Related policies" },
];

export default function ArticlePage() {
  const { slug } = useParams();
  const [vote, setVote] = useState(null);

  const displaySlug = slug ? slug.slice(0, 6).toUpperCase() : "VPN_SETUP";

  return (
      <div className="space-y-6 text-left font-sans">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <Link to="/kb" className="hover:text-slate-800 transition">
            Knowledge Base
          </Link>
          <ChevronRight className="size-3" />
          <span className="hover:text-slate-800 transition cursor-pointer">VPN & Security</span>
          <ChevronRight className="size-3" />
          <span className="text-slate-800 font-extrabold truncate max-w-[200px] sm:max-w-md">
            How do I connect to the bank's VPN?
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
          {/* Article Panel */}
          <article className="min-w-0 space-y-6">
            {/* Header metadata card */}
            <header className="rounded-2xl bg-white border border-slate-200 p-5 md:p-7 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-sky-50 text-sky-700 border-sky-100 uppercase">
                  VPN & Security
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-emerald-50 text-emerald-700 border-emerald-100 inline-flex items-center gap-1 uppercase">
                  <ShieldCheck className="size-3" /> Verified by IT
                </span>
                <span className="text-[10px] font-bold text-slate-400 font-mono ml-auto">Article ID: KB-{displaySlug}</span>
              </div>
              
              <h1 className="text-xl md:text-2xl font-black tracking-tight leading-snug text-slate-900">
                How do I connect to the bank's VPN from home?
              </h1>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed font-semibold">
                A step-by-step guide for branch staff and remote employees to securely establish connections to internal bank directories from outside the branch networks [1].
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-bold text-slate-400 uppercase border-t border-slate-100 pt-4">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" /> 4 min read
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="size-3.5" /> 1,842 views this month
                </span>
                <span>Last updated · May 14, 2026</span>
                <span>By IT Network Team</span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-slate-100">
                <ActionBtn icon={Bookmark}>Save</ActionBtn>
                <ActionBtn icon={Share2}>Share</ActionBtn>
                <ActionBtn icon={Printer}>Print</ActionBtn>
              </div>
            </header>

            {/* Content Body */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6 md:p-9 shadow-sm leading-relaxed text-slate-600 text-xs font-semibold space-y-6">
              <section id="overview">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Overview</h2>
                <p className="mt-2.5">
                  The Dash MFB corporate VPN allows authorized staff to reach sensitive internal sub-systems securely—including Flexcube, the bank intranet portal, and HR Workday files—from remote home networks or external branches [1]. All data streams are encrypted end-to-end and inspected by compliance perimeter firewalls [1].
                </p>
                <Callout tone="warning" title="Authorised Devices Only">
                  Never attempt to establish a VPN session from a personal, shared, or public computer. Only bank-provisioned laptops with disk encryption controls enabled are authorized [1].
                </Callout>
              </section>

              <section id="prereqs">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Prerequisites</h2>
                <ul className="mt-2.5 space-y-2.5">
                  {[
                    "A bank-issued operational laptop with current security patch updates",
                    "Active corporate directory credentials (firstname.lastname@dash-mfb.com) [1]",
                    "Microsoft Authenticator application registered on your mobile device [1]",
                    "Network connection with a stable speed of 5 Mbps or above",
                  ].map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-xs text-slate-600 font-semibold">
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <Step n={1} id="install" title="Install the VPN client">
                <p>
                  Open the <code>Dash Software Center</code> application from your Windows taskbar, search for{" "}
                  <strong>"Dash Secure Connect"</strong>, and select <em>Install</em>. Deployment completes in approximately 2 minutes.
                </p>
                <p className="mt-2">
                  If the package fails to appear in Software Center, file a new support request:{" "}
                  <Link to="/tickets/new" className="text-blue-600 font-extrabold hover:underline">
                    IT Support → Software Request
                  </Link>{" "}
                  and an active agent will push the package remotely [1, 2].
                </p>
              </Step>

              <Step n={2} id="configure" title="Configure your profile credentials">
                <p>Launch the Dash Secure Connect application. On your first load, input parameters exactly as detailed:</p>
                <pre className="mt-3 text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-3.5 font-mono overflow-x-auto text-slate-700 font-bold leading-relaxed select-all">
{`Server      : vpn.dashmfb.com
Port        : 443 (TCP)
Auth method : SAML SSO + Push MFA
Profile     : Dash-Staff-Default`}
                </pre>
                <p className="mt-3">
                  Save your configurations. Tick the <strong>"Connect at logon"</strong> checkbox only if your role is designated for full-time remote operations.
                </p>
              </Step>

              <Step n={3} id="connect" title="Establish the connection session">
                <p>
                  Click the <strong>Connect</strong> button. An external browser window will load prompting you to verify your credentials. Once validated, approve the authentication push notification dispatched to your mobile device [1, 2].
                </p>
                <p className="mt-2">
                  Once the handshake completes, a green <em>Secure</em> icon will display in your taskbar. Verify accessibility by opening <code>https://intranet.dashmfb.local</code>—it should load under 2 seconds.
                </p>
                <Callout tone="success" title="Session Authenticated">
                  All internal directories and banking core subsystems are now accessible as if you were in the branch [1].
                </Callout>
              </Step>

              <section id="trouble" className="pt-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Troubleshooting</h2>
                <div className="mt-3 divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {[
                    {
                      q: "Authenticator push request fails to arrive",
                      a: "Verify that the time sync parameters are set dynamically on your mobile phone (Settings → Date & time → Auto-Sync). If requests still fail, enter a 6-digit backup TOTP code instead [1, 2].",
                    },
                    {
                      q: "Handshake completed, but Core Banking is unreachable",
                      a: "Flexcube operations require authorization through the specialized 'Dash-Staff-Banking' profile. Switch connection profiles inside your client settings and reconnect [1, 2].",
                    },
                    {
                      q: "Error: 'Security Certificate validation failed'",
                      a: "Your system certs may be outdated. Perform a machine restart, then launch Dash Software Center → Check for Updates. If problems persist, escalate to IT support [1, 2].",
                    },
                  ].map((f) => (
                    <details key={f.q} className="group p-4 bg-white select-none">
                      <summary className="flex items-center justify-between cursor-pointer text-xs font-bold text-slate-800 outline-none list-none">
                        {f.q}
                        <ChevronRight className="size-4 text-slate-400 group-open:rotate-90 transition-transform" />
                      </summary>
                      <p className="mt-2 text-xs text-slate-500 font-semibold leading-relaxed pl-1">{f.a}</p>
                    </details>
                  ))}
                </div>
              </section>

              <section id="related" className="pt-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Related policy documents</h2>
                <ul className="mt-3 space-y-2">
                  {[
                    { t: "Remote work asset control compliance v3.2", c: "Compliance" },
                    { t: "Multi-factor authentication mandatory protocols", c: "VPN & Security" },
                    { t: "Acceptable use guidelines for microfinance systems", c: "HR Policies" },
                  ].map((r) => (
                    <li key={r.t}>
                      <a
                        href="#"
                        className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 transition"
                      >
                        <span className="flex items-center gap-2 text-xs font-bold text-slate-800">
                          <BookOpen className="size-4 text-blue-600" /> {r.t}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{r.c}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* Helpful validation cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm text-left">
                <div className="text-xs font-bold text-slate-900">Was this article helpful?</div>
                <p className="text-[11px] text-slate-400 font-semibold mt-1">Your feedback helps tune our self-service machine search index.</p>
                <div className="mt-4 flex gap-2">
                  <FeedbackBtn active={vote === "up"} onClick={() => setVote("up")} tone="success" icon={ThumbsUp}>
                    Helpful
                  </FeedbackBtn>
                  <FeedbackBtn active={vote === "down"} onClick={() => setVote("down")} tone="critical" icon={ThumbsDown}>
                    Not helpful
                  </FeedbackBtn>
                </div>
                {vote && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[11px] text-slate-400 font-bold mt-3"
                  >
                    Feedback logged. Thank you for your contribution to system optimization.
                  </motion.p>
                )}
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-blue-50/50 via-white to-slate-50 border border-slate-200 p-5 flex flex-col shadow-sm text-left">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Sparkles className="size-4 text-blue-600" /> Still need assistance?
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-semibold leading-relaxed">
                  Escalate this to active agents—the system will pre-fill parameters as <strong>IT Support → VPN & Network</strong>.
                </p>
                <Link
                  to="/tickets/new"
                  className="mt-auto inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm self-start"
                >
                  File a ticket <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </article>

          {/* Right Floating TOC Side column */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4 text-left">
              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  On this page
                </div>
                <ul className="mt-3 space-y-2 text-xs font-bold">
                  {TOC.map((t) => (
                    <li key={t.id}>
                      <a
                        href={`#${t.id}`}
                        className="block py-0.5 text-slate-500 hover:text-slate-950 border-l-2 border-transparent hover:border-blue-500 pl-3 -ml-px transition"
                      >
                        {t.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Article telemetry
                </div>
                <dl className="mt-3 space-y-2.5 text-xs font-bold">
                  <Row label="Helpfulness score" value="92%" />
                  <Row label="Avg. read time" value="3m 48s" />
                  <Row label="Tickets avoided (30d)" value="142" />
                </dl>
              </div>
            </div>
          </aside>
        </div>
      </div>
  );
}

function Step({ id, n, title, children }) {
  return (
    <section id={id} className="pt-2 text-left">
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-lg bg-blue-600 text-white text-xs font-bold grid place-items-center shrink-0">
          {n}
        </div>
        <h2 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h2>
      </div>
      <div className="mt-3 ml-11 text-xs text-slate-500 leading-relaxed space-y-2 font-semibold">{children}</div>
    </section>
  );
}

function Callout({ tone, title, children }) {
  const map = {
    warning: { cls: "bg-rose-50 border-rose-100 text-rose-700", icon: AlertTriangle },
    success: { cls: "bg-emerald-50 border-emerald-100 text-emerald-700", icon: CheckCircle2 },
  };
  const { cls, icon: Icon } = map[tone];
  return (
    <div className={cn("mt-4 rounded-xl border p-4 flex gap-3 text-left", cls)}>
      <Icon className="size-5 shrink-0 mt-0.5" />
      <div>
        <div className="text-xs font-bold">{title}</div>
        <div className="text-[11px] text-slate-600 leading-relaxed mt-1 font-semibold">{children}</div>
      </div>
    </div>
  );
}

function ActionBtn({ icon: Icon, children }) {
  return (
    <button className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer">
      <Icon className="size-3.5 text-slate-400" /> {children}
    </button>
  );
}

function FeedbackBtn({ active, onClick, tone, icon: Icon, children }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "flex-1 h-10 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer",
        active
          ? tone === "success"
            ? "bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm"
            : "bg-rose-50 text-rose-700 border-rose-100 shadow-sm"
          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
      )}
    >
      <Icon className="size-4" /> {children}
    </motion.button>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-extrabold text-slate-800 tabular-nums">{value}</dd>
    </div>
  );
}