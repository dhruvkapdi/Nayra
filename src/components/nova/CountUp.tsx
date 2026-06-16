import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function CountUp({ to, duration = 1000, suffix = "" }: { to: number; duration?: number; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setN(Math.floor(p * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return (
    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {n.toLocaleString()}
      {suffix}
    </motion.span>
  );
}
