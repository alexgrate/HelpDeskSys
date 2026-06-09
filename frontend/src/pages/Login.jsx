import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Lock, Mail, ShieldCheck, KeyRound, ArrowRight, Fingerprint, AlertCircle } from "lucide-react";

const cn = (...classes) => classes.filter(Boolean).join(" ");


const getApiBaseUrl = () => {
  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (isLocal) {
    return "http://127.0.0.1:8000/api";
  }
  return "https://helpdesksys.onrender.com/api"; 
};

const API_BASE_URL = getApiBaseUrl();

export default function Login() {
  const [step, setStep] = useState("credentials"); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [preAuthToken, setPreAuthToken] = useState("")
  const [devCode, setDevCode] = useState("")
  const navigate = useNavigate();

  const handleCreds = async (e) => {
    e.preventDefault();
    setError("");

    if (email && !email.endsWith("@dashmfb.com")) {
      setError("Use your corporate email address (e.g. name@dashmfb.com).");
      return;
    }

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Authentication failed. Check your credentials.");
      }

      if (data.step === "mfa") {
        setPreAuthToken(data.pre_auth_token);
        setDevCode(data.dev_code)
        setStep("mfa");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50/50 text-slate-900 font-sans">
      
      <div className="relative hidden lg:flex flex-col justify-between p-10 bg-[#240C54] text-slate-200 overflow-hidden">
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500 via-transparent to-transparent" />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-500 grid place-items-center shadow-lg shadow-blue-500/20">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-white tracking-wide leading-tight">Dash MFB</div>
            <div className="text-[10px] text-slate-400">Help Desk · Control Tower</div>
          </div>
        </div>

        <div className="relative space-y-6 max-w-md text-left z-10">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight text-white">
            Operate the bank's nerve center with confidence.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            One secure portal for ticketing, approvals, SLA monitoring, and audit-grade visibility across every branch.
          </p>
          <ul className="space-y-3.5 text-xs text-slate-300 font-medium">
            {[
              "FIPS-compliant identity & MFA enforcement",
              "Role-based access · Staff · Agent · Manager · Admin",
              "Immutable audit trail on every ticket action",
            ].map((text) => (
              <li key={text} className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-[10px] text-slate-500">
          © 2026 Dash Microfinance Bank · Authorized access only
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-10 bg-white">
        <div className="w-full max-w-sm">
          
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-500 grid place-items-center shadow-md">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-slate-900 leading-tight">Dash MFB</div>
              <p className="text-[9px] text-slate-400">Help Desk · Control Tower</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === "credentials" ? (
              <motion.div
                key="creds"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="text-left"
              >
                <div className="mb-6">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100/50 mb-3.5">
                    <Lock className="h-3 w-3" /> SECURE STAFF PORTAL
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sign in to continue</h2>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Use your Dash MFB corporate credentials. Sessions expire after 15 minutes of inactivity.
                  </p>
                </div>

                <button
                  type="button"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center justify-center gap-2.5 text-xs font-bold text-slate-700 shadow-sm cursor-pointer"
                >
                  <svg className="h-4 w-4" viewBox="0 0 23 23" fill="none">
                    <rect x="1" y="1" width="10" height="10" fill="#F25022" />
                    <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
                    <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
                    <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
                  </svg>
                  Sign in with Microsoft SSO
                </button>

                <div className="flex items-center gap-3 my-5 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  <div className="flex-1 h-px bg-slate-200" />
                  or with email
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <form onSubmit={handleCreds} className="space-y-4">
                  <Field
                    icon={<Mail className="h-4 w-4" />}
                    label="Corporate email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="firstname.lastname@dashmfb.com"
                    disabled={isLoading}
                  />
                  
                  <Field
                    icon={<KeyRound className="h-4 w-4" />}
                    label="Password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="••••••••••••"
                    disabled={isLoading}
                    trailing={
                      <button type="button" className="text-[10px] font-bold text-blue-600 hover:underline focus:outline-none">
                        Forgot?
                      </button>
                    }
                  />

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-100/50 rounded-xl px-3 py-2.5"
                    >
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 rounded-xl bg-[#4D1D6F] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#3C1658] transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? "Authenticating..." : "Continue"} <ArrowRight className="h-4 w-4" />
                  </button>
                </form>

                <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-slate-400 font-medium">
                  <Fingerprint className="h-4 w-4" />
                  Connecting from outside the bank network · MFA required
                </div>
              </motion.div>
            ) : (
              <MfaStep
                key="mfa"
                email={email}
                preAuthToken={preAuthToken}
                devCode={devCode}
                onBack={() => setStep("credentials")}
                onSuccess={(redirectUrl) => navigate(redirectUrl)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Field({ icon, label, type, value, onChange, placeholder, trailing, disabled }) {
  return (
    <label className="block text-left">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-slate-700">{label}</span>
        {trailing}
      </div>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm transition-all disabled:opacity-50"
        />
      </div>
    </label>
  );
}

function MfaStep({ email, preAuthToken, devCode, onBack, onSuccess }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [activeDevCode, setActiveDevCode] = useState(devCode);

  const [countdown, setCountdown] = useState(29)
  const [canResend, setCanResend] = useState(false)

  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleResend = async () => {
    if (!canResend || isLoading) return;

    setIsLoading(true);
    setError("");
    
    try{
      const response = await fetch(`${API_BASE_URL}/auth/mfa/resend/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pre_auth_token: preAuthToken })
      });

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || "Failed to generate a new verification code.")
      }

      setActiveDevCode(data.dev_code)
      setCountdown(29)
      setCanResend(false)
      setDigits(["", "", "", "", "", ""])
      refs.current[0]?.focus()
    } catch (err) {
      setError(err.message || "Network error. Unable to connect to server.")
    } finally {
      setIsLoading(false)
    }
  };

  const refs = useRef([]);

  const handleChange = (i, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[i] = value;
    setDigits(next);
    
    if (value && i < 5) {
      refs.current[i + 1]?.focus();
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = text.split("").concat(Array(6).fill("")).slice(0, 6);
    setDigits(next);
    refs.current[Math.min(text.length, 5)]?.focus();
  };

  const verifyMFA = async (e) => {
    e.preventDefault();
    setError("");

    const code = digits.join("");
    if (code.length < 6) {
      setError("Enter all 6 digits from your authenticator app.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/mfa/verify/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, pre_auth_token: preAuthToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Verification failed. Check your code.");
      }

      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      localStorage.setItem("user", JSON.stringify(data.user));

      onSuccess(data.redirect_to || "/"); 
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.2 }}
      className="text-left"
    >
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100/50 mb-3.5">
          <ShieldCheck className="h-3 w-3" /> MULTI-FACTOR AUTHENTICATION
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Verify it's you</h2>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          Enter the 6-digit code from your authenticator app or the OTP we sent to{" "}
          <strong className="text-slate-800 font-bold">{email || "your corporate inbox"}</strong>.
        </p>

        {activeDevCode && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800 font-bold leading-relaxed">
            <span className="text-amber-950 font-black">DEVELOPER NOTICE:</span> For remote testing, your active MFA code is: <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-900 font-black ml-1 text-sm select-all">{activeDevCode}</span>
          </div>
        )}
      </div>

      <form onSubmit={verifyMFA} className="space-y-5">
        <div className="flex gap-2 justify-between">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={digit}
              disabled={isLoading}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              inputMode="numeric"
              maxLength={1}
              className="w-12 h-14 text-center text-xl font-bold tabular-nums rounded-xl bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-50"
            />
          ))}
        </div>

        {error && (
          <div className="flex items-start gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-100/50 rounded-xl px-3 py-2.5">
            <AlertCircle className="h-4.5 w-4.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 rounded-xl bg-[#4D1D6F] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#3C1658] transition-colors shadow-sm cursor-pointer disabled:opacity-50"
        >
          {isLoading ? "Verifying..." : "Verify & sign in"} <ArrowRight className="h-4 w-4" />
        </button>

        <div className="flex items-center justify-between text-xs font-semibold pt-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={onBack}
            className="text-slate-400 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
          >
            ← Use a different account
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend || isLoading}
            className={cn(
              "text-xs font-semibold transition-colors",
              canResend
                ? "text-blue-600 hover:underline cursor-pointer"
                : "text-slate-400 cursor-not-allowed"
            )}
          >
            {canResend ? "Resend code" : `Resend code (${countdown}s)`}
          </button>
        </div>
      </form>
    </motion.div>
  );
}