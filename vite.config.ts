/// <reference types="vite/client" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
