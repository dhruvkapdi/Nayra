import { motion } from "framer-motion";

/**
 * Nayra logo — rounded chat bubble with 3 dots, purple gradient stroke.
 */
export function Logo({ size = 36, withGlow = true }: { size?: number; withGlow?: boolean }) {
  const radius = Math.round(size * 0.28);
  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      {withGlow && (
        <motion.div
          aria-hidden
          className="absolute pointer-events-none rounded-[20px]"
          style={{
            inset: -5,
            background: "radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 70%)",
          }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: "linear-gradient(135deg, rgba(76,29,149,0.55), rgba(8,8,20,0.6))",
          border: "1px solid rgba(196,181,253,0.35)",
          boxShadow: "0 2px 12px rgba(76,29,149,0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        <svg viewBox="0 0 40 40" width={Math.round(size * 0.72)} height={Math.round(size * 0.72)}>
          <defs>
            <linearGradient id="novaBubbleGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#C4B5FD" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
          {/* Speech bubble with tail bottom-left */}
          <path
            d="M10 6 H30 Q34 6 34 10 V24 Q34 28 30 28 H16 L10 33 V28 Q6 28 6 24 V10 Q6 6 10 6 Z"
            fill="none"
            stroke="url(#novaBubbleGrad)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* 3 dots */}
          <circle cx="14" cy="17" r="2" fill="url(#novaBubbleGrad)" />
          <circle cx="20" cy="17" r="2" fill="url(#novaBubbleGrad)" />
          <circle cx="26" cy="17" r="2" fill="url(#novaBubbleGrad)" />
        </svg>
      </div>
    </div>
  );
}

export function LogoWordmark({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <Logo size={size} />
      <div
        className="font-display font-bold leading-none"
        style={{ letterSpacing: "-0.4px", fontSize: Math.round(size * 0.55) }}
      >
        <span style={{ color: "#F0F0F5" }}>Nay</span>
        <span style={{ color: "#8B5CF6" }}>ra</span>
      </div>
    </div>
  );
}
