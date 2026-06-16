import { motion } from "framer-motion";
import { Plus, Menu } from "lucide-react";
import { useNova } from "./NovaContext";
import { NotificationBell } from "./NotificationBell";
import type { ReactNode } from "react";

export function Topbar({ right, onNewChat }: { right?: ReactNode; onNewChat?: () => void }) {
  const { workspace, userProfile, setMobileMenuOpen } = useNova();
  const isHR = userProfile?.role === "HR Admin";

  return (
    <div className="h-[54px] shrink-0 flex items-center justify-between px-3 sm:px-6 gap-2"
      style={{ background: "var(--topbar-bg)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid var(--sidebar-border)", transition: "background 0.4s ease, border-color 0.4s ease" }}>
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden p-1.5 -ml-1 rounded-lg transition-colors hover:bg-white/[0.06] flex-shrink-0"
          style={{ color: "#C0C0D5" }}>
          <Menu size={18} />
        </button>
        <span className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: workspace?.color ?? "#7C6EF8", boxShadow: `0 0 10px ${workspace?.color ?? "#7C6EF8"}` }} />
        <h2 className="font-display font-bold text-[14px] sm:text-[15px] text-white truncate">{workspace?.name ?? "Workspace"}</h2>
        <span className="text-[12px] text-[#7A798A] hidden sm:inline">/ Knowledge Workspace</span>
        {isHR && (
          <span className="text-[10px] px-2 py-0.5 rounded-full hidden sm:inline-block flex-shrink-0"
            style={{ background: "rgba(139,92,246,0.12)", color: "#C4B5FD", border: "1px solid rgba(139,92,246,0.25)" }}>
            HR Admin
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {right}
        <NotificationBell />
        {onNewChat && (
          <motion.button onClick={onNewChat} whileTap={{ scale: 0.97 }}
            className="relative overflow-hidden flex items-center gap-1.5 text-[12px] sm:text-[12.5px] text-white px-3 sm:px-3.5 py-1.5 rounded-lg gradient-bg font-medium group">
            <Plus size={13} /> <span className="hidden sm:inline">New Chat</span>
            <motion.span className="absolute inset-y-0 -left-1/2 w-2/5 -skew-x-12 bg-white/30 pointer-events-none"
              initial={{ x: "-150%" }} whileHover={{ x: "350%" }} transition={{ duration: 0.8 }} />
          </motion.button>
        )}
      </div>
    </div>
  );
}
