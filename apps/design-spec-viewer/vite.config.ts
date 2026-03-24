import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("/node_modules/")) {
            return;
          }

          if (id.includes("/node_modules/@xyflow/")) {
            return "xyflow";
          }

          if (id.includes("/node_modules/@radix-ui/")) {
            return "radix";
          }

          if (id.includes("/node_modules/lucide-react/")) {
            return "icons";
          }
        }
      }
    }
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src")
    }
  }
});
