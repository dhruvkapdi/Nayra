import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { User, ShieldCheck, Cpu, DollarSign, Megaphone } from "lucide-react";
import { Logo } from "@/components/nova/Logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  return <AuthCard mode="login" />;
}

type Role = "Employee" | "HR Admin";
type Workspace = "Engineering" | "Finance" | "Marketing";

const HR_EMAIL = "dhruvkapdi007@gmail.com";

export function AuthCard({ mode, forceRole }: { mode: "login" | "signup"; forceRole?: "Employee" }) {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>(forceRole ?? "Employee");
  const [workspace, setWorkspace] = useState<Workspace>("Engineering");

  // Check if this employee has logged in before (has saved workspace)
  const hasExistingWorkspace = typeof window !== "undefined" && !!localStorage.getItem("nova_workspace");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Block HR on signup
      if (role === "HR Admin" && mode === "signup") {
        toast.error("HR Admin accounts cannot be created here.");
        setLoading(false);
        return;
      }
      // Block unauthorized HR access
      if (role === "HR Admin" && email.toLowerCase().trim() !== HR_EMAIL) {
        toast.error("You are not authorized as HR Admin.");
        setLoading(false);
        return;
      }

      let userId: string | undefined;
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        userId = data.user?.id;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/`, data: { full_name: name } },
        });
        if (error) throw error;
        userId = data.user?.id;
        // Save workspace on first signup
        localStorage.setItem("nova_workspace", workspace);
      }

      localStorage.setItem("nova_role", role);

      // Auto-detect workspace from DB profile on login
      if (mode === "login" && role === "Employee" && userId) {
        const { data: prof } = await supabase.from("profiles").select("workspace_name").eq("id", userId).single();
        if (prof?.workspace_name) localStorage.setItem("nova_workspace", prof.workspace_name);
      }

      // Update profile role in DB
      if (userId) {
        const updateData: Record<string, string> = { role };
        if (name && mode === "signup") updateData.full_name = name;
        if (role === "Employee") {
          // Save which workspace/department this user belongs to
          const ws = mode === "signup" ? workspace : (localStorage.getItem("nova_workspace") || workspace);
          updateData.workspace_name = ws;
        }
        await supabase.from("profiles").update(updateData).eq("id", userId);
      }

      nav({ to: role === "HR Admin" ? "/hr-dashboard" : "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const workspaceOptions: { label: Workspace; icon: React.ReactNode; color: string }[] = [
    { label: "Engineering", icon: <Cpu size={14} />, color: "#8B5CF6" },
    { label: "Finance", icon: <DollarSign size={14} />, color: "#F59E0B" },
    { label: "Marketing", icon: <Megaphone size={14} />, color: "#EC4899" },
  ];

  // Show workspace selector ONLY on signup (first time account creation)
  // On login, system auto-detects department from saved profile
  const showWorkspaceSelector = role === "Employee" && mode === "signup";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative z-[1]">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-[420px] rounded-[20px] overflow-hidden"
        style={{ padding: "28px 20px 24px", background: "rgba(4,4,16,0.82)", backdropFilter: "blur(40px)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 0 0 1px rgba(255,255,255,0.04) inset, 0 40px 120px rgba(0,0,0,0.8), 0 0 80px rgba(88,28,220,0.12)" }}>
        {/* top shine */}
        <div aria-hidden className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)" }} />
        <div aria-hidden className="absolute pointer-events-none"
          style={{ top: -40, right: -40, width: 160, height: 160, background: "radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)" }} />

        <div className="flex flex-col items-center gap-3 mb-5 relative">
          <Logo size={48} />
          <div className="font-display font-bold text-[20px] leading-none" style={{ letterSpacing: "-0.4px" }}>
            <span style={{ color: "#F0F0F5" }}>Nay</span><span style={{ color: "#8B5CF6" }}>ra</span>
          </div>
        </div>

        <h1 className="text-[17px] font-medium text-center" style={{ color: "#E0E0F0" }}>
          {mode === "login" ? "Sign in to your workspace" : "Create your account"}
        </h1>
        <p className="text-[12.5px] text-center mt-1.5 mb-5" style={{ color: "#404055" }}>
          {mode === "login" ? "Choose your role to continue" : "Set up your employee account"}
        </p>

        {/* Role selector — only on login, signup is always Employee */}
        {mode === "login" && !forceRole && (
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <RoleCard label="Employee" sub="Ask & discover" icon={<User size={16} />}
              active={role === "Employee"} onClick={() => setRole("Employee")} />
            <RoleCard label="HR Admin" sub="Manage & control" icon={<ShieldCheck size={16} />}
              active={role === "HR Admin"} onClick={() => setRole("HR Admin")} />
          </div>
        )}

        {/* Workspace selector — only on first-time setup */}
        <AnimatePresence>
          {showWorkspaceSelector && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden mb-4">
              <p className="text-[11px] uppercase tracking-[0.1em] mb-2" style={{ color: "#404055" }}>
                {mode === "signup" ? "Select your department" : "Which department are you in?"}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {workspaceOptions.map((w) => (
                  <button key={w.label} type="button" onClick={() => setWorkspace(w.label)}
                    className="flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl transition-all"
                    style={{ background: workspace === w.label ? `${w.color}18` : "rgba(255,255,255,0.03)", border: `1px solid ${workspace === w.label ? `${w.color}55` : "rgba(255,255,255,0.06)"}`, color: workspace === w.label ? w.color : "#606070" }}>
                    {w.icon}
                    <span className="text-[11px] font-medium">{w.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "#404055" }}>enter credentials</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3 relative">
          {mode === "signup" && (
            <Field label="Full name" type="text" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} required />
          )}
          <Field label="Email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Field label="Password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading}
            className="relative overflow-hidden mt-2 w-full rounded-xl py-2.5 text-[14px] font-medium text-white disabled:opacity-70"
            style={{ background: "linear-gradient(135deg, #4C1D95, #8B5CF6)" }}>
            <span className="relative z-10">{loading ? "Please wait…" : mode === "login" ? "Continue" : "Create Account"}</span>
            <motion.span className="absolute inset-y-0 -left-1/3 w-2/5 -skew-x-12 bg-white/25 pointer-events-none"
              initial={{ x: "-150%" }} whileHover={{ x: "400%" }} transition={{ duration: 0.9 }} />
          </motion.button>
        </form>

        {/* Footer link — hide "Request access" for HR Admin login */}
        {mode === "login" && role !== "HR Admin" && (
          <p className="text-[12.5px] text-center mt-5" style={{ color: "#606070" }}>
            No account?{" "}
            <Link to="/signup" className="hover:underline" style={{ color: "#8B5CF6" }}>Request access</Link>
          </p>
        )}
        {mode === "signup" && (
          <p className="text-[12.5px] text-center mt-5" style={{ color: "#606070" }}>
            Already have an account?{" "}
            <Link to="/login" className="hover:underline" style={{ color: "#8B5CF6" }}>Sign in</Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}

function RoleCard({ label, sub, icon, active, onClick }: { label: string; sub: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-left rounded-xl px-3 py-2.5 transition-all"
      style={{ background: active ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${active ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.06)"}`, boxShadow: active ? "inset 0 0 0 1px rgba(139,92,246,0.15)" : "none" }}>
      <div className="flex items-center gap-2 mb-0.5" style={{ color: active ? "#C4B5FD" : "#A0A0B0" }}>
        {icon}
        <span className="text-[12.5px] font-medium">{label}</span>
      </div>
      <div className="text-[11px]" style={{ color: "#606070" }}>{sub}</div>
    </button>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.1em]" style={{ color: "#404055" }}>{label}</span>
      <input {...props}
        className="rounded-xl px-3.5 py-2.5 text-[13px] outline-none transition-all"
        style={{ color: "#E0E0F0", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", caretColor: "#8B5CF6" }}
        onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(139,92,246,0.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.08)"; }}
        onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "none"; }} />
    </label>
  );
}
