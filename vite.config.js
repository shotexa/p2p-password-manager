import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      "@src": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: true,
    modulePreload: false,
    rollupOptions: {
      external: [
        "hyperbee",
        "hyperswarm",
        "corestore"
      ],
      output: {
        format: 'es'
      }
    },
  }
});
