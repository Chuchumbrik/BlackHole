import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json";

export default defineConfig({
  plugins: [react()],
  base: "/",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    /** Pixi + app bundle often exceeds Vite’s default 500 kB warning. */
    chunkSizeWarningLimit: 1024,
  },
});
