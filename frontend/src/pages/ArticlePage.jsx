import React, { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Clock, Eye, ThumbsUp, ThumbsDown, ArrowRight, Sparkles, Loader2, AlertCircle, Pencil, ShieldCheck } from "lucide-react";
import { apiFetch } from "../utils/apiFetch";
import { cn } from "../utils/cn";
import { Markdown } from "../components/helpdesk/Markdown";

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

export default function ArticlePage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);
  const isAdmin = currentUser.role === "Admin";

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [vote, setVote] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError("");
      try {
        const res = await apiFetch(`/knowledge/${slug}/`);
        if (cancelled) return;
        if (res.ok) setArticle(await res.json());
        else if (res.status === 404) setError("not-found");
        else setError("Unable to load this article.");
      } catch {
        if (!cancelled) setError("Network error loading the article.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const sendFeedback = async (v) => {
    if (vote) return; 
    setVote(v);
    setArticle((a) => a && ({
      ...a,
      helpful_count: a.helpful_count + (v === "up" ? 1 : 0),
      not_helpful_count: a.not_helpful_count + (v === "down" ? 1 : 0),
    }));
    try {
      await apiFetch(`/knowledge/${slug}/feedback/`, {
        method: "POST",
        body: JSON.stringify({ vote: v }),
      });
    } catch { /* optimistic; ignore transient failure */ }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs font-bold text-slate-400 gap-2 min-h-[400px]">
        <Loader2 className="size-8 text-blue-600 animate-spin" />
        <p>Loading article…</p>
      </div>
    );
  }

  if (error === "not-found" || (!article && error)) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center gap-3 min-h-[400px]">
        <AlertCircle className="size-8 text-slate-300" />
        <h2 className="text-sm font-bold text-slate-900">
          {error === "not-found" ? "Article not found" : "Something went wrong"}
        </h2>
        <p className="text-xs text-slate-500 font-semibold max-w-xs">
          {error === "not-found"
            ? "This guide may have been moved or unpublished."
            : "We couldn't load this article. Please try again."}
        </p>
        <Link to="/kb" className="mt-2 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition">
          Back to Knowledge Base
        </Link>
      </div>
    );
  }

  const total = article.helpful_count + article.not_helpful_count;
  const helpfulPct = total > 0 ? Math.round((article.helpful_count / total) * 100) : null;
  const color = article.category_color || "#5e17eb";

  return (
    <div className="space-y-6 text-left font-sans">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        <Link to="/kb" className="hover:text-slate-800 transition">Knowledge Base</Link>
        <ChevronRight className="size-3" />
        <span>{article.category_label}</span>
        <ChevronRight className="size-3" />
        <span className="text-slate-800 font-extrabold truncate max-w-[200px] sm:max-w-md">{article.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
        <article className="min-w-0 space-y-6">
          <header className="rounded-2xl bg-white border border-slate-200 p-5 md:p-7 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase"
                style={{ color, backgroundColor: `${color}14`, borderColor: `${color}29` }}
              >
                {article.category_label}
              </span>
              {article.status === "published" ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-emerald-50 text-emerald-700 border-emerald-100 inline-flex items-center gap-1 uppercase">
                  <ShieldCheck className="size-3" /> Published
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-amber-50 text-amber-700 border-amber-200 uppercase">
                  Draft
                </span>
              )}
              {isAdmin && (
                <button
                  onClick={() => navigate(`/kb/${slug}/edit`)}
                  className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 cursor-pointer transition"
                >
                  <Pencil className="size-3.5 text-slate-400" /> Edit
                </button>
              )}
            </div>

            <h1 className="text-xl md:text-2xl font-black tracking-tight leading-snug text-slate-900">{article.title}</h1>
            {article.summary && (
              <p className="text-xs text-slate-500 mt-2 leading-relaxed font-semibold">{article.summary}</p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-bold text-slate-400 uppercase border-t border-slate-100 pt-4">
              <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" /> {article.read_minutes} min read</span>
              <span className="inline-flex items-center gap-1.5"><Eye className="size-3.5" /> {article.views.toLocaleString()} views</span>
              <span>Updated · {formatDate(article.updated_at)}</span>
              <span>By {article.author_name}</span>
            </div>
          </header>

          <div className="rounded-2xl bg-white border border-slate-200 p-6 md:p-9 shadow-sm">
            <Markdown>{article.content}</Markdown>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm text-left">
              <div className="text-xs font-bold text-slate-900">Was this article helpful?</div>
              <p className="text-[11px] text-slate-400 font-semibold mt-1">Your feedback helps us prioritize what to improve.</p>
              <div className="mt-4 flex gap-2">
                <FeedbackBtn active={vote === "up"} disabled={!!vote} onClick={() => sendFeedback("up")} tone="success" icon={ThumbsUp}>Helpful</FeedbackBtn>
                <FeedbackBtn active={vote === "down"} disabled={!!vote} onClick={() => sendFeedback("down")} tone="critical" icon={ThumbsDown}>Not helpful</FeedbackBtn>
              </div>
              {vote && (
                <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-[11px] text-slate-400 font-bold mt-3">
                  Feedback logged. Thank you.
                </motion.p>
              )}
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-blue-50/50 via-white to-slate-50 border border-slate-200 p-5 flex flex-col shadow-sm text-left">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Sparkles className="size-4 text-blue-600" /> Still need assistance?
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-semibold leading-relaxed">
                If this guide didn't resolve your issue, raise a ticket and it will be routed to the right department.
              </p>
              <Link to="/tickets/new" className="mt-auto inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm self-start">
                File a ticket <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4 text-left">
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Article telemetry</div>
              <dl className="mt-3 space-y-2.5 text-xs font-bold">
                <Row label="Helpfulness score" value={helpfulPct === null ? "—" : `${helpfulPct}%`} />
                <Row label="Total views" value={article.views.toLocaleString()} />
                <Row label="Est. read time" value={`${article.read_minutes} min`} />
                {article.category_department && <Row label="Owned by" value={article.category_department} />}
              </dl>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function FeedbackBtn({ active, disabled, onClick, tone, icon: Icon, children }) {
  return (
    <motion.button
      whileTap={disabled ? {} : { scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex-1 h-10 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:cursor-default",
        active
          ? tone === "success"
            ? "bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm"
            : "bg-rose-50 text-rose-700 border-rose-100 shadow-sm"
          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 disabled:opacity-60"
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
