import { useEffect } from "react";
import { useNova } from "./NovaContext";

// Cinematic background with drifting glow orbs + grain texture for depth.
// Supports 12 selectable themes (set via Settings page, persisted in NovaContext).
export function AuroraBackground() {
  const { bgTheme } = useNova();

  // Apply theme on <html> so sidebar/topbar/cards can use CSS vars globally
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", bgTheme);
  }, [bgTheme]);

  return (
    <div className="app-bg" data-theme={bgTheme} suppressHydrationWarning aria-hidden>
      <div className="orb-1" />
      <div className="orb-2" />
      <div className="orb-3" />
      <div className="grid-pattern" />
      <div className="grain" />
      {bgTheme === "aurora" && <div className="ribbon" />}
      {bgTheme === "cyber" && <div className="scanline" />}
      {bgTheme === "horizon" && (
        <>
          <div className="star star-1" />
          <div className="star star-2" />
          <div className="star star-3" />
          <div className="star star-4" />
        </>
      )}
      {bgTheme === "obsidian" && (
        <>
          <div className="spark spark-1" />
          <div className="spark spark-2" />
          <div className="spark spark-3" />
          <div className="spark spark-4" />
        </>
      )}
      {bgTheme === "nebula" && (
        <>
          <div className="nebula-cloud nebula-cloud-1" />
          <div className="nebula-cloud nebula-cloud-2" />
        </>
      )}
    </div>
  );
}
