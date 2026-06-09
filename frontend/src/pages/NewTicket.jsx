import React, { useMemo, useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import {
  ArrowLeft, ArrowRight, Check, Monitor, Banknote, CreditCard, Wrench, Users,
  ShieldAlert, ChevronDown, Upload, X, FileText, AlertCircle, Send, Sparkles,
} from "lucide-react";
import { cn } from "../utils/cn";
import { apiFetch } from "../utils/apiFetch";

const getApiBaseUrl = () => {
  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (isLocal) {
    return "http://127.0.0.1:8000/api";
  }
  return "https://helpdesksys.onrender.com/api"; 
};

const API_BASE_URL = getApiBaseUrl();

/* ─────────────── Catalog configuration ─────────────── */

const CATEGORIES = [
  { key: "it", label: "IT Support", team: "IT Helpdesk", icon: Monitor, accent: "from-sky-500/15 to-sky-500/0 text-sky-600",
    desc: "Workstations, VPN, password resets",
    problems: ["Password reset", "VPN not connecting", "Workstation issue", "Email / Outlook", "Software install request"] },
  { key: "core", label: "Core Banking", team: "Core Banking Ops", icon: Banknote, accent: "from-violet-500/15 to-violet-500/0 text-violet-600",
    desc: "Transfers, reversals, account access",
    problems: ["Failed transfer / NIP", "Reversal request", "Account access issue", "Statement / balance dispute", "Standing order setup"] },
  { key: "cards", label: "Cards Team", team: "Cards Operations", icon: CreditCard, accent: "from-rose-500/15 to-rose-500/0 text-rose-600",
    desc: "ATM malfunction, activation, POS",
    problems: ["ATM dispense failure", "Card activation", "POS dispute / chargeback", "Card hot-listing", "PIN reset"] },
  { key: "facilities", label: "Facilities", team: "Facilities Mgmt", icon: Wrench, accent: "from-amber-500/15 to-amber-500/0 text-amber-600",
    desc: "AC, generator, internet, printers",
    problems: ["AC not cooling", "Generator failure", "Internet / link down", "Printer issue", "Plumbing / electrical"] },
  { key: "hr", label: "Human Resources", team: "HR Services", icon: Users, accent: "from-emerald-500/15 to-emerald-500/0 text-emerald-600",
    desc: "Payroll, leave, ID card",
    problems: ["Payroll discrepancy", "Leave request", "ID card replacement", "Benefits enquiry", "Letter request"] },
  { key: "compliance", label: "Compliance / Risk", team: "Compliance", icon: ShieldAlert, accent: "from-indigo-500/15 to-indigo-500/0 text-indigo-600",
    desc: "SAR, policy check, sanctions",
    problems: ["Suspicious Activity Report (SAR)", "Policy clarification", "Sanctions screening match", "KYC escalation", "Audit query"] },
];

/* ─────────────── Zod Validation Schemas ─────────────── */

const Step1 = z.object({
  category: z.enum(["it", "core", "cards", "facilities", "hr", "compliance"], {
    message: "Pick a category to continue",
  }),
  problemType: z.string().trim().min(1, "Select a problem type"),
});

const Step2Base = z.object({
  summary: z.string().trim().min(8, "Summary must be at least 8 characters").max(120, "Keep it under 120 characters"),
  description: z.string().trim().min(20, "Add at least 20 characters of detail").max(2000, "Too long (max 2000)"),
  impact: z.enum(["single", "team", "branch"], { message: "Select impact level" }),
});

const Step2Financial = Step2Base.extend({
  accountOrCard: z.string().trim().regex(/^[0-9*\-\s]{6,24}$/, "Use digits, dashes or *, 6–24 characters"),
  txnDate: z.string().min(1, "Date required"),
  txnId: z.string().trim().max(64, "Max 64 characters").optional().or(z.literal("")),
});

const Step2IT = Step2Base.extend({
  assetTag: z.string().trim().regex(/^[A-Za-z0-9\-]{3,20}$/, "Alphanumerics & dashes, 3–20 characters"),
  errorCode: z.string().trim().max(64, "Max 64 characters").optional().or(z.literal("")),
});

const emptyState = {
  category: undefined,
  problemType: "",
  summary: "",
  description: "",
  impact: "",
  accountOrCard: "",
  txnDate: "",
  txnId: "",
  assetTag: "",
  errorCode: "",
  files: [],
};


export default function NewTicket() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyState);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [createdTicketId, setCreatedTicketId] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  // Authentication Guard: Ensure user is logged in
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const cat = useMemo(() => CATEGORIES.find((c) => c.key === form.category), [form.category]);
  const needsFinancial = form.category === "core" || form.category === "cards";
  const needsIT = form.category === "it";

  const validateStep = (s) => {
    const errs = {};
    if (s === 0) {
      const r = Step1.safeParse({ category: form.category, problemType: form.problemType });
      if (!r.success) r.error.issues.forEach((i) => (errs[i.path[0]] = i.message));
    }
    if (s === 1) {
      const schema = needsFinancial ? Step2Financial : needsIT ? Step2IT : Step2Base;
      const r = schema.safeParse(form);
      if (!r.success) r.error.issues.forEach((i) => (errs[i.path[0]] = i.message));
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => validateStep(step) && setStep((s) => Math.min(2, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  
  // Real Backend API Connection Handler
  const submit = async () => {
    if (!validateStep(1)) return;

    setIsLoading(true);
    setSubmitError("");

    // Create a FormData container to safely transport files and string fields
    const formData = new FormData();
    formData.append("category", form.category);
    formData.append("problem_type", form.problemType);
    formData.append("summary", form.summary);
    formData.append("description", form.description);
    formData.append("impact", form.impact);

    if (form.accountOrCard) formData.append("account_or_card", form.accountOrCard);
    if (form.txnDate) formData.append("txn_date", form.txnDate);
    if (form.txnId) formData.append("txn_id", form.txnId);
    if (form.assetTag) formData.append("asset_tag", form.assetTag);
    if (form.errorCode) formData.append("error_code", form.errorCode);

    // Append multiple files with the backend's key: "uploaded_files"
    form.files.forEach((file) => {
      formData.append("uploaded_files", file);
    });

    try {
      const response = await apiFetch("/tickets/", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to submit ticket.");
      }

      setCreatedTicketId(data.ticket_id); // Save the database-generated ID
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <SuccessScreen 
        team={cat?.team ?? "Help Desk"} 
        ticketId={createdTicketId}
        reset={() => { 
          setForm(emptyState); 
          setStep(0); 
          setSubmitted(false); 
          setSubmitError("");
          setCreatedTicketId("");
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 text-left">
      <TopStrip />
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <header className="mb-6 text-center">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Create a new ticket</h1>
          <p className="text-xs text-slate-500 mt-1.5">Your ticket is automatically triaged and sent to the correct queue.</p>
        </header>

        <Stepper step={step} />

        <motion.div
          layout
          className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="relative">
            <AnimatePresence mode="wait" custom={step}>
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="p-5 md:p-7"
              >
                {step === 0 && <StepCategory form={form} update={update} errors={errors} />}
                {step === 1 && <StepDetails form={form} update={update} errors={errors} cat={cat} needsFinancial={needsFinancial} needsIT={needsIT} />}
                {step === 2 && <StepReview form={form} cat={cat} needsFinancial={needsFinancial} needsIT={needsIT} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Render Global Network/Validation errors */}
          {submitError && (
            <div className="mx-5 md:mx-7 mb-4 flex items-start gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-100/50 rounded-xl px-3 py-2.5">
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="px-5 md:px-7 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            <button
              onClick={back}
              disabled={step === 0 || isLoading}
              className="h-10 px-4 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-white hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-4" /> Back
            </button>
            <div className="text-xs font-semibold text-slate-400 hidden sm:block">Step {step + 1} of 3</div>
            {step < 2 ? (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={next}
                className="h-10 px-5 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Continue <ArrowRight className="size-4" />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={submit}
                disabled={isLoading}
                className="h-10 px-5 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-55 transition-colors cursor-pointer"
              >
                {isLoading ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="size-4" /> Submit Ticket
                  </>
                )}
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ─────────────── Back Strip Link Header ─────────────── */

function TopStrip({ ticketId, category }) {
  // Read role from session — determines where "back" goes
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isStaff = currentUser?.role === "Staff";

  return (
    <div className="border-b border-slate-200 bg-white/70 backdrop-blur-xl sticky top-0 z-20">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 h-14 flex items-center gap-3">
        <Link
          to={isStaff ? "/staff-portal" : "/"}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="size-4" />
          {isStaff ? "Back to portal" : "Back to queue"}
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-xs font-bold text-slate-500 uppercase">{category} Queue</span>
        <span className="text-slate-300">/</span>
        <span className="text-xs font-bold font-mono text-slate-800">#{ticketId}</span>
      </div>
    </div>
  );
}

/* ─────────────── Stepper ─────────────── */

const STEP_LABELS = ["Category", "Details", "Review"];
function Stepper({ step }) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        {STEP_LABELS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={label} className="flex-1 flex items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <motion.div
                  animate={{ scale: active ? 1.05 : 1 }}
                  className={cn(
                    "size-8 rounded-full grid place-items-center text-xs font-bold transition-colors border",
                    done && "bg-emerald-500 text-white border-emerald-500",
                    active && "bg-blue-600 text-white border-blue-600 ring-4 ring-blue-500/15",
                    !done && !active && "bg-white text-slate-400 border-slate-200"
                  )}
                >
                  {done ? <Check className="size-4" /> : i + 1}
                </motion.div>
                <div className={cn("text-[10px] font-bold tracking-wide uppercase", active ? "text-slate-800" : "text-slate-400")}>
                  {label}
                </div>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className="flex-1 h-px bg-slate-200 mx-2 relative top-[-10px] overflow-hidden">
                  <motion.div
                    initial={false}
                    animate={{ scaleX: i < step ? 1 : 0 }}
                    transition={{ duration: 0.4 }}
                    style={{ originX: 0 }}
                    className="h-full bg-emerald-500"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────── Step 1: Category ─────────────── */

function StepCategory({ form, update, errors }) {
  const cat = CATEGORIES.find((c) => c.key === form.category);
  return (
    <div className="space-y-4">
      <SectionHead title="What's this about?" subtitle="Pick the category that best fits your issue to target the correct queue." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const active = form.category === c.key;
          return (
            <motion.button
              key={c.key}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { update("category", c.key); update("problemType", ""); }}
              className={cn(
                "group relative text-left p-4 rounded-xl border bg-white transition-colors overflow-hidden cursor-pointer",
                active ? "border-blue-600 ring-2 ring-blue-500/10" : "border-slate-200 hover:border-slate-300"
              )}
            >
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none", c.accent)} />
              <div className="relative flex items-start gap-3">
                <div className={cn("size-10 rounded-lg grid place-items-center bg-white border border-slate-200 shrink-0", c.accent.split(" ").find(s => s.startsWith("text-")))}>
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800">{c.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{c.desc}</div>
                </div>
                {active && (
                  <span className="size-5 rounded-full bg-blue-600 text-white grid place-items-center shrink-0">
                    <Check className="size-3" />
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
      {errors.category && <FieldError msg={errors.category} />}

      <AnimatePresence>
        {cat && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 20 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.25 }}
            className="text-left"
          >
            <Label>Specific Issue Type</Label>
            <SelectField
              value={form.problemType}
              onChange={(v) => update("problemType", v)}
              options={cat.problems}
              placeholder="Select the specific issue…"
              error={!!errors.problemType}
            />
            {errors.problemType && <FieldError msg={errors.problemType} />}
            <div className="mt-3 text-[11px] text-slate-400 inline-flex items-center gap-1.5 font-medium">
              <Sparkles className="size-3.5 text-blue-500" />
              This will automatically route to the <span className="font-bold text-slate-700">{cat.team}</span>.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────── Step 2: Form Details ─────────────── */

function StepDetails({
  form, update, errors, cat, needsFinancial, needsIT,
}) {
  return (
    <div className="space-y-5 text-left">
      <SectionHead
        title="Provide ticket information"
        subtitle={cat ? `${cat.label} · ${form.problemType}` : "Issue details"}
      />

      {needsFinancial && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
          <Field label="Account / Card number" error={errors.accountOrCard}>
            <Input value={form.accountOrCard} onChange={(v) => update("accountOrCard", v)} placeholder="0123-456-789" error={!!errors.accountOrCard} />
          </Field>
          <Field label="Transaction date" error={errors.txnDate}>
            <Input type="date" value={form.txnDate} onChange={(v) => update("txnDate", v)} error={!!errors.txnDate} />
          </Field>
          <Field label="Transaction ID (optional)" error={errors.txnId}>
            <Input value={form.txnId} onChange={(v) => update("txnId", v)} placeholder="TXN8821443" error={!!errors.txnId} />
          </Field>
        </div>
      )}

      {needsIT && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
          <Field label="Asset Tag / Reference" error={errors.assetTag}>
            <Input value={form.assetTag} onChange={(v) => update("assetTag", v)} placeholder="DMFB-WS-2041" error={!!errors.assetTag} />
          </Field>
          <Field label="Error code (optional)" error={errors.errorCode}>
            <Input value={form.errorCode} onChange={(v) => update("errorCode", v)} placeholder="0x80070005" error={!!errors.errorCode} />
          </Field>
        </div>
      )}

      <Field label="Short Summary" error={errors.summary}>
        <Input value={form.summary} onChange={(v) => update("summary", v)} placeholder="Describe the problem in one short line" error={!!errors.summary} maxLength={120} />
      </Field>

      <Field label="Detailed Description" error={errors.description}>
        <textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="Walk us through what happened, what went wrong, and any troubleshooting steps you've already tried..."
          className={cn(
            "w-full px-3.5 py-2.5 rounded-lg border bg-white text-xs font-semibold outline-none transition-colors resize-none",
            errors.description ? "border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10"
              : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
          )}
        />
      </Field>

      <Field label="Attachments / Screenshot references">
        <Dropzone files={form.files} onChange={(f) => update("files", f)} />
      </Field>

      <Field label="Organizational Impact" error={errors.impact}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { k: "single", label: "Single User", desc: "Affects only me / one employee", tone: "text-blue-600" },
            { k: "team", label: "Whole Team", desc: "Affects an entire operational department", tone: "text-amber-600" },
            { k: "branch", label: "Entire Branch", desc: "Complete branch-wide infrastructure outage", tone: "text-rose-600" },
          ].map((i) => {
            const active = form.impact === i.k;
            return (
              <button
                key={i.k}
                type="button"
                onClick={() => update("impact", i.k)}
                className={cn(
                  "text-left p-3 rounded-lg border transition-colors cursor-pointer",
                  active ? "border-blue-600 ring-2 ring-blue-500/10 bg-blue-50/10" : "border-slate-200 hover:border-slate-300 bg-white"
                )}
              >
                <div className={cn("text-xs font-bold", active ? i.tone : "text-slate-700")}>{i.label}</div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5 leading-snug">{i.desc}</div>
              </button>
            );
          })}
        </div>
      </Field>
    </div>
  );
}

/* ─────────────── Step 3: Review ─────────────── */

function StepReview({ form, cat, needsFinancial, needsIT }) {
  const priority =
    form.impact === "branch" ? { label: "Critical", cls: "bg-rose-50 text-rose-700 border-rose-200" } :
    form.impact === "team" ? { label: "High", cls: "bg-amber-50 text-amber-700 border-amber-200" } :
    { label: "Medium", cls: "bg-blue-50 text-blue-700 border-blue-200" };

  return (
    <div className="space-y-5 text-left">
      <SectionHead title="Review your submission" subtitle="Please verify all fields are correct before confirming." />

      <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/30 to-indigo-50/10 p-4">
        <div className="flex items-center gap-3">
          {cat && (
            <div className="size-10 rounded-lg bg-white border border-slate-200 grid place-items-center">
              <cat.icon className={cn("size-5", cat.accent.split(" ").find(s => s.startsWith("text-")))} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Auto-routed queue</div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-2 flex-wrap mt-0.5">
              {cat?.team}
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", priority.cls)}>
                {priority.label} priority
              </span>
            </div>
          </div>
          <Sparkles className="size-4 text-blue-500" />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 divide-y divide-slate-200 bg-white overflow-hidden">
        <ReviewRow label="Category" value={`${cat?.label} · ${form.problemType}`} />
        <ReviewRow label="Summary" value={form.summary} />
        <ReviewRow label="Description" value={form.description} multiline />
        <ReviewRow label="Impact" value={form.impact === "branch" ? "Entire Branch Outage" : form.impact === "team" ? "Whole Department" : "Single User"} />
        {needsFinancial && (
          <>
            <ReviewRow label="Account / Card" value={form.accountOrCard} />
            <ReviewRow label="Transaction Date" value={form.txnDate} />
            {form.txnId && <ReviewRow label="Transaction ID" value={form.txnId} />}
          </>
        )}
        {needsIT && (
          <>
            <ReviewRow label="Asset Tag / Ref" value={form.assetTag} />
            {form.errorCode && <ReviewRow label="Error Code" value={form.errorCode} />}
          </>
        )}
        {form.files.length > 0 && (
          <ReviewRow label="Attachments" value={`${form.files.length} reference file${form.files.length > 1 ? "s" : ""}`} />
        )}
      </div>

      <div className="flex items-start gap-2 text-[11px] font-medium text-slate-400 rounded-xl bg-slate-50 border border-slate-200 p-3 leading-relaxed">
        <AlertCircle className="size-4 shrink-0 mt-0.5 text-slate-400" />
        Submitting this request logs the incident to the central system and triggers the official operational SLA timeline immediately.
      </div>
    </div>
  );
}

function ReviewRow({ label, value, multiline }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 px-4 py-3.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{label}</div>
      <div className={cn("sm:col-span-3 text-xs font-bold text-slate-700", multiline && "whitespace-pre-wrap leading-relaxed")}>
        {value || <span className="text-slate-400 italic font-medium">—</span>}
      </div>
    </div>
  );
}

/* ─────────────── Success Screen ─────────────── */

function SuccessScreen({ team, ticketId, reset }) {
  return (
    <div className="min-h-screen grid place-items-center px-4 bg-slate-50 text-slate-800">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-7 text-center"
      >
        <motion.div
          initial={{ scale: 0 }} 
          animate={{ scale: 1 }} 
          transition={{ type: "spring", delay: 0.1 }}
          className="size-14 mx-auto rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center"
        >
          <Check className="size-6" />
        </motion.div>
        <h2 className="mt-4 text-lg font-bold text-slate-900">Ticket submitted successfully</h2>
        <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
          Your ticket <span className="font-mono font-bold text-slate-900">#{ticketId || "DMFB-XXXX"}</span> was routed to the <span className="font-bold text-slate-900">{team}</span> queue.
        </p>
        <div className="mt-6 flex gap-2 justify-center">
          <Link to="/staff-portal" className="h-10 px-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 transition-colors">
            Staff Dashboard
          </Link>
          <button onClick={reset} className="h-10 px-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer">
            New ticket
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────── Primitives ─────────────── */

function SectionHead({ title, subtitle }) {
  return (
    <div className="mb-5 text-left">
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function Label({ children }) {
  return <div className="text-xs font-bold text-slate-700 mb-1.5 text-left">{children}</div>;
}

function Field({ label, error, children }) {
  return (
    <div className="space-y-1 text-left">
      <Label>{label}</Label>
      {children}
      {error && <FieldError msg={error} />}
    </div>
  );
}

function FieldError({ msg }) {
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-xs text-rose-500 inline-flex items-center gap-1 font-semibold">
      <AlertCircle className="size-3" /> {msg}
    </motion.div>
  );
}

function Input({
  value, onChange, placeholder, error, type = "text", maxLength,
}) {
  return (
    <input
      type={type}
      value={value}
      maxLength={maxLength}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full h-10 px-3.5 rounded-lg border bg-white text-xs font-bold outline-none transition-colors",
        error ? "border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10"
          : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
      )}
    />
  );
}

function SelectField({
  value, onChange, options, placeholder, error,
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full h-10 px-3.5 pr-9 rounded-lg border bg-white text-xs font-bold outline-none appearance-none transition-colors",
          error ? "border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10"
            : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10",
          !value && "text-slate-400"
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o} className="text-slate-800">{o}</option>)}
      </select>
      <ChevronDown className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}

function Dropzone({ files, onChange }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  const accept = (list) => {
    if (!list) return;
    const incoming = Array.from(list).filter((f) => f.size <= 10 * 1024 * 1024);
    onChange([...files, ...incoming].slice(0, 5));
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); accept(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-colors",
          drag ? "border-blue-500 bg-blue-50/10" : "border-slate-200 hover:border-slate-400"
        )}
      >
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => accept(e.target.files)} />
        <Upload className="size-5 mx-auto text-slate-400" />
        <div className="mt-2 text-xs font-bold text-slate-700">
          <span className="text-blue-600 hover:underline">Click to upload</span>{" "}
          <span className="text-slate-400 font-medium">or drag and drop</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5 font-medium">PNG, JPG, PDF up to 10MB · max 5 files</div>
      </div>
      {files.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-lg border border-slate-200 bg-white">
              <FileText className="size-4 text-slate-400 shrink-0" />
              <span className="flex-1 truncate font-bold text-slate-700">{f.name}</span>
              <span className="text-slate-400 font-medium tabular-nums text-[10px]">{(f.size / 1024).toFixed(0)} KB</span>
              <button
                onClick={(e) => { e.stopPropagation(); onChange(files.filter((_, j) => j !== i)); }}
                className="size-6 grid place-items-center rounded-md hover:bg-slate-100 cursor-pointer"
              >
                <X className="size-3.5 text-slate-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}