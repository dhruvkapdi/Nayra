import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Paperclip, Mic, Send, Sparkles, FileText, Copy, Check, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "@/components/nova/Sidebar";
import { Topbar } from "@/components/nova/Topbar";
import { Logo } from "@/components/nova/Logo";
import { CountUp } from "@/components/nova/CountUp";
import { useNova } from "@/components/nova/NovaContext";
import { suggestions } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nayra — Chat" },
      { name: "description", content: "Ask your company knowledge base anything." },
    ],
  }),
  component: ChatPage,
});

type Source = { name: string; page: number };
type Msg = { id: string; role: "ai" | "user"; text: string; sources?: Source[]; };

// Simple markdown-like renderer for AI responses
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) { elements.push(<div key={key++} className="h-2" />); continue; }

    // Bold headers like **Languages:**
    const rendered = line.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j} style={{ color: "#E0E0F0", fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    // Bullet points
    if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
      elements.push(
        <div key={key++} className="flex items-start gap-2 my-0.5">
          <span style={{ color: "#8B5CF6", marginTop: 2 }}>•</span>
          <span>{line.trim().slice(2).split(/(\*\*[^*]+\*\*)/).map((p, j) =>
            p.startsWith("**") && p.endsWith("**")
              ? <strong key={j} style={{ color: "#E0E0F0", fontWeight: 600 }}>{p.slice(2, -2)}</strong>
              : p
          )}</span>
        </div>
      );
    } else {
      elements.push(<div key={key++}>{rendered}</div>);
    }
  }
  return elements;
}

function ChatPage() {
  const { user, authLoading, workspace, workspaces, sessions, userProfile, refetchSessions, activeSessionId, setActiveSessionId } = useNova();
  const nav = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [glow, setGlow] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!authLoading && !user) nav({ to: "/login" }); }, [user, authLoading, nav]);

  // Load messages on session change
  useEffect(() => {
    if (!activeSessionId) return;
    let cancelled = false;
    supabase.from("messages").select("id, role, content, sources, created_at")
      .eq("session_id", activeSessionId).order("created_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled || !data) return;
        const loaded: Msg[] = data.map((m) => ({
          id: m.id, role: m.role as "ai" | "user", text: m.content,
          sources: Array.isArray(m.sources) ? (m.sources as unknown as Source[]) : undefined,
        }));
        setMessages((prev) => {
          const temps = prev.filter((p) => p.id.startsWith("temp-"));
          const ids = new Set(loaded.map((l) => l.id));
          return [...loaded, ...temps.filter((t) => !ids.has(t.id))];
        });
      });
    return () => { cancelled = true; };
  }, [activeSessionId]);

  // Realtime
  useEffect(() => {
    if (!activeSessionId) return;
    const ch = supabase.channel(`msgs-${activeSessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `session_id=eq.${activeSessionId}` }, (payload) => {
        const m = payload.new as { id: string; role: string; content: string; sources: unknown };
        setMessages((prev) => {
          if (prev.some((p) => p.id === m.id)) return prev;
          return [...prev, { id: m.id, role: m.role as "ai" | "user", text: m.content, sources: Array.isArray(m.sources) ? (m.sources as Source[]) : undefined }];
        });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeSessionId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing]);

  const ensureSession = async (firstMessage?: string): Promise<string | null> => {
    if (activeSessionId) return activeSessionId;
    if (!user || !workspace) return null;
    const title = firstMessage ? firstMessage.slice(0, 40) : "New Chat";
    const { data, error } = await supabase.from("chat_sessions")
      .insert({ user_id: user.id, workspace_id: workspace.id, title }).select("id").single();
    if (error || !data) { toast.error(error?.message ?? "Failed to start chat"); return null; }
    setActiveSessionId(data.id);
    await refetchSessions();
    return data.id;
  };

  const send = async (text: string) => {
    if (!text.trim() || !user || !workspace) return;
    const sid = await ensureSession(text);
    if (!sid) return;
    setInput("");
    setGlow(true);
    setTimeout(() => setGlow(false), 400);
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, role: "user", text, sources: [] }]);
    const { data: userMsg, error: userErr } = await supabase.from("messages")
      .insert({ session_id: sid, role: "user", content: text, sources: [] }).select("id").single();
    if (userErr) { toast.error(userErr.message); return; }
    if (userMsg?.id) setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, id: userMsg.id } : m));
    setTyping(true);
    let answer = "I couldn't process your question. Please try again.";
    let sources: Source[] = [];
    try {
      const { data, error } = await supabase.functions.invoke("chat", {
        body: { question: text, workspace_id: workspace.id, user_id: user.id, session_id: sid },
      });
      if (error) toast.error(error.message);
      else if (data?.answer) { answer = data.answer; sources = Array.isArray(data.sources) ? data.sources : []; }
    } catch (e: any) { toast.error(e?.message ?? "Chat failed"); }
    const { data: aiRow, error: aiErr } = await supabase.from("messages")
      .insert({ session_id: sid, role: "ai", content: answer, sources }).select("id").single();
    if (aiErr) toast.error(aiErr.message);
    const aiId = aiRow?.id ?? `temp-ai-${Date.now()}`;
    setMessages((prev) => { if (prev.some((m) => m.id === aiId)) return prev; return [...prev, { id: aiId, role: "ai", text: answer, sources }]; });
    setTyping(false);
  };

  const newChat = () => { setActiveSessionId(null); setMessages([]); setTyping(false); };
  const empty = messages.length === 0 && !typing;
  const userName = userProfile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const userInitial = (userProfile?.full_name || user?.email || "U")[0].toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden relative z-[1]">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <Topbar onNewChat={newChat} />
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 flex flex-col min-w-0">
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6"
              style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(139,92,246,0.2) transparent" }}>
              {empty ? (
                <EmptyState userName={userName} onPick={(s) => send(s)} />
              ) : (
                <div className="max-w-[720px] mx-auto flex flex-col gap-4">
                  <AnimatePresence initial={false}>
                    {messages.map((m) => (
                      <MessageBubble key={m.id} msg={m} userInitial={userInitial} />
                    ))}
                  </AnimatePresence>
                  {typing && <TypingIndicator />}
                </div>
              )}
            </div>
            <InputBar value={input} onChange={setInput} onSend={() => send(input)} glow={glow} />
          </div>
          <RightPanel sessionsCount={sessions.length} workspacesCount={workspaces.length} />
        </div>
      </main>
    </div>
  );
}

function MessageBubble({ msg, userInitial }: { msg: Msg; userInitial: string }) {
  const isAi = msg.role === "ai";
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<null | "up" | "down">(null);

  const copy = () => {
    navigator.clipboard.writeText(msg.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied!");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={`flex gap-3 group ${isAi ? "" : "flex-row-reverse"}`}>
      <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-[11px] font-bold text-white"
        style={{ background: isAi ? "linear-gradient(135deg,#4C1D95,#8B5CF6)" : "linear-gradient(135deg,#6D28D9,#A78BFA)" }}>
        {isAi ? <Sparkles size={14} /> : userInitial}
      </div>

      <div className={`flex flex-col gap-1.5 max-w-[85%] sm:max-w-[80%] ${isAi ? "items-start" : "items-end"}`}>
        <div className="text-[10.5px] font-medium mb-0.5" style={{ color: "#404055" }}>
          {isAi ? "Nayra" : "You"}
        </div>

        <div className="px-4 py-3 text-[13.5px] leading-relaxed"
          style={isAi ? {
            background: "rgba(8,8,20,0.7)", backdropFilter: "blur(16px)",
            borderLeft: "2px solid rgba(139,92,246,0.6)",
            border: "1px solid rgba(255,255,255,0.07)", borderLeftWidth: 2,
            borderRadius: "4px 16px 16px 16px", color: "#D0D0E8",
          } : {
            background: "rgba(139,92,246,0.12)", backdropFilter: "blur(12px)",
            border: "1px solid rgba(139,92,246,0.22)",
            borderRadius: "16px 4px 16px 16px", color: "#E0E0F0",
          }}>
          {isAi ? (
            <div className="flex flex-col gap-1">{renderMarkdown(msg.text)}</div>
          ) : msg.text}
        </div>

        {/* Sources */}
        {msg.sources && msg.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {msg.sources.map((s, i) => (
              <motion.span key={`${s.name}-${i}`} whileHover={{ scale: 1.03 }}
                className="text-[11px] px-2.5 py-1 rounded-full cursor-pointer flex items-center gap-1.5"
                style={{ background: "rgba(16,185,80,0.07)", border: "1px solid rgba(16,185,80,0.2)", color: "#34D399", backdropFilter: "blur(8px)" }}>
                <FileText size={10} />
                {s.name.length > 20 ? s.name.slice(0, 20) + "…" : s.name} · p.{s.page}
              </motion.span>
            ))}
          </div>
        )}

        {/* AI message actions */}
        {isAi && (
          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity mt-0.5">
            <ActionBtn onClick={copy} title="Copy">{copied ? <Check size={11} /> : <Copy size={11} />}</ActionBtn>
            <ActionBtn onClick={() => { setLiked("up"); toast.success("Thanks for the feedback!"); }} title="Good response"
              active={liked === "up"}><ThumbsUp size={11} /></ActionBtn>
            <ActionBtn onClick={() => { setLiked("down"); toast.info("Got it, we'll improve!"); }} title="Bad response"
              active={liked === "down"}><ThumbsDown size={11} /></ActionBtn>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ActionBtn({ onClick, title, children, active }: { onClick: () => void; title: string; children: React.ReactNode; active?: boolean }) {
  return (
    <button onClick={onClick} title={title}
      className="p-1.5 rounded-lg transition-all hover:bg-white/[0.08]"
      style={{ color: active ? "#8B5CF6" : "#404055" }}>
      {children}
    </button>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center"
        style={{ background: "linear-gradient(135deg,#4C1D95,#8B5CF6)" }}>
        <Sparkles size={14} className="text-white" />
      </div>
      <div className="px-4 py-3 flex items-center gap-2"
        style={{ background: "rgba(8,8,20,0.7)", backdropFilter: "blur(16px)", borderLeft: "2px solid rgba(139,92,246,0.6)", border: "1px solid rgba(255,255,255,0.07)", borderLeftWidth: 2, borderRadius: "4px 16px 16px 16px" }}>
        <span className="text-[12px]" style={{ color: "#606070" }}>Nayra is thinking</span>
        {[0, 1, 2].map((i) => (
          <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]"
            animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ userName, onPick }: { userName: string; onPick: (s: string) => void }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <motion.div key="empty" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="h-full flex flex-col items-center justify-center text-center max-w-[580px] mx-auto py-8 sm:py-12 px-2">
      <Logo size={56} />
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }}
        className="font-display font-bold text-[22px] sm:text-[28px] mt-5 px-2" style={{ color: "#E0E0F0" }}>
        {greeting}, <span style={{ background: "linear-gradient(135deg, #C4B5FD, #8B5CF6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{userName}</span> 👋
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35, duration: 0.5 }}
        className="text-[13.5px] mt-2" style={{ color: "#505060" }}>
        Ask anything about your company documents. I'll cite my sources.
      </motion.p>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-8 w-full">
        {suggestions.map((s) => (
          <motion.button key={s} onClick={() => onPick(s)}
            whileHover={{ y: -2, borderColor: "rgba(139,92,246,0.4)", boxShadow: "0 0 20px rgba(139,92,246,0.15)" }}
            whileTap={{ scale: 0.98 }}
            className="text-left text-[12.5px] px-4 py-3 rounded-xl transition-colors"
            style={{ background: "rgba(8,8,20,0.55)", border: "1px solid rgba(255,255,255,0.09)", backdropFilter: "blur(16px)", color: "#C0C0D5" }}>
            {s}
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}

function InputBar({ value, onChange, onSend, glow }: { value: string; onChange: (v: string) => void; onSend: () => void; glow: boolean; }) {
  return (
    <div className="px-3 sm:px-6 pb-3 sm:pb-5 pt-2 sm:pt-3">
      <div className="max-w-[720px] mx-auto">
        <motion.div
          animate={{ boxShadow: glow ? "0 0 30px rgba(139,92,246,0.4)" : "0 0 0px rgba(139,92,246,0)" }}
          transition={{ duration: 0.35 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
          style={{ background: "rgba(8,8,20,0.7)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)" }}
          onFocus={(e) => (e.currentTarget.style.border = "1px solid rgba(139,92,246,0.4)")}
          onBlur={(e) => (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)")}>
          <button className="p-1.5 transition-colors hover:text-white/80" style={{ color: "rgba(255,255,255,0.3)" }}>
            <Paperclip size={15} />
          </button>
          <input value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSend()}
            placeholder="Ask Nayra about anything in your workspace…"
            className="flex-1 bg-transparent outline-none text-[13.5px] text-white placeholder:text-[#303040] py-1.5"
            style={{ caretColor: "#8B5CF6" }} />
          <button className="p-1.5 transition-colors hover:text-white/80" style={{ color: "rgba(255,255,255,0.3)" }}>
            <Mic size={15} />
          </button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onSend}
            className="p-2 rounded-xl text-white" disabled={!value.trim()}
            style={{ background: value.trim() ? "linear-gradient(135deg,#4C1D95,#8B5CF6)" : "rgba(255,255,255,0.05)", opacity: value.trim() ? 1 : 0.4 }}>
            <Send size={14} />
          </motion.button>
        </motion.div>
        <p className="text-[11px] text-center mt-2" style={{ color: "#252535" }}>
          Responses cite source documents and page numbers.
        </p>
      </div>
    </div>
  );
}

type RecentDoc = { id: string; name: string; size: number | null; status: string | null };

function RightPanel({ sessionsCount, workspacesCount }: { sessionsCount: number; workspacesCount: number }) {
  const { workspace, workspaces, user, docCount } = useNova();
  const [queries, setQueries] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from("chat_sessions").select("id").eq("user_id", user.id).then(async ({ data }) => {
      const ids = (data ?? []).map((s) => s.id);
      if (ids.length === 0) { setQueries(0); return; }
      const { count } = await supabase.from("messages").select("*", { count: "exact", head: true }).in("session_id", ids).eq("role", "user");
      setQueries(count ?? 0);
    });
  }, [user, sessionsCount]);

  const formatSize = (b: number | null) => {
    if (!b) return "—";
    if (b > 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${(b / 1024).toFixed(0)} KB`;
  };

  return (
    <aside className="w-[210px] shrink-0 hidden lg:flex flex-col p-4 gap-3 overflow-y-auto"
      style={{ background: "rgba(4,4,12,0.6)", backdropFilter: "blur(16px)", borderLeft: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Documents", value: docCount },
          { label: "Queries", value: queries },
          { label: "Sessions", value: sessionsCount },
          { label: "Depts", value: workspacesCount },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-xl" style={{ background: "rgba(8,8,20,0.55)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(16px)" }}>
            <div className="text-[9.5px] uppercase tracking-[0.1em] mb-1" style={{ color: "#404055" }}>{s.label}</div>
            <div className="font-display font-bold text-[20px]" style={{ color: "#E0E0F0" }}>
              <CountUp to={s.value} duration={800} />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-3" style={{ background: "rgba(8,8,20,0.55)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(16px)" }}>
        <div className="text-[9.5px] uppercase tracking-[0.12em] mb-2 font-medium" style={{ color: "#404055" }}>Departments</div>
        {workspaces.map((w) => (
          <div key={w.id} className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2">
              <motion.span className="w-1.5 h-1.5 rounded-full" style={{ background: w.color, boxShadow: `0 0 5px ${w.color}` }}
                animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.5, repeat: Infinity }} />
              <span className="text-[12px]" style={{ color: w.id === workspace?.id ? "#E0E0F0" : "#606070" }}>{w.name}</span>
            </div>
          </div>
        ))}
      </div>


    </aside>
  );
}
