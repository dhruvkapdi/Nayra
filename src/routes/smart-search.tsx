import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, FileText, Sparkles, Clock, SlidersHorizontal, Calendar, X, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "@/components/nova/Sidebar";
import { Topbar } from "@/components/nova/Topbar";
import { useNova } from "@/components/nova/NovaContext";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/smart-search")({
  head: () => ({ meta: [{ title: "Nayra — Smart Search" }] }),
  component: SmartSearchPage,
});

type Result = { name: string; page: number; workspace_id?: string; created_at?: string };

const DATE_RANGES = [
  { id: "all", label: "Any time" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 3 months" },
];

const SUGGESTED = [
  "What is the leave policy?",
  "How to request reimbursement?",
  "What are the onboarding steps?",
  "Remote work guidelines",
];

function SmartSearchPage() {
  const { user, authLoading, workspace, workspaces, userProfile } = useNova();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  // Filters
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dateRange, setDateRange] = useState("all");
  const [docNameFilter, setDocNameFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("current");
  const isHR = userProfile?.role === "HR Admin";

  const activeFilterCount = (dateRange !== "all" ? 1 : 0) + (docNameFilter.trim() ? 1 : 0) + (deptFilter !== "current" ? 1 : 0);

  useEffect(() => { if (!authLoading && !user) nav({ to: "/login" }); }, [user, authLoading, nav]);

  const run = async (query?: string) => {
    const searchQ = query ?? q;
    if (!searchQ.trim() || !user || !workspace) return;
    if (query) setQ(query);
    setLoading(true);
    setHasSearched(true);
    setAnswer(null);
    setResults([]);
    setHistory((prev) => [searchQ, ...prev.filter((h) => h !== searchQ)].slice(0, 5));
    try {
      const now = new Date();
      let date_from: string | null = null;
      if (dateRange === "7d") date_from = new Date(now.getTime() - 7 * 86400000).toISOString();
      else if (dateRange === "30d") date_from = new Date(now.getTime() - 30 * 86400000).toISOString();
      else if (dateRange === "90d") date_from = new Date(now.getTime() - 90 * 86400000).toISOString();

      const filters: Record<string, unknown> = { match_count: 8 };
      if (date_from) filters.date_from = date_from;
      if (docNameFilter.trim()) filters.doc_name = docNameFilter.trim();
      if (isHR && deptFilter !== "current") {
        if (deptFilter === "all") filters.search_all_workspaces = true;
        else filters.workspace_id = deptFilter;
      }

      const { data, error } = await supabase.functions.invoke("chat", {
        body: { question: searchQ, workspace_id: workspace.id, user_id: user.id, session_id: "search", filters },
      });
      if (error) { toast.error(error.message); }
      else {
        setAnswer(data?.answer ?? "No relevant information found in your documents.");
        setResults(Array.isArray(data?.sources) ? data.sources : []);
      }
    } catch (e: any) { toast.error(e?.message ?? "Search failed"); }
    setLoading(false);
  };

  return (
    <div className="flex h-screen overflow-hidden relative z-[1]">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(139,92,246,0.2) transparent" }}>
          <div className="max-w-[860px] mx-auto">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <h1 className="font-display font-bold text-[24px] mb-1" style={{ color: "#E0E0F0" }}>Smart Search</h1>
              <p className="text-[13px]" style={{ color: "#606070" }}>
                Semantic search — goes beyond keywords to find the real meaning in your documents.
              </p>
            </motion.div>

            {/* Search input */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-3"
              style={{ background: "rgba(8,8,20,0.7)", backdropFilter: "blur(16px)", border: "1px solid rgba(139,92,246,0.3)" }}>
              <Search size={17} style={{ color: "#8B5CF6", flexShrink: 0 }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()}
                placeholder="Ask anything across your company documents…"
                className="flex-1 bg-transparent outline-none text-[14px]"
                style={{ color: "#E0E0F0", caretColor: "#8B5CF6" }} />
              <button onClick={() => setFiltersOpen((o) => !o)}
                className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] transition-colors flex-shrink-0"
                style={{ background: filtersOpen || activeFilterCount > 0 ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.04)", color: filtersOpen || activeFilterCount > 0 ? "#C4B5FD" : "#909090", border: `1px solid ${filtersOpen || activeFilterCount > 0 ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.08)"}` }}>
                <SlidersHorizontal size={13} />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: "#8B5CF6" }}>
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => run()} disabled={loading || !q.trim()}
                className="px-4 py-2 rounded-xl text-white text-[12.5px] font-medium disabled:opacity-40 flex-shrink-0"
                style={{ background: q.trim() ? "linear-gradient(135deg,#4C1D95,#8B5CF6)" : "rgba(255,255,255,0.06)" }}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : "Search"}
              </motion.button>
            </motion.div>

            {/* Filter panel */}
            <AnimatePresence>
              {filtersOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="p-4 rounded-2xl mb-4 space-y-3" style={{ background: "rgba(8,8,20,0.55)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(16px)" }}>
                    <div>
                      <div className="flex items-center gap-1.5 mb-2 text-[11px]" style={{ color: "#606070" }}>
                        <Calendar size={12} /> Date range
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {DATE_RANGES.map((d) => (
                          <button key={d.id} onClick={() => setDateRange(d.id)}
                            className="text-[11.5px] px-2.5 py-1 rounded-full transition-colors"
                            style={{ background: dateRange === d.id ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.04)", color: dateRange === d.id ? "#C4B5FD" : "#909090", border: `1px solid ${dateRange === d.id ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.08)"}` }}>
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {isHR && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2 text-[11px]" style={{ color: "#606070" }}>
                          <Building2 size={12} /> Department
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => setDeptFilter("current")}
                            className="text-[11.5px] px-2.5 py-1 rounded-full transition-colors"
                            style={{ background: deptFilter === "current" ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.04)", color: deptFilter === "current" ? "#C4B5FD" : "#909090", border: `1px solid ${deptFilter === "current" ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.08)"}` }}>
                            {workspace?.name ?? "Current"} (current)
                          </button>
                          <button onClick={() => setDeptFilter("all")}
                            className="text-[11.5px] px-2.5 py-1 rounded-full transition-colors"
                            style={{ background: deptFilter === "all" ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.04)", color: deptFilter === "all" ? "#C4B5FD" : "#909090", border: `1px solid ${deptFilter === "all" ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.08)"}` }}>
                            All Departments
                          </button>
                          {workspaces.filter((w) => w.id !== workspace?.id).map((w) => (
                            <button key={w.id} onClick={() => setDeptFilter(w.id)}
                              className="text-[11.5px] px-2.5 py-1 rounded-full transition-colors"
                              style={{ background: deptFilter === w.id ? `${w.color}25` : "rgba(255,255,255,0.04)", color: deptFilter === w.id ? w.color : "#909090", border: `1px solid ${deptFilter === w.id ? `${w.color}50` : "rgba(255,255,255,0.08)"}` }}>
                              {w.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-1.5 mb-2 text-[11px]" style={{ color: "#606070" }}>
                        <FileText size={12} /> Document name contains
                      </div>
                      <div className="flex items-center gap-2">
                        <input value={docNameFilter} onChange={(e) => setDocNameFilter(e.target.value)}
                          placeholder="e.g. Policy, SOP, Handbook…"
                          className="flex-1 px-3 py-1.5 rounded-lg text-[12.5px] outline-none"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#E0E0F0" }} />
                        {docNameFilter && (
                          <button onClick={() => setDocNameFilter("")} className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06]" style={{ color: "#606070" }}>
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {activeFilterCount > 0 && (
                      <button onClick={() => { setDateRange("all"); setDocNameFilter(""); setDeptFilter("current"); }}
                        className="text-[11.5px] transition-colors hover:text-white" style={{ color: "#8B5CF6" }}>
                        Clear all filters
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Suggested / history */}
            {!hasSearched && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <div className="flex flex-wrap gap-2 mb-8">
                  {SUGGESTED.map((s) => (
                    <button key={s} onClick={() => run(s)}
                      className="text-[12px] px-3 py-1.5 rounded-full transition-all hover:border-purple-500/40"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#A0A0B8" }}>
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
                    <Search size={28} style={{ color: "#8B5CF6" }} />
                  </div>
                  <p className="text-[15px] font-medium mb-1" style={{ color: "#E0E0F0" }}>Semantic search</p>
                  <p className="text-[13px]" style={{ color: "#606070" }}>
                    Ask natural questions — I'll find the meaning, not just keywords.
                  </p>
                </div>
              </motion.div>
            )}

            {loading && (
              <div className="space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="p-5 rounded-2xl animate-pulse"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", height: 100 }} />
                ))}
              </div>
            )}

            <AnimatePresence>
              {!loading && hasSearched && answer !== null && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {/* Answer */}
                  <div className="p-5 rounded-2xl mb-4"
                    style={{ background: "rgba(8,8,20,0.7)", backdropFilter: "blur(16px)", borderLeft: "2px solid rgba(139,92,246,0.6)", border: "1px solid rgba(255,255,255,0.07)", borderLeftWidth: 2 }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={14} style={{ color: "#8B5CF6" }} />
                      <span className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "#606070" }}>Answer</span>
                    </div>
                    <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap" style={{ color: "#D0D0E8" }}>{answer}</p>
                  </div>

                  {/* Sources */}
                  {results.length > 0 && (
                    <div>
                      <h2 className="text-[11px] uppercase tracking-[0.12em] mb-3" style={{ color: "#404055" }}>
                        Source Matches ({results.length})
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {results.map((r, i) => (
                          <motion.div key={`${r.name}-${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }} whileHover={{ y: -2 }}
                            className="p-4 rounded-xl flex items-start gap-3"
                            style={{ background: "rgba(16,185,80,0.05)", border: "1px solid rgba(16,185,80,0.15)", backdropFilter: "blur(8px)" }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: "rgba(16,185,80,0.1)" }}>
                              <FileText size={14} style={{ color: "#10B981" }} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[13px] font-medium truncate" style={{ color: "#E0E0F0" }}>{r.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[11.5px]" style={{ color: "#34D399" }}>Page {r.page}</span>
                                {r.created_at && (
                                  <span className="text-[10.5px]" style={{ color: "#606070" }}>
                                    · {new Date(r.created_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search again */}
                  {history.length > 1 && (
                    <div className="mt-6">
                      <h2 className="text-[11px] uppercase tracking-[0.12em] mb-3 flex items-center gap-2" style={{ color: "#404055" }}>
                        <Clock size={11} /> Recent searches
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {history.slice(1).map((h) => (
                          <button key={h} onClick={() => run(h)}
                            className="text-[12px] px-3 py-1.5 rounded-full transition-all"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "#808090" }}>
                            {h}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
