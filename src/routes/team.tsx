import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, Mail, X } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "@/components/nova/Sidebar";
import { Topbar } from "@/components/nova/Topbar";
import { useNova } from "@/components/nova/NovaContext";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/team")({
  head: () => ({ meta: [{ title: "Nayra — Team" }] }),
  component: TeamPage,
});

type Profile = { id: string; full_name: string | null; email: string | null; role: string | null; created_at: string | null; };

function TeamPage() {
  const { user, authLoading } = useNova();
  const nav = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => { if (!authLoading && !user) nav({ to: "/login" }); }, [user, authLoading, nav]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("id, full_name, email, role, created_at")
      .eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfile(data as Profile));
  }, [user]);

  const initials = (profile?.full_name || user?.email || "U").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "You";
  const displayEmail = profile?.email || user?.email || "";
  // Always show actual role from DB — never hardcode "Admin"
  const displayRole = profile?.role === "HR Admin" ? "HR Admin" : "Employee";

  const invite = () => {
    if (!email.includes("@")) { toast.error("Enter a valid email"); return; }
    toast.success(`Invite sent to ${email}!`);
    setEmail(""); setOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden relative z-[1]">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <div className="flex-1 overflow-y-auto px-3 sm:px-8 py-4 sm:py-6">
          <div className="max-w-[760px] mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="font-display font-bold text-[24px] mb-1" style={{ color: "#E0E0F0" }}>Team</motion.h1>
                <p className="text-[13px]" style={{ color: "#606070" }}>Your workspace membership.</p>
              </div>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-[12.5px] font-medium"
                style={{ background: "linear-gradient(135deg,#4C1D95,#8B5CF6)" }}>
                <UserPlus size={14} /> Invite Member
              </motion.button>
            </div>

            <h2 className="text-[11px] uppercase tracking-[0.12em] mb-3" style={{ color: "#404055" }}>Your Profile</h2>
            <MemberCard initials={initials} name={displayName} email={displayEmail} role={displayRole} joined={profile?.created_at ?? null} />

            <h2 className="text-[11px] uppercase tracking-[0.12em] mt-8 mb-3" style={{ color: "#404055" }}>Workspace</h2>
            <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-[13px]" style={{ color: "#A0A0B8" }}>
                You are a member of the <strong style={{ color: "#E0E0F0" }}>{displayRole}</strong> workspace.
                Contact your HR Admin to manage workspace members or upload documents.
              </p>
            </div>
          </div>
        </div>
      </main>

      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }}
          onClick={() => setOpen(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[400px] p-6 rounded-2xl"
            style={{ background: "rgba(8,8,20,0.95)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-[18px]" style={{ color: "#E0E0F0" }}>Invite Member</h3>
              <button onClick={() => setOpen(false)} style={{ color: "#606070" }}><X size={16} /></button>
            </div>
            <label className="block text-[11px] uppercase tracking-wider mb-1.5" style={{ color: "#404055" }}>Email</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-4"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Mail size={14} style={{ color: "#8B5CF6" }} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && invite()}
                placeholder="teammate@company.com"
                className="flex-1 bg-transparent outline-none text-[13px]" style={{ color: "#E0E0F0" }} />
            </div>
            <button onClick={invite}
              className="w-full py-2.5 rounded-xl text-white text-[13px] font-medium"
              style={{ background: "linear-gradient(135deg,#4C1D95,#8B5CF6)" }}>
              Send Invite
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function MemberCard({ initials, name, email, role, joined }: { initials: string; name: string; email: string; role: string; joined: string | null; }) {
  const isEmployee = role === "Employee";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl flex items-center gap-4"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[13px] font-bold text-white shrink-0"
        style={{ background: "linear-gradient(135deg,#4C1D95,#8B5CF6)" }}>{initials}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium truncate" style={{ color: "#E0E0F0" }}>{name}</div>
        <div className="text-[12px] truncate" style={{ color: "#606070" }}>{email}</div>
      </div>
      <div className="text-right shrink-0">
        <span className="text-[10.5px] px-2.5 py-1 rounded-full"
          style={{
            background: isEmployee ? "rgba(139,92,246,0.1)" : "rgba(16,185,80,0.1)",
            border: `1px solid ${isEmployee ? "rgba(139,92,246,0.25)" : "rgba(16,185,80,0.25)"}`,
            color: isEmployee ? "#C4B5FD" : "#10B981",
          }}>{role}</span>
        <div className="text-[11px] mt-1.5" style={{ color: "#404055" }}>
          {joined ? new Date(joined).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : ""}
        </div>
      </div>
    </motion.div>
  );
}
