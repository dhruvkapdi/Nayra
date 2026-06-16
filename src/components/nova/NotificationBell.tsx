import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, FileText, Megaphone, Info, Check } from "lucide-react";
import { useNova } from "./NovaContext";
import { supabase } from "@/integrations/supabase/client";

type Notification = {
  id: string;
  type: "announcement" | "document_upload" | "system";
  title: string;
  message: string | null;
  created_at: string;
  read: boolean;
};

export function NotificationBell() {
  const { user } = useNova();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: notifs } = await supabase
      .from("notifications")
      .select("id, type, title, message, created_at")
      .order("created_at", { ascending: false })
      .limit(30);

    const { data: reads } = await supabase
      .from("notification_reads")
      .select("notification_id")
      .eq("user_id", user.id);

    const readSet = new Set((reads ?? []).map((r) => r.notification_id));
    setItems((notifs ?? []).map((n) => ({ ...n, read: readSet.has(n.id) } as Notification)));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Realtime: refetch on new notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        fetchNotifications();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifications]);

  const unreadCount = items.filter((i) => !i.read).length;

  const markAsRead = async (id: string) => {
    if (!user) return;
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, read: true } : i));
    await supabase.from("notification_reads").upsert({ notification_id: id, user_id: user.id });
  };

  const markAllRead = async () => {
    if (!user) return;
    const unread = items.filter((i) => !i.read);
    if (unread.length === 0) return;
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    await supabase.from("notification_reads").upsert(unread.map((i) => ({ notification_id: i.id, user_id: user.id })));
  };

  const iconFor = (type: Notification["type"]) => {
    if (type === "announcement") return <Megaphone size={14} />;
    if (type === "document_upload") return <FileText size={14} />;
    return <Info size={14} />;
  };

  const colorFor = (type: Notification["type"]) => {
    if (type === "announcement") return "#8B5CF6";
    if (type === "document_upload") return "#10B981";
    return "#38BDF8";
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)}
        className="relative p-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
        style={{ color: "#C0C0D5" }}>
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-[3px] rounded-full flex items-center justify-center text-[9px] font-bold text-white"
            style={{ background: "#EF4444", boxShadow: "0 0 6px rgba(239,68,68,0.6)" }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-[320px] max-w-[90vw] rounded-2xl overflow-hidden z-50"
              style={{ background: "rgba(8,8,20,0.97)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(24px)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-[13px] font-semibold" style={{ color: "#E0E0F0" }}>Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] transition-colors hover:text-white"
                    style={{ color: "#8B5CF6" }}>
                    <Check size={11} /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-[380px] overflow-y-auto">
                {loading ? (
                  <div className="px-4 py-8 text-center text-[12px]" style={{ color: "#606070" }}>Loading…</div>
                ) : items.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[12px]" style={{ color: "#606070" }}>
                    No notifications yet.
                  </div>
                ) : (
                  items.map((n) => (
                    <button key={n.id} onClick={() => markAsRead(n.id)}
                      className="w-full flex items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: n.read ? "transparent" : "rgba(139,92,246,0.04)" }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: `${colorFor(n.type)}18`, color: colorFor(n.type) }}>
                        {iconFor(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12.5px] font-medium truncate" style={{ color: "#E0E0F0" }}>{n.title}</span>
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#8B5CF6" }} />}
                        </div>
                        {n.message && <p className="text-[11.5px] mt-0.5 leading-snug" style={{ color: "#7A798A" }}>{n.message}</p>}
                        <span className="text-[10px] mt-1 block" style={{ color: "#404055" }}>{timeAgo(n.created_at)}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
