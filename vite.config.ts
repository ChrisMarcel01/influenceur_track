import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile()],
  build: { target: "es2017", assetsInlineLimit: 100000000, cssCodeSplit: false, sourcemap: false },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
