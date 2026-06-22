import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Check, X, Clock, Building, User, Banknote, AlertTriangle, FileText, MessageSquare, ChevronRight, ArrowLeft, AlertCircle } from "lucide-react";
import { AppShell } from "../components/helpdesk/AppShell";
import { cn } from "../utils/cn";
import { apiFetch } from "../utils/apiFetch";


const priorityTone = {
  Critical: "bg-rose-50 text-rose-700 border-rose-200",
  High: "bg-amber-50 text-amber-700 border-amber-200",
  Medium: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileView, setMobileView] = useState("list");
  const [decideError, setDecideError] = useState("");
  const [successMsg,  setSuccessMsg]  = useState("");

  // Fetch pending list on mount
  useEffect(() => {
    const fetchApprovals = async () => {
      try {
        const response = await apiFetch("/approvals/");
        if (!response.ok) {
          throw new Error("Unable to retrieve pending approvals queue.");
        }
        const data = await response.json();
        setApprovals(data);
        if (data.length > 0) {
          setSelectedId(data[0].id);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchApprovals();
  }, []);

  const selected = approvals.find((a) => a.id === selectedId) || approvals[0];
  const pending = approvals.filter((a) => a.status === "Pending");

  // Live decision handler 
  const decide = async (verdict) => {
    if (!selectedId) return;
    setDecideError("");
    setSuccessMsg("");

    if ((verdict === "Rejected" || verdict === "Returned") && !comment.trim()) {
      setDecideError("A justification comment is required when rejecting or requesting updates [2].");
      return;
    }

    try {
      const response = await apiFetch(`/approvals/${selectedId}/decide/`, {
        method: "POST",
        body: JSON.stringify({ status: verdict, comment }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Decision failed.");
      }

      const updatedRow = await response.json();
      setApprovals(prev => prev.map(item => item.id === selectedId ? updatedRow : item));
      setComment("");

      if (verdict === "Approved" && updatedRow.routed_to) {
        setSuccessMsg(`Approved. Ticket routed to ${updatedRow.routed_to}.`);
        setTimeout(() => setSuccessMsg(""), 5000);
      }

      const next = approvals.find((a) => a.status === "Pending" && a.id !== selectedId);
      if (next) setSelectedId(next.id);
      else setMobileView("list");
    } catch (err) {
      setDecideError(err.message);
    }
  };

  const handleSelectListMobile = (id) => {
    setSelectedId(id);
    setMobileView("detail");
  };

  return (
    <AppShell>
      <div className="space-y-6 font-sans text-left">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <ShieldCheck className="size-3.5 text-blue-600" /> Manager Workspace
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Approvals Hub</h1>
            <p className="text-xs text-slate-500 mt-1">
              {pending.length} pending decisions · queue is currently active
            </p>
          </div>
        </header>

        {isLoading && (
          <div className="p-12 text-center text-xs font-bold text-slate-400">Loading manager approvals queue...</div>
        )}
        {error && (
          <div className="p-12 text-center text-xs font-bold text-rose-500">{error}</div>
        )}

        {!isLoading && !error && approvals.length === 0 && (
          <div className="p-12 text-center text-xs font-bold text-slate-400 bg-white border border-slate-200 rounded-2xl">
            Approvals queue is completely clear. No requests require action.
          </div>
        )}

        {/* Master-Detail Grid */}
        {!isLoading && !error && approvals.length > 0 && (
          <div className="grid lg:grid-cols-[380px_1fr] gap-5 min-h-[640px]">
            
            {/* Master Queue List */}
            <div className={cn(
              "rounded-2xl bg-white border border-slate-200 overflow-hidden flex flex-col shadow-sm",
              mobileView === "detail" ? "hidden lg:flex" : "flex"
            )}>
              <div className="px-4 h-12 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">Pending queue</div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{pending.length} items</span>
              </div>
              
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {approvals.map((a) => {
                  const active = a.id === selectedId;
                  return (
                    <button
                      key={a.id}
                      onClick={() => handleSelectListMobile(a.id)}
                      className={cn(
                        "w-full text-left px-4 py-3.5 flex gap-3 transition-colors relative cursor-pointer outline-none",
                        active ? "bg-slate-50/70" : "hover:bg-slate-50/30"
                      )}
                    >
                      {active && <span className="absolute left-0 top-2.5 bottom-2.5 w-0.75 bg-blue-600 rounded-r" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase", priorityTone[a.priority] || priorityTone.Medium)}>
                            {a.priority}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 tabular-nums">#{a.id}</span>
                        </div>
                        <div className="text-xs font-bold text-slate-800 truncate">{a.title}</div>
                        <div className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center gap-2">
                          <span className="truncate">{a.requester}</span>
                          <span>·</span>
                          <span className="shrink-0">{a.status}</span>
                        </div>

                        {a.status !== "Pending" && (
                          <span
                            className={cn(
                              "mt-2 inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase",
                              a.status === "Approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                            )}
                          >
                            {a.status === "Approved" ? <Check className="size-3" /> : <X className="size-3" />}
                            {a.status}
                          </span>
                        )}
                      </div>
                      <ChevronRight className="size-4 text-slate-300 self-center shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Details Pane */}
            {selected && (
              <div className={cn(
                "w-full",
                mobileView === "list" ? "hidden lg:block" : "block"
              )}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selected.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-2xl bg-white border border-slate-200 flex flex-col h-full shadow-sm"
                  >
                    <div className="p-4 border-b border-slate-100 flex items-center lg:hidden bg-slate-50/30">
                      <button 
                        onClick={() => setMobileView("list")} 
                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        <ArrowLeft className="size-4" /> Back to list
                      </button>
                    </div>

                    <div className="p-6 border-b border-slate-200">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded border uppercase", priorityTone[selected.priority] || priorityTone.Medium)}>
                          {selected.priority}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-50 text-slate-500 uppercase">
                          {selected.category}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 tabular-nums ml-auto">#{selected.id}</span>
                      </div>
                      <h2 className="text-lg font-black text-slate-900 tracking-tight">{selected.title}</h2>

                      <div className="grid sm:grid-cols-2 gap-3 mt-5 text-xs">
                        <InfoRow icon={<User className="size-4" />} label="Requester" value={selected.requester} />
                        <InfoRow icon={<Building className="size-4" />} label="Branch" value={selected.branch} />
                        <InfoRow icon={<Clock className="size-4" />} label="Status State" value={selected.status} />
                        {selected.amount && (
                          <InfoRow icon={<Banknote className="size-4" />} label="Reference Info" value={selected.amount} highlight />
                        )}
                      </div>
                    </div>

                    <div className="p-6 space-y-5 flex-1">
                      <section>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Scope Impact</div>
                        <div className="flex items-start gap-2.5 text-xs bg-amber-50/50 border border-amber-200 rounded-xl p-3">
                          <AlertTriangle className="size-4 text-amber-500 mt-0.5 shrink-0" />
                          <span className="font-semibold text-slate-700">{selected.impact}</span>
                        </div>
                      </section>

                      <section>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Justification / Reason</div>
                        <p className="text-xs font-semibold leading-relaxed text-slate-600">{selected.reason}</p>
                      </section>

                      {selected.attachments > 0 && (
                        <section>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Submitted Evidence</div>
                          <div className="flex flex-wrap gap-2">
                            {Array.from({ length: selected.attachments }).map((_, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-600 shadow-sm">
                                <FileText className="size-3.5 text-slate-400" />
                                evidence_ref_{i + 1}.pdf
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {selected.status === "Pending" && (
                        
                        <section>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                            Approver Comment (strictly required for rejection)
                          </div>
                          <div className="relative">
                            <MessageSquare className="size-4 absolute left-3 top-3.5 text-slate-400" />
                            <textarea
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              rows={3}
                              placeholder="Provide override context, instructions, or rejection reasons..."
                              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-xs font-semibold resize-none transition"
                            />
                          </div>
                        </section>
                      )}
                    </div>

                    {decideError && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        className="mx-6 mb-3 flex items-start gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5"
                      >
                        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                        <span>{decideError}</span>
                      </motion.div>
                    )}

                    {successMsg && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        className="mx-6 mb-3 flex items-start gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5"
                      >
                        <Check className="size-4 shrink-0 mt-0.5" />
                        <span>{successMsg}</span>
                      </motion.div>
                    )}

                    {selected.status === "Pending" && (
                      <div className="p-4 border-t border-slate-200 flex flex-wrap items-center gap-2 justify-end bg-slate-50/50 rounded-b-2xl">
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => decide("Returned")}
                          className="px-3.5 h-9 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <AlertCircle className="size-3.5" /> Request Info
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => decide("Rejected")}
                          className="px-3.5 h-9 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <X className="size-4" /> Reject / Return
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => decide("Approved")}
                          className="px-4 h-9 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <Check className="size-4" /> Approve{comment ? " with comment" : ""}
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function InfoRow({ icon, label, value, highlight }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="size-8 rounded-lg bg-slate-50 border border-slate-100 grid place-items-center text-slate-400 shrink-0">{icon}</span>
      <div className="min-w-0 text-left">
        <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">{label}</div>
        <div className={cn("text-xs font-bold text-slate-700 truncate mt-0.5", highlight && "text-rose-600 tabular-nums")}>{value}</div>
      </div>
    </div>
  );
}