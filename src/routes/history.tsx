import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Trash2, MessageSquare, History as HistoryIcon } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "@/components/nova/Sidebar";
import { Topbar } from "@/components/nova/Topbar";
import { useNova } from "@/components/nova/NovaContext";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "Nayra — History" }] }),
  component: HistoryPage,
});

type Row = {
  id: string;
  title: string | null;
  workspace_id: string | null;
  created_at: string | null;
  message_count: number;
};

function HistoryPage() {
  const { user, authLoading, workspaces, sessions, refetchSessions, setActiveSessionId } = useNova();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!authLoading && !user) nav({ to: "/login" });
  }, [user, authLoading, nav]);

  useEffect(() => {
    if (!user || sessions.length === 0) return;
    const ids = sessions.map((s) => s.id);
    supabase
      .from("messages")
      .select("session_id")
      .in("session_id", ids)
      .then(({ data }) => {
        const m: Record<string, number> = {};
        (data ?? []).forEach((r: any) => {
          m[r.session_id] = (m[r.session_id] ?? 0) + 1;
        });
        setCounts(m);
      });
  }, [user, sessions]);

  const rows: Row[] = useMemo(
    () =>
      sessions.map((s) => ({
        id: s.id,
        title: s.title,
        workspace_id: s.workspace_id,
        created_at: s.created_at,
        message_count: counts[s.id] ?? 0,
      })),
    [sessions, counts],
  );

  const filtered = useMemo(
    () => rows.filter((r) => (r.title ?? "Untitled").toLowerCase().includes(q.toLowerCase())),
    [rows, q],
  );

  const open = (id: string) => {
    setActiveSessionId(id);
    nav({ to: "/" });
  };

  const del = async (id: string) => {
    await supabase.from("messages").delete().eq("session_id", id);
    const { error } = await supabase.from("chat_sessions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Session deleted");
    refetchSessions();
  };

  const wsById = (id: string | null) => workspaces.find((w) => w.id === id);

  return (
    <div className="flex h-screen overflow-hidden relative z-[1]">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <div className="flex-1 overflow-y-auto px-3 sm:px-8 py-4 sm:py-6">
          <div className="max-w-[1000px] mx-auto">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display font-bold text-[24px] text-white mb-1"
            >
              Conversation History
            </motion.h1>
            <p className="text-[13px] text-[#7A798A] mb-6">All your chat sessions across every workspace.</p>

            <div className="relative mb-5">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A798A]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search sessions…"
                className="w-full bg-transparent text-[13px] text-white pl-9 pr-3 py-2.5 rounded-lg outline-none glass"
              />
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-20 text-[13px] text-[#7A798A]">
                <HistoryIcon size={40} className="mx-auto mb-3 opacity-40" />
                {sessions.length === 0 ? "No sessions yet — start a chat to see history here." : "No sessions match your search."}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AnimatePresence>
                  {filtered.map((r) => {
                    const ws = wsById(r.workspace_id);
                    return (
                      <motion.div
                        key={r.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        whileHover={{ y: -2, boxShadow: "0 12px 40px rgba(45,212,191,0.15)" }}
                        onClick={() => open(r.id)}
                        className="p-4 rounded-xl glass cursor-pointer group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <MessageSquare size={14} className="text-[#A78BFA] shrink-0" />
                            <div className="text-[13.5px] text-white font-medium truncate">{r.title ?? "Untitled"}</div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              del(r.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-3 text-[11px] text-[#7A798A]">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ background: ws?.color ?? "#7C6EF8" }}
                            />
                            <span>{ws?.name ?? "—"}</span>
                          </div>
                          <span>{r.message_count} msgs</span>
                          <span>
                            {r.created_at
                              ? new Date(r.created_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "2-digit",
                                })
                              : ""}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
