import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, BookOpen, ArrowRight, Clock, Eye, Sparkles, Plus, X, Loader2, AlertCircle } from "lucide-react";
import { cn } from "../utils/cn";
import { apiFetch } from "../utils/apiFetch";
import { categoryIcon } from "../components/helpdesk/categoryIcons";

const TRENDING = ["VPN", "Card activation", "Password reset", "Leave"];

export default function KnowledgePage() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);
  const isAdmin = currentUser.role === "Admin";

  const [categories, setCategories] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(null); 

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/knowledge/categories/");
        if (res.ok) setCategories(await res.json());
      } catch { /* non-fatal: the page still works without the cards */ }
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    (async () => {
      setLoading(true); setError("");
      try {
        let url = "/knowledge/?sort=popular";
        if (debouncedQuery) url = `/knowledge/?search=${encodeURIComponent(debouncedQuery)}`;
        else if (activeCategory) url = `/knowledge/?category=${encodeURIComponent(activeCategory.key)}`;
        const res = await apiFetch(url);
        if (res.ok) setArticles(await res.json());
        else setError("Could not load knowledge base articles.");
      } catch {
        setError("Network error loading the knowledge base.");
      } finally {
        setLoading(false);
      }
    })();
  }, [debouncedQuery, activeCategory]);

  const selectCategory = (c) => {
    setQuery(""); setDebouncedQuery("");
    setActiveCategory((prev) => (prev?.key === c.key ? null : { key: c.key, label: c.label }));
  };

  const clearFilters = () => { setQuery(""); setDebouncedQuery(""); setActiveCategory(null); };

  const listTitle = debouncedQuery
    ? `Results for “${debouncedQuery}”`
    : activeCategory ? `${activeCategory.label} articles`
    : "Most read this week";

  return (
    <div className="space-y-8 text-left font-sans">
      <section className="relative overflow-hidden rounded-3xl bg-[#0B1329] text-white p-8 md:p-12 shadow-md">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top_right,_var(--primary)_0%,_transparent_60%)]" />
        <div className="absolute -bottom-24 -left-16 size-72 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative max-w-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700 mb-4 uppercase tracking-wider">
              <Sparkles className="size-3 text-blue-400" /> Self-service · Powered by Dash MFB
            </div>
            {isAdmin && (
              <button
                onClick={() => navigate("/kb/new")}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold border-0 cursor-pointer transition shadow-md"
              >
                <Plus className="size-4" /> New article
              </button>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
            Find the answer before raising a ticket.
          </h1>
          <p className="text-slate-400 mt-2 text-xs md:text-sm font-medium">
            Guides, FAQs, and policy documents — organized by department.
          </p>

          <form onSubmit={(e) => e.preventDefault()} className="mt-7 relative">
            <Search className="size-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search guides, FAQs, policy documents…"
              className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white text-slate-900 border border-slate-200 focus:border-blue-500 outline-none text-xs font-semibold shadow-lg transition"
            />
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
            <span>Trending:</span>
            {TRENDING.map((t) => (
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

      <section>
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900">Browse by category</h2>
            <p className="text-xs text-slate-400 mt-0.5">Organized by bank department, not by software tool.</p>
          </div>
          {activeCategory && (
            <button onClick={clearFilters} className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold border-0 bg-transparent cursor-pointer">
              <X className="size-3" /> Clear filter
            </button>
          )}
        </div>

        {categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs font-bold text-slate-400">
            No categories yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((c, i) => {
              const Icon = categoryIcon(c.icon_name);
              const active = activeCategory?.key === c.key;
              return (
                <motion.button
                  key={c.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ y: -2 }}
                  onClick={() => selectCategory(c)}
                  className={cn(
                    "group relative text-left rounded-2xl bg-white border p-5 transition-all cursor-pointer outline-none shadow-sm",
                    active ? "border-blue-400 ring-1 ring-blue-200" : "border-slate-200 hover:border-blue-300"
                  )}
                >
                  <div
                    className="size-11 rounded-xl grid place-items-center border"
                    style={{ color: c.color, backgroundColor: `${c.color}14`, borderColor: `${c.color}29` }}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-800 text-sm">{c.label}</h3>
                    <span className="text-[10px] font-bold text-slate-400 tabular-nums uppercase">
                      {c.article_count} article{c.article_count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed line-clamp-2">{c.description}</p>
                </motion.button>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="px-5 h-12 flex items-center justify-between border-b border-slate-200 bg-slate-50/50">
            <div className="text-xs font-bold flex items-center gap-2 text-slate-800 uppercase tracking-wider">
              <BookOpen className="size-4 text-blue-600" /> {listTitle}
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">{articles.length} shown</span>
          </div>

          {loading && (
            <div className="p-12 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin text-blue-600" /> Loading articles…
            </div>
          )}
          {error && (
            <div className="p-12 text-center text-xs font-bold text-rose-500 flex items-center justify-center gap-2">
              <AlertCircle className="size-4" /> {error}
            </div>
          )}
          {!loading && !error && articles.length === 0 && (
            <div className="p-12 text-center text-xs font-bold text-slate-400">
              {debouncedQuery ? "No articles match your search." : "No articles here yet."}
            </div>
          )}

          {!loading && !error && articles.length > 0 && (
            <ul className="divide-y divide-slate-200">
              {articles.map((a, i) => (
                <li key={a.slug} className="px-5 py-4 hover:bg-slate-50/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className="text-[11px] font-bold tabular-nums text-slate-400 w-5 mt-0.5">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <Link to={`/kb/${a.slug}`} className="font-bold text-slate-800 hover:underline text-xs block">
                        {a.title}
                      </Link>
                      {a.summary && (
                        <p className="text-[11px] text-slate-400 font-semibold mt-0.5 line-clamp-1">{a.summary}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[10px] text-slate-400 font-bold uppercase">
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="size-3" /> {a.category_label}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3" /> {a.read_minutes} min read
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Eye className="size-3" /> {a.views.toLocaleString()} views
                        </span>
                        {a.status === "draft" && (
                          <span className="text-amber-600 inline-flex items-center gap-1">· Draft</span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-blue-50/50 via-white to-slate-50 border border-slate-200 p-6 flex flex-col shadow-sm text-left h-fit">
          <div className="size-11 rounded-xl bg-blue-50 text-blue-600 grid place-items-center border border-blue-100 shadow-sm">
            <Sparkles className="size-5" />
          </div>
          <h3 className="mt-4 text-base font-bold tracking-tight text-slate-900">Still stuck?</h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
            If none of our self-service guides resolve your problem, submit a help desk ticket and the system will auto-route it to the correct department queue.
          </p>
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
