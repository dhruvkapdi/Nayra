import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Workspace = { id: string; name: string; color: string };
export type ChatSession = { id: string; title: string | null; workspace_id: string | null; created_at: string | null };

interface NovaCtx {
  user: User | null;
  authLoading: boolean;
  userProfile: { full_name: string | null; role: string | null; email: string | null } | null;
  workspaces: Workspace[];
  workspace: Workspace | null;
  setWorkspace: (w: Workspace) => void;
  sessions: ChatSession[];
  refetchSessions: () => Promise<void>;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  docCount: number;
  refetchDocCount: () => Promise<void>;
  signOut: () => Promise<void>;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
  bgTheme: string;
  setBgTheme: (v: string) => void;
}

const Ctx = createContext<NovaCtx | null>(null);

export function NovaProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ full_name: string | null; role: string | null; email: string | null } | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspace, setWorkspaceState] = useState<Workspace | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [docCount, setDocCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bgTheme, setBgThemeState] = useState<string>(() => {
    if (typeof window === "undefined") return "violet";
    return localStorage.getItem("nova_bg_theme") ?? "violet";
  });

  const setBgTheme = useCallback((v: string) => {
    setBgThemeState(v);
    localStorage.setItem("nova_bg_theme", v);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load profile (full_name, role, email)
  useEffect(() => {
    if (!user) { setUserProfile(null); return; }
    supabase.from("profiles").select("full_name, role, email").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        setUserProfile({
          full_name: data?.full_name ?? null,
          role: data?.role ?? "Employee",
          email: data?.email ?? user.email ?? null,
        });
      });
  }, [user]);

  // Load workspaces and set correct one based on DB profile (always trust DB over localStorage)
  useEffect(() => {
    if (!user) { setWorkspaces([]); setWorkspaceState(null); setSessions([]); setActiveSessionId(null); setDocCount(0); return; }
    supabase.from("workspaces").select("id, name, color").order("created_at", { ascending: true })
      .then(async ({ data }) => {
        if (!data) return;
        // Include 'All' workspace for HR but filter it from employee switcher
        const ws = data.map((w) => ({ id: w.id, name: w.name, color: w.color ?? "#7C6EF8" }))
          .filter((w) => w.name !== "All"); // Always filter 'All' from switcher
        setWorkspaces(ws);

        // Always fetch workspace from DB profile first (most accurate)
        const { data: prof } = await supabase.from("profiles")
          .select("workspace_name, role").eq("id", user.id).maybeSingle();

        if (prof?.role === "HR Admin") {
          // HR defaults to Engineering for chat view
          const eng = ws.find((w) => w.name === "Engineering") ?? ws[0];
          setWorkspaceState((cur) => cur ?? eng ?? null);
        } else {
          // Employee: always use DB workspace_name
          const dbWsName = prof?.workspace_name;
          if (dbWsName) {
            localStorage.setItem("nova_workspace", dbWsName); // keep in sync
            const matched = ws.find((w) => w.name === dbWsName);
            setWorkspaceState(matched ?? ws[0] ?? null);
          } else {
            const savedName = localStorage.getItem("nova_workspace");
            const matched = savedName ? ws.find((w) => w.name === savedName) : null;
            setWorkspaceState(matched ?? ws[0] ?? null);
          }
        }
      });
  }, [user]);

  const setWorkspace = useCallback((w: Workspace) => {
    setWorkspaceState(w);
    localStorage.setItem("nova_workspace", w.name);
  }, []);

  const refetchSessions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("chat_sessions").select("id, title, workspace_id, created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false });
    setSessions(data ?? []);
  }, [user]);

  useEffect(() => { refetchSessions(); }, [refetchSessions]);

  const refetchDocCount = useCallback(async () => {
    if (!user || !workspace) return;
    const ALL_WS_ID = "00000000-0000-0000-0000-000000000001";
    const { count } = await supabase.from("documents").select("*", { count: "exact", head: true })
      .or(`workspace_id.eq.${workspace.id},workspace_id.eq.${ALL_WS_ID}`);
    setDocCount(count ?? 0);
  }, [user, workspace]);

  useEffect(() => { refetchDocCount(); }, [refetchDocCount]);

  useEffect(() => {
    if (!user || !workspace) return;
    const ch = supabase.channel(`docs-count-${workspace.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "documents", filter: `workspace_id=eq.${workspace.id}` }, () => refetchDocCount())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, workspace, refetchDocCount]);

  const signOut = useCallback(async () => {
    localStorage.removeItem("nova_role");
    localStorage.removeItem("nova_workspace");
    await supabase.auth.signOut();
  }, []);

  return (
    <Ctx.Provider value={{ user, authLoading, userProfile, workspaces, workspace, setWorkspace, sessions, refetchSessions, activeSessionId, setActiveSessionId, docCount, refetchDocCount, signOut, mobileMenuOpen, setMobileMenuOpen, bgTheme, setBgTheme }}>
      {children}
    </Ctx.Provider>
  );
}

export function useNova() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useNova must be inside NovaProvider");
  return v;
}
