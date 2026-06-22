import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Lock, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import { API_BASE_URL } from "../utils/apiFetch"; 


export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const cleanParam = (param) => {
    if (!param) return "";
    if (param.startsWith("3D")) {
      return param.substring(2);
    }
    return param;
  };

  const rawUid = searchParams.get("uid");
  const rawToken = searchParams.get("token");

  const uid = rawUid && rawUid.startsWith("3D") ? rawUid.slice(2) : rawUid;
  const token = rawToken && rawToken.startsWith("3D") ? rawToken.slice(2) : rawToken;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Lock access if crucial parameters are absent
    if (!uid || !token) {
      setError("Missing authorization parameters. Reset links are single-use and expire after 15 minutes.");
    }
  }, [uid, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/password-reset-confirm/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, token, new_password: newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Reset failed. The link may have expired or been previously used.");
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to connect to system security gateway.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 text-slate-800 font-sans">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center size-16 rounded-full bg-emerald-50 border border-emerald-100 mb-6">
            <CheckCircle2 className="size-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Password Updated Successfully</h2>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-2">
            Your corporate credentials have been updated securely. System logs recorded this modification [2].
          </p>
          <div className="mt-8">
            <Link to="/login" className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm">
              Sign in to platform <ArrowRight className="size-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

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
            Define your new credentials.
          </h1>
          <p className="text-slate-400 leading-relaxed text-sm">
            Set up a secure, non-reusable password matching complexity requirements. All updates are logged for compliance [2].
          </p>
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

          <div className="text-left">
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100/50 mb-4 uppercase tracking-wider">
                <ShieldAlert className="size-3" /> Password Re-assignment
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Define New Password</h2>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                Define a strong password to recover access. Use at least 8 characters containing digits and special marks.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-left">
                <span className="text-xs font-bold text-slate-700 block mb-1.5">New Password</span>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Lock className="size-4" /></span>
                  <input
                    required
                    disabled={isLoading || !uid || !token}
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-11 pl-10 pr-3.5 rounded-lg bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-xs transition disabled:opacity-50"
                  />
                </div>
              </label>

              <label className="block text-left">
                <span className="text-xs font-bold text-slate-700 block mb-1.5">Confirm New Password</span>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Lock className="size-4" /></span>
                  <input
                    required
                    disabled={isLoading || !uid || !token}
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-11 pl-10 pr-3.5 rounded-lg bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-xs transition disabled:opacity-50"
                  />
                </div>
              </label>

              {error && (
                <div className="flex items-start gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-100/50 rounded-xl px-3 py-2.5">
                  <AlertCircle className="size-3.5 mt-0.5 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              <button
                disabled={isLoading || !uid || !token}
                type="submit"
                className="w-full h-11 rounded-lg bg-[#4D1D6F] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#3C1658] transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <>Reset Password <ArrowRight className="size-4" /></>}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-800 transition-colors font-bold">
                <ArrowLeft className="size-3.5" />
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}