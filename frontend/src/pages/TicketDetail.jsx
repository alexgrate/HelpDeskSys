import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, UserPlus, ArrowUpRightFromSquare, ShieldCheck, ChevronDown,
  Paperclip, Send, MessageSquare, Building2, Calendar, Tag,
  Clock, CheckCircle2, Circle, Loader2, FileText, Activity, Bot,
  AlertTriangle, User as UserIcon, MoreHorizontal,
} from "lucide-react";
import { cn } from "../utils/cn";
import { apiFetch } from "../utils/apiFetch";
import { getSlaMetrics } from "../utils/sla";

export default function TicketDetail() {
  const { id } = useParams(); 
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [composerText, setComposerText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }

    const fetchTicketDetails = async () => {
      try {
        const ticketRes = await apiFetch(`/tickets/${id}/`);
        if (!ticketRes.ok) {
          if (ticketRes.status === 404) {
            setError("Ticket not found in the records.");
            return;
          }
          throw new Error("Unable to retrieve ticket details.");
        }
        
        const data = await ticketRes.json();
        setTicket(data);
        
        const commentsRes = await apiFetch(`/tickets/${id}/comments/`);
        if (commentsRes.ok) {
            const commentsData = await commentsRes.json();

            const formattedComments = commentsData.map(c => ({
                id: c.id,
                kind: c.comment_type,
                author: c.author_name,
                role: c.author_email ? c.author_email.split('@')[0] : "System",
                initials: c.author_name ? c.author_name.slice(0, 2).toUpperCase() : "SC",
                time: new Date(c.created_at).toLocaleString([], { 
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                }),
                body: c.body
            }));

            setComments(formattedComments);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTicketDetails();
  }, [id, navigate]);

  // Live Status Transition Patch Command
  const handleMarkResolved = async () => {
    if (!ticket) return;
    try {
      const response = await apiFetch(`/tickets/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Resolved" })
      });
      if (response.ok) {
        const updatedTicket = await response.json();
        setTicket(updatedTicket);
        refreshTimeline();
      }
    } catch (err) {
      console.error("Status transition failed:", err);
    }
  };

  // Live Override Escalation Patch Command
  const handleRequestOverride = async () => {
    if (!ticket) return;
    try {
      const response = await apiFetch(`/tickets/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Pending Manager Approval" })
      });
      if (response.ok) {
        const updatedTicket = await response.json();
        setTicket(updatedTicket);
        refreshTimeline();
      }
    } catch (err) {
      console.error("Override request failed:", err);
    }
  };

  // Live Comment Post Handler
  const handlePostComment = async () => {
    if (!composerText.trim() || !ticket) return;
    setPostingComment(true);

    try {
      const response = await apiFetch(`/tickets/${id}/comments/`, {
        method: "POST",
        body: JSON.stringify({
          body: composerText,
          comment_type: "public"
        })
      });

      if (!response.ok) {
        throw new Error("Failed to post comment.");
      }

      const c = await response.json();

      const newComment = {
        id: c.id,
        kind: c.comment_type,
        author: c.author_name,
        role: c.author_email ? c.author_email.split('@')[0] : "System",
        initials: c.author_name ? c.author_name.slice(0, 2).toUpperCase() : "SC",
        time: new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        body: c.body
      };

      setComments(prev => [...prev, newComment]);
      setComposerText("");
    } catch (err) {
      console.error(err.message);
    } finally {
      setPostingComment(false);
    }
  };

  const refreshTimeline = async () => {
    const commentsRes = await apiFetch(`/tickets/${id}/comments/`);
    if (commentsRes.ok) {
      const commentsData = await commentsRes.json();
      const formattedComments = commentsData.map(c => ({
        id: c.id,
        kind: c.comment_type,
        author: c.author_name,
        role: c.author_email ? c.author_email.split('@')[0] : "System",
        initials: c.author_name ? c.author_name.slice(0, 2).toUpperCase() : "SC",
        time: new Date(c.created_at).toLocaleString([], { 
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        }),
        body: c.body
      }));
      setComments(formattedComments);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 text-blue-600 animate-spin" />
          <p className="text-xs font-bold text-slate-400">Loading secure workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center font-sans">
        <div className="max-w-sm space-y-4">
          <AlertTriangle className="size-12 text-rose-500 mx-auto" />
          <h2 className="text-sm font-bold text-slate-900">Workspace Unavailable</h2>
          <p className="text-xs text-slate-400">{error || "This incident record could not be loaded."}</p>
          <Link to="/" className="inline-flex h-9 px-4 items-center justify-center text-xs font-bold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg">
            Back to Queue
          </Link>
        </div>
      </div>
    );
  }

  const isStaff = currentUser?.role === "Staff";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 text-left font-sans">
      <TopStrip ticketId={ticket.ticket_id} category={ticket.category} />
      <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          <div className="lg:col-span-7 space-y-6 min-w-0">
            <TicketHeader ticket={ticket} />
            
            {/* FIXED: Warn message if the ticket has been claimed by another operator [4] */}
            {ticket.assignee && ticket.assignee !== currentUser?.id && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3 shadow-sm">
                <UserIcon className="size-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-blue-800">Occupied Incident Workspace</h4>
                  <p className="text-[11px] text-blue-600 font-semibold leading-relaxed mt-0.5">
                    This ticket is currently assigned to and being worked on by <span className="font-black text-blue-800">{ticket.assignee_name || "another operator"}</span>.
                  </p>
                </div>
              </div>
            )}

            {/* Render the Action bar (Hidden for Staff Requesters) */}
            {!isStaff && (
              <ActionBar 
                ticket={ticket} 
                currentUser={currentUser}
                onResolve={handleMarkResolved} 
                onRequestOverride={handleRequestOverride}
                onTicketUpdate={(updated) => {
                  setTicket(updated);
                  refreshTimeline();
                }}
              />
            )}
            
            <Workspace 
              text={composerText} 
              setText={setComposerText}
              onPost={handlePostComment}
              posting={postingComment}
              comments={comments}
            />
          </div>
          <aside className="lg:col-span-3 space-y-6 min-w-0">
            <SlaWidget createdAt={ticket.created_at} priority={ticket.priority} status={ticket.status} />
            <ApprovalTracker status={ticket.status} />
            <AuditLog ticket={ticket} />
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Top Header bar ─────────────── */

function TopStrip({ ticketId, category }) {
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}")
  const isStaff = currentUser?.role === "Staff"
  
  return (
    <div className="border-b border-slate-200 bg-white/70 backdrop-blur-xl sticky top-0 z-20">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 h-14 flex items-center gap-3">
        <Link to={isStaff ? "/staff-portal" : "/"} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">
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

/* ─────────────── Ticket Header ─────────────── */

function TicketHeader({ ticket }) {
  const priorityColors = {
    Critical: "bg-rose-50 text-rose-700 border-rose-200",
    High: "bg-amber-50 text-amber-700 border-amber-200",
    Medium: "bg-blue-50 text-blue-700 border-blue-200",
    Low: "bg-slate-100 text-slate-600 border-slate-200",
  };

  const statusColors = {
    "Submitted": "bg-slate-100 text-slate-600 border-slate-200",
    "Pending Manager Approval": "bg-amber-50 text-amber-700 border-amber-200",
    "In Progress": "bg-indigo-50 text-indigo-700 border-indigo-200",
    "Resolved": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Closed": "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.35 }}
      className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs font-mono font-bold text-slate-400">#{ticket.ticket_id}</span>
        <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border", priorityColors[ticket.priority])}>
          <AlertTriangle className="size-3" /> {ticket.priority} Priority
        </span>
        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border bg-slate-50 text-slate-600 uppercase">
          {ticket.category}
        </span>
        <span className={cn("inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border", statusColors[ticket.status])}>
          {ticket.status}
        </span>
      </div>

      <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 leading-snug">
        {ticket.summary}
      </h1>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
        <Meta icon={UserIcon} label="Requester" value={ticket.submitted_by_email.split("@")[0]} sub={ticket.branch || "Branch Operations"} />
        <Meta icon={Tag} label="Classified Category" value={ticket.problem_type} sub="Automatic Classification" />
        <Meta icon={Calendar} label="Date Submitted" value={new Date(ticket.created_at).toLocaleDateString()} sub={new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
      </div>

      {ticket.attachments && ticket.attachments.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-100 text-left">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">Attached Evidence / Screenshots</div>
          <div className="flex flex-wrap gap-2">
            {ticket.attachments.map((att) => {
              const fileName = att.file.split("/").pop();
              return (
                <a 
                  key={att.id}
                  href={att.file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[11px] font-bold px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 text-slate-600 hover:text-slate-800 shadow-sm transition-all cursor-pointer"
                >
                  <FileText className="size-4 text-slate-400 shrink-0" />
                  <span className="truncate max-w-[150px]">{fileName}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </motion.section>
  );
}

function Meta({ icon: Icon, label, value, sub }) {
  return (
    <div className="flex items-start gap-3">
      <div className="size-9 shrink-0 rounded-lg bg-slate-50 border border-slate-100 grid place-items-center text-slate-400">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">{label}</div>
        <div className="text-xs font-bold text-slate-700 truncate mt-0.5">{value}</div>
        <div className="text-[10px] text-slate-400 truncate font-medium">{sub}</div>
      </div>
    </div>
  );
}

/* ─────────────── Action Triage Bar ─────────────── */

function ActionBar({ ticket, currentUser, onResolve, onRequestOverride, onTicketUpdate }) {
  const isManager = currentUser?.role === "Manager";
  const isAssignee = ticket.assignee === currentUser?.id;
  const isUnassigned = !ticket.assignee;

  // Handles Take Ownership updates dynamically using the general serializer
  const handleAssignToMe = async () => {
    try {
      const response = await apiFetch(`/tickets/${ticket.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ assignee: currentUser.id })
      });
      if (response.ok) {
        const updatedTicket = await response.json();
        onTicketUpdate?.(updatedTicket);
      }
    } catch (err) {
      console.error("Failed to assign ticket:", err);
    }
  };

  const handleEscalate = async () => {
    const nextPriority = ticket.priority === "Low" ? "Medium" : ticket.priority === "Medium" ? "High" : "Critical";
    try {
      const response = await apiFetch(`/tickets/${ticket.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ priority: nextPriority })
      });
      if (response.ok) {
        const updatedTicket = await response.json();
        onTicketUpdate?.(updatedTicket);
      }
    } catch (err) {
      console.error("Failed to escalate ticket priority:", err);
    }
  };

  // FIXED: If assigned to someone else, do not render the action bar [4]
  if (ticket.assignee && !isAssignee) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex flex-wrap items-center gap-2">
      
      {/* 1. Dynamic Assignee Action: 
          - If Unassigned, the ONLY action is "Assign to Me" [4]
          - If Assigned, hide assign buttons and unlock active resolutions */}
      {isUnassigned ? (
        <ActionBtn 
          icon={UserPlus} 
          label={isManager ? "Take Ownership (Override)" : "Assign to Me"} 
          onClick={handleAssignToMe} 
        />
      ) : (
        <span className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold">
          <UserIcon className="size-3.5 shrink-0" /> Assigned to You
        </span>
      )}

      {/* 2. Escalation Action: Hidden for Managers. Unlocked for assigned agents only */}
      {!isManager && (
        <ActionBtn 
          icon={ArrowUpRightFromSquare} 
          label="Escalate Priority" 
          tone="warning" 
          onClick={handleEscalate} 
          disabled={isUnassigned}
        />
      )}
      
      <button className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600">
        Status: <span className="text-slate-800 font-black">{ticket.status}</span>
      </button>

      {/* 3. Override request action: Only available to non-manager roles */}
      {!isManager && <ActionBtn icon={ShieldCheck} label="Request Override" onClick={onRequestOverride} disabled={isUnassigned} />}
      
      <div className="ml-auto">
        {/* 4. Resolution Action:
            - Unlocked for Agents & Admins who have claimed ownership [4].
            - Unlocked for Managers ONLY if they have actively taken ownership [4]. */}
        {ticket.status !== "Resolved" && ticket.status !== "Closed" && (!isManager || isAssignee) && (
          <motion.button
            whileHover={isUnassigned ? {} : { y: -1 }} 
            whileTap={isUnassigned ? {} : { scale: 0.97 }}
            onClick={onResolve}
            disabled={isUnassigned}
            className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-55 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <CheckCircle2 className="size-4" /> Mark Resolved
          </motion.button>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, tone, onClick, disabled }) {
  return (
    <motion.button
      whileTap={disabled ? {} : { scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed",
        tone === "warning"
          ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </motion.button>
  );
}


/* ─────────────── Workspace Composer (Single Tab Only) ─────────────── */

function Workspace({ text, setText, onPost, posting, comments }) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-left">
      <div className="border-b border-slate-200 px-5 py-3.5 flex items-center gap-2 bg-slate-50/50">
        <MessageSquare className="size-4 text-slate-500" />
        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Post a Reply</span>
      </div>

      <div className="relative">
        <Composer text={text} setText={setText} onPost={onPost} posting={posting} />
      </div>

      <div className="border-t border-slate-200 bg-slate-50/30">
        <div className="px-5 py-3 flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100">
          <Activity className="size-3.5" /> Conversation Timeline
        </div>
        <ConversationTimeline comments={comments} />
      </div>
    </section>
  );
}

function Composer({ text, setText, onPost, posting }) {
  return (
    <div className="p-5 bg-white">
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your response here..."
          className="w-full px-4 py-3 bg-transparent outline-none resize-none text-xs font-semibold placeholder:text-slate-400 text-slate-800"
        />
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50/30">
          <div className="flex items-center gap-1">
            <IconBtn icon={Paperclip} />
            <IconBtn icon={FileText} />
            <span className="text-[10px] font-medium text-slate-400 ml-1">Attachments & markdown supported</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onPost}
            disabled={posting || !text.trim()}
            className="h-8 px-3.5 inline-flex items-center gap-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all cursor-pointer disabled:opacity-50"
          >
            {posting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <>
                <Send className="size-3.5" />
                Send Reply
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ icon: Icon }) {
  return (
    <button className="size-8 grid place-items-center rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
      <Icon className="size-4" />
    </button>
  );
}

/* ─────────────── Timeline List ─────────────── */

function ConversationTimeline({ comments }) {
  return (
    <div className="px-5 pb-5 max-h-[480px] overflow-y-auto space-y-4 pt-4">
      {comments.map((m, i) => (
        <motion.div
          key={m.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          {m.kind === "system" ? (
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 py-1 uppercase tracking-wider">
              <div className="flex-1 h-px bg-slate-200" />
              <Bot className="size-3.5" />
              <span>{m.body}</span>
              <span className="text-slate-300">· {m.time}</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
          ) : (
            <div className="flex gap-3 text-left">
              <div className="size-9 rounded-full grid place-items-center text-xs font-bold shrink-0 ring-2 ring-white border bg-blue-50 text-blue-700 border-blue-100">
                {m.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-800">{m.author}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{m.role}</span>
                  <span className="text-[10px] text-slate-400 font-medium">· {m.time}</span>
                </div>
                <div className="mt-1.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold leading-relaxed border bg-slate-50 border-slate-200 text-slate-700">
                  {m.body}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

/* ─────────────── Right Panel: Widgets ─────────────── */

function SlaWidget({ createdAt, priority, status, updatedAt }) {
  const sla = getSlaMetrics(createdAt, priority, status, updatedAt);
  const remaining = Math.max(0, sla.remainingMin);
  const total = sla.totalMin;
  
  const resolved = status === "Resolved" || status === "Closed";
  const pct = resolved ? 100 : ((total - remaining) / total) * 100;
  
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = resolved ? 0 : c - (pct / 100) * c;

  const tone = remaining < 20 && !resolved ? "stroke-rose-500" : remaining < 45 && !resolved ? "stroke-amber-500" : "stroke-emerald-500";
  const toneText = remaining < 20 && !resolved ? "text-rose-500 font-bold" : remaining < 45 && !resolved ? "text-amber-500 font-bold" : "text-emerald-500 font-bold";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.35 }}
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-left"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-slate-900 tracking-tight">SLA Progress</h3>
        <span className={cn("text-[10px] font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded-md border",
          resolved ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
          remaining < 45 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-100"
        )}>
          <Clock className="size-3" />
          {resolved ? "Met" : remaining < 45 ? "At Risk" : "On Track"}
        </span>
      </div>

      <div className="relative grid place-items-center py-2">
        <svg viewBox="0 0 100 100" className="size-40 -rotate-90">
          <circle cx="50" cy="50" r={r} className="stroke-slate-100 fill-none" strokeWidth="8" />
          <motion.circle
            cx="50"
            cy="50"
            r={r}
            className={cn("fill-none", tone)}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className={cn("text-3xl font-black tabular-nums leading-none", toneText)}>
              {resolved ? "0m" : `${remaining}m`}
            </div>
            <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">
              {resolved ? "Closed out" : "remaining"}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 text-[11px] text-center text-slate-400 font-medium">
        {resolved ? (
          <span className="font-bold text-emerald-600">SLA successfully met on resolved ticket.</span>
        ) : (
          <>
            <span className="font-bold text-slate-700">{remaining}</span> minutes remaining of a{" "}
            <span className="font-bold text-slate-700 font-mono">{(total / 60).toFixed(0)}-hour</span> limit.
          </>
        )}
      </div>
    </motion.div>
  );
}

function ApprovalTracker({ status }) {
  const steps = [
    { label: "Ticket Created", state: "done" },
    { 
      label: "Pending Approvals", 
      state: status === "Pending Manager Approval" ? "active" : 
             status === "Submitted" ? "pending" : "done" 
    },
    { 
      label: "Operator Processing", 
      state: status === "In Progress" ? "active" : 
             status === "Submitted" || status === "Pending Manager Approval" ? "pending" : "done" 
    },
    { 
      label: "Resolution", 
      state: status === "Resolved" || status === "Closed" ? "done" : "pending" 
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay: 0.05, duration: 0.35 }}
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-left"
    >
      <h3 className="text-xs font-bold text-slate-900 tracking-tight mb-4">Approval Workflow</h3>
      <ol className="relative space-y-1">
        {steps.map((s, i) => {
          const last = i === steps.length - 1;
          return (
            <li key={s.label} className="relative pl-9 pb-4 last:pb-0">
              {!last && (
                <span
                  className={cn(
                    "absolute left-[14px] top-7 bottom-0 w-px",
                    s.state === "done" ? "bg-emerald-500" : "bg-slate-200"
                  )}
                />
              )}
              <span className="absolute left-0 top-0 size-7 grid place-items-center rounded-full">
                {s.state === "done" && (
                  <span className="size-7 grid place-items-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <CheckCircle2 className="size-4" />
                  </span>
                )}
                {s.state === "active" && (
                  <span className="size-7 grid place-items-center rounded-full bg-blue-600 text-white ring-4 ring-blue-500/15">
                    <Loader2 className="size-3.5 animate-spin" />
                  </span>
                )}
                {s.state === "pending" && (
                  <span className="size-7 grid place-items-center rounded-full bg-slate-50 text-slate-400 border border-slate-200">
                    <Circle className="size-3.5" />
                  </span>
                )}
              </span>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className={cn(
                    "text-xs font-bold",
                    s.state === "active" ? "text-blue-600" :
                    s.state === "done" ? "text-slate-800" : "text-slate-400"
                  )}>
                    {s.label}
                  </div>
                  {s.state === "active" && <div className="text-[10px] text-blue-500 font-bold mt-0.5">Current step</div>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </motion.div>
  );
}

function AuditLog({ ticket }) {
  const auditEntries = [
    { time: "Submitted", text: `Ticket created by ${ticket.submitted_by_email.split('@')[0]}`, tone: "create" },
    { time: "Processed", text: `Auto-assigned priority: ${ticket.priority}`, tone: "system" },
    { time: "Updated", text: `Latest log state status: ${ticket.status}`, tone: "system" },
  ];

  const auditToneStyle = {
    create: { icon: UserIcon, ring: "ring-blue-100", bg: "bg-blue-50", text: "text-blue-600" },
    system: { icon: Bot, ring: "ring-slate-100", bg: "bg-slate-50", text: "text-slate-500" },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay: 0.1, duration: 0.35 }}
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-left"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-slate-900 tracking-tight">Audit Log</h3>
        <span className="text-[10px] text-slate-400 inline-flex items-center gap-1 font-bold">
          <Building2 className="size-3" /> Immutable trail
        </span>
      </div>
      <ol className="relative space-y-3.5">
        <span className="absolute left-[13px] top-2 bottom-2 w-px bg-slate-100" />
        {auditEntries.map((e, i) => {
          const s = auditToneStyle[e.tone] || auditToneStyle.system;
          const Icon = s.icon;
          return (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.04 }}
              className="relative pl-9"
            >
              <span className={cn("absolute left-0 top-0 size-7 grid place-items-center rounded-full ring-2 ring-white border", s.bg, s.ring)}>
                <Icon className={cn("size-3.5", s.text)} />
              </span>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{e.time}</div>
              <div className="text-xs font-bold text-slate-700 leading-snug mt-0.5">{e.text}</div>
            </motion.li>
          );
        })}
      </ol>
    </motion.div>
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

