import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Mail, ShieldCheck, KeyRound, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "../utils/cn";
import { API_BASE_URL } from "../utils/apiFetch";

export default function ForgotPassword() {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Corporate email is required.");
      return;
    }

    if (email && !email.endsWith("@dash-mfb.com")) {
      setError("Use your authorized corporate email address (e.g., name@dash-mfb.com).");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/password-reset/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to process recovery request.");
      }

      setStep("sent");
    } catch (err) {
      setError(err.message || "Connection timeout reaching security gateway.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50/50 text-slate-800 font-sans">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 bg-[#240C54] text-slate-200 overflow-hidden">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_top_right,_var(--primary)_0%,_transparent_55%)]" />
        <div className="absolute -bottom-32 -left-24 size-96 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <div className="size-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-500 grid place-items-center">
            <Building2 className="size-5 text-white" />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold">Dash MFB</div>
            <div className="text-[11px] text-slate-400">Help Desk · Control Tower</div>
          </div>
        </div>

        <div className="relative space-y-6 max-w-md text-left">
          <h1 className="text-4xl font-semibold tracking-tight leading-tight text-white">
            Account recovery, done securely.
          </h1>
          <p className="text-slate-400 leading-relaxed text-sm">
            Reset your credentials through a verified channel. All reset attempts are logged and audited for compliance [2].
          </p>
          <ul className="space-y-3 text-sm text-slate-300">
            {[
              "Reset links expire after 15 minutes",
              "Single-use tokens with dynamic audit trail",
              "Corporate domain verification enforced",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-[11px] text-slate-500 text-left">
          © 2026 Dash Microfinance Bank · Authorized access only
        </div>
      </div>

      {/* Auth panel */}
      <div className="flex items-center justify-center p-6 md:p-10 bg-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="size-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-500 grid place-items-center">
              <Building2 className="size-5 text-white" />
            </div>
            <div className="text-sm font-semibold">Dash MFB</div>
          </div>

          <AnimatePresence mode="wait">
            {step === "email" ? (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
                className="text-left"
              >
                <div className="mb-8">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100/50 mb-4 uppercase tracking-wider">
                    <KeyRound className="size-3" /> Password reset
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">Forgot your password?</h2>
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                    Enter your corporate email and we’ll send you a secure reset link. Links expire in 15 minutes.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Field
                    icon={<Mail className="size-4" />}
                    label="Corporate email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="firstname.lastname@dash-mfb.com"
                    disabled={isLoading}
                  />

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-100/50 rounded-xl px-3 py-2.5"
                    >
                      <AlertCircle className="size-3.5 mt-0.5 shrink-0 text-rose-500" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  <button
                    disabled={isLoading}
                    type="submit"
                    className="w-full h-11 rounded-lg bg-[#4D1D6F] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#3C1658] transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? <Loader2 className="size-4 animate-spin" /> : <>Send reset link <ArrowRight className="size-4" /></>}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-800 transition-colors font-bold"
                  >
                    <ArrowLeft className="size-3.5" />
                    Back to sign in
                  </Link>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="sent"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center size-16 rounded-full bg-emerald-50 border border-emerald-100 mb-6">
                  <CheckCircle2 className="size-8 text-emerald-600" />
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Check your inbox</h2>
                <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed font-semibold">
                  We’ve sent a secure password-reset link to{" "}
                  <span className="text-slate-900 font-extrabold">{email}</span>. It will expire in 15 minutes.
                </p>

                <div className="mt-8 space-y-3">
                  <button
                    onClick={() => {
                      setStep("email");
                      setEmail("");
                      setError("");
                    }}
                    className="w-full h-11 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer border-0"
                  >
                    <ArrowLeft className="size-4" />
                    Use a different email
                  </button>

                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-800 transition-colors font-bold"
                  >
                    <ArrowLeft className="size-3.5" />
                    Back to sign in
                  </Link>
                </div>

                <p className="mt-8 text-[11px] text-slate-400 font-semibold leading-relaxed">
                  Didn’t receive it? Check your spam folder or contact your branch{" "}
                  <span className="text-blue-600 cursor-pointer hover:underline font-bold">IT Helpdesk Support</span>.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  type,
  value,
  onChange,
  placeholder,
  disabled
}) {
  return (
    <label className="block text-left">
      <span className="text-xs font-bold text-slate-700 block mb-1.5">{label}</span>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        <input
          required
          disabled={disabled}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-11 pl-10 pr-3.5 rounded-lg bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-xs transition disabled:opacity-50"
        />
      </div>
    </label>
  );
}