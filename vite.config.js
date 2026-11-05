import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Patrón SPA / Thin Client con Bundling (Vite/Rollup) y Polyfilling
// (@vitejs/plugin-react + target de build amplio) definido en el TP2.
export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2015", // polyfilling / compatibilidad amplia de navegadores
    sourcemap: false,
  },
  server: {
    port: 5173,
    host: true,
  },
});
