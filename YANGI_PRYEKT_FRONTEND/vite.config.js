import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact()],
  build: {
    outDir: "dist", // Vercel build uchun chiqish papka
  },
  server: {
    port: 3000,
    open: true,
  },
});
