import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Plus, Route as RouteIcon, Timer, Users, Trash2, ArrowRight, Pencil, Search, ShieldCheck, CheckCircle2, Loader2, X, AlertCircle, Save } from "lucide-react";
import { AppShell } from "../components/helpdesk/AppShell";
import { cn } from "../utils/cn";
import { apiFetch } from "../utils/apiFetch";

const ICON_CHOICES = [
  { k: "Monitor", label: "Monitor / Workstations" },
  { k: "Banknote", label: "Banknote / Core Banking" },
  { k: "CreditCard", label: "CreditCard / ATM & Cards" },
  { k: "Wrench", label: "Wrench / Facilities" },
  { k: "Users", label: "Users / HR Services" },
  { k: "ShieldAlert", label: "ShieldAlert / Compliance & Risk" },
  { k: "ShoppingBag", label: "ShoppingBag / Procurement" },
  { k: "Scale", label: "Scale / Legal" },
  { k: "Key", label: "Key / Access Security" },
  { k: "Database", label: "Database / Core Engine" },
  { k: "HelpCircle", label: "HelpCircle / General Inquiries" },
  { k: "Activity", label: "Activity / System Status" },
  { k: "UserCog", label: "UserCog / Administrative Overrides" },
  { k: "Laptop", label: "Laptop / Asset Provisioning" },
];

const emptyCategoryState = {
  key: "",
  label: "",
  team_id: "",
  description: "",
  icon_name: "Monitor",
  is_high_risk: false,
  steps: [],
  problems: [],
  sla_critical_hours: 1,
  sla_high_hours: 2,
  sla_medium_hours: 4,
  sla_low_hours: 8,
};

export default function AdminPage() {
  const [tab, setTab] = useState("routing");
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null); // structure: { message: string, type: 'success' | 'error' | 'info' | 'warning' }

  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const fetchAdminMatrixData = async () => {
      try {
        const [catRes, deptRes, roleRes] = await Promise.all([
          apiFetch("/categories/"),
          apiFetch("/departments/"),
          apiFetch("/roles/"),
        ]);

        if (catRes.ok && deptRes.ok && roleRes.ok) {
          setCategories(await catRes.json());
          setDepartments(await deptRes.json());
          setRoles(await roleRes.json());
        } else {
          setError("Failed to resolve administrative records from server.");
        }
      } catch (err) {
        setError("Network error. Unable to load system configs.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAdminMatrixData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 text-blue-600 animate-spin" />
          <p className="text-xs font-bold text-slate-400">Loading system operations...</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 text-left font-sans">
        <header>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
            <Settings className="size-3.5 text-blue-600" /> Control panel
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Admin · SLA & Routing</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure matrix workflows, operational thresholds, and departmental queue allocations across all branches.
          </p>
        </header>

        {error && (
          <div className="text-xs text-rose-500 font-bold bg-rose-50 border border-rose-100 p-3 rounded-lg flex items-center gap-1.5">
            <AlertCircle className="size-4" /> {error}
          </div>
        )}

        <div className="flex gap-1 p-1 rounded-lg bg-slate-100 w-fit flex-wrap">
          {[
            { id: "routing", label: "Routing Rules", icon: RouteIcon },
            { id: "sla", label: "SLA Matrix", icon: Timer },
            { id: "team", label: "Team Members", icon: Users },
            { id: "departments", label: "Departments", icon: ShieldCheck },
            { id: "roles", label: "Security Roles", icon: Settings },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative px-4 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border-0 outline-none bg-transparent",
                  active ? "text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="admin-tab"
                    className="absolute inset-0 bg-white rounded-md border border-slate-200 shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon className="relative size-3.5 text-slate-500" />
                <span className="relative">{t.label}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            {tab === "routing" && (
              <RoutingRules 
                categories={categories} 
                setCategories={setCategories} 
                departments={departments} 
                roles={roles} 
                showToast={showToast}
              />
            )}
            {tab === "sla" && (
              <SlaMatrix 
                categories={categories} 
                setCategories={setCategories} 
                showToast={showToast}
              />
            )}
            {tab === "team" && (
              <TeamMembers 
                departments={departments} 
                roles={roles} 
                showToast={showToast}
              />
            )}
            {tab === "departments" && (
              <DepartmentsPanel 
                departments={departments} 
                setDepartments={setDepartments} 
                showToast={showToast}
              />
            )}
            {tab === "roles" && (
              <RolesPanel 
                roles={roles} 
                setRoles={setRoles} 
                showToast={showToast}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating Animated Toast System */}
      <AnimatePresence>
        {toast && (
          <Toast toast={toast} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>
    </AppShell>
  );
}

/* ---------- Custom Notification Component ---------- */

function Toast({ toast, onClose }) {
  const styles = {
    success: "bg-emerald-50 border-emerald-200 text-emerald-900 shadow-emerald-100",
    error: "bg-rose-50 border-rose-200 text-rose-900 shadow-rose-100",
    info: "bg-indigo-50 border-indigo-100 text-indigo-900 shadow-indigo-100",
    warning: "bg-amber-50 border-amber-200 text-amber-900 shadow-amber-100"
  };

  const icons = {
    success: <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />,
    error: <AlertCircle className="size-4 text-rose-600 shrink-0" />,
    info: <ShieldCheck className="size-4 text-indigo-600 shrink-0" />,
    warning: <AlertCircle className="size-4 text-amber-600 shrink-0" />
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl text-xs font-bold max-w-sm",
        styles[toast.type] || styles.info
      )}
    >
      {icons[toast.type] || icons.info}
      <div className="flex-1 pr-1.5 leading-tight">{toast.message}</div>
      <button
        onClick={onClose}
        className="p-1 rounded-md hover:bg-black/5 text-slate-400 hover:text-slate-600 transition border-0 bg-transparent cursor-pointer"
      >
        <X className="size-3.5" />
      </button>
    </motion.div>
  );
}

/* ---------- 1. Dynamic Routing & Multi-Step Approvals ---------- */

function RoutingRules({ categories, setCategories, departments, roles, showToast }) {
  const [editingCategory, setEditingCategory] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCategory, setNewCategory] = useState({
    ...emptyCategoryState,
    team_id: departments[0]?.id || "",
  });
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [problemInput, setProblemInput] = useState("");

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setSavingId("new");
    try {
      const res = await apiFetch("/categories/", {
        method: "POST",
        body: JSON.stringify({
          key: newCategory.key.toLowerCase().trim().replace(/\s+/g, "_"),
          label: newCategory.label.trim(),
          team_id: newCategory.team_id,
          description: newCategory.description.trim(),
          icon_name: newCategory.icon_name,
          is_high_risk: newCategory.is_high_risk,
          problems: newCategory.problems,
          steps: newCategory.steps.map((s) => ({
            role_id: s.role_id,
            department_id: s.department_id || null,
          })),
        }),
      });

      if (res.ok) {
        const freshCategory = await res.json();
        setCategories((prev) => [...prev, freshCategory]);
        setNewCategory({ ...emptyCategoryState, team_id: departments[0]?.id || "" });
        setIsCreating(false);
        showToast("Category registered successfully.", "success");
      } else {
        const errData = await res.json();
        showToast(errData.detail || "Validation failed when creating category.", "error");
      }
    } catch (err) {
      showToast("Failed to connect to database server.", "error");
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdateCategory = async (id, updatedData) => {
    setSavingId(id);
    try {
      const res = await apiFetch(`/categories/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(updatedData),
      });

      if (res.ok) {
        const freshCat = await res.json();
        setCategories((prev) => prev.map((c) => (c.id === id ? freshCat : c)));
        setEditingCategory(null);
        showToast("Category updated successfully.", "success");
      } else {
        const errData = await res.json();
        showToast(errData.detail || "Validation failed when updating category.", "error");
      }
    } catch (err) {
      showToast("Failed to connect to database server.", "error");
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this category?")) return;
    setDeletingId(id);
    try {
      const res = await apiFetch(`/categories/${id}/`, {
        method: "DELETE",
      });

      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        showToast("Category permanently deleted.", "success");
      } else {
        showToast("Failed to delete category.", "error");
      }
    } catch (err) {
      showToast("Failed to connect to database.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const addProblemTag = (targetState, setTargetState) => {
    if (!problemInput.trim()) return;
    const cleanVal = problemInput.trim();
    if (!targetState.problems.includes(cleanVal)) {
      setTargetState({
        ...targetState,
        problems: [...targetState.problems, cleanVal],
      });
    }
    setProblemInput("");
  };

  const removeProblemTag = (tag, targetState, setTargetState) => {
    const problems = targetState.problems.filter((p) => p !== tag);
    setTargetState({ ...targetState, problems });
  };

  const addStepPlaceholder = (targetState, setTargetState) => {
    if (!targetState) return;
    const newStep = {
      step_number: targetState.steps.length + 1,
      role_id: roles[0]?.id || "",
      department_id: "",
    };
    setTargetState({
      ...targetState,
      steps: [...targetState.steps, newStep],
    });
  };

  const removeStep = (idx, targetState, setTargetState) => {
    const steps = targetState.steps.filter((_, i) => i !== idx);
    setTargetState({ ...targetState, steps });
  };

  return (
    <div className="space-y-6">
      <Panel
        title="Category Routing & Approval Steps"
        description="Designate high-risk ticket categories and configure dynamic authorization sequences."
        action={
          <button 
            onClick={() => setIsCreating(true)}
            className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition border-0 shadow-sm cursor-pointer"
          >
            <Plus className="size-4" /> Add Category
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
                <th className="text-left font-bold py-3 pl-2">Category</th>
                <th className="text-left font-bold py-3">Risk classification</th>
                <th className="text-left font-bold py-3">Approval Gate Sequence</th>
                <th className="text-left font-bold py-3">Default Target Queue</th>
                <th className="text-right font-bold py-3 pr-2 w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {categories.map((r) => {
                const isEditing = editingCategory?.id === r.id;
                return (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 pl-2">
                      <div className="font-bold text-slate-900 text-xs">
                        {r.label} <span className="text-[10px] font-mono text-slate-400 uppercase">({r.key})</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5 max-w-[200px]">
                        {r.problems && r.problems.map((p) => (
                          <span key={p} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4">
                      {isEditing ? (
                        <select
                          value={editingCategory.is_high_risk ? "true" : "false"}
                          onChange={(e) =>
                            setEditingCategory({
                              ...editingCategory,
                              is_high_risk: e.target.value === "true",
                            })
                          }
                          className="h-8 px-2 rounded-md border border-slate-200 text-xs font-bold outline-none"
                        >
                          <option value="false">Standard Risk</option>
                          <option value="true">High Risk</option>
                        </select>
                      ) : (
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                            r.is_high_risk
                              ? "bg-rose-50 text-rose-700 border-rose-100"
                              : "bg-slate-50 text-slate-500 border-slate-200"
                          )}
                        >
                          {r.is_high_risk ? "High Risk" : "Standard Risk"}
                        </span>
                      )}
                    </td>
                    <td className="py-4">
                      {isEditing ? (
                        <div className="space-y-2 max-w-lg">
                          {editingCategory.steps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-xs">
                              <span className="font-bold text-slate-400 pl-1">Step {idx + 1}:</span>
                              <select
                                value={step.role_id}
                                onChange={(e) => {
                                  const steps = [...editingCategory.steps];
                                  steps[idx].role_id = e.target.value;
                                  setEditingCategory({ ...editingCategory, steps });
                                }}
                                className="bg-white h-7 border border-slate-200 rounded text-xs font-bold"
                              >
                                {roles.map((rl) => (
                                  <option key={rl.id} value={rl.id}>{rl.name}</option>
                                ))}
                              </select>
                              <ArrowRight className="size-3.5 text-slate-400" />
                              <select
                                value={step.department_id || ""}
                                onChange={(e) => {
                                  const steps = [...editingCategory.steps];
                                  steps[idx].department_id = e.target.value || null;
                                  setEditingCategory({ ...editingCategory, steps });
                                }}
                                className="bg-white h-7 border border-slate-200 rounded text-xs font-bold"
                              >
                                <option value="">Default (Team)</option>
                                {departments.map((dp) => (
                                  <option key={dp.id} value={dp.id}>{dp.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => removeStep(idx, editingCategory, setEditingCategory)}
                                className="p-1 rounded text-rose-500 hover:bg-rose-50 border-0 outline-none bg-transparent cursor-pointer ml-auto"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => addStepPlaceholder(editingCategory, setEditingCategory)}
                            className="h-7 px-2.5 inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 border-0 text-[11px] font-bold text-slate-600 cursor-pointer"
                          >
                            <Plus className="size-3" /> Add step
                          </button>
                        </div>
                      ) : r.is_high_risk && r.steps && r.steps.length > 0 ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold flex-wrap">
                          {r.steps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                                <ShieldCheck className="size-3 text-indigo-500" />
                                {step.role_name}
                                {step.department_name && (
                                  <span className="text-[10px] text-indigo-400">· {step.department_name}</span>
                                )}
                              </span>
                              {idx < r.steps.length - 1 && (
                                <ArrowRight className="size-3 text-slate-400" />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic font-medium flex items-center gap-1.5">
                          <CheckCircle2 className="size-3.5 text-emerald-500" />
                          Bypasses Approvals (Auto-Approved)
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-xs font-bold text-slate-600">
                      {isEditing ? (
                        <select
                          value={editingCategory.team_id}
                          onChange={(e) =>
                            setEditingCategory({
                              ...editingCategory,
                              team_id: e.target.value,
                            })
                          }
                          className="h-8 px-2 rounded-md border border-slate-200 text-xs font-bold outline-none"
                        >
                          {departments.map((dp) => (
                            <option key={dp.id} value={dp.id}>{dp.name}</option>
                          ))}
                        </select>
                      ) : (
                        r.team_name
                      )}
                    </td>
                    <td className="py-4 pr-2 text-right">
                      {isEditing ? (
                        <div className="inline-flex gap-1.5">
                          <button
                            disabled={savingId === r.id}
                            onClick={() =>
                              handleUpdateCategory(r.id, {
                                is_high_risk: editingCategory.is_high_risk,
                                team_id: editingCategory.team_id,
                                problems: editingCategory.problems,
                                steps: editingCategory.steps.map((s) => ({
                                  role_id: s.role_id,
                                  department_id: s.department_id || null,
                                })),
                              })
                            }
                            className="size-7 rounded bg-emerald-600 text-white hover:bg-emerald-700 grid place-items-center transition border-0 cursor-pointer shadow-sm disabled:opacity-55"
                          >
                            {savingId === r.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Save className="size-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => setEditingCategory(null)}
                            className="size-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 grid place-items-center transition border-0 cursor-pointer"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => setEditingCategory(JSON.parse(JSON.stringify(r)))}
                            className="size-7 grid place-items-center rounded bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 border-0 cursor-pointer transition shadow-sm"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            disabled={deletingId === r.id}
                            onClick={() => handleDeleteCategory(r.id)}
                            className="size-7 grid place-items-center rounded bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border-0 cursor-pointer transition shadow-sm disabled:opacity-50"
                          >
                            {deletingId === r.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Creation Modal Drawer */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setIsCreating(false)} className="absolute inset-0 bg-slate-900" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto flex flex-col p-6 z-10 text-left">
              <header className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add New Category</h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Register a brand new ticket route and approval workflow.</p>
                </div>
                <button onClick={() => setIsCreating(false)} className="size-8 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 grid place-items-center border-0 outline-none bg-transparent cursor-pointer">
                  <X className="size-4" />
                </button>
              </header>

              <form onSubmit={handleCreateCategory} className="space-y-4 pt-4 flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Category Key (URL route)</label>
                    <input required type="text" placeholder="e.g. legal_ops" value={newCategory.key} onChange={(e) => setNewCategory({ ...newCategory, key: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-xs font-bold" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Display Label</label>
                    <input required type="text" placeholder="e.g. Legal Operations" value={newCategory.label} onChange={(e) => setNewCategory({ ...newCategory, label: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-xs font-bold" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Description</label>
                  <textarea required rows={2} placeholder="Describe what types of tickets fall under this operational routing..." value={newCategory.description} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })} className="w-full p-3 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-xs font-semibold resize-none" />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    Problem Choices (Specific Issue Dropdown Options)
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {!newCategory.problems || newCategory.problems.length === 0 ? (
                      <span className="text-[10px] text-slate-400 italic font-semibold">No specific issue options added yet.</span>
                    ) : (
                      newCategory.problems.map((prob) => (
                        <span key={prob} className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">
                          {prob}
                          <button
                            type="button"
                            onClick={() => removeProblemTag(prob, newCategory, setNewCategory)}
                            className="hover:text-rose-500 cursor-pointer border-0 p-0 bg-transparent outline-none text-[11px] font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                  <div className="flex gap-1.5 max-w-sm">
                    <input
                      type="text"
                      placeholder="e.g. Printer Offline"
                      value={problemInput}
                      onChange={(e) => setProblemInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addProblemTag(newCategory, setNewCategory))}
                      className="h-9 px-3 flex-1 rounded-lg border border-slate-200 text-xs outline-none font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => addProblemTag(newCategory, setNewCategory)}
                      className="h-9 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 border-0 outline-none text-xs font-bold text-slate-600 cursor-pointer"
                    >
                      Add Choice
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Default Target Team</label>
                    <select value={newCategory.team_id} onChange={(e) => setNewCategory({ ...newCategory, team_id: e.target.value })} className="w-full h-10 px-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-xs font-bold cursor-pointer">
                      {departments.map((dp) => (
                        <option key={dp.id} value={dp.id}>{dp.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Icon Choice</label>
                    <select value={newCategory.icon_name} onChange={(e) => setNewCategory({ ...newCategory, icon_name: e.target.value })} className="w-full h-10 px-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-xs font-bold cursor-pointer">
                      {ICON_CHOICES.map((ic) => (
                        <option key={ic.k} value={ic.k}>{ic.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <div>
                    <div className="text-xs font-bold text-slate-800">High Risk Category Classification</div>
                    <div className="text-[10px] text-slate-400 font-semibold mt-0.5">High-risk categories require manager approval sequences before processing.</div>
                  </div>
                  <select value={newCategory.is_high_risk ? "true" : "false"} onChange={(e) => setNewCategory({ ...newCategory, is_high_risk: e.target.value === "true", steps: e.target.value === "false" ? [] : newCategory.steps })} className="h-8 px-2 rounded-md bg-white border border-slate-200 text-xs font-bold outline-none cursor-pointer">
                    <option value="false">Standard Risk</option>
                    <option value="true">High Risk</option>
                  </select>
                </div>

                {newCategory.is_high_risk && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Approval Step Sequencing</label>
                    <div className="space-y-2">
                      {newCategory.steps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-xs">
                          <span className="font-bold text-slate-400 pl-1">Step {idx + 1}:</span>
                          <select value={step.role_id} onChange={(e) => { const steps = [...newCategory.steps]; steps[idx].role_id = e.target.value; setNewCategory({ ...newCategory, steps }); }} className="bg-white h-7 border border-slate-200 rounded text-xs font-bold">
                            {roles.map((rl) => (
                              <option key={rl.id} value={rl.id}>{rl.name}</option>
                            ))}
                          </select>
                          <ArrowRight className="size-3.5 text-slate-400" />
                          <select value={step.department_id || ""} onChange={(e) => { const steps = [...newCategory.steps]; steps[idx].department_id = e.target.value || ""; setNewCategory({ ...newCategory, steps }); }} className="bg-white h-7 border border-slate-200 rounded text-xs font-bold">
                            <option value="">Default (Team)</option>
                            {departments.map((dp) => (
                              <option key={dp.id} value={dp.id}>{dp.name}</option>
                            ))}
                          </select>
                          <button type="button" onClick={() => removeStep(idx, newCategory, setNewCategory)} className="p-1 rounded text-rose-500 hover:bg-rose-50 border-0 outline-none bg-transparent cursor-pointer ml-auto">
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={() => addStepPlaceholder(newCategory, setNewCategory)} className="h-7 px-2.5 inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 border-0 text-[11px] font-bold text-slate-600 cursor-pointer">
                        <Plus className="size-3" /> Add step
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setIsCreating(false)} className="h-10 px-4 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 border-0 cursor-pointer">Cancel</button>
                  <button type="submit" disabled={savingId === "new"} className="h-10 px-4 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white border-0 cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-55">
                    {savingId === "new" ? <Loader2 className="size-3.5 animate-spin" /> : <><Save className="size-3.5" /> Save Category</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const PRIORITY_LABELS = ["Critical", "High", "Medium", "Low"];

/* ---------- 2. Dynamic SLA Matrix (Database-backed) ---------- */

function SlaMatrix({ categories, setCategories, showToast }) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedCategories, setEditedCategories] = useState([]);

  const startEditing = () => {
    setEditedCategories(JSON.parse(JSON.stringify(categories)));
    setIsEditing(true);
  };

  const handleSlaChange = (id, fieldName, value) => {
    const val = parseInt(value, 10);
    const validatedVal = isNaN(val) ? 0 : Math.max(0, val);
    
    setEditedCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [fieldName]: validatedVal } : c))
    );
  };

  const handleSaveSlas = async () => {
    setSaving(true);
    try {
      const changePayloads = editedCategories.filter((edited) => {
        const original = categories.find((c) => c.id === edited.id);
        return (
          original.sla_critical_hours !== edited.sla_critical_hours ||
          original.sla_high_hours !== edited.sla_high_hours ||
          original.sla_medium_hours !== edited.sla_medium_hours ||
          original.sla_low_hours !== edited.sla_low_hours
        );
      });

      if (changePayloads.length === 0) {
        setIsEditing(false);
        return;
      }

      await Promise.all(
        changePayloads.map((c) =>
          apiFetch(`/categories/${c.id}/`, {
            method: "PATCH",
            body: JSON.stringify({
              sla_critical_hours: c.sla_critical_hours,
              sla_high_hours: c.sla_high_hours,
              sla_medium_hours: c.sla_medium_hours,
              sla_low_hours: c.sla_low_hours,
            }),
          })
        )
      );

      const freshRes = await apiFetch("/categories/");
      if (freshRes.ok) {
        setCategories(await freshRes.json());
      }
      setIsEditing(false);
      showToast("SLA performance thresholds saved successfully.", "success");
    } catch (err) {
      showToast("Failed to save updated SLA configurations to server.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel
      title="SLA Performance Thresholds"
      description="SLA targets (in hours) by priority × category. Updates directly adjust dynamic resolution timers on active tickets."
      action={
        isEditing ? (
          <div className="flex gap-2">
            <button
              disabled={saving}
              onClick={handleSaveSlas}
              className="h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 border-0 cursor-pointer shadow-sm disabled:opacity-55"
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <>
                  <Save className="size-3.5" /> Save Targets
                </>
              )}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="h-9 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold border-0 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={startEditing}
            className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Pencil className="size-4 text-slate-400" /> Edit thresholds
          </button>
        )
      }
    >
      <div className="overflow-x-auto">
        {categories.length === 0 ? (
          <div className="p-8 text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-200 rounded-xl my-4">
            No ticket categories configured. Go to the "Routing Rules" tab and click "+ Add Category" first!
          </div>
        ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <th className="text-left font-bold py-3 pl-2 w-44">Priority \ Category</th>
              {categories.map((c) => (
                <th key={c.id} className="text-center font-bold py-3 px-2">
                  {c.label} <span className="text-[9px] font-mono text-slate-400 uppercase">({c.key})</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {PRIORITY_LABELS.map((p) => {
              const fieldName = `sla_${p.toLowerCase()}_hours`;
              return (
                <tr key={p} className="hover:bg-slate-50/50">
                  <td className="py-3.5 pl-2">
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded border uppercase",
                        p === "Critical" && "bg-rose-50 text-rose-700 border-rose-100",
                        p === "High" && "bg-amber-50 text-amber-700 border-amber-200",
                        p === "Medium" && "bg-blue-50 text-blue-700 border-blue-100",
                        p === "Low" && "bg-slate-50 text-slate-500 border-slate-200"
                      )}
                    >
                      {p}
                    </span>
                  </td>
                  {categories.map((c) => {
                    const editedCat = editedCategories.find((ec) => ec.id === c.id);
                    const hoursVal = isEditing ? (editedCat?.[fieldName] ?? 0) : c[fieldName];
                    
                    return (
                      <td key={c.id} className="py-3.5 px-2 text-center font-bold text-slate-700 tabular-nums">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1.5 justify-center">
                            <input
                              type="number"
                              min="0"
                              value={hoursVal}
                              onChange={(e) => handleSlaChange(c.id, fieldName, e.target.value)}
                              className="w-12 h-8 text-center rounded border border-slate-200 text-xs font-bold focus:border-blue-500 outline-none"
                            />
                            <span className="text-[10px] text-slate-400 lowercase font-medium">hrs</span>
                          </div>
                        ) : (
                          `${hoursVal} hrs`
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        )}
      </div>
    </Panel>
  );
}

/* ---------- 3. Team & Queue Balancer ---------- */

function TeamMembers({ departments, roles, showToast }) {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [isInviting, setIsInviting] = useState(false);
  const [invitingState, setInvitingState] = useState({
    email: "",
    first_name: "",
    last_name: "",
    role_id: "",
    department_id: "",
  });
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchTeamConfigData = async () => {
      try {
        const usersRes = await apiFetch("/users/");
        if (usersRes.ok) {
          setMembers(await usersRes.json());
          setInvitingState((prev) => ({
            ...prev,
            role_id: roles[0]?.id || "",
            department_id: departments[0]?.id || "",
          }));
        } else {
          setError("Failed to fetch workforce allocations.");
        }
      } catch (err) {
        setError("Network error. Unable to load workforce roster.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchTeamConfigData();
  }, [departments, roles]);

  const handleQueueReassignment = async (userId, departmentId) => {
    try {
      const res = await apiFetch(`/users/${userId}/`, {
        method: "PATCH",
        body: JSON.stringify({ department_id: departmentId }),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setMembers((prev) => prev.map((m) => (m.id === userId ? updatedUser : m)));
        showToast("Queue reassignment updated successfully.", "success");
      } else {
        showToast("Failed to update queue routing. Check administrative privileges.", "error");
      }
    } catch (err) {
      showToast("Failed to connect to system database.", "error");
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch("/users/invite/", {
        method: "POST",
        body: JSON.stringify(invitingState),
      });

      if (res.ok) {
        const newEmployee = await res.json();
        setMembers((prev) => [...prev, newEmployee]);
        setIsInviting(false);
        setInvitingState({
          email: "",
          first_name: "",
          last_name: "",
          role_id: roles[0]?.id || "",
          department_id: departments[0]?.id || "",
        });
        showToast("Team member onboarded successfully.", "success");
      } else {
        const errData = await res.json();
        showToast(errData.detail || "Invitation rejected by security gateway.", "error");
      }
    } catch (err) {
      showToast("Connection timeout while processing invitation.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/users/${deleteTarget.id}/`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
        setDeleteTarget(null);
        showToast("Employee profile deleted successfully.", "success");
      } else {
        showToast("Deletion rejected. Check that the user is not actively processing pending approvals.", "error");
      }
    } catch (err) {
      showToast("Database error during operation.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = members.filter((m) => {
    const term = searchQuery.toLowerCase().trim();
    const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
    return (
      fullName.includes(term) ||
      m.email.toLowerCase().includes(term) ||
      (m.department_name && m.department_name.toLowerCase().includes(term))
    );
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
        <Loader2 className="size-4 animate-spin text-blue-600" /> Resolving active queues...
      </div>
    );
  }

  return (
    <Panel
      title="Team & queue assignments"
      description={`${members.length} active members balanced across ${departments.length} queues`}
      action={
        <button 
          onClick={() => setIsInviting(true)}
          className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition border-0 shadow-sm cursor-pointer"
        >
          <Plus className="size-4" /> Invite member
        </button>
      }
    >
      {error && (
        <div className="mb-4 text-xs text-rose-500 font-bold bg-rose-50 border border-rose-100 p-3 rounded-lg flex items-center gap-1.5">
          <AlertCircle className="size-4" /> {error}
        </div>
      )}

      <div className="mb-4 relative max-w-sm">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or department…"
          className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 outline-none text-xs transition"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <th className="text-left font-bold py-3 pl-2">Agent</th>
              <th className="text-left font-bold py-3">Role</th>
              <th className="text-left font-bold py-3">Assigned queue</th>
              <th className="text-left font-bold py-3">Open load</th>
              <th className="text-right font-medium py-2.5 pr-2 w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.map((m) => {
              const initials = `${m.first_name?.[0] || ""}${m.last_name?.[0] || ""}` || m.email[0].toUpperCase();
              const displayName = m.first_name && m.last_name ? `${m.first_name} ${m.last_name}` : m.email.split('@')[0];
              
              return (
                <tr key={m.id} className="group hover:bg-slate-50/50">
                  <td className="py-3.5 pl-2">
                    <div className="flex items-center gap-3">
                      <div className="relative size-9 rounded-full bg-[#4f1a60] text-white font-bold text-xs grid place-items-center shadow-inner">
                        {initials}
                        <span
                          className={cn(
                            "absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-white",
                            m.online ? "bg-emerald-500" : "bg-slate-300"
                          )}
                        />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{displayName}</div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {m.is_on_duty ? "Online now" : "Offline"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 text-xs text-slate-500 font-semibold">{m.role_name || "Staff"}</td>
                  <td className="py-3.5">
                    <select
                      value={m.department_id || ""}
                      onChange={(e) => handleQueueReassignment(m.id, e.target.value || null)} 
                      className="h-8 px-2.5 rounded-md bg-white border border-slate-200 text-xs font-bold text-slate-700 focus:border-blue-500 outline-none cursor-pointer"
                    >
                        <option value="">
                          Unassigned Queue
                        </option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            m.open_load >= 10 ? "bg-rose-500" : m.open_load >= 6 ? "bg-amber-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${Math.min(m.open_load * 8, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-500 tabular-nums">{m.open_load}</span>
                    </div>
                  </td>
                  <td className="py-3.5 pr-2 text-right">
                    <button
                      onClick={() => setDeleteTarget(m)}
                      className="size-7 grid place-items-center rounded bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border-0 cursor-pointer transition shadow-sm bg-transparent outline-none"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Invite Member Drawer Modal */}
      <AnimatePresence>
        {isInviting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setIsInviting(false)} className="absolute inset-0 bg-slate-900" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full flex flex-col p-6 z-10 text-left">
              <header className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Onboard New Team Member</h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Register a new employee and allocate their initial operational queue.</p>
                </div>
                <button onClick={() => setIsInviting(false)} className="size-8 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 grid place-items-center border-0 outline-none bg-transparent cursor-pointer">
                  <X className="size-4" />
                </button>
              </header>

              <form onSubmit={handleInviteMember} className="space-y-4 pt-4 flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">First Name</label>
                    <input required type="text" placeholder="John" value={invitingState.first_name} onChange={(e) => setInvitingState({ ...invitingState, first_name: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-xs font-bold" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Last Name</label>
                    <input required type="text" placeholder="Okeke" value={invitingState.last_name} onChange={(e) => setInvitingState({ ...invitingState, last_name: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-xs font-bold" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Corporate Email</label>
                  <input required type="email" placeholder="john.okeke@dash-mfb.com" value={invitingState.email} onChange={(e) => setInvitingState({ ...invitingState, email: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-xs font-bold" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Queue Allocation</label>
                    <select value={invitingState.department_id} onChange={(e) => setInvitingState({ ...invitingState, department_id: e.target.value })} className="w-full h-10 px-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-xs font-bold cursor-pointer">
                      <option value="">Unassigned Queue</option>
                      {departments.map((dp) => (
                        <option key={dp.id} value={dp.id}>{dp.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Operational Role</label>
                    <select value={invitingState.role_id} onChange={(e) => setInvitingState({ ...invitingState, role_id: e.target.value })} className="w-full h-10 px-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-xs font-bold cursor-pointer">
                      {roles.map((rl) => (
                        <option key={rl.id} value={rl.id}>{rl.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setIsInviting(false)} className="h-10 px-4 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 border-0 cursor-pointer">Cancel</button>
                  <button type="submit" disabled={saving} className="h-10 px-4 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white border-0 cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-55">
                    {saving ? <Loader2 className="size-3.5 animate-spin" /> : <><Save className="size-3.5" /> Save Member</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Deletion Confirmation Drawer Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setDeleteTarget(null)} className="absolute inset-0 bg-slate-900" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full flex flex-col p-6 z-10 text-left">
              <header className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="size-8 rounded-full bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertCircle className="size-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Confirm Profile Deletion</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">This action cannot be undone.</p>
                </div>
              </header>

              <div className="py-4 text-xs font-semibold text-slate-600 leading-relaxed">
                Are you sure you want to delete <span className="font-extrabold text-slate-800">{deleteTarget.first_name} {deleteTarget.last_name}</span>'s profile? 
                All pending assigned tickets must be manually re-routed [4].
              </div>

              <div className="flex items-center justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setDeleteTarget(null)} 
                  className="h-9 px-3 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 border-0 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  disabled={deleting}
                  onClick={handleDeleteMember} 
                  className="h-9 px-3.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white border-0 cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-55 animate-pulse"
                >
                  {deleting ? <Loader2 className="size-3.5 animate-spin" /> : "Delete Profile"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Panel>
  );
}

/* ---------- 4. Department Queue Management ---------- */

function DepartmentsPanel({ departments, setDepartments, showToast }) {
  const [isCreating, setIsCreating] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch("/departments/", {
        method: "POST",
        body: JSON.stringify({ name: newDeptName.trim() }),
      });
      if (res.ok) {
        const added = await res.json();
        setDepartments((prev) => [...prev, added]);
        setNewDeptName("");
        setIsCreating(false);
        showToast("Department queue registered successfully.", "success");
      } else {
        showToast("Failed to register department.", "error");
      }
    } catch (err) {
      showToast("Server connection failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id) => {
    if (!editingName.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/departments/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ name: editingName.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDepartments((prev) => prev.map((d) => (d.id === id ? updated : d)));
        setEditingId(null);
        showToast("Department updated successfully.", "success");
      } else {
        showToast("Failed to update department.", "error");
      }
    } catch (err) {
      showToast("Server connection failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this department queue? Active routing rules and user assignments may break.")) return;
    setDeletingId(id);
    try {
      const res = await apiFetch(`/departments/${id}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDepartments((prev) => prev.filter((d) => d.id !== id));
        showToast("Department permanently deleted.", "success");
      } else {
        showToast("Deletion rejected. Check that this department is not active in any categories or queues.", "error");
      }
    } catch (err) {
      showToast("Server connection failed.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Panel
      title="Department Queues"
      description={`${departments.length} active departments processing helpdesk tickets.`}
      action={
        <button
          onClick={() => setIsCreating(true)}
          className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition border-0 shadow-sm cursor-pointer"
        >
          <Plus className="size-4" /> Add Department
        </button>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <th className="text-left font-bold py-3 pl-2">Queue Name</th>
              <th className="text-right font-bold py-3 pr-2 w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {departments.map((dept) => {
              const isEditing = editingId === dept.id;
              return (
                <tr key={dept.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-4 pl-2">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-8 px-2 rounded-md border border-slate-200 text-xs font-bold focus:border-blue-500 outline-none w-64"
                      />
                    ) : (
                      <span className="font-bold text-slate-900 text-xs">{dept.name}</span>
                    )}
                  </td>
                  <td className="py-4 pr-2 text-right">
                    {isEditing ? (
                      <div className="inline-flex gap-1.5">
                        <button
                          disabled={saving}
                          onClick={() => handleUpdate(dept.id)}
                          className="size-7 rounded bg-emerald-600 text-white hover:bg-emerald-700 grid place-items-center transition border-0 cursor-pointer shadow-sm disabled:opacity-55"
                        >
                          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="size-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 grid place-items-center transition border-0 cursor-pointer"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => {
                            setEditingId(dept.id);
                            setEditingName(dept.name);
                          }}
                          className="size-7 grid place-items-center rounded bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 border-0 cursor-pointer transition shadow-sm"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          disabled={deletingId === dept.id}
                          onClick={() => handleDelete(dept.id)}
                          className="size-7 grid place-items-center rounded bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border-0 cursor-pointer transition shadow-sm disabled:opacity-50"
                        >
                          {deletingId === dept.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setIsCreating(false)} className="absolute inset-0 bg-slate-900" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full flex flex-col p-6 z-10 text-left">
              <header className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Department Queue</h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Register a new helpdesk queue and group boundary.</p>
                </div>
                <button onClick={() => setIsCreating(false)} className="size-8 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 grid place-items-center border-0 outline-none bg-transparent cursor-pointer">
                  <X className="size-4" />
                </button>
              </header>

              <form onSubmit={handleCreate} className="space-y-4 pt-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Department Name</label>
                  <input required type="text" placeholder="e.g. Risk Operations" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-xs font-bold" />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setIsCreating(false)} className="h-10 px-4 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 border-0 cursor-pointer">Cancel</button>
                  <button type="submit" disabled={saving} className="h-10 px-4 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white border-0 cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-55">
                    {saving ? <Loader2 className="size-3.5 animate-spin" /> : <><Save className="size-3.5" /> Save Department</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Panel>
  );
}

/* ---------- 5. Security Role Boundary Configuration ---------- */

function RolesPanel({ roles, setRoles, showToast }) {
  const [isCreating, setIsCreating] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", description: "", can_approve: false, is_agent: false });
  const [editingId, setEditingId] = useState(null);
  const [editingState, setEditingState] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newRole.name.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch("/roles/", {
        method: "POST",
        body: JSON.stringify({
          name: newRole.name.trim(),
          description: newRole.description.trim(),
          can_approve: newRole.can_approve,
          is_agent: newRole.is_agent,
        }),
      });
      if (res.ok) {
        const added = await res.json();
        setRoles((prev) => [...prev, added]);
        setNewRole({ name: "", description: "", can_approve: false, is_agent: false });
        setIsCreating(false);
        showToast("Security role configured successfully.", "success");
      } else {
        showToast("Failed to register security role.", "error");
      }
    } catch (err) {
      showToast("Server connection failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id) => {
    if (!editingState.name.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/roles/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editingState.name.trim(),
          description: editingState.description.trim(),
          can_approve: editingState.can_approve,
          is_agent: editingState.is_agent,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setRoles((prev) => prev.map((r) => (r.id === id ? updated : r)));
        setEditingId(null);
        showToast("Security role updated successfully.", "success");
      } else {
        showToast("Failed to update security role.", "error");
      }
    } catch (err) {
      showToast("Server connection failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this security role? This will break references for users currently assigned this role.")) return;
    setDeletingId(id);
    try {
      const res = await apiFetch(`/roles/${id}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRoles((prev) => prev.filter((r) => r.id !== id));
        showToast("Security role permanently deleted.", "success");
      } else {
        showToast("Deletion rejected. Ensure no users or approval steps reference this role.", "error");
      }
    } catch (err) {
      showToast("Server connection failed.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Panel
      title="Security Role Boundaries"
      description={`${roles.length} active roles governing approval power and queue operations.`}
      action={
        <button
          onClick={() => setIsCreating(true)}
          className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition border-0 shadow-sm cursor-pointer"
        >
          <Plus className="size-4" /> Add Role
        </button>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <th className="text-left font-bold py-3 pl-2">Role Name</th>
              <th className="text-left font-bold py-3">Description</th>
              <th className="text-left font-bold py-3">Capabilities</th>
              <th className="text-right font-bold py-3 pr-2 w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {roles.map((role) => {
              const isEditing = editingId === role.id;
              return (
                <tr key={role.id} className="hover:bg-slate-50/50 transition text-xs">
                  <td className="py-4 pl-2 font-bold text-slate-900">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingState.name}
                        onChange={(e) => setEditingState({ ...editingState, name: e.target.value })}
                        className="h-8 px-2 rounded-md border border-slate-200 font-bold focus:border-blue-500 outline-none w-36"
                      />
                    ) : (
                      role.name
                    )}
                  </td>
                  <td className="py-4 text-slate-500 font-medium">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingState.description}
                        onChange={(e) => setEditingState({ ...editingState, description: e.target.value })}
                        className="h-8 px-2 rounded-md border border-slate-200 focus:border-blue-500 outline-none w-64"
                      />
                    ) : (
                      role.description || "—"
                    )}
                  </td>
                  <td className="py-4 space-x-1.5">
                    {isEditing ? (
                      <div className="flex gap-3 text-[11px] font-bold">
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={editingState.can_approve}
                            onChange={(e) => setEditingState({ ...editingState, can_approve: e.target.checked })}
                          />
                          Approver
                        </label>
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={editingState.is_agent}
                            onChange={(e) => setEditingState({ ...editingState, is_agent: e.target.checked })}
                          />
                          Agent
                        </label>
                      </div>
                    ) : (
                      <>
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded border",
                          role.can_approve ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-slate-50 text-slate-400 border-slate-200"
                        )}>
                          {role.can_approve ? "Approver" : "No Approvals"}
                        </span>
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded border",
                          role.is_agent ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" : "bg-slate-50 text-slate-400 border-slate-200"
                        )}>
                          {role.is_agent ? "Agent" : "No Queue Load"}
                        </span>
                      </>
                    )}
                  </td>
                  <td className="py-4 pr-2 text-right">
                    {isEditing ? (
                      <div className="inline-flex gap-1.5">
                        <button
                          disabled={saving}
                          onClick={() => handleUpdate(role.id)}
                          className="size-7 rounded bg-emerald-600 text-white hover:bg-emerald-700 grid place-items-center transition border-0 cursor-pointer shadow-sm disabled:opacity-55"
                        >
                          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="size-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 grid place-items-center transition border-0 cursor-pointer"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => {
                            setEditingId(role.id);
                            setEditingState({ ...role });
                          }}
                          className="size-7 grid place-items-center rounded bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 border-0 cursor-pointer transition shadow-sm"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          disabled={deletingId === role.id}
                          onClick={() => handleDelete(role.id)}
                          className="size-7 grid place-items-center rounded bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border-0 cursor-pointer transition shadow-sm disabled:opacity-50"
                        >
                          {deletingId === role.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setIsCreating(false)} className="absolute inset-0 bg-slate-900" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full flex flex-col p-6 z-10 text-left">
              <header className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Security Role</h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Define a security privilege profile and operational capability.</p>
                </div>
                <button onClick={() => setIsCreating(false)} className="size-8 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 grid place-items-center border-0 outline-none bg-transparent cursor-pointer">
                  <X className="size-4" />
                </button>
              </header>

              <form onSubmit={handleCreate} className="space-y-4 pt-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Role Name</label>
                  <input required type="text" placeholder="e.g. Branch Audit Head" value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-xs font-bold" />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Description</label>
                  <input required type="text" placeholder="e.g. Inspects financial ticket details at branch level" value={newRole.description} onChange={(e) => setNewRole({ ...newRole, description: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-xs font-medium" />
                </div>

                <div className="flex gap-4 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRole.can_approve}
                      onChange={(e) => setNewRole({ ...newRole, can_approve: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    Can Approve Tickets
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRole.is_agent}
                      onChange={(e) => setNewRole({ ...newRole, is_agent: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    Is Active Queue Agent
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setIsCreating(false)} className="h-10 px-4 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 border-0 cursor-pointer">Cancel</button>
                  <button type="submit" disabled={saving} className="h-10 px-4 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white border-0 cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-55">
                    {saving ? <Loader2 className="size-3.5 animate-spin" /> : <><Save className="size-3.5" /> Save Role</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Panel>
  );
}

/* ---------- Shared Structural Layout Panels ---------- */

function Panel({ title, description, action, children }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm text-left">
      <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-200 flex-wrap">
        <div>
          <div className="text-sm font-bold text-slate-900 tracking-tight">{title}</div>
          {description && <div className="text-xs text-slate-400 mt-1 font-medium">{description}</div>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}