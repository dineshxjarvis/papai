import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/s2": {
        target: "https://api.semanticscholar.org",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/s2/, ""),
      },
      "/api/arxiv": {
        target: "https://export.arxiv.org",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/arxiv/, ""),
      },
      "/api/arxiv-pdf": {
        target: "https://arxiv.org",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/arxiv-pdf/, ""),
      },
    },
  },
});
