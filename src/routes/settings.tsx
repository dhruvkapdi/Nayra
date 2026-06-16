import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LogOut, Save, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "@/components/nova/Sidebar";
import { Topbar } from "@/components/nova/Topbar";
import { useNova } from "@/components/nova/NovaContext";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Nayra — Settings" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, authLoading, workspace, signOut, userProfile, bgTheme, setBgTheme } = useNova();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [nameLoaded, setNameLoaded] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) nav({ to: "/login" });
  }, [user, authLoading, nav]);

  // Use userProfile from context first (immediate), then fetch from DB
  useEffect(() => {
    if (userProfile?.full_name && !nameLoaded) {
      setName(userProfile.full_name);
      setNameLoaded(true);
    }
  }, [userProfile, nameLoaded]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, created_at")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setName(data.full_name);
        setCreatedAt(data?.created_at ?? null);
        setNameLoaded(true);
      });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  };

  const out = async () => {
    await signOut();
    nav({ to: "/login" });
  };

  return (
    <div className="flex h-screen overflow-hidden relative z-[1]">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <div className="flex-1 overflow-y-auto px-3 sm:px-8 py-4 sm:py-6">
          <div className="max-w-[760px] mx-auto space-y-5">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display font-bold text-[24px] text-white"
            >
              Workspace Settings
            </motion.h1>

            <Section title="Profile">
              <label className="block text-[11px] text-[#7A798A] mb-1.5">Full Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent text-[13px] text-white px-3 py-2 rounded-lg outline-none glass mb-3"
              />
              <label className="block text-[11px] text-[#7A798A] mb-1.5">Email</label>
              <input
                value={user?.email ?? ""}
                readOnly
                className="w-full bg-transparent text-[13px] text-white/60 px-3 py-2 rounded-lg outline-none glass mb-4 cursor-not-allowed"
              />
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-bg text-white text-[12.5px] font-medium disabled:opacity-50"
              >
                <Save size={13} /> {saving ? "Saving…" : "Save Changes"}
              </motion.button>
            </Section>

            <Section title="Appearance">
              <p className="text-[12.5px] text-[#7A798A] mb-4">
                Choose a background theme — applies instantly across the app.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {THEMES.map((t) => (
                  <ThemeCard key={t.id} theme={t} active={bgTheme === t.id} onClick={() => setBgTheme(t.id)} />
                ))}
              </div>
            </Section>

            <Section title="Workspace">
              <div className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: workspace?.color ?? "#7C6EF8" }}
                />
                <div className="text-[14px] text-white font-medium">{workspace?.name ?? "—"}</div>
              </div>
              <div className="text-[11px] text-[#7A798A] mt-2">
                Joined{" "}
                {createdAt
                  ? new Date(createdAt).toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"}
              </div>
            </Section>

            <Section title="Account">
              <button
                onClick={out}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12.5px] text-white/90 glass hover:text-white transition-colors"
              >
                <LogOut size={13} /> Sign Out
              </button>
            </Section>

            <Section title="Danger Zone" danger>
              <p className="text-[12.5px] text-[#7A798A] mb-3">
                Permanently delete your account and all associated data. This cannot be undone.
              </p>
              <button
                onClick={() => setConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12.5px] font-medium transition-colors"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#EF4444",
                }}
              >
                <AlertTriangle size={13} /> Delete Account
              </button>
            </Section>
          </div>
        </div>
      </main>

      {confirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
          onClick={() => setConfirm(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[420px] p-6 rounded-2xl glass"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-[18px] text-white">Delete Account?</h3>
              <button onClick={() => setConfirm(false)} className="text-white/50 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <p className="text-[12.5px] text-[#7A798A] mb-5">
              Account deletion requires admin action. Please contact your workspace administrator to permanently
              remove your account.
            </p>
            <button
              onClick={() => {
                setConfirm(false);
                toast.info("Please contact your admin to delete your account.");
              }}
              className="w-full py-2.5 rounded-xl text-white text-[13px] font-medium"
              style={{
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.4)",
                color: "#EF4444",
              }}
            >
              Understood
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

const THEMES: { id: string; name: string; tagline: string; gradient: string; accent: string }[] = [
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

function ThemeCard({ theme, active, onClick }: { theme: (typeof THEMES)[number]; active: boolean; onClick: () => void }) {
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

function Section({
  title,
  children,
  danger = false,
}: {
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl glass"
      style={danger ? { borderColor: "rgba(239,68,68,0.25)" } : undefined}
    >
      <h2
        className="font-display font-bold text-[14px] mb-4"
        style={{ color: danger ? "#EF4444" : "#F0EFF8" }}
      >
        {title}
      </h2>
      {children}
    </motion.div>
  );
}
