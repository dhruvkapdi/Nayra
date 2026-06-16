import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, FileText, Users as UsersIcon, BarChart3,
  Settings as SettingsIcon, LogOut, Upload, Trash2, RefreshCw,
  Search, ShieldCheck, ChevronLeft, ChevronRight, Building2,
  TrendingUp, MessageSquare, Clock, UserCheck, Menu, X, Megaphone, ChevronDown, UploadCloud, Mail,
} from "lucide-react";
import { toast } from "sonner";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Cell,
} from "recharts";
import { Logo } from "@/components/nova/Logo";
import { NotificationBell } from "@/components/nova/NotificationBell";
import { useNova } from "@/components/nova/NovaContext";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/hr-dashboard")({
  head: () => ({ meta: [{ title: "Nayra — HR Admin" }] }),
  component: HRDashboard,
});

type Tab = "overview" | "documents" | "users" | "analytics" | "workspaces" | "settings";

const BG_THEMES: { id: string; name: string; tagline: string; gradient: string; accent: string }[] = [
  {
    id: "violet",
    name: "Midnight Violet",
    tagline: "Purple arc · emerald glow",
    gradient: "radial-gradient(circle at 30% 30%, #4C1D95 0%, #080810 60%), radial-gradient(circle at 80% 80%, rgba(16,185,129,0.35) 0%, transparent 50%)",
    accent: "#8B5CF6",
  },
  {
    id: "aurora",
    name: "Aurora Borealis",
    tagline: "Teal · indigo · emerald flow",
    gradient: "linear-gradient(135deg, #042f2e 0%, #134e4a 35%, #312e81 70%, #022c22 100%)",
    accent: "#2DD4BF",
  },
  {
    id: "ember",
    name: "Sunset Ember",
    tagline: "Orange · pink · warm glow",
    gradient: "radial-gradient(circle at 70% 20%, #F97316 0%, transparent 50%), radial-gradient(circle at 20% 80%, #EC4899 0%, transparent 50%), #1a0a0c",
    accent: "#F97316",
  },
  {
    id: "cyber",
    name: "Cyber Neon",
    tagline: "Cyan · magenta · electric grid",
    gradient: "radial-gradient(circle at 20% 20%, #22D3EE 0%, transparent 45%), radial-gradient(circle at 85% 75%, #E879F9 0%, transparent 45%), #03030c",
    accent: "#22D3EE",
  },
  {
    id: "polygon",
    name: "Low-Poly Emerald",
    tagline: "Faceted glass · midnight teal",
    gradient: "url('/themes/polygon.jpg') center/cover",
    accent: "#2DD4BF",
  },
  {
    id: "watercolor",
    name: "Watercolor Bloom",
    tagline: "Ivory · blush · lavender clouds",
    gradient: "url('/themes/watercolor.jpg') center/cover",
    accent: "#EC9CC2",
  },
  {
    id: "waves",
    name: "Wave Pastel",
    tagline: "Periwinkle · lavender · blush waves",
    gradient: "url('/themes/waves.jpg') center/cover",
    accent: "#A5B4FC",
  },
  {
    id: "inkteal",
    name: "Ink Teal Depths",
    tagline: "Navy ink · cyan glow",
    gradient: "url('/themes/inkteal.jpg') center/cover",
    accent: "#38BDF8",
  },
  {
    id: "frosted",
    name: "Frosted Glass",
    tagline: "Powder blue · ivory · gray",
    gradient: "url('/themes/frosted.jpg') center/cover",
    accent: "#93C5FD",
  },
  {
    id: "horizon",
    name: "Horizon Glow",
    tagline: "Planet arc · shooting stars",
    gradient: "url('/themes/horizon.jpg') center/cover",
    accent: "#8B5CF6",
  },
  {
    id: "obsidian",
    name: "Obsidian Gold",
    tagline: "Charcoal · amber · rising sparks",
    gradient: "radial-gradient(circle at 80% 15%, #F5BF62 0%, transparent 50%), radial-gradient(circle at 15% 90%, #D97706 0%, transparent 50%), #08070a",
    accent: "#F5BF62",
  },
  {
    id: "nebula",
    name: "Crimson Nebula",
    tagline: "Crimson · magenta · violet clouds",
    gradient: "radial-gradient(circle at 20% 20%, #F43F5E 0%, transparent 50%), radial-gradient(circle at 85% 70%, #C026D3 0%, transparent 50%), #0a0408",
    accent: "#FB7185",
  },
];

function BgThemeCard({ theme, active, onClick }: { theme: (typeof BG_THEMES)[number]; active: boolean; onClick: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} whileHover={{ y: -2 }} onClick={onClick}
      className="relative rounded-2xl overflow-hidden text-left transition-all"
      style={{
        border: active ? `1.5px solid ${theme.accent}` : "1px solid rgba(255,255,255,0.08)",
        boxShadow: active ? `0 0 20px ${theme.accent}40` : "none",
      }}>
      <div className="h-[64px] w-full" style={{ background: theme.gradient }} />
      <div className="p-2.5" style={{ background: "rgba(8,8,20,0.7)" }}>
        <div className="text-[12px] font-medium" style={{ color: "#E0E0F0" }}>{theme.name}</div>
        <div className="text-[10.5px] mt-0.5" style={{ color: "#606070" }}>{theme.tagline}</div>
      </div>
      {active && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
          style={{ background: theme.accent, boxShadow: `0 0 10px ${theme.accent}` }}>
          ✓
        </div>
      )}
    </motion.button>
  );
}

function HRDashboard() {
  const { user, authLoading, signOut, workspaces, userProfile } = useNova();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("hr_sidebar_collapsed") === "true");

  useEffect(() => {
    if (!authLoading && !user) nav({ to: "/login" });
  }, [user, authLoading, nav]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("hr_sidebar_collapsed", String(next));
  };

  return (
    <div className="flex h-screen overflow-hidden relative z-[1]">
      <HRSidebar tab={tab} setTab={setTab} onSignOut={signOut} collapsed={collapsed} onToggle={toggleCollapse} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <HRTopbar tab={tab} />
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
          <div className="max-w-[1200px] mx-auto">
            {tab === "overview" && <Overview workspaces={workspaces} />}
            {tab === "documents" && <DocumentsTab workspaces={workspaces} />}
            {tab === "users" && <UsersTab />}
            {tab === "analytics" && <AnalyticsTab workspaces={workspaces} />}
            {tab === "workspaces" && <WorkspacesTab workspaces={workspaces} />}
            {tab === "settings" && <SettingsTab onSignOut={signOut} />}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── Collapsible Sidebar ── */
function HRSidebar({ tab, setTab, onSignOut, collapsed, onToggle }: {
  tab: Tab; setTab: (t: Tab) => void; onSignOut: () => Promise<void>;
  collapsed: boolean; onToggle: () => void;
}) {
  const { user, userProfile, mobileMenuOpen, setMobileMenuOpen } = useNova();
  const items: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "users", label: "Users", icon: UsersIcon },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "workspaces", label: "Workspaces", icon: Building2 },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  const email = user?.email ?? "";
  const hrName = userProfile?.full_name?.split(" ")[0] || email.split("@")[0] || "Admin";
  const initials = (userProfile?.full_name || email || "HR").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
    <motion.aside
      animate={{ width: collapsed ? 64 : 230 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="hidden lg:flex shrink-0 flex-col h-screen relative overflow-hidden"
      style={{
        background: "var(--sidebar-bg)",
        backdropFilter: "blur(24px)",
        borderRight: "1px solid var(--sidebar-border)",
        transition: "background 0.4s ease, border-color 0.4s ease",
      }}
    >
      {/* Logo */}
      <div className={`flex items-center gap-2.5 pt-5 pb-3 ${collapsed ? "px-3 justify-center" : "px-4"}`}>
        <Logo size={32} />
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="font-display font-bold text-[17px] leading-none" style={{ letterSpacing: "-0.4px" }}>
            <span style={{ color: "#F0F0F5" }}>Nay</span>
            <span style={{ color: "#8B5CF6" }}>ra</span>
          </motion.div>
        )}
      </div>

      {/* HR Admin badge */}
      {!collapsed && (
        <div className="px-3 mb-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.25)", color: "#C4B5FD" }}>
            <ShieldCheck size={14} />
            <span className="text-[12px] font-medium">HR Admin</span>
          </div>
        </div>
      )}
      {collapsed && <div className="mb-2" />}

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto px-2">
        {!collapsed && (
          <div className="px-2 text-[9px] uppercase tracking-[0.14em] mb-1.5 font-medium" style={{ color: "#202030" }}>
            Workspace
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          {items.map((i) => {
            const active = tab === i.id;
            const Icon = i.icon;
            return (
              <button key={i.id} onClick={() => setTab(i.id)} title={collapsed ? i.label : undefined}
                className="relative flex items-center gap-2.5 py-2 rounded-lg transition-colors text-left"
                style={{
                  padding: collapsed ? "8px" : "8px 12px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  background: active ? "rgba(139,92,246,0.08)" : "transparent",
                  color: active ? "#E0E0F0" : "#606070",
                  borderLeft: active && !collapsed ? "2px solid #8B5CF6" : "2px solid transparent",
                }}
              >
                <Icon size={15} />
                {!collapsed && <span className="text-[13px]">{i.label}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom: user + signout */}
      <div className="p-2 border-t border-white/[0.05]">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 py-2 mb-1 rounded-lg"
            style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #4C1D95, #8B5CF6)" }}>{initials}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[11.5px] font-medium truncate" style={{ color: "#E0E0F0" }}>{hrName}</div>
              <div className="text-[10px]" style={{ color: "#8B5CF6" }}>HR Admin</div>
            </div>
          </div>
        )}
        <button onClick={onSignOut} title={collapsed ? "Sign out" : undefined}
          className="w-full flex items-center gap-2 py-2 rounded-lg text-[12px] transition-colors hover:bg-white/[0.04]"
          style={{ padding: collapsed ? "8px" : "8px 10px", justifyContent: collapsed ? "center" : "flex-start", color: "#606070" }}
        >
          <LogOut size={13} />
          {!collapsed && <span>Sign out</span>}
        </button>

        {/* Collapse toggle */}
        <button onClick={onToggle}
          className="w-full flex items-center justify-center py-2 mt-1 rounded-lg transition-colors hover:bg-white/[0.04]"
          style={{ color: "#404055" }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </motion.aside>

    {/* Mobile drawer + backdrop */}
    <AnimatePresence>
      {mobileMenuOpen && (
        <motion.div key="hr-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="lg:hidden fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
          onClick={() => setMobileMenuOpen(false)} />
      )}
    </AnimatePresence>
    <motion.aside
      className="lg:hidden fixed inset-y-0 left-0 z-50 w-[250px] max-w-[80vw] flex flex-col h-screen overflow-hidden"
      style={{ background: "var(--sidebar-bg)", backdropFilter: "blur(24px)", borderRight: "1px solid var(--sidebar-border)", transition: "background 0.4s ease, border-color 0.4s ease" }}
      initial={{ x: "-100%" }}
      animate={{ x: mobileMenuOpen ? 0 : "-100%" }}
      transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}>
      <div className="flex items-center justify-between gap-2.5 pt-5 pb-3 px-4">
        <div className="flex items-center gap-2.5">
          <Logo size={32} />
          <div className="font-display font-bold text-[17px] leading-none" style={{ letterSpacing: "-0.4px" }}>
            <span style={{ color: "#F0F0F5" }}>Nay</span>
            <span style={{ color: "#8B5CF6" }}>ra</span>
          </div>
        </div>
        <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg" style={{ color: "#606070" }}>
          <X size={18} />
        </button>
      </div>

      <div className="px-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.25)", color: "#C4B5FD" }}>
          <ShieldCheck size={14} />
          <span className="text-[12px] font-medium">HR Admin</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        <div className="px-2 text-[9px] uppercase tracking-[0.14em] mb-1.5 font-medium" style={{ color: "#202030" }}>
          Workspace
        </div>
        <div className="flex flex-col gap-0.5">
          {items.map((i) => {
            const active = tab === i.id;
            const Icon = i.icon;
            return (
              <button key={i.id} onClick={() => { setTab(i.id); setMobileMenuOpen(false); }}
                className="relative flex items-center gap-2.5 py-2 px-3 rounded-lg transition-colors text-left"
                style={{
                  background: active ? "rgba(139,92,246,0.08)" : "transparent",
                  color: active ? "#E0E0F0" : "#606070",
                  borderLeft: active ? "2px solid #8B5CF6" : "2px solid transparent",
                }}>
                <Icon size={15} />
                <span className="text-[13px]">{i.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-2 border-t border-white/[0.05]">
        <div className="flex items-center gap-2 px-2 py-2 mb-1 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #4C1D95, #8B5CF6)" }}>{initials}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[11.5px] font-medium truncate" style={{ color: "#E0E0F0" }}>{hrName}</div>
            <div className="text-[10px]" style={{ color: "#8B5CF6" }}>HR Admin</div>
          </div>
        </div>
        <button onClick={onSignOut}
          className="w-full flex items-center gap-2 py-2 px-2.5 rounded-lg text-[12px] transition-colors hover:bg-white/[0.04]"
          style={{ color: "#606070" }}>
          <LogOut size={13} />
          <span>Sign out</span>
        </button>
      </div>
    </motion.aside>
    </>
  );
}

function HRTopbar({ tab }: { tab: Tab }) {
  const { setMobileMenuOpen } = useNova();
  const titles: Record<Tab, string> = {
    overview: "Dashboard Overview", documents: "All Documents",
    users: "Users & Employees", analytics: "Workspace Analytics",
    workspaces: "Workspaces", settings: "Settings",
  };
  return (
    <div className="h-[54px] shrink-0 flex items-center justify-between px-3 sm:px-6 gap-2"
      style={{ background: "var(--topbar-bg)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--sidebar-border)", transition: "background 0.4s ease, border-color 0.4s ease" }}>
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden p-1.5 -ml-1 rounded-lg transition-colors hover:bg-white/[0.06] flex-shrink-0"
          style={{ color: "#C0C0D5" }}>
          <Menu size={18} />
        </button>
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#8B5CF6", boxShadow: "0 0 10px #8B5CF6" }} />
        <h2 className="font-display font-bold text-[14px] sm:text-[15px] truncate" style={{ color: "#C0C0D5" }}>{titles[tab]}</h2>
        <span className="text-[12px] hidden sm:inline" style={{ color: "#404055" }}>/ HR Admin</span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <NotificationBell />
        <Link to="/" className="flex items-center gap-1.5 text-[12px] transition-colors hover:text-white/80" style={{ color: "#606070" }}>
          <span className="hidden sm:inline">← Employee Chat View</span>
          <span className="sm:hidden">← Chat</span>
        </Link>
      </div>
    </div>
  );
}

/* ── Overview ── */
type DocRow = { id: string; name: string; workspace_id: string | null; status: string | null; created_at: string | null; storage_path: string | null; };
type MsgRow = { id: string; content: string; created_at: string | null; };

function Overview({ workspaces }: { workspaces: { id: string; name: string; color: string }[] }) {
  const { user, userProfile } = useNova();
  const hrName = userProfile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Admin";
  const [stats, setStats] = useState({ totalDocs: 0, queriesToday: 0, activeEmployees: 0, workspacesCount: 0 });
  const [uploads, setUploads] = useState<DocRow[]>([]);
  const [recentQs, setRecentQs] = useState<MsgRow[]>([]);

  useEffect(() => {
    (async () => {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const [{ count: docs }, { count: emps }, todayMsgs, ups, qs] = await Promise.all([
        supabase.from("documents").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("role", "user").gte("created_at", todayStart.toISOString()),
        supabase.from("documents").select("id, name, workspace_id, status, created_at, storage_path").order("created_at", { ascending: false }).limit(8),
        supabase.from("messages").select("id, content, created_at").eq("role", "user").order("created_at", { ascending: false }).limit(8),
      ]);
      setStats({ totalDocs: docs ?? 0, queriesToday: todayMsgs.count ?? 0, activeEmployees: emps ?? 0, workspacesCount: workspaces.length });
      setUploads((ups.data as DocRow[]) ?? []);
      setRecentQs((qs.data as MsgRow[]) ?? []);
    })();
  }, [workspaces.length]);

  const ALL_WS_ID_DOC = "00000000-0000-0000-0000-000000000001";
  const wsName = (id: string | null) => {
    if (id === ALL_WS_ID_DOC) return "All";
    return workspaces.find((w) => w.id === id)?.name ?? "—";
  };
  const wsColor = (id: string | null) => {
    if (id === ALL_WS_ID_DOC) return "#6366F1";
    return workspaces.find((w) => w.id === id)?.color ?? "#606070";
  };

  return (
    <>
      <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="font-display font-bold text-[24px] mb-1" style={{ color: "#E0E0F0" }}>
        Welcome back, <span style={{ color: "#C4B5FD" }}>{hrName}</span> 👋
      </motion.h1>
      <p className="text-[13px] mb-6" style={{ color: "#606070" }}>
        Manage employees, monitor documents, and oversee workspace activity.
      </p>

      <AnnouncementComposer workspaces={workspaces} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Documents", value: stats.totalDocs, icon: <FileText size={16} />, color: "#8B5CF6" },
          { label: "Queries Today", value: stats.queriesToday, icon: <MessageSquare size={16} />, color: "#10B981" },
          { label: "Total Employees", value: stats.activeEmployees, icon: <UserCheck size={16} />, color: "#F59E0B" },
          { label: "Workspaces", value: stats.workspacesCount, icon: <Building2 size={16} />, color: "#EC4899" },
        ].map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(8px)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "#606070" }}>{s.label}</div>
              <div style={{ color: s.color }}>{s.icon}</div>
            </div>
            <div className="font-display font-bold text-[28px]" style={{ color: "#E0E0F0" }}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Recent uploads">
          <HRTable headers={["Document", "Workspace", "Date", "Status"]}>
            {uploads.length === 0 && <EmptyRow cols={4} text="No uploads yet." />}
            {uploads.map((u) => (
              <tr key={u.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 text-[12.5px] max-w-[160px] truncate" style={{ color: "#E0E0F0" }}>{u.name}</td>
                <td className="py-2.5">
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: `${wsColor(u.workspace_id)}20`, color: wsColor(u.workspace_id), border: `1px solid ${wsColor(u.workspace_id)}40` }}>
                    {wsName(u.workspace_id)}
                  </span>
                </td>
                <td className="py-2.5 text-[12px]" style={{ color: "#606070" }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : ""}</td>
                <td className="py-2.5"><StatusPill status={u.status ?? "processing"} /></td>
              </tr>
            ))}
          </HRTable>
        </SectionCard>

        <SectionCard title="Recent questions">
          <HRTable headers={["Question", "When"]}>
            {recentQs.length === 0 && <EmptyRow cols={2} text="No questions yet." />}
            {recentQs.map((q) => (
              <tr key={q.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 text-[12.5px] max-w-[280px] truncate" style={{ color: "#E0E0F0" }}>{q.content}</td>
                <td className="py-2.5 text-[11px] whitespace-nowrap" style={{ color: "#606070" }}>
                  {q.created_at ? timeAgo(q.created_at) : ""}
                </td>
              </tr>
            ))}
          </HRTable>
        </SectionCard>
      </div>
    </>
  );
}

/* ── Documents ── */
function DocumentsTab({ workspaces }: { workspaces: { id: string; name: string; color: string }[] }) {
  const { user } = useNova();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [uploadWs, setUploadWs] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase.from("documents").select("id, name, workspace_id, status, created_at, storage_path").order("created_at", { ascending: false });
    setDocs((data as DocRow[]) ?? []);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (!uploadWs) setUploadWs("all"); }, [uploadWs]);

  const ALL_WS_ID_FILTER = "00000000-0000-0000-0000-000000000001";
  const visible = useMemo(() => {
    let d = filter === "all" ? docs : docs.filter((x) => x.workspace_id === filter || x.workspace_id === ALL_WS_ID_FILTER);
    if (search) d = d.filter((x) => x.name.toLowerCase().includes(search.toLowerCase()));
    return d;
  }, [docs, filter, search]);

  const ALL_WS_ID = "00000000-0000-0000-0000-000000000001";

  const handleUpload = async (files: FileList | null) => {
    if (!files || !user) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      // Single upload — All Workspaces = special ALL_WS_ID, not duplicated
      const targetWsId = uploadWs === "all" ? ALL_WS_ID : uploadWs;
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
      if (upErr) { toast.error(`Upload failed: ${upErr.message}`); continue; }
      const { data: inserted, error: insErr } = await supabase.from("documents")
        .insert({ user_id: user.id, workspace_id: targetWsId, name: file.name, size: file.size, pages: 0, status: "processing", storage_path: path })
        .select("id").single();
      if (insErr) { toast.error(insErr.message); continue; }
      const wsLabel = uploadWs === "all" ? "All Workspaces" : workspaces.find(w => w.id === uploadWs)?.name;
      toast.success(`${file.name} uploaded to ${wsLabel} — indexing…`);
      if (inserted?.id) {
        supabase.functions.invoke("ingest-pdf", { body: { document_id: inserted.id, workspace_id: targetWsId, user_id: user.id, storage_path: path } })
          .then(({ error }) => { if (error) toast.error(`Indexing failed: ${error.message}`); load(); });
      }
    }
    setUploading(false);
    load();
  };

  const del = async (d: DocRow) => {
    if (!confirm(`Delete "${d.name}"?`)) return;
    setDocs((p) => p.filter((x) => x.id !== d.id));
    await supabase.from("document_chunks").delete().eq("document_id", d.id);
    if (d.storage_path) await supabase.storage.from("documents").remove([d.storage_path]);
    await supabase.from("documents").delete().eq("id", d.id);
    toast.success(`Deleted ${d.name}`);
  };

  const reindex = async (d: DocRow) => {
    if (!user || !d.storage_path || !d.workspace_id) return;
    setDocs((p) => p.map((x) => x.id === d.id ? { ...x, status: "processing" } : x));
    await supabase.from("documents").update({ status: "processing" }).eq("id", d.id);
    toast.info(`Re-indexing ${d.name}…`);
    const { error } = await supabase.functions.invoke("ingest-pdf", { body: { document_id: d.id, workspace_id: d.workspace_id, user_id: user.id, storage_path: d.storage_path } });
    if (error) toast.error(`Re-index failed: ${error.message}`);
    else toast.success(`${d.name} re-indexed`);
    load();
  };

  const ALL_WS_ID_DOC = "00000000-0000-0000-0000-000000000001";
  const wsName = (id: string | null) => {
    if (id === ALL_WS_ID_DOC) return "All";
    return workspaces.find((w) => w.id === id)?.name ?? "—";
  };
  const wsColor = (id: string | null) => {
    if (id === ALL_WS_ID_DOC) return "#6366F1";
    return workspaces.find((w) => w.id === id)?.color ?? "#606070";
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="font-display font-bold text-[22px]" style={{ color: "#E0E0F0" }}>All Documents</h1>
        <div className="flex items-center gap-2">
          <select value={uploadWs} onChange={(e) => setUploadWs(e.target.value)}
            className="rounded-lg px-3 py-2 text-[12.5px] outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#E0E0F0" }}>
            <option value="all" style={{ background: "#0c0c18" }}>📢 All Workspaces (shared)</option>
            {workspaces.map((w) => <option key={w.id} value={w.id} style={{ background: "#0c0c18" }}>{w.name}</option>)}
          </select>
          <input ref={fileRef} type="file" multiple accept="application/pdf" className="hidden" onChange={(e) => handleUpload(e.target.files)} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] transition-colors disabled:opacity-60"
            style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "#C4B5FD" }}>
            <Upload size={13} /> {uploading ? "Uploading…" : "Upload PDF"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#606070" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents…"
            className="pl-8 pr-3 py-2 rounded-lg text-[12.5px] outline-none w-[160px] sm:w-[200px]"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#E0E0F0" }} />
        </div>
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" />
        {workspaces.map((w) => (
          <FilterChip key={w.id} active={filter === w.id} onClick={() => setFilter(w.id)} label={w.name} />
        ))}
      </div>

      <SectionCard title={`${visible.length} documents`}>
        <HRTable headers={["Name", "Workspace", "Date", "Status", ""]}>
          {visible.length === 0 && <EmptyRow cols={5} text="No documents." />}
          {visible.map((d) => (
            <tr key={d.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
              <td className="py-2.5 text-[12.5px] max-w-[200px] truncate" style={{ color: "#E0E0F0" }}>{d.name}</td>
              <td className="py-2.5">
                <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: `${wsColor(d.workspace_id)}20`, color: wsColor(d.workspace_id), border: `1px solid ${wsColor(d.workspace_id)}40` }}>
                  {wsName(d.workspace_id)}
                </span>
              </td>
              <td className="py-2.5 text-[12px]" style={{ color: "#606070" }}>{d.created_at ? new Date(d.created_at).toLocaleDateString() : ""}</td>
              <td className="py-2.5"><StatusPill status={d.status ?? "processing"} /></td>
              <td className="py-2.5 text-right">
                <div className="flex items-center gap-2 justify-end">
                  <button onClick={() => reindex(d)} className="text-[11px] flex items-center gap-1 transition-colors hover:text-[#C4B5FD]" style={{ color: "#606070" }}>
                    <RefreshCw size={11} /> Re-index
                  </button>
                  <button onClick={() => del(d)} className="text-[11px] flex items-center gap-1 transition-colors hover:text-red-400" style={{ color: "#606070" }}>
                    <Trash2 size={11} /> Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </HRTable>
      </SectionCard>
    </>
  );
}

/* ── Users ── */
type Profile = { id: string; full_name: string | null; role: string | null; created_at: string | null; email: string | null; workspace_name: string | null; };

function UsersTab() {
  const { user: currentUser } = useNova();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [q, setQ] = useState("");
  const [activityUser, setActivityUser] = useState<Profile | null>(null);
  const [userActivity, setUserActivity] = useState<{ content: string; created_at: string | null }[]>([]);

  const load = async () => {
    // Fetch ALL profiles - HR Admin can see everyone due to updated RLS
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, created_at, email, workspace_name")
      .order("created_at", { ascending: false });
    if (error) console.error("Profiles fetch error:", error.message);
    setProfiles((data as Profile[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const visible = profiles.filter((p) =>
    (p.full_name ?? "").toLowerCase().includes(q.toLowerCase()) || p.id.toLowerCase().includes(q.toLowerCase())
  );

  const toggleRole = async (p: Profile) => {
    const newRole = p.role === "HR Admin" ? "Employee" : "HR Admin";
    await supabase.from("profiles").update({ role: newRole }).eq("id", p.id);
    setProfiles((prev) => prev.map((x) => x.id === p.id ? { ...x, role: newRole } : x));
    toast.success(`${p.full_name ?? "User"} is now ${newRole}`);
  };

  const changeDept = async (p: Profile, newDept: string) => {
    const { error } = await supabase.from("profiles").update({ workspace_name: newDept }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    setProfiles((prev) => prev.map((x) => x.id === p.id ? { ...x, workspace_name: newDept } : x));
    toast.success(`${p.full_name ?? "User"} moved to ${newDept}`);
  };

  const viewActivity = async (p: Profile) => {
    setActivityUser(p);
    const { data: sessions } = await supabase.from("chat_sessions").select("id").eq("user_id", p.id);
    const sessionIds = (sessions ?? []).map((s: { id: string }) => s.id);
    if (sessionIds.length === 0) { setUserActivity([]); return; }
    const { data: msgs } = await supabase.from("messages").select("content, created_at").eq("role", "user").in("session_id", sessionIds).order("created_at", { ascending: false }).limit(10);
    setUserActivity((msgs ?? []) as { content: string; created_at: string | null }[]);
  };

  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("delete-user", { body: { user_id: deleteTarget.id } });
    setDeleting(false);
    if (error || data?.error) {
      toast.error(data?.error ?? error?.message ?? "Failed to delete user");
      return;
    }
    setProfiles((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    toast.success(`${deleteTarget.full_name ?? "User"} removed`);
    setDeleteTarget(null);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h1 className="font-display font-bold text-[22px]" style={{ color: "#E0E0F0" }}>Users & Employees</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#606070" }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…"
              className="pl-8 pr-3 py-2 rounded-lg text-[12.5px] outline-none w-[160px] sm:w-[220px]"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#E0E0F0" }} />
          </div>
          <button onClick={() => setInviteOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] transition-colors hover:bg-purple-500/20"
            style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "#C4B5FD" }}>
            <Mail size={13} /> Invite User
          </button>
        </div>
      </div>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} onInvited={load} />

      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
            onClick={() => !deleting && setDeleteTarget(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()} className="w-full max-w-[400px] p-6 rounded-2xl"
              style={{ background: "rgba(8,8,20,0.97)", border: "1px solid rgba(239,68,68,0.25)", backdropFilter: "blur(24px)" }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-[16px]" style={{ color: "#E0E0F0" }}>Remove user?</h3>
                <button onClick={() => !deleting && setDeleteTarget(null)} className="text-white/50 hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <p className="text-[12.5px] mb-5" style={{ color: "#7A798A" }}>
                This will permanently delete <span style={{ color: "#E0E0F0" }}>{deleteTarget.full_name ?? deleteTarget.email}</span>'s account, including their login access and chat history. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#C0C0D5" }}>
                  Cancel
                </button>
                <button onClick={confirmDelete} disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-medium disabled:opacity-50"
                  style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#EF4444" }}>
                  {deleting ? "Removing…" : "Remove User"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SectionCard title={`${visible.length} users`}>
        <HRTable headers={["", "Name / Email", "Department", "Role", "Joined", "Actions"]}>
          {visible.length === 0 && <EmptyRow cols={6} text="No users found." />}
          {visible.map((p) => {
            const initials = (p.full_name ?? "?").slice(0, 2).toUpperCase();
            const isCurrentUser = p.id === currentUser?.id;
            const deptColor: Record<string, string> = {
              Engineering: "#8B5CF6", Finance: "#F59E0B",
              Marketing: "#EC4899", HR: "#10B981"
            };
            const dept = p.workspace_name || (p.role === "HR Admin" ? "HR" : "—");
            return (
              <tr key={p.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 w-10">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, #4C1D95, #8B5CF6)" }}>{initials}</div>
                </td>
                <td className="py-2.5">
                  <div className="text-[12.5px]" style={{ color: "#E0E0F0" }}>{p.full_name ?? "Unnamed User"}</div>
                  <div className="text-[11px]" style={{ color: "#606070" }}>{p.email ?? "No email"}</div>
                </td>
                <td className="py-2.5">
                  {p.role === "HR Admin" ? (
                    <span className="text-[10.5px] px-2 py-0.5 rounded-full"
                      style={{ background: `${deptColor["HR"]}18`, color: deptColor["HR"], border: `1px solid ${deptColor["HR"]}40` }}>
                      HR
                    </span>
                  ) : (
                    <select value={dept !== "—" ? dept : "Engineering"} onChange={(e) => changeDept(p, e.target.value)}
                      className="text-[10.5px] px-2 py-1 rounded-full outline-none cursor-pointer"
                      style={{ background: `${deptColor[dept] ?? "#8B5CF6"}18`, color: deptColor[dept] ?? "#8B5CF6", border: `1px solid ${deptColor[dept] ?? "#8B5CF6"}40` }}>
                      <option value="Engineering" style={{ background: "#0c0c18", color: "#C4B5FD" }}>Engineering</option>
                      <option value="Finance" style={{ background: "#0c0c18", color: "#FCD34D" }}>Finance</option>
                      <option value="Marketing" style={{ background: "#0c0c18", color: "#F9A8D4" }}>Marketing</option>
                      <option value="HR" style={{ background: "#0c0c18", color: "#6EE7B7" }}>HR</option>
                    </select>
                  )}
                </td>
                <td className="py-2.5">
                  <span className="text-[10.5px] px-2 py-0.5 rounded-md"
                    style={{ background: p.role === "HR Admin" ? "rgba(139,92,246,0.1)" : "rgba(255,255,255,0.05)", color: p.role === "HR Admin" ? "#8B5CF6" : "#A0A0B0", border: `1px solid ${p.role === "HR Admin" ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.08)"}` }}>
                    {p.role ?? "Employee"}
                  </span>
                </td>
                <td className="py-2.5 text-[12px]" style={{ color: "#606070" }}>
                  {p.created_at ? new Date(p.created_at).toLocaleDateString() : ""}
                </td>
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <button onClick={() => viewActivity(p)} className="text-[11px] px-2 py-1 rounded-md transition-colors hover:bg-white/[0.06]" style={{ color: "#A0A0B0", border: "1px solid rgba(255,255,255,0.08)" }}>
                      Activity
                    </button>
                    {!isCurrentUser && (
                      <button onClick={() => toggleRole(p)} className="text-[11px] px-2 py-1 rounded-md transition-colors hover:bg-purple-500/10" style={{ color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.2)" }}>
                        Toggle Role
                      </button>
                    )}
                    {!isCurrentUser && (
                      <button onClick={() => setDeleteTarget(p)} className="text-[11px] px-2 py-1 rounded-md transition-colors hover:bg-red-500/10" style={{ color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                        <Trash2 size={11} className="inline -mt-0.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </HRTable>
      </SectionCard>

      {/* Activity slide-over */}
      <AnimatePresence>
        {activityUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => setActivityUser(null)}>
            <motion.div initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} transition={{ type: "spring", damping: 25 }}
              className="w-[380px] h-full flex flex-col p-6 overflow-y-auto"
              style={{ background: "rgba(8,8,20,0.98)", backdropFilter: "blur(24px)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display font-bold text-[18px]" style={{ color: "#E0E0F0" }}>{activityUser.full_name ?? "User"}'s Activity</h3>
                <button onClick={() => setActivityUser(null)} style={{ color: "#606070" }}>✕</button>
              </div>
              {userActivity.length === 0
                ? <p className="text-[13px]" style={{ color: "#606070" }}>No questions asked yet.</p>
                : userActivity.map((m, i) => (
                  <div key={i} className="mb-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-[12.5px]" style={{ color: "#D0D0E0" }}>{m.content}</p>
                    <p className="text-[11px] mt-1" style={{ color: "#606070" }}>{m.created_at ? timeAgo(m.created_at) : ""}</p>
                  </div>
                ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Analytics ── */
function AnalyticsTab({ workspaces }: { workspaces: { id: string; name: string; color: string }[] }) {
  const [days, setDays] = useState<{ day: string; queries: number }[]>([]);
  const [wsCounts, setWsCounts] = useState<{ name: string; queries: number; color: string }[]>([]);
  const [topUsers, setTopUsers] = useState<{ name: string; count: number }[]>([]);
  const [stats, setStats] = useState({ total: 0, today: 0, indexed: 0 });
  const [allQs, setAllQs] = useState<{ content: string; created_at: string | null }[]>([]);

  useEffect(() => {
    (async () => {
      const since = new Date(); since.setDate(since.getDate() - 29); since.setHours(0, 0, 0, 0);
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const [msgsAll, msgsToday, indexed, sessions, recentMsgs] = await Promise.all([
        supabase.from("messages").select("created_at, session_id").eq("role", "user").gte("created_at", since.toISOString()),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("role", "user").gte("created_at", todayStart.toISOString()),
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("status", "indexed"),
        supabase.from("chat_sessions").select("id, workspace_id, user_id"),
        supabase.from("messages").select("content, created_at").eq("role", "user").order("created_at", { ascending: false }).limit(20),
      ]);

      setStats({ total: msgsAll.data?.length ?? 0, today: msgsToday.count ?? 0, indexed: indexed.count ?? 0 });
      setAllQs((recentMsgs.data ?? []) as { content: string; created_at: string | null }[]);

      // Daily chart
      const dayMap = new Map<string, number>();
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const keys: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        keys.push(d.toDateString()); dayMap.set(d.toDateString(), 0);
      }
      for (const m of msgsAll.data ?? []) {
        if (!m.created_at) continue;
        const k = new Date(m.created_at).toDateString();
        if (dayMap.has(k)) dayMap.set(k, (dayMap.get(k) ?? 0) + 1);
      }
      setDays(keys.map((k) => ({ day: dayNames[new Date(k).getDay()], queries: dayMap.get(k) ?? 0 })));

      // Workspace counts
      const sessMap = new Map<string, string>();
      for (const s of sessions.data ?? []) sessMap.set(s.id, s.workspace_id ?? "");
      const wsCount = new Map<string, number>();
      for (const m of msgsAll.data ?? []) {
        const wsId = sessMap.get(m.session_id) ?? "";
        if (wsId) wsCount.set(wsId, (wsCount.get(wsId) ?? 0) + 1);
      }
      // Include all workspaces in chart even if 0 queries
      setWsCounts(workspaces.map((w) => ({ name: w.name, queries: wsCount.get(w.id) ?? 0, color: w.color })));
    })();
  }, [workspaces]);

  return (
    <>
      <h1 className="font-display font-bold text-[22px] mb-4" style={{ color: "#E0E0F0" }}>Workspace Analytics</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total Queries", value: stats.total, color: "#8B5CF6" },
          { label: "Queries Today", value: stats.today, color: "#10B981" },
          { label: "Docs Indexed", value: stats.indexed, color: "#F59E0B" },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(8px)" }}>
            <div className="text-[10px] uppercase tracking-[0.14em] mb-1" style={{ color: "#606070" }}>{s.label}</div>
            <div className="font-display font-bold text-[26px]" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <SectionCard title="Queries — last 7 days">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={days}>
              <defs>
                <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" stroke="#606070" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#606070" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#0c0c18", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 12 }} />
              <Area type="monotone" dataKey="queries" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#ag)" />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Queries by workspace">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={wsCounts}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" stroke="#606070" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#606070" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#0c0c18", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="queries" radius={[4, 4, 0, 0]}>
                {wsCounts.map((w, i) => <Cell key={i} fill={w.color} fillOpacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <SectionCard title="Recent questions">
        <HRTable headers={["Question", "When"]}>
          {allQs.map((q, i) => (
            <tr key={i} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
              <td className="py-2.5 text-[12.5px] max-w-[500px] truncate" style={{ color: "#E0E0F0" }}>{q.content}</td>
              <td className="py-2.5 text-[11px] whitespace-nowrap" style={{ color: "#606070" }}>{q.created_at ? timeAgo(q.created_at) : ""}</td>
            </tr>
          ))}
        </HRTable>
      </SectionCard>
    </>
  );
}

/* ── Workspaces ── */
function WorkspacesTab({ workspaces }: { workspaces: { id: string; name: string; color: string }[] }) {
  const [wsDocs, setWsDocs] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("documents").select("workspace_id");
      const counts: Record<string, number> = {};
      for (const d of data ?? []) {
        if (d.workspace_id) counts[d.workspace_id] = (counts[d.workspace_id] ?? 0) + 1;
      }
      setWsDocs(counts);
    })();
  }, []);

  return (
    <>
      <h1 className="font-display font-bold text-[22px] mb-6" style={{ color: "#E0E0F0" }}>Workspaces</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {workspaces.map((w) => (
          <motion.div key={w.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl" style={{ background: "rgba(4,4,16,0.65)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(16px)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${w.color}20`, border: `1px solid ${w.color}40` }}>
                <Building2 size={18} style={{ color: w.color }} />
              </div>
              <div>
                <div className="font-display font-bold text-[16px]" style={{ color: "#E0E0F0" }}>{w.name}</div>
                <div className="text-[11px]" style={{ color: "#606070" }}>Knowledge Workspace</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#606070" }}>Documents</div>
                <div className="font-bold text-[20px]" style={{ color: "#E0E0F0" }}>{wsDocs[w.id] ?? 0}</div>
              </div>
              <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#606070" }}>Status</div>
                <div className="text-[12px]" style={{ color: "#10B981" }}>● Active</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </>
  );
}

/* ── Settings ── */
function SettingsTab({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const { user, userProfile, bgTheme, setBgTheme } = useNova();
  const [name, setName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userProfile?.full_name) setName(userProfile.full_name);
    else if (user) {
      supabase.from("profiles").select("full_name").eq("id", user.id).single()
        .then(({ data }) => { if (data?.full_name) setName(data.full_name); });
    }
  }, [user, userProfile]);

  const saveName = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", user.id);
    if (error) toast.error(error.message);
    else toast.success("Profile updated!");
    setSaving(false);
  };

  const savePassword = async () => {
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match!"); return; }
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success("Password updated!"); setNewPassword(""); setConfirmPassword(""); }
  };

  const initials = (name || user?.email || "HR").split(/\s+/).map(p => p[0]).slice(0,2).join("").toUpperCase();

  return (
    <>
      <h1 className="font-display font-bold text-[26px] mb-1" style={{ color: "#E0E0F0" }}>Account Settings</h1>
      <p className="text-[13px] mb-8" style={{ color: "#606070" }}>Manage your HR Admin profile and security preferences.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — avatar card */}
        <div className="flex flex-col gap-4">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl flex flex-col items-center gap-4 text-center"
            style={{ background: "rgba(4,4,16,0.65)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(16px)" }}>
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-[24px] font-bold text-white"
              style={{ background: "linear-gradient(135deg,#4C1D95,#8B5CF6)", boxShadow: "0 0 30px rgba(139,92,246,0.3)" }}>
              {initials}
            </div>
            <div>
              <div className="font-bold text-[16px]" style={{ color: "#E0E0F0" }}>{name || "HR Admin"}</div>
              <div className="text-[12px] mt-0.5" style={{ color: "#606070" }}>{user?.email}</div>
              <div className="mt-2 text-[10.5px] px-3 py-1 rounded-full inline-block"
                style={{ background: "rgba(139,92,246,0.1)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.2)" }}>
                HR Admin
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="p-4 rounded-2xl"
            style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", backdropFilter: "blur(16px)" }}>
            <div className="text-[13px] font-medium mb-1" style={{ color: "#EF4444" }}>Danger Zone</div>
            <div className="text-[11.5px] mb-3" style={{ color: "#606070" }}>Sign out from all sessions.</div>
            <button onClick={onSignOut}
              className="w-full py-2 rounded-xl text-[12.5px] font-medium transition-colors"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444" }}>
              Sign Out
            </button>
          </motion.div>
        </div>

        {/* Right column — forms */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="p-6 rounded-2xl"
            style={{ background: "rgba(4,4,16,0.65)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(16px)" }}>
            <div className="font-bold text-[15px] mb-4" style={{ color: "#E0E0F0" }}>Profile Information</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] uppercase tracking-wider" style={{ color: "#404055" }}>Full Name</span>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="rounded-xl px-3.5 py-2.5 text-[13px] outline-none transition-all w-full"
                  style={{ color: "#E0E0F0", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", caretColor: "#8B5CF6" }}
                  onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(139,92,246,0.4)"; }}
                  onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; }} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] uppercase tracking-wider" style={{ color: "#404055" }}>Email Address</span>
                <input value={user?.email ?? ""} disabled
                  className="rounded-xl px-3.5 py-2.5 text-[13px] outline-none w-full opacity-50"
                  style={{ color: "#E0E0F0", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }} />
              </label>
            </div>
            <button onClick={saveName} disabled={saving}
              className="px-5 py-2.5 rounded-xl text-[13px] font-medium text-white transition-opacity disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #4C1D95, #8B5CF6)" }}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl"
            style={{ background: "rgba(4,4,16,0.65)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(16px)" }}>
            <div className="font-bold text-[15px] mb-4" style={{ color: "#E0E0F0" }}>Change Password</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] uppercase tracking-wider" style={{ color: "#404055" }}>New Password</span>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters"
                  className="rounded-xl px-3.5 py-2.5 text-[13px] outline-none w-full"
                  style={{ color: "#E0E0F0", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", caretColor: "#8B5CF6" }}
                  onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(139,92,246,0.4)"; }}
                  onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; }} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] uppercase tracking-wider" style={{ color: "#404055" }}>Confirm Password</span>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password"
                  className="rounded-xl px-3.5 py-2.5 text-[13px] outline-none w-full"
                  style={{ color: "#E0E0F0", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", caretColor: "#8B5CF6" }}
                  onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(139,92,246,0.4)"; }}
                  onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; }} />
              </label>
            </div>
            <button onClick={savePassword}
              className="px-5 py-2.5 rounded-xl text-[13px] font-medium transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#C0C0D5" }}>
              Update Password
            </button>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="p-6 rounded-2xl"
            style={{ background: "rgba(4,4,16,0.65)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(16px)" }}>
            <div className="font-bold text-[15px] mb-1" style={{ color: "#E0E0F0" }}>Appearance</div>
            <p className="text-[12px] mb-4" style={{ color: "#606070" }}>Choose a background theme — applies instantly across the app.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {BG_THEMES.map((t) => (
                <BgThemeCard key={t.id} theme={t} active={bgTheme === t.id} onClick={() => setBgTheme(t.id)} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}

/* ── Shared ── */
function AnnouncementComposer({ workspaces }: { workspaces: { id: string; name: string; color: string }[] }) {
  const { user } = useNova();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<string>("all");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!title.trim() || !user) { toast.error("Please enter a title"); return; }
    setSending(true);
    const { error } = await supabase.from("notifications").insert({
      type: "announcement",
      title: title.trim(),
      message: message.trim() || null,
      workspace_id: target === "all" ? null : target,
      target_role: "Employee",
      created_by: user.id,
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Announcement sent!");
    setTitle(""); setMessage(""); setTarget("all"); setOpen(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 rounded-2xl overflow-hidden"
      style={{ background: "rgba(4,4,16,0.65)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(16px)" }}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.12)", color: "#C4B5FD" }}>
            <Megaphone size={15} />
          </div>
          <span className="font-display font-bold text-[14px]" style={{ color: "#E0E0F0" }}>Send Announcement</span>
        </div>
        <ChevronDown size={16} style={{ color: "#606070", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-5 pb-5 pt-1 space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title…"
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#E0E0F0" }} />
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message (optional)…" rows={3}
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#E0E0F0" }} />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px]" style={{ color: "#606070" }}>Send to:</span>
                <button onClick={() => setTarget("all")}
                  className="text-[11px] px-2.5 py-1 rounded-full transition-colors"
                  style={{ background: target === "all" ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.04)", color: target === "all" ? "#C4B5FD" : "#909090", border: `1px solid ${target === "all" ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.08)"}` }}>
                  All Employees
                </button>
                {workspaces.map((w) => (
                  <button key={w.id} onClick={() => setTarget(w.id)}
                    className="text-[11px] px-2.5 py-1 rounded-full transition-colors"
                    style={{ background: target === w.id ? `${w.color}25` : "rgba(255,255,255,0.04)", color: target === w.id ? w.color : "#909090", border: `1px solid ${target === w.id ? `${w.color}50` : "rgba(255,255,255,0.08)"}` }}>
                    {w.name}
                  </button>
                ))}
              </div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={send} disabled={sending}
                className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-bg text-white text-[12.5px] font-medium disabled:opacity-50">
                <Megaphone size={13} /> {sending ? "Sending…" : "Send Announcement"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Invite Modal ── */
type InviteRow = { name: string; email: string; department: string; status?: "sent" | "error" | "skipped" | "pending"; message?: string };

const DEPT_OPTIONS = ["Engineering", "Finance", "Marketing", "HR"];

function parseCSV(text: string): InviteRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const nameIdx = header.indexOf("name");
  const emailIdx = header.indexOf("email");
  const deptIdx = header.indexOf("department");
  const startRow = (nameIdx >= 0 || emailIdx >= 0) ? 1 : 0; // skip header if recognized
  const rows: InviteRow[] = [];
  for (let i = startRow; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const email = emailIdx >= 0 ? cols[emailIdx] : cols[1] ?? cols[0];
    const name = nameIdx >= 0 ? cols[nameIdx] : cols[0];
    const dept = deptIdx >= 0 ? cols[deptIdx] : cols[2];
    if (!email) continue;
    rows.push({ name: name ?? "", email, department: dept || "Engineering" });
  }
  return rows;
}

function InviteModal({ open, onClose, onInvited }: { open: boolean; onClose: () => void; onInvited: () => void }) {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dept, setDept] = useState("Engineering");
  const [csvRows, setCsvRows] = useState<InviteRow[]>([]);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setMode("single"); setName(""); setEmail(""); setDept("Engineering"); setCsvRows([]); setSending(false);
  };

  const close = () => { reset(); onClose(); };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCSV(String(reader.result ?? ""));
      if (rows.length === 0) { toast.error("No valid rows found in CSV"); return; }
      setCsvRows(rows.map((r) => ({ ...r, status: "pending" })));
    };
    reader.readAsText(file);
  };

  const sendInvites = async (invites: { email: string; full_name?: string; workspace_name?: string }[]) => {
    const { data, error } = await supabase.functions.invoke("invite-user", { body: { invites } });
    if (error) throw error;
    return data;
  };

  const sendSingle = async () => {
    if (!email.trim() || !email.includes("@")) { toast.error("Enter a valid email"); return; }
    setSending(true);
    try {
      const result = await sendInvites([{ email: email.trim(), full_name: name.trim() || undefined, workspace_name: dept }]);
      const r = result?.results?.[0];
      if (r?.status === "sent") toast.success(`Invite sent to ${email}`);
      else if (r?.status === "skipped") toast.info(`${email} already has an account`);
      else toast.error(r?.message ?? "Failed to send invite");
      if (r?.status === "sent") { onInvited(); close(); }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send invites");
    }
    setSending(false);
  };

  const sendBulk = async () => {
    if (csvRows.length === 0) return;
    setSending(true);
    try {
      const invites = csvRows.map((r) => ({ email: r.email, full_name: r.name || undefined, workspace_name: r.department }));
      const result = await sendInvites(invites);
      const results: InviteRow[] = csvRows.map((r) => {
        const match = result?.results?.find((x: any) => x.email.toLowerCase() === r.email.toLowerCase());
        return { ...r, status: match?.status ?? "error", message: match?.message };
      });
      setCsvRows(results);
      const sentCount = results.filter((r) => r.status === "sent").length;
      const skipCount = results.filter((r) => r.status === "skipped").length;
      const errCount = results.filter((r) => r.status === "error").length;
      toast.success(`${sentCount} invited, ${skipCount} skipped, ${errCount} failed`);
      if (sentCount > 0) onInvited();
    } catch (e: any) {
      toast.error(e?.message ?? "Bulk invite failed");
    }
    setSending(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={close}>
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()} className="w-full max-w-[480px] rounded-2xl overflow-hidden"
            style={{ background: "rgba(8,8,20,0.97)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(24px)" }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 className="font-display font-bold text-[16px]" style={{ color: "#E0E0F0" }}>Invite Users</h3>
              <button onClick={close} className="p-1 rounded-lg hover:bg-white/[0.06]" style={{ color: "#606070" }}>
                <X size={16} />
              </button>
            </div>

            {/* Mode tabs */}
            <div className="flex gap-2 px-5 pt-4">
              {(["single", "bulk"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                  style={{ background: mode === m ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.04)", color: mode === m ? "#C4B5FD" : "#909090", border: `1px solid ${mode === m ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.08)"}` }}>
                  {m === "single" ? "Single Invite" : "Bulk Invite (CSV)"}
                </button>
              ))}
            </div>

            <div className="px-5 py-4">
              {mode === "single" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] mb-1" style={{ color: "#606070" }}>Full Name</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma"
                      className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#E0E0F0" }} />
                  </div>
                  <div>
                    <label className="block text-[11px] mb-1" style={{ color: "#606070" }}>Email</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" type="email"
                      className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#E0E0F0" }} />
                  </div>
                  <div>
                    <label className="block text-[11px] mb-1" style={{ color: "#606070" }}>Department</label>
                    <select value={dept} onChange={(e) => setDept(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-[13px] outline-none cursor-pointer"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#E0E0F0" }}>
                      {DEPT_OPTIONS.map((d) => (
                        <option key={d} value={d} style={{ background: "#0c0c18" }}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={sendSingle} disabled={sending}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl gradient-bg text-white text-[13px] font-medium disabled:opacity-50">
                    <Mail size={14} /> {sending ? "Sending…" : "Send Invite"}
                  </motion.button>
                  <p className="text-[11px]" style={{ color: "#404055" }}>
                    An email invite will be sent via Supabase Auth. The user sets their password on first login.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div onClick={() => fileRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl cursor-pointer transition-colors hover:bg-white/[0.02]"
                    style={{ border: "1.5px dashed rgba(139,92,246,0.3)" }}>
                    <UploadCloud size={24} style={{ color: "#8B5CF6" }} />
                    <span className="text-[12.5px]" style={{ color: "#C0C0D5" }}>
                      {csvRows.length > 0 ? `${csvRows.length} rows loaded` : "Click to upload CSV"}
                    </span>
                    <span className="text-[10.5px]" style={{ color: "#606070" }}>Columns: name, email, department</span>
                    <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                  </div>

                  {csvRows.length > 0 && (
                    <div className="max-h-[240px] overflow-y-auto rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                      {csvRows.map((r, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 text-[12px]"
                          style={{ borderBottom: i < csvRows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                          <div className="min-w-0 flex-1">
                            <div className="truncate" style={{ color: "#E0E0F0" }}>{r.name || r.email}</div>
                            <div className="truncate text-[10.5px]" style={{ color: "#606070" }}>{r.email} · {r.department}</div>
                          </div>
                          {r.status === "sent" && <span className="text-[10.5px] flex-shrink-0" style={{ color: "#10B981" }}>Sent</span>}
                          {r.status === "skipped" && <span className="text-[10.5px] flex-shrink-0" style={{ color: "#F59E0B" }}>Exists</span>}
                          {r.status === "error" && <span className="text-[10.5px] flex-shrink-0" style={{ color: "#EF4444" }}>Failed</span>}
                          {r.status === "pending" && <span className="text-[10.5px] flex-shrink-0" style={{ color: "#606070" }}>Ready</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  <motion.button whileTap={{ scale: 0.97 }} onClick={sendBulk} disabled={sending || csvRows.length === 0}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl gradient-bg text-white text-[13px] font-medium disabled:opacity-50">
                    <Mail size={14} /> {sending ? "Sending…" : `Send ${csvRows.length || ""} Invite${csvRows.length === 1 ? "" : "s"}`}
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl"
      style={{ background: "rgba(4,4,16,0.65)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(16px)" }}>
      <h3 className="font-display font-bold text-[14px] mb-3" style={{ color: "#E0E0F0" }}>{title}</h3>
      {children}
    </motion.div>
  );
}

function HRTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-left py-2 text-[10.5px] uppercase tracking-[0.12em] font-medium whitespace-nowrap" style={{ color: "#404055" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <tr><td colSpan={cols} className="py-6 text-center text-[12px]" style={{ color: "#606070" }}>{text}</td></tr>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="px-3 py-1.5 rounded-full text-[11.5px] transition-colors"
      style={{ background: active ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${active ? "rgba(139,92,246,0.35)" : "rgba(255,255,255,0.06)"}`, color: active ? "#C4B5FD" : "#A0A0B0" }}>
      {label}
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "indexed") return <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.25)" }}>Indexed</span>;
  if (status === "failed") return <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.25)" }}>Failed</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.25)" }}>Processing</span>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
