// This shared config wraps Vite + TanStack Start + Tailwind + Nitro build setup.
// It already includes: tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro
// (build-only, cloudflare target by default), dev-only component tagger,
// VITE_* env injection, @ path alias, React/TanStack dedupe, error logger
// plugins, and sandbox detection (port/host/strictPort).
// Do NOT add these plugins manually — duplicates will break the app.
// Additional config can be passed via defineConfig({ vite: { ... }, ... }).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Force-enable the nitro deploy plugin (it's normally only auto-enabled
  // inside Lovable's own build sandbox) and target Vercel's output format.
  nitro: { preset: "vercel" },
});
