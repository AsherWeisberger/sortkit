import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/sortkit/",
  build: {
    outDir: "docs",
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 4000,
    target: "esnext",
  },
  preview: { port: 4240, host: "127.0.0.1", strictPort: true },
  server: { port: 5240, host: "127.0.0.1", strictPort: true },
  optimizeDeps: {
    include: ["pdfjs-dist", "pdf-lib", "jszip"],
  },
  worker: { format: "es" },
});
