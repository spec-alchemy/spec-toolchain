import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoRootPath = resolve(__dirname, "../..");

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [repoRootPath]
    }
  },
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
      "@": resolve(__dirname, "./src"),
      "@spec-alchemy/spec-viewer-contract": resolve(
        __dirname,
        "../../packages/ddd-spec-viewer-contract/index.ts"
      )
    }
  }
});
