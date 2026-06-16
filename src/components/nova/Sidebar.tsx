import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "@tanstack/react-router";
import { MessageSquare, Search, History, Users, Settings, LogOut, ChevronDown, X } from "lucide-react";
import { Logo } from "./Logo";
import { useNova } from "./NovaContext";

const mainNav = [
  { to: "/", label: "Chat", icon: MessageSquare },
  { to: "/smart-search", label: "Smart Search", icon: Search },
  { to: "/history", label: "History", icon: History },
];
const manageNav = [
  { to: "/team", label: "Team", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { workspace, workspaces, setWorkspace, user, userProfile, signOut, sessions, activeSessionId, setActiveSessionId, mobileMenuOpen, setMobileMenuOpen } = useNova();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [wsDropOpen, setWsDropOpen] = useState(false);
  const loc = useLocation();

  const email = user?.email ?? "";
  const displayName = userProfile?.full_name?.split(" ")[0] || email.split("@")[0] || "User";
  const fullInitials = (userProfile?.full_name || email || "U").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const isHR = userProfile?.role === "HR Admin";
  const role = isHR ? "HR Admin" : "Employee";
  const recentSessions = sessions.slice(0, 6);

  const closeMobile = () => setMobileMenuOpen(false);

  const content = (
    <>
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo size={34} />
          <div className="font-display font-bold text-[17px] leading-none" style={{ letterSpacing: "-0.4px" }}>
            <span style={{ color: "#F0F0F5" }}>Nay</span><span style={{ color: "#8B5CF6" }}>ra</span>
          </div>
        </div>
        <button onClick={closeMobile} className="lg:hidden p-1.5 rounded-lg" style={{ color: "#606070" }}>
          <X size={18} />
        </button>
      </div>

      {/* Workspace — switchable for HR, fixed for Employee */}
      <div className="px-3 mb-4 relative">
        <button
          onClick={() => isHR && setWsDropOpen((o) => !o)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-colors"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", cursor: isHR ? "pointer" : "default" }}>
          <span className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: workspace?.color ?? "#8B5CF6", boxShadow: `0 0 8px ${workspace?.color ?? "#8B5CF6"}` }} />
          <span className="text-[13px] flex-1 text-left" style={{ color: "#C0C0D5" }}>{workspace?.name ?? "Loading…"}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0"
            style={{ background: "rgba(139,92,246,0.1)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.2)" }}>
            {isHR ? "Admin" : "Member"}
          </span>
          {isHR && <ChevronDown size={12} className={`flex-shrink-0 transition-transform ${wsDropOpen ? "rotate-180" : ""}`} style={{ color: "#606070" }} />}
        </button>

        {/* HR workspace dropdown */}
        <AnimatePresence>
          {isHR && wsDropOpen && (
            <motion.div initial={{ opacity: 0, y: -6, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -6, height: 0 }} transition={{ duration: 0.18 }}
              className="absolute left-3 right-3 mt-1 rounded-xl overflow-hidden z-20"
              style={{ background: "rgba(8,8,20,0.98)", border: "1px solid rgba(255,255,255,0.09)", backdropFilter: "blur(16px)" }}>
              {workspaces.map((w) => (
                <button key={w.id} onClick={() => { setWorkspace(w); setWsDropOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-white/[0.05]"
                  style={{ background: workspace?.id === w.id ? "rgba(139,92,246,0.08)" : "transparent" }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: w.color, boxShadow: `0 0 6px ${w.color}` }} />
                  <span className="text-[13px]" style={{ color: workspace?.id === w.id ? "#C4B5FD" : "#A0A0B8" }}>{w.name}</span>
                  {workspace?.id === w.id && <span className="ml-auto text-[10px]" style={{ color: "#8B5CF6" }}>✓</span>}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto">
        <NavSection label="Main">
          {mainNav.map((item) => <NavItem key={item.to} {...item} active={loc.pathname === item.to} onClick={closeMobile} />)}
        </NavSection>
        <NavSection label="Manage">
          {manageNav.map((item) => <NavItem key={item.to} {...item} active={loc.pathname === item.to} onClick={closeMobile} />)}
        </NavSection>

        {recentSessions.length > 0 && (
          <div className="px-3 mb-4">
            <div className="px-3 text-[10px] uppercase tracking-[0.12em] mb-1.5 font-medium" style={{ color: "#3A3A4A" }}>Recent Chats</div>
            <div className="flex flex-col gap-0.5">
              {recentSessions.map((s) => (
                <Link key={s.id} to="/" onClick={() => { setActiveSessionId(s.id); closeMobile(); }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-[12px] truncate"
                  style={{ background: activeSessionId === s.id ? "rgba(139,92,246,0.10)" : "transparent", color: activeSessionId === s.id ? "#C4B5FD" : "#9A99AA" }}>
                  <MessageSquare size={12} className="shrink-0" />
                  <span className="truncate">{s.title || "New Chat"}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 relative">
        <AnimatePresence>
          {userMenuOpen && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-full left-3 right-3 mb-2 rounded-xl overflow-hidden"
              style={{ background: "rgba(8,8,20,0.98)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(16px)" }}>
              {isHR && (
                <Link to="/hr-dashboard"
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-[12.5px] hover:bg-white/[0.06] transition-colors"
                  style={{ color: "#8B5CF6" }}
                  onClick={() => { setUserMenuOpen(false); closeMobile(); }}>
                  🛡️ HR Dashboard
                </Link>
              )}
              <button onClick={() => { setUserMenuOpen(false); signOut(); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-[12.5px] hover:bg-white/[0.06] transition-colors"
                style={{ color: "#C0C0D0" }}>
                <LogOut size={13} /> Sign out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <button onClick={() => setUserMenuOpen((o) => !o)}
          className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-[12px] font-semibold flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#4C1D95,#8B5CF6)" }}>{fullInitials}</div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-[12.5px] text-white truncate font-medium">{displayName}</div>
            <div className="text-[11px]" style={{ color: isHR ? "#8B5CF6" : "#7A798A" }}>{role}</div>
          </div>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden lg:flex w-[220px] shrink-0 flex-col h-screen"
        style={{ background: "var(--sidebar-bg)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRight: "1px solid var(--sidebar-border)", transition: "background 0.4s ease, border-color 0.4s ease" }}>
        {content}
      </aside>

      {/* Mobile drawer + backdrop */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
            onClick={closeMobile} />
        )}
      </AnimatePresence>
      <motion.aside
        className="lg:hidden fixed inset-y-0 left-0 z-50 w-[260px] max-w-[80vw] flex flex-col h-screen"
        style={{ background: "var(--sidebar-bg)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRight: "1px solid var(--sidebar-border)", transition: "background 0.4s ease, border-color 0.4s ease" }}
        initial={{ x: "-100%" }}
        animate={{ x: mobileMenuOpen ? 0 : "-100%" }}
        transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}>
        {content}
      </motion.aside>
    </>
  );
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-3 mb-4">
      <div className="px-3 text-[10px] uppercase tracking-[0.12em] mb-1.5 font-medium" style={{ color: "#3A3A4A" }}>{label}</div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function NavItem({ to, label, icon: Icon, active, onClick }: { to: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; active?: boolean; onClick?: () => void }) {
  return (
    <Link to={to} onClick={onClick} className="group relative flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors"
      style={{ background: active ? "rgba(139,92,246,0.10)" : "transparent", color: active ? "#C4B5FD" : "#C4C3D2" }}>
      <motion.span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full origin-top"
        style={{ background: "linear-gradient(180deg, #8B5CF6, #6D28D9)" }}
        initial={false} animate={{ scaleY: active ? 1 : 0 }} transition={{ duration: 0.2 }} />
      <Icon size={15} className="relative" />
      <span className="text-[13px] relative flex-1">{label}</span>
    </Link>
  );
}
