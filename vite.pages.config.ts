import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "github-pages",
  base: "/om-universal-operations-dashboard/",
  publicDir: "../public",
  plugins: [react()],
  build: {
    outDir: "../dist-pages",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        format: "iife",
        name: "OMUniversalDashboard",
        inlineDynamicImports: true,
        entryFileNames: "assets/dashboard.js",
        assetFileNames: (assetInfo) => assetInfo.name?.endsWith(".css") ? "assets/dashboard.css" : "assets/[name][extname]",
      },
    },
  },
});
