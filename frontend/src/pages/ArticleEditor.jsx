import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronRight, Save, Loader2, AlertCircle, Eye, X } from "lucide-react";
import { apiFetch } from "../utils/apiFetch";
import { Markdown } from "../components/helpdesk/Markdown";

const EMPTY = { title: "", category: "", summary: "", status: "published", content: "" };

export default function ArticleEditor() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(slug);

  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/categories/");
        if (res.ok) setCategories(await res.json());
      } catch { /* non-fatal */ }
    })();
  }, []);

  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/knowledge/${slug}/`);
        if (res.ok) {
          const a = await res.json();
          setForm({
            title: a.title || "",
            category: a.category_key || "",
            summary: a.summary || "",
            status: a.status || "published",
            content: a.content || "",
          });
        } else {
          setError("Could not load the article for editing.");
        }
      } catch {
        setError("Network error loading the article.");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, isEditing]);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setFieldErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required.";
    if (!form.category) errs.category = "Pick a department category.";
    if (!form.content.trim()) errs.content = "Article content is required.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async () => {
    setError("");
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await apiFetch(isEditing ? `/knowledge/${slug}/` : "/knowledge/", {
        method: isEditing ? "PATCH" : "POST",
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        navigate(`/kb/${data.slug || slug}`);
      } else if (res.status === 400 && data && typeof data === "object") {
        setFieldErrors(
          Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v.join(" ") : String(v)]))
        );
        setError("Please fix the highlighted fields.");
      } else {
        setError("Could not save the article.");
      }
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs font-bold text-slate-400 gap-2 min-h-[400px]">
        <Loader2 className="size-8 text-blue-600 animate-spin" /> Loading editor…
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left font-sans">
      <nav className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        <Link to="/kb" className="hover:text-slate-800 transition">Knowledge Base</Link>
        <ChevronRight className="size-3" />
        <span className="text-slate-800 font-extrabold">{isEditing ? "Edit article" : "New article"}</span>
      </nav>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {isEditing ? "Edit article" : "New article"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">Write in Markdown — headings, lists, code blocks, and tables are supported.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(isEditing ? `/kb/${slug}` : "/kb")}
            className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 cursor-pointer transition"
          >
            <X className="size-4" /> Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="h-9 px-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold border-0 cursor-pointer transition shadow-sm disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isEditing ? "Save changes" : "Publish article"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600 flex items-center gap-2">
          <AlertCircle className="size-4" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-4 lg:col-span-1 h-fit">
          <Field label="Title" error={fieldErrors.title}>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. How to connect to the VPN"
              className="w-full h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 outline-none text-xs font-semibold"
            />
          </Field>

          <Field label="Department category" error={fieldErrors.category}>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 outline-none text-xs font-semibold cursor-pointer"
            >
              <option value="">Select a category…</option>
              {categories.map((c) => (
                <option key={c.key} value={c.key}>{c.label}{c.team_name ? ` · ${c.team_name}` : ""}</option>
              ))}
            </select>
          </Field>

          <Field label="Summary" error={fieldErrors.summary}>
            <textarea
              value={form.summary}
              onChange={(e) => set("summary", e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="A one or two line description shown in listings."
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 outline-none text-xs font-semibold resize-none"
            />
          </Field>

          <Field label="Status" error={fieldErrors.status}>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 outline-none text-xs font-semibold cursor-pointer"
            >
              <option value="published">Published — visible to everyone</option>
              <option value="draft">Draft — only visible to admins</option>
            </select>
          </Field>
        </div>

        {/* Content + live preview */}
        <div className="lg:col-span-2 space-y-4">
          <Field label="Content (Markdown)" error={fieldErrors.content}>
            <textarea
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              rows={16}
              placeholder={"# Overview\n\nExplain the guide here.\n\n## Steps\n\n1. First step\n2. Second step\n\n> Tip: use `code` for commands."}
              className="w-full px-3.5 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono leading-relaxed resize-y"
            />
          </Field>

          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="px-5 h-11 flex items-center gap-2 border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Eye className="size-3.5 text-blue-600" /> Live preview
            </div>
            <div className="p-6">
              {form.content.trim() ? (
                <Markdown>{form.content}</Markdown>
              ) : (
                <p className="text-xs text-slate-400 font-semibold">Start typing to see a preview…</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{label}</span>
      <div className="mt-1.5">{children}</div>
      {error && <span className="text-[11px] font-bold text-rose-500 mt-1 block">{error}</span>}
    </label>
  );
}
