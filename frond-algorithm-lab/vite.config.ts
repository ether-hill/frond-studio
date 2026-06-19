import { defineConfig } from "vite";

// Minimal Vite config — fast HMR is the priority. No SSR, no framework plugin.
export default defineConfig({
  server: { open: true },
});
