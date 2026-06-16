import { motion } from "framer-motion";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useNova } from "./NovaContext";

export function PlaceholderPage({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  const { user, authLoading } = useNova();
  const nav = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) nav({ to: "/login" });
  }, [user, authLoading, nav]);

  return (
    <div className="flex h-screen overflow-hidden relative z-[1]">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <div className="flex-1 overflow-y-auto px-8 py-6 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-[480px] p-10 rounded-2xl glass"
          >
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 20px rgba(124,110,248,0.35)",
                  "0 0 40px rgba(45,212,191,0.35)",
                  "0 0 20px rgba(124,110,248,0.35)",
                ],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-14 h-14 rounded-2xl gradient-bg mx-auto mb-5 flex items-center justify-center"
            >
              <Icon size={26} className="text-white" />
            </motion.div>
            <h1 className="font-display font-bold text-[26px] gradient-text mb-2">{title}</h1>
            <p className="text-[13.5px] text-[#7A798A] leading-relaxed">{description}</p>
            <div className="mt-6 inline-block text-[11px] uppercase tracking-[0.14em] text-[#A78BFA] px-3 py-1.5 rounded-full glass">
              Coming soon
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
